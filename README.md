# OpenAI Builder Lab Wiki Comparison

Static comparison of five Wiki-generation approaches applied to the same
`openai/openai-builder-lab-solution` source revision.

Open the published site:

<https://yishimengjue.github.io/openai-builder-lab-wiki-comparison/>

## Comparison scope

- Source repository: <https://github.com/openai/openai-builder-lab-solution>
- Fixed source commit: `e87f060e4e86d599ee54bdc7b752484944278f85`
- Compared outputs: Local Skill, DeepWiki Open, OpenWiki, CodeWiki, and
  DeepWiki (Devin-hosted)
- The audit annotations are part of this comparison site, not part of the
  original tool outputs.

## Content provenance

The Local Skill, DeepWiki Open, OpenWiki, and CodeWiki bodies were generated
in Chinese and rendered from their output Markdown. The DeepWiki hosted
artifact was generated in English. Its `English Original` view preserves the
archived tool text; the optional Chinese view is a condensed editorial summary,
not the original tool output or a line-by-line translation.

The site is self-contained except for links to the fixed GitHub source commit.
No runtime logs, credentials, local repository copies, or local filesystem
paths are included.

## Reading and comparing

- `compare.html` displays any two complete Wiki artifacts side by side, with
  independent chapter navigation and optional percentage-based scroll sync.
  Matching scroll percentages do not imply matching content. Its overview
  compares original-output structure and links each focus observation to a
  passage in the corresponding pane; counts are not accuracy scores.
- `issue-compare.html` groups concrete cases under abstract problem categories
  and checks all five tools against the same source behavior. Each conclusion
  separates the Wiki statement, source behavior, explanation, and improvements
  to the generation skill. A selectable two-tool comparison below the five-tool
  view keeps original passages and line-numbered source excerpts on the page.
  Both tools are checked against the same pinned repository, not separate
  implementations. GitHub links open separately without replacing the view.
- Case statuses distinguish a matching error, mixed correct/incorrect passages,
  a correct explanation of that check, missing coverage, and unreviewed content.
  They are not overall tool scores. Quality observations are labeled separately
  from factual errors; the old audit list remains available as historical context.
- Serve the folder through a static web server for chapter navigation and scroll
  sync. Some browsers restrict those controls when opening `file://` directly;
  the original documents remain accessible via the single-page links.

The case evidence is in `assets/issue-comparison-data.js`; inline source excerpts
and plain-language explanations are in `assets/issue-source-evidence.js`.
Evidence-backed output observations are in `assets/wiki-output-profiles.js`.
Presentation annotations and excerpt highlights never modify the original Wiki
body text. The optional Chinese view of the hosted output is not used as audit
evidence or included in structure counts.

## Verification

With Python 3.10+ and Node.js available, run `python3 tests/verify-site.py`.
The offline checks cover asset references, JavaScript syntax, case completeness,
original-text evidence matches, section anchors, pinned source URLs, and the
additional evidence schemas. Source excerpts are also compared byte-for-byte
with the pinned checkout when it is locally available; missing local source is
reported as a skip rather than a successful source verification. Validator
regression tests are in `tests/test_verify_site.py`.

The bundled Mermaid 11.17.2 browser build is distributed under its MIT license;
see `THIRD_PARTY_LICENSES/Mermaid-LICENSE.txt`.
