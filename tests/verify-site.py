#!/usr/bin/env python3
"""Check the static comparison site without a browser, network, or third-party packages.

Run: python3 tests/verify-site.py
The installed Node.js executable is used for JavaScript parsing and a restricted
VM evaluation of the site's data assignment. No project files are modified.
Exact source checks use the adjacent evaluation checkout when available, or
--source-root. Published copies without that checkout still validate every
embedded contract. --skip-source-check explicitly selects that portable mode.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
from typing import Iterable
from urllib.parse import unquote, urlsplit


EXPECTED_REPOSITORY = "openai/openai-builder-lab-solution"
EXPECTED_COMMIT = "e87f060e4e86d599ee54bdc7b752484944278f85"
EXPECTED_TOOLS = {
    "local-skill": "local-skill.html",
    "codewiki": "codewiki.html",
    "openwiki": "openwiki.html",
    "deepwiki-open": "deepwiki-open.html",
    "devinwiki": "devinwiki.html",
}
NEW_PAGES = ("compare.html", "issue-compare.html")
DATA_FILE = "assets/issue-comparison-data.js"
SOURCE_DATA_FILE = "assets/issue-source-evidence.js"
PROFILES_FILE = "assets/wiki-output-profiles.js"
QUALITY_CASE_ID = "source-reference-navigation"
EXPECTED_CASE_IDS = {
    "voice-tool-reachability", "itinerary-parameter-contract", "voice-config-consumer",
    "async-error-boundary", "utf8-stream-boundary", "microphone-cleanup",
    "final-model-config", "backend-substitution", "completion-diagram-direction",
    QUALITY_CASE_ID,
}
STATUSES = {"same_issue", "mixed", "correct", "not_covered", "unreviewed"}
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
MATCH_TAGS = {"p", "li", "h1", "h2", "h3", "td", "th", "pre"}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


@dataclass(eq=False)
class Element:
    tag: str
    attrs: dict[str, str]
    line: int
    parent: Element | None = None
    children: list[Element | str] = field(default_factory=list)

    @property
    def text(self) -> str:
        # textContent concatenates inline children without inserting spaces.
        return "".join(child.text if isinstance(child, Element) else child for child in self.children)

    def has_class(self, name: str) -> bool:
        return name in self.attrs.get("class", "").split()

    def descendants(self, include_self: bool = False) -> Iterable[Element]:
        if include_self:
            yield self
        for child in self.children:
            if isinstance(child, Element):
                yield child
                yield from child.descendants()

    def contains(self, node: Element) -> bool:
        current: Element | None = node
        while current is not None:
            if current is self:
                return True
            current = current.parent
        return False


class SiteHTML(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.root = Element("document", {}, 0)
        self.stack = [self.root]
        self.feed(source)
        self.close()
        self.ids: dict[str, list[Element]] = {}
        self._index_ids()
        self._add_runtime_heading_ids()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Element(tag, {key: value or "" for key, value in attrs}, self.getpos()[0], self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)

    def _index_ids(self) -> None:
        for node in self.root.descendants():
            if node.attrs.get("id"):
                self.ids.setdefault(node.attrs["id"], []).append(node)

    def _add_runtime_heading_ids(self) -> None:
        # Keep this contract aligned with sectionAnchors() in assets/app.js.
        for panel_id, prefix in (("wiki-original", "compare-section-"), ("wiki-zh", "compare-zh-section-")):
            for panel in self.ids.get(panel_id, []):
                articles = [node for node in panel.descendants() if node.has_class("wiki-doc")]
                for article_index, article in enumerate(articles, 1):
                    headings = [node for node in article.descendants() if node.tag == "h2"]
                    for heading_index, heading in enumerate(headings, 1):
                        if not heading.attrs.get("id"):
                            heading.attrs["id"] = f"{prefix}{article_index}-{heading_index}"
                            self.ids.setdefault(heading.attrs["id"], []).append(heading)

    @property
    def original(self) -> Element | None:
        return next(iter(self.ids.get("wiki-original", [])), None)

    def matches(self, wanted: str, root: Element | None = None) -> list[Element]:
        root = root or self.root
        wanted = normalize(wanted)
        if not wanted:
            return []
        return [
            node for node in root.descendants(include_self=True)
            if (node.tag in MATCH_TAGS or node.has_class("mermaid")) and wanted in normalize(node.text)
        ]


class Verification:
    def __init__(self, root: Path, source_root: Path | None = None, skip_source_check: bool = False):
        self.root = root.resolve()
        self.requested_source_root = source_root
        self.skip_source_check = skip_source_check
        self.source_root: Path | None = None
        self.source_check = {"mode": "not-run", "commit_verified": False}
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.counts: Counter[str] = Counter()
        self.html: dict[str, SiteHTML] = {}
        self.original_counts: dict[str, dict[str, int]] = {}
        self.node = shutil.which("node")

    def error(self, context: str, message: str) -> None:
        self.errors.append(f"{context}: {message}")

    def warn(self, context: str, message: str) -> None:
        self.warnings.append(f"{context}: {message}")

    def read_html(self, name: str) -> SiteHTML | None:
        if name in self.html:
            return self.html[name]
        path = self.root / name
        if not path.is_file():
            self.error(name, "HTML file does not exist")
            return None
        try:
            parsed = SiteHTML(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError) as exc:
            self.error(name, f"cannot parse HTML: {exc}")
            return None
        self.html[name] = parsed
        self.counts["html_files"] += 1
        return parsed

    def parser_self_test(self) -> None:
        fixture = SiteHTML(
            '<main><div id="wiki-original"><article class="wiki-doc" id="original-1">'
            '<h1>Original</h1><h2>Contract</h2>'
            '<p>Value <code>a&amp;b</code> &gt; 0&nbsp;works.</p></article></div></main>'
            '<aside><p>Audit-only assertion.</p></aside>'
        )
        assertions = {
            "entities and inline code": len(fixture.matches("Value a&b > 0 works.", fixture.original)) == 1,
            "audit exclusion": not fixture.matches("Audit-only assertion.", fixture.original),
            "dynamic heading ID": "compare-section-1-1" in fixture.ids,
        }
        for name, passed in assertions.items():
            if not passed:
                self.error("parser self-test", name)
        self.counts["parser_self_tests"] += len(assertions)

    def verify_page_references(self) -> None:
        for name in NEW_PAGES:
            page = self.read_html(name)
            if page is None:
                continue
            for id_value, nodes in page.ids.items():
                if len(nodes) > 1:
                    self.error(name, f"duplicate HTML id {id_value!r}")
            for node in page.root.descendants():
                label_target = node.attrs.get("for") if node.tag == "label" else None
                if label_target and label_target not in page.ids:
                    self.error(f"{name}:{node.line}", f"label references missing id {label_target!r}")
                for attr in ("src", "href"):
                    value = node.attrs.get(attr)
                    if not value:
                        continue
                    parts = urlsplit(value)
                    if parts.scheme or parts.netloc:
                        if parts.scheme in {"javascript", "file"}:
                            self.error(f"{name}:{node.line}", f"non-shareable or executable {attr}: {value}")
                        continue
                    relative = unquote(parts.path)
                    target = (self.root / name).parent / relative if relative else self.root / name
                    if relative.startswith("/"):
                        target = self.root / relative.lstrip("/")
                    target = target.resolve()
                    if not target.is_relative_to(self.root):
                        self.error(f"{name}:{node.line}", f"local reference escapes site root: {value}")
                        continue
                    if not target.exists():
                        self.error(f"{name}:{node.line}", f"missing referenced file: {value}")
                        continue
                    self.counts["local_references"] += 1
                    if parts.fragment and target.suffix.lower() == ".html":
                        target_name = target.relative_to(self.root).as_posix()
                        target_page = self.read_html(target_name)
                        if target_page and unquote(parts.fragment) not in target_page.ids:
                            self.error(f"{name}:{node.line}", f"reference has missing fragment: {value}")

    def verify_javascript(self) -> None:
        if not self.node:
            self.error("JavaScript syntax", "Node.js executable is required but was not found on PATH")
            return
        for path in sorted((self.root / "assets").glob("*.js")):
            name = path.relative_to(self.root).as_posix()
            try:
                result = subprocess.run(
                    [self.node, "--check", str(path)], capture_output=True, text=True,
                    timeout=30, check=False,
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                self.error(name, f"JavaScript syntax check failed: {exc}")
                continue
            if result.returncode:
                self.error(name, "JavaScript syntax error: " + result.stderr.strip())
            else:
                self.counts["javascript_files"] += 1

    def load_data(self, filename: str = DATA_FILE, global_name: str = "WIKI_ISSUE_COMPARISON_DATA") -> dict | None:
        path = self.root / filename
        if not path.is_file():
            self.error(filename, "data file is missing; its contract checks cannot run")
            return None
        if not self.node:
            self.error(filename, "cannot evaluate data without Node.js")
            return None
        evaluator = r"""
const fs = require('node:fs');
const vm = require('node:vm');
const filename = process.argv[1];
const globalName = process.argv[2];
const sandbox = Object.create(null);
sandbox.window = Object.create(null);
const context = vm.createContext(sandbox, {codeGeneration: {strings: false, wasm: false}});
new vm.Script(fs.readFileSync(filename, 'utf8'), {filename}).runInContext(context, {timeout: 2000});
const data = sandbox.window[globalName];
if (!data || typeof data !== 'object' || Array.isArray(data)) {
  throw new Error('window.' + globalName + ' must be an object');
}
process.stdout.write(JSON.stringify(data));
"""
        try:
            result = subprocess.run(
                [self.node, "-e", evaluator, str(path), global_name], capture_output=True, text=True,
                timeout=10, check=False,
            )
            if result.returncode:
                self.error(filename, "data evaluation failed: " + result.stderr.strip())
                return None
            data = json.loads(result.stdout)
        except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
            self.error(filename, f"cannot load data: {exc}")
            return None
        return data

    def index_records(self, data: dict, key: str) -> dict[str, dict]:
        records = data.get(key)
        if not isinstance(records, list) or not records:
            self.error(key, "must be a nonempty array")
            return {}
        index = {}
        for position, record in enumerate(records):
            context = f"{key}[{position}]"
            if not isinstance(record, dict):
                self.error(context, "must be an object")
                continue
            record_id = record.get("id")
            if not isinstance(record_id, str) or not record_id.strip():
                self.error(context, "missing nonempty string id")
            elif record_id in index:
                self.error(context, f"duplicate id {record_id!r}")
            else:
                index[record_id] = record
        self.counts[key] += len(index)
        return index

    def verify_source_url(self, value: object, context: str) -> None:
        if not isinstance(value, str) or not value:
            self.error(context, "source URL must be a nonempty string")
            return
        parts = urlsplit(value)
        prefix = f"/openai/openai-builder-lab-solution/blob/{EXPECTED_COMMIT}/"
        path = unquote(parts.path)
        if parts.scheme != "https" or parts.netloc != "github.com" or not path.startswith(prefix) or path == prefix:
            self.error(context, f"source URL must target the fixed repository commit {EXPECTED_COMMIT}: {value}")
            return
        if any(segment in {".", ".."} for segment in path.split("/")):
            self.error(context, "source URL contains path traversal segments")
            return
        self.counts["source_urls"] += 1

    def verify_quote(self, value: object, page: SiteHTML, context: str, scope: Element | None = None) -> bool:
        if not isinstance(value, str) or not normalize(value):
            self.error(context, "quote must be a nonempty string when present")
            return False
        original = page.original
        if original is None:
            return False
        text = normalize((scope or original).text)
        quote = normalize(value)
        if quote in text:
            self.counts["original_quotes"] += 1
            return True
        # Explicit ellipses may join excerpts, but each retained fragment must be verbatim.
        fragments = [part.strip() for part in re.split(r"\u2026+|\.{3,}", quote) if part.strip()]
        position = 0
        if len(fragments) > 1:
            for fragment in fragments:
                index = text.find(fragment, position)
                if index < 0:
                    break
                position = index + len(fragment)
            else:
                self.counts["original_quotes"] += 1
                self.counts["excerpted_quotes"] += 1
                return True
        self.error(context, "quote is not verbatim original text (including any explicitly excerpted fragments)")
        return False

    def verify_wiki_evidence(self, evidence: dict, tool_id: str, context: str) -> bool:
        page_name = evidence.get("page")
        if page_name != EXPECTED_TOOLS[tool_id]:
            self.error(context, f"evidence.page must be {EXPECTED_TOOLS[tool_id]!r}, got {page_name!r}")
            return False
        page = self.read_html(page_name)
        if page is None:
            return False
        original = page.original
        if original is None:
            self.error(context, f"{page_name} has no #wiki-original")
            return False
        anchor = evidence.get("anchor", "")
        match = evidence.get("match", "")
        if not isinstance(anchor, str) or not isinstance(match, str):
            self.error(context, "anchor and match must be strings when present")
            return False
        if not anchor and not normalize(match):
            self.error(context, "Wiki evidence requires an anchor or a nonempty match")
            return False
        valid = True
        anchor_node = None
        hits: list[Element] = []
        if anchor:
            anchor = unquote(anchor.removeprefix("#"))
            targets = page.ids.get(anchor, [])
            if len(targets) != 1:
                self.error(context, f"anchor {anchor!r} must exist exactly once in {page_name}")
                valid = False
            elif not original.contains(targets[0]):
                self.error(context, f"anchor {anchor!r} is outside #wiki-original (audit or translated content)")
                valid = False
            else:
                anchor_node = targets[0]
                self.counts["original_anchors"] += 1
        if match:
            if len(match) > 1000:
                self.error(context, "match exceeds the reader's 1000-character limit")
                valid = False
            hits = page.matches(match[:1000], original)
            if not hits:
                outside = page.matches(match[:1000])
                extra = " It only occurs outside #wiki-original (e.g. audit commentary)." if outside else ""
                self.error(context, f"match is absent from readable original blocks in {page_name}: {match[:100]!r}.{extra}")
                valid = False
            else:
                self.counts["original_matches"] += 1
                if anchor_node and anchor_node.has_class("wiki-doc") and not any(anchor_node.contains(hit) for hit in hits):
                    self.error(context, f"match exists elsewhere but not inside the specified original article {anchor!r}")
                    valid = False
                elif anchor_node and anchor_node.has_class("wiki-doc") and not anchor_node.contains(hits[0]):
                    self.warn(context, "match also occurs earlier in another article; ensure the runtime scopes lookup to the supplied anchor")
        if "quote" in evidence:
            quote_scope = anchor_node or next(iter(hits), None)
            while quote_scope is not None and not quote_scope.has_class("wiki-doc"):
                quote_scope = quote_scope.parent
            if not self.verify_quote(evidence["quote"], page, context, quote_scope):
                valid = False
        if valid:
            self.counts["wiki_evidence"] += 1
        return valid

    def verify_data(self, data: dict) -> None:
        if data.get("commit") != EXPECTED_COMMIT:
            self.error("data.commit", f"expected {EXPECTED_COMMIT}, got {data.get('commit')!r}")
        tools = self.index_records(data, "tools")
        categories = self.index_records(data, "categories")
        cases = self.index_records(data, "cases")
        if set(cases) != EXPECTED_CASE_IDS:
            self.error("cases", f"expected the ten audited cases; missing={sorted(EXPECTED_CASE_IDS - set(cases))}, extra={sorted(set(cases) - EXPECTED_CASE_IDS)}")
        if set(tools) != set(EXPECTED_TOOLS):
            self.error("tools", f"expected exactly five known tools; missing={sorted(set(EXPECTED_TOOLS) - set(tools))}, extra={sorted(set(tools) - set(EXPECTED_TOOLS))}")
        for tool_id, record in tools.items():
            if record.get("page") != EXPECTED_TOOLS.get(tool_id):
                self.error(f"tool {tool_id}", "page does not match the known tool HTML")
            if not record.get("label"):
                self.error(f"tool {tool_id}", "missing displayed label")
        if "all" in categories:
            self.error("categories", "id 'all' is reserved by the UI")
        for category_id, category in categories.items():
            if not category.get("label"):
                self.error(f"category {category_id}", "missing displayed label")
        used_categories = set()
        for case_id, item in cases.items():
            context = f"case {case_id}"
            category_id = item.get("categoryId")
            if category_id not in categories:
                self.error(context, f"unknown categoryId {category_id!r}")
            else:
                used_categories.add(category_id)
            for required in ("title", "question"):
                if not isinstance(item.get(required), str) or not item[required].strip():
                    self.error(context, f"missing nonempty {required}")
            truth = item.get("truth")
            if not isinstance(truth, dict) or not truth.get("summary"):
                self.error(context, "truth.summary is required")
            else:
                source_urls = truth.get("codeUrls")
                if isinstance(source_urls, list) and source_urls:
                    for index, source in enumerate(source_urls):
                        value = source.get("url") if isinstance(source, dict) else source
                        self.verify_source_url(value, f"{context} truth.codeUrls[{index}]")
                elif truth.get("codeUrl"):
                    self.verify_source_url(truth["codeUrl"], f"{context} truth.codeUrl")
                elif item.get("kind") != "quality":
                    self.error(context, "fact case requires a fixed-commit truth source URL")
            results = item.get("tools")
            if not isinstance(results, dict):
                self.error(context, "tools must contain the five tool results")
                continue
            if set(results) != set(EXPECTED_TOOLS):
                self.error(context, f"tool results incomplete: missing={sorted(set(EXPECTED_TOOLS) - set(results))}, extra={sorted(set(results) - set(EXPECTED_TOOLS))}")
            for tool_id in EXPECTED_TOOLS:
                result = results.get(tool_id)
                result_context = f"{context} / {tool_id}"
                if not isinstance(result, dict):
                    self.error(result_context, "missing tool result object")
                    continue
                self.counts["tool_results"] += 1
                status = result.get("status")
                if status not in STATUSES:
                    self.error(result_context, f"unknown status {status!r}")
                if not isinstance(result.get("summary"), str) or not result["summary"].strip():
                    self.error(result_context, "missing summary")
                evidence_list = result.get("evidence")
                if not isinstance(evidence_list, list):
                    self.error(result_context, "evidence must be an array")
                    continue
                valid_original_evidence = 0
                for index, evidence in enumerate(evidence_list):
                    evidence_context = f"{result_context} evidence[{index}]"
                    if not isinstance(evidence, dict):
                        self.error(evidence_context, "evidence must be an object")
                    elif evidence.get("kind") == "source":
                        self.verify_source_url(evidence.get("url"), evidence_context)
                    elif self.verify_wiki_evidence(evidence, tool_id, evidence_context):
                        valid_original_evidence += 1
                if status in {"same_issue", "mixed", "correct"} and not valid_original_evidence:
                    self.error(result_context, f"status {status!r} needs at least one valid Wiki-original locator, not only source/audit commentary")
        for unused in sorted(set(categories) - used_categories):
            self.warn(f"category {unused}", "no cases currently use this category")

    def prepare_source_check(self) -> None:
        self.source_root = None
        self.source_check = {"mode": "skipped", "commit_verified": False}
        if self.skip_source_check:
            self.warn("source excerpts", "exact external-file checks explicitly skipped; all embedded contracts are still validated")
            return
        candidate = self.requested_source_root or (
            self.root.parent / "wiki-tool-eval" / "runs-4way-single"
            / "openai__openai-builder-lab-solution" / "source" / "repo"
        )
        if not candidate.is_dir():
            if self.requested_source_root is not None:
                self.error("source checkout", "the explicitly requested source root is not an existing directory")
            else:
                self.warn("source excerpts", "local source checkout is absent; exact external-file checks skipped, embedded contracts remain required")
            return
        self.source_root = candidate.resolve()
        self.source_check["mode"] = "exact"
        try:
            result = subprocess.run(
                ["git", "-C", str(self.source_root), "rev-parse", "--verify", "HEAD"],
                capture_output=True, text=True, timeout=10, check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            self.warn("source checkout", "could not verify checkout revision; exact text checks will still run")
            return
        if result.returncode:
            self.warn("source checkout", "no readable Git revision; exact text checks will still run against available files")
        elif result.stdout.strip() != EXPECTED_COMMIT:
            self.error("source checkout", "Git HEAD differs from the fixed source commit; use the pinned checkout")
        else:
            self.source_check["commit_verified"] = True

    def verify_source_excerpt(self, excerpt: dict, context: str) -> bool:
        valid = True
        for field_name in ("id", "title", "file", "code", "takeaway"):
            value = excerpt.get(field_name)
            if not isinstance(value, str) or not value.strip():
                self.error(context, f"{field_name} must be a nonempty string")
                valid = False
        filename = excerpt.get("file")
        safe_path = isinstance(filename, str) and bool(filename) and not any(
            character in filename for character in ("\\", ":", "\x00", "\n", "\r")
        )
        if safe_path:
            parts = PurePosixPath(filename)
            safe_path = (
                not parts.is_absolute() and unquote(filename) == filename
                and all(part not in {"", ".", "..", ".git"} for part in filename.split("/"))
            )
        if not safe_path:
            self.error(context, "file must be an unencoded repository-relative path without traversal")
            valid = False
        start, end = excerpt.get("startLine"), excerpt.get("endLine")
        valid_range = type(start) is int and type(end) is int and 1 <= start <= end
        if not valid_range:
            self.error(context, "startLine/endLine must be positive integers with startLine <= endLine")
            valid = False
        code = excerpt.get("code")
        if isinstance(code, str) and valid_range:
            code = code.replace("\r\n", "\n")
            line_counts = {len(code.split("\n"))}
            if code.endswith("\n"):
                line_counts.add(len(code.split("\n")) - 1)
            if end - start + 1 not in line_counts:
                self.error(context, "code line count does not match the inclusive source range")
                valid = False
        if valid and self.source_root is not None:
            path = (self.source_root / filename).resolve()
            if not path.is_relative_to(self.source_root):
                self.error(context, "resolved source path escapes the pinned checkout")
                return False
            if not path.is_file():
                self.error(context, f"source file is missing: {filename}")
                return False
            pinned_text = None
            if self.source_check["commit_verified"]:
                try:
                    result = subprocess.run(
                        ["git", "-C", str(self.source_root), "show", f"{EXPECTED_COMMIT}:{filename}"],
                        capture_output=True, timeout=10, check=False,
                    )
                    if result.returncode:
                        self.error(context, f"source file is not present in the pinned commit: {filename}")
                        return False
                    pinned_text = result.stdout.decode("utf-8").replace("\r\n", "\n")
                except (OSError, UnicodeError, subprocess.TimeoutExpired):
                    self.error(context, f"could not read the pinned source version: {filename}")
                    return False
            try:
                source = path.read_bytes().decode("utf-8").replace("\r\n", "\n")
            except (OSError, UnicodeError):
                self.error(context, f"cannot read UTF-8 source file: {filename}")
                return False
            if pinned_text is not None and source != pinned_text:
                self.error(context, f"working source differs from the pinned commit: {filename}")
                return False
            lines = source.split("\n")
            if source.endswith("\n"):
                lines.pop()
            if end > len(lines):
                self.error(context, f"source range exceeds {filename}'s {len(lines)} lines")
                return False
            expected = "\n".join(lines[start - 1:end])
            if code not in (expected, expected + "\n"):
                self.error(context, f"code differs from {filename}:{start}-{end}; indentation and blank lines must be preserved")
                return False
            self.counts["source_excerpt_exact_matches"] += 1
        if valid:
            self.counts["source_excerpts"] += 1
        return valid

    def verify_source_evidence(self, data: dict) -> None:
        if data.get("repository") != EXPECTED_REPOSITORY:
            self.error(SOURCE_DATA_FILE, "repository must match the audited repository")
        if data.get("commit") != EXPECTED_COMMIT:
            self.error(SOURCE_DATA_FILE, "commit must match the fixed source revision")
        cases = data.get("cases")
        if not isinstance(cases, dict):
            self.error(SOURCE_DATA_FILE, "cases must be an object keyed by the ten audited case IDs")
            return
        if set(cases) != EXPECTED_CASE_IDS:
            self.error(SOURCE_DATA_FILE, f"source cases incomplete; missing={sorted(EXPECTED_CASE_IDS - set(cases))}, extra={sorted(set(cases) - EXPECTED_CASE_IDS)}")
        for case_id, item in cases.items():
            context = f"source case {case_id}"
            if not isinstance(item, dict):
                self.error(context, "case must be an object")
                continue
            self.counts["source_cases"] += 1
            excerpts = item.get("sourceExcerpts")
            excerpt_ids = set()
            if not isinstance(excerpts, list) or (not excerpts and case_id != QUALITY_CASE_ID):
                self.error(context, "sourceExcerpts must be nonempty, except for the archive-navigation quality case")
                excerpts = []
            for index, excerpt in enumerate(excerpts):
                excerpt_context = f"{context} sourceExcerpts[{index}]"
                if not isinstance(excerpt, dict):
                    self.error(excerpt_context, "source excerpt must be an object")
                    continue
                excerpt_id = excerpt.get("id")
                if isinstance(excerpt_id, str) and excerpt_id:
                    if excerpt_id in excerpt_ids:
                        self.error(excerpt_context, f"duplicate excerpt id {excerpt_id!r}")
                    excerpt_ids.add(excerpt_id)
                self.verify_source_excerpt(excerpt, excerpt_context)
            results = item.get("tools")
            if not isinstance(results, dict):
                self.error(context, "tools must contain the five explanation objects")
                continue
            if set(results) != set(EXPECTED_TOOLS):
                self.error(context, "tools must contain exactly the five known tool IDs")
            for tool_id, result in results.items():
                result_context = f"{context} / {tool_id}"
                if not isinstance(result, dict):
                    self.error(result_context, "tool explanation must be an object")
                    continue
                self.counts["source_tool_results"] += 1
                for field_name in ("wikiMeaning", "explanation", "skillAction"):
                    value = result.get(field_name)
                    if not isinstance(value, str) or not value.strip():
                        self.error(result_context, f"{field_name} must be a nonempty string")
                if "scopeNote" in result and (not isinstance(result["scopeNote"], str) or not result["scopeNote"].strip()):
                    self.error(result_context, "scopeNote must be a nonempty string when present")
                source_ids = result.get("sourceIds")
                if not isinstance(source_ids, list) or any(not isinstance(value, str) or not value for value in source_ids):
                    self.error(result_context, "sourceIds must be an array of nonempty excerpt IDs")
                    continue
                if not source_ids and case_id != QUALITY_CASE_ID:
                    self.error(result_context, "fact-case explanations must cite at least one source excerpt")
                if len(set(source_ids)) != len(source_ids):
                    self.error(result_context, "sourceIds contains duplicates")
                unknown = set(source_ids) - excerpt_ids
                if unknown:
                    self.error(result_context, f"sourceIds references unknown excerpts: {sorted(unknown)}")

    def verify_profiles(self, data: dict) -> None:
        if data.get("commit") != EXPECTED_COMMIT:
            self.error(PROFILES_FILE, "commit must match the fixed source revision")
        profiles = data.get("tools")
        if not isinstance(profiles, dict):
            self.error(PROFILES_FILE, "tools must be an object keyed by the five known tool IDs")
            return
        if set(profiles) != set(EXPECTED_TOOLS):
            self.error(PROFILES_FILE, "profiles must contain exactly the five known tool IDs")
        for tool_id, profile in profiles.items():
            context = f"output profile {tool_id}"
            if not isinstance(profile, dict):
                self.error(context, "profile must be an object")
                continue
            self.counts["output_profiles"] += 1
            if not isinstance(profile.get("label"), str) or not profile["label"].strip():
                self.error(context, "label must be a nonempty string")
            observations = profile.get("observations")
            if not isinstance(observations, list) or not observations:
                self.error(context, "observations must be a nonempty array")
                continue
            for index, observation in enumerate(observations):
                observation_context = f"{context} observations[{index}]"
                if not isinstance(observation, dict):
                    self.error(observation_context, "observation must be an object")
                    continue
                self.counts["profile_observations"] += 1
                if not isinstance(observation.get("text"), str) or not observation["text"].strip():
                    self.error(observation_context, "text must be a nonempty string")
                evidence = observation.get("evidence")
                if not isinstance(evidence, dict):
                    self.error(observation_context, "each observation needs an original-Wiki evidence object")
                elif tool_id in EXPECTED_TOOLS:
                    self.verify_wiki_evidence(evidence, tool_id, observation_context)

    def collect_original_counts(self) -> None:
        for tool_id, filename in EXPECTED_TOOLS.items():
            page = self.read_html(filename)
            original = page.original if page else None
            if original is None:
                self.error(filename, "cannot count structure without #wiki-original")
                continue
            articles = [node for node in original.descendants() if node.has_class("wiki-doc")]
            nodes = [node for node in original.descendants() if any(article is not node and article.contains(node) for article in articles)]

            def inside_diagram(node: Element) -> bool:
                parent: Element | None = node
                while parent is not None and parent is not original:
                    if parent.has_class("mermaid"):
                        return True
                    parent = parent.parent
                return False

            def pinned_source_link(node: Element) -> bool:
                if node.tag != "a" or not node.attrs.get("href"):
                    return False
                try:
                    url = urlsplit(node.attrs["href"])
                    return (
                        url.scheme == "https" and url.hostname == "github.com" and url.port in {None, 443}
                        and url.path.startswith(f"/{EXPECTED_REPOSITORY}/blob/{EXPECTED_COMMIT}/")
                    )
                except ValueError:
                    return False

            self.original_counts[tool_id] = {
                "articles": len(articles),
                "sections": sum(node.tag == "h2" for node in nodes),
                "code_blocks": sum(node.tag == "pre" and not inside_diagram(node) for node in nodes),
                "diagrams": sum(node.has_class("mermaid") for node in nodes),
                "source_links": sum(pinned_source_link(node) for node in nodes),
            }

    def run(self) -> None:
        self.parser_self_test()
        self.verify_page_references()
        self.verify_javascript()
        data = self.load_data()
        if data is not None:
            self.verify_data(data)
        self.prepare_source_check()
        source_data = self.load_data(SOURCE_DATA_FILE, "WIKI_ISSUE_SOURCE_DATA")
        if source_data is not None:
            self.verify_source_evidence(source_data)
        profiles = self.load_data(PROFILES_FILE, "WIKI_OUTPUT_PROFILES")
        if profiles is not None:
            self.verify_profiles(profiles)
        self.collect_original_counts()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent, help="site root (defaults to the parent of tests)")
    source_options = parser.add_mutually_exclusive_group()
    source_options.add_argument("--source-root", type=Path, help="pinned source checkout; an explicitly supplied missing directory is an error")
    source_options.add_argument("--skip-source-check", action="store_true", help="skip only external-file comparisons; embedded source/evidence contracts remain required")
    parser.add_argument("--json", action="store_true", help="emit a machine-readable JSON report")
    args = parser.parse_args()
    verification = Verification(args.root, args.source_root, args.skip_source_check)
    verification.run()
    report = {
        "ok": not verification.errors,
        "root": str(verification.root),
        "commit": EXPECTED_COMMIT,
        "counts": dict(verification.counts),
        "source_check": verification.source_check,
        "original_counts": verification.original_counts,
        "errors": verification.errors,
        "warnings": verification.warnings,
        "scope": "Offline schema, original-evidence, DOM-scope and optional exact source-file checks; no browser rendering, semantic verdict validation, or network requests.",
    }
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print("Wiki site offline verification")
        print(f"Root: {verification.root}")
        print("Checks: " + ", ".join(f"{key}={value}" for key, value in verification.counts.items()))
        print("Source checks: " + json.dumps(verification.source_check, sort_keys=True))
        print("Original-only structure: " + json.dumps(verification.original_counts, sort_keys=True))
        for error in verification.errors:
            print(f"FAIL: {error}")
        for warning in verification.warnings:
            print(f"WARN: {warning}")
        print(f"Result: {'PASS' if report['ok'] else 'FAIL'} ({len(verification.errors)} errors, {len(verification.warnings)} warnings)")
        print(report["scope"])
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
