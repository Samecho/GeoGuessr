# Local Tuxundoc import and review record

The local source entry is `tuxundoc/index.html`. It links to 133 chapter folders containing `index.html`, `metadata.json`, and images in chapter-relative folders. The original archive is approximately 8 GB, is read-only to the import workflow, and is excluded from Git and the deployed site. The importer reads the index, metadata, HTML, heading structure, highlighted text, paragraph/list text, and image references; it checks source image paths without copying or embedding their bytes.

## Import output

- 133 candidate chapter locations, including Antarctica; only a user-chosen scope can remove a candidate at runtime.
- 8,466 paragraph/list/content records, each with a stable source fact ID, chapter path, source section/element or ordinal, content hash, and a short excerpt.
- 5,562 normalized feature IDs, 8,602 location-feature claims, 5,102 deduplicated prevalence estimates, and 28 explicit source-backed interaction estimates.
- 5,860 image references, all private and marked `source-only`; per-image rights are unknown, so they are not public assets.
- One chapter is missing `document.lake`; its HTML was still imported. The precise source path and each chapter's counts are generated in [DATA_COVERAGE.md](DATA_COVERAGE.md).

Every paragraph remains represented in `facts.json` and `import-progress.json`, including the 1,883 text blocks from which no selectable feature was extracted. This preserves a review trail instead of treating file scanning as semantic completion. The short fact excerpt is not a substitute for the original; the path, source element/ordinal and hash provide traceability back to the local read-only source.

## Parsing and evidence boundaries

The conversion deduplicates by stable normalized observation IDs and source hashes. Author-highlighted descriptions and a curated visual vocabulary produce candidate observation IDs. Claims record `supports`, `opposes`, or `explicit-absence`, plus source sections and relevant local conditions where parsed. Only explicit source wording creates an interaction. Missing text is unknown and does not imply a feature is absent. Country statements and region-specific statements are kept distinct; Brazil's 27 bracket-coded state set is complete in the local source, while six other mentioned region sets remain partial.

The archive is Chinese-first. The current English UI is preserved, but 5,033 clue labels still require translation review; parser-generated cards also need human review for sentence-like emphasis and noisy phrases. Therefore this import is a fully accounted first conversion of all linked chapters, not a claim of manually reviewed or fully translated knowledge.

## Image and licensing boundary

No image from the local tutorial archive is copied to the public site. The archive does not supply a verified, per-image redistribution grant in the imported metadata, and a chapter/source URL alone does not establish permission. The current app uses only the separately documented, redistributable Commons photographs in [ASSETS.md](ASSETS.md). They illustrate appearances; their photographed locations are not used to support any geographic rule.
