"""Regression tests for the offline verifier; no browser or network is used.

Run: python3 -B -m unittest discover -s tests -p 'test_*.py'
"""

from copy import deepcopy
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SPEC = importlib.util.spec_from_file_location("wiki_site_verifier", Path(__file__).with_name("verify-site.py"))
assert SPEC and SPEC.loader
SITE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = SITE
SPEC.loader.exec_module(SITE)


def source_excerpt() -> dict:
    return {
        "id": "code-a", "title": "A checked source range", "file": "src/example.ts",
        "startLine": 2, "endLine": 3, "code": "const value = 1;\n  return value;",
        "takeaway": "The return uses the value declared immediately above it.",
    }


def source_data() -> dict:
    cases = {}
    for case_id in SITE.EXPECTED_CASE_IDS:
        quality = case_id == SITE.QUALITY_CASE_ID
        cases[case_id] = {
            "sourceExcerpts": [] if quality else [source_excerpt()],
            "tools": {
                tool_id: {
                    "wikiMeaning": "What this tool's text says.",
                    "explanation": "How the original text relates to this check.",
                    "skillAction": "Keep the evidence and qualify the claim.",
                    "sourceIds": [] if quality else ["code-a"],
                }
                for tool_id in SITE.EXPECTED_TOOLS
            },
        }
    return {"repository": SITE.EXPECTED_REPOSITORY, "commit": SITE.EXPECTED_COMMIT, "cases": cases}


def original_fixture() -> str:
    source = f"https://github.com/{SITE.EXPECTED_REPOSITORY}/blob/{SITE.EXPECTED_COMMIT}/src/example.ts"
    return (
        '<main><div id="wiki-original"><article class="wiki-doc" id="original-1">'
        '<h1>Original title</h1><h2>Source contract</h2>'
        '<p>A named <code>value</code> is returned.</p>'
        '<pre>const value = 1;</pre><div class="mermaid"><pre>graph TD</pre></div>'
        f'<a href="{source}">Source</a><a href="{source}#L2">Source again</a>'
        '<a href="https://github.com/openai/openai-builder-lab-solution/blob/main/src/example.ts">Mutable source</a>'
        '</article></div></main>'
        '<aside><article class="wiki-doc"><h2>Audit-only assertion.</h2>'
        '<pre>Not an original code block</pre><div class="mermaid">graph LR</div></article></aside>'
        '<div id="wiki-zh"><article class="wiki-doc"><h2>Editorial summary</h2>'
        '<pre>Not original either</pre></article></div>'
    )


class VerifierContractTests(unittest.TestCase):
    def verifier(self) -> SITE.Verification:
        return SITE.Verification(Path(__file__).resolve().parent.parent, skip_source_check=True)

    def assert_has_error(self, verification: SITE.Verification, fragment: str) -> None:
        self.assertTrue(any(fragment in error for error in verification.errors), verification.errors)

    def test_complete_source_contract_with_empty_quality_excerpts(self) -> None:
        verification = self.verifier()
        verification.verify_source_evidence(source_data())
        self.assertEqual([], verification.errors)
        self.assertEqual(10, verification.counts["source_cases"])
        self.assertEqual(50, verification.counts["source_tool_results"])

    def test_portable_mode_does_not_skip_contract_validation(self) -> None:
        verification = self.verifier()
        verification.prepare_source_check()
        data = source_data()
        data["cases"]["voice-tool-reachability"]["sourceExcerpts"][0]["code"] = ""
        verification.verify_source_evidence(data)
        self.assertEqual("skipped", verification.source_check["mode"])
        self.assert_has_error(verification, "code must be a nonempty string")

    def test_absent_default_checkout_skips_only_exact_checks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            verification = SITE.Verification(Path(directory) / "site")
            verification.prepare_source_check()
            verification.verify_source_evidence(source_data())
            self.assertEqual([], verification.errors)
            self.assertEqual("skipped", verification.source_check["mode"])
            self.assertTrue(verification.warnings)

    def test_explicit_missing_checkout_is_an_error(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            verification = SITE.Verification(Path(directory) / "site", Path(directory) / "missing")
            verification.prepare_source_check()
            self.assert_has_error(verification, "explicitly requested source root")

    def test_missing_case_or_tool_cannot_pass(self) -> None:
        for missing in ("case", "tool"):
            with self.subTest(missing=missing):
                data = source_data()
                if missing == "case":
                    del data["cases"]["voice-tool-reachability"]
                else:
                    del data["cases"]["voice-tool-reachability"]["tools"]["local-skill"]
                verification = self.verifier()
                verification.verify_source_evidence(data)
                self.assertTrue(verification.errors)

    def test_wrong_repository_or_commit_cannot_pass(self) -> None:
        for field in ("repository", "commit"):
            with self.subTest(field=field):
                data = source_data()
                data[field] = "different"
                verification = self.verifier()
                verification.verify_source_evidence(data)
                self.assertTrue(verification.errors)

    def test_fact_excerpts_and_tool_explanations_are_required(self) -> None:
        for field in ("sourceExcerpts", "wikiMeaning", "explanation", "skillAction", "sourceIds"):
            with self.subTest(field=field):
                data = source_data()
                case = data["cases"]["voice-tool-reachability"]
                if field == "sourceExcerpts":
                    case[field] = []
                else:
                    case["tools"]["local-skill"][field] = [] if field == "sourceIds" else " "
                verification = self.verifier()
                verification.verify_source_evidence(data)
                self.assertTrue(verification.errors)

    def test_duplicate_excerpt_id_and_unknown_source_id_are_rejected(self) -> None:
        data = source_data()
        case = data["cases"]["voice-tool-reachability"]
        case["sourceExcerpts"].append(deepcopy(case["sourceExcerpts"][0]))
        case["tools"]["local-skill"]["sourceIds"] = ["missing"]
        verification = self.verifier()
        verification.verify_source_evidence(data)
        self.assert_has_error(verification, "duplicate excerpt id")
        self.assert_has_error(verification, "unknown excerpts")

    def test_duplicate_source_references_are_rejected(self) -> None:
        data = source_data()
        data["cases"]["voice-tool-reachability"]["tools"]["local-skill"]["sourceIds"] = ["code-a", "code-a"]
        verification = self.verifier()
        verification.verify_source_evidence(data)
        self.assert_has_error(verification, "sourceIds contains duplicates")

    def test_unsafe_repository_paths_are_rejected_without_source_files(self) -> None:
        for filename in ("../secret.ts", "/source.ts", "C:\\source.ts", "src/%2e%2e/source.ts", "src//source.ts", ".git/config"):
            with self.subTest(filename=filename):
                excerpt = source_excerpt()
                excerpt["file"] = filename
                verification = self.verifier()
                self.assertFalse(verification.verify_source_excerpt(excerpt, "fixture"))
                self.assert_has_error(verification, "repository-relative path")

    def test_boolean_negative_or_reversed_ranges_are_rejected(self) -> None:
        for start, end in ((True, 3), (0, 2), (3, 2), (2, 3.0)):
            with self.subTest(start=start, end=end):
                excerpt = source_excerpt()
                excerpt.update(startLine=start, endLine=end)
                verification = self.verifier()
                self.assertFalse(verification.verify_source_excerpt(excerpt, "fixture"))
                self.assert_has_error(verification, "positive integers")

    def test_line_count_must_match_even_in_portable_mode(self) -> None:
        excerpt = source_excerpt()
        excerpt["endLine"] = 4
        verification = self.verifier()
        self.assertFalse(verification.verify_source_excerpt(excerpt, "fixture"))
        self.assert_has_error(verification, "line count")

    def test_exact_source_check_preserves_indentation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / "src").mkdir()
            (root / "src/example.ts").write_text("// Header\nconst value = 1;\n  return value;\n", encoding="utf-8")
            for code, expected in ((source_excerpt()["code"], True), (source_excerpt()["code"] + "\n", True), ("const value = 1;\nreturn value;", False)):
                with self.subTest(code=code):
                    verification = self.verifier()
                    verification.source_root = root
                    excerpt = source_excerpt()
                    excerpt["code"] = code
                    self.assertEqual(expected, verification.verify_source_excerpt(excerpt, "fixture"))
                    if expected:
                        self.assertEqual(1, verification.counts["source_excerpt_exact_matches"])

    def test_missing_file_does_not_become_a_skip(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            verification = self.verifier()
            verification.source_root = Path(directory).resolve()
            self.assertFalse(verification.verify_source_excerpt(source_excerpt(), "fixture"))
            self.assert_has_error(verification, "source file is missing")

    def test_pinned_snapshot_guards_modified_and_untracked_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / "src").mkdir()
            (root / "src/example.ts").write_text("// Header\nconst value = 1;\n  return value;\n", encoding="utf-8")
            for returncode, content, error in (
                (0, b"// Header\nconst value = 2;\n  return value;\n", "working source differs"),
                (128, b"", "not present in the pinned commit"),
            ):
                with self.subTest(returncode=returncode):
                    verification = self.verifier()
                    verification.source_root = root
                    verification.source_check["commit_verified"] = True
                    result = SITE.subprocess.CompletedProcess([], returncode, content, b"")
                    with mock.patch.object(SITE.subprocess, "run", return_value=result):
                        self.assertFalse(verification.verify_source_excerpt(source_excerpt(), "fixture"))
                    self.assert_has_error(verification, error)

    def test_blank_last_line_is_not_stripped(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / "src").mkdir()
            (root / "src/example.ts").write_bytes(b"// Header\r\nconst value = 1;\r\n\r\n")
            verification = self.verifier()
            verification.source_root = root
            excerpt = source_excerpt()
            excerpt["code"] = "const value = 1;\n"
            self.assertTrue(verification.verify_source_excerpt(excerpt, "fixture"))
            self.assertEqual([], verification.errors)

    def test_symlink_cannot_escape_source_checkout(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory) / "outside.ts"
            outside.write_text("// Header\nconst value = 1;\n  return value;\n", encoding="utf-8")
            root = Path(directory).resolve() / "checkout"
            (root / "src").mkdir(parents=True)
            (root / "src/example.ts").symlink_to(outside)
            verification = self.verifier()
            verification.source_root = root
            self.assertFalse(verification.verify_source_excerpt(source_excerpt(), "fixture"))
            self.assert_has_error(verification, "escapes the pinned checkout")

    def test_quote_must_be_original_not_editorial(self) -> None:
        page = SITE.SiteHTML(original_fixture())
        verification = self.verifier()
        self.assertTrue(verification.verify_quote("A named value is returned.", page, "fixture"))
        self.assertFalse(verification.verify_quote("Audit-only assertion.", page, "fixture"))

    def test_quote_must_agree_with_its_located_original_article(self) -> None:
        html = original_fixture().replace(
            "</article></div></main>",
            '</article><article class="wiki-doc" id="original-2"><p>Another chapter says this.</p></article></div></main>',
        )
        verification = self.verifier()
        verification.html["local-skill.html"] = SITE.SiteHTML(html)
        evidence = {
            "page": "local-skill.html", "anchor": "original-1", "match": "A named value is returned.",
            "quote": "Another chapter says this.",
        }
        self.assertFalse(verification.verify_wiki_evidence(evidence, "local-skill", "fixture"))
        self.assert_has_error(verification, "quote is not verbatim")

    def test_quoted_ellipses_still_require_verbatim_ordered_fragments(self) -> None:
        page = SITE.SiteHTML(original_fixture())
        verification = self.verifier()
        self.assertTrue(verification.verify_quote("A named ... is returned.", page, "fixture"))
        self.assertFalse(verification.verify_quote("is returned. ... A named", page, "fixture"))

    def test_profile_evidence_cannot_point_outside_original(self) -> None:
        verification = self.verifier()
        verification.html = {filename: SITE.SiteHTML(original_fixture()) for filename in SITE.EXPECTED_TOOLS.values()}
        profiles = {
            "commit": SITE.EXPECTED_COMMIT,
            "tools": {
                tool_id: {"label": tool_id, "observations": [{"text": "A source-led observation.", "evidence": {"page": filename, "match": "A named value is returned.", "anchor": "original-1"}}]}
                for tool_id, filename in SITE.EXPECTED_TOOLS.items()
            },
        }
        verification.verify_profiles(profiles)
        self.assertEqual([], verification.errors)
        profiles["tools"]["local-skill"]["observations"][0]["evidence"]["match"] = "Audit-only assertion."
        verification.verify_profiles(profiles)
        self.assert_has_error(verification, "outside #wiki-original")

    def test_structure_counts_exclude_audit_summary_and_diagram_fallback(self) -> None:
        verification = self.verifier()
        verification.html = {filename: SITE.SiteHTML(original_fixture()) for filename in SITE.EXPECTED_TOOLS.values()}
        verification.collect_original_counts()
        self.assertEqual([], verification.errors)
        for counts in verification.original_counts.values():
            self.assertEqual({"articles": 1, "sections": 1, "code_blocks": 1, "diagrams": 1, "source_links": 2}, counts)


if __name__ == "__main__":
    unittest.main()
