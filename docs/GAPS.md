# Remaining knowledge review work

Status 2026-09-25. The data and inference rebuild is connected to the existing application; it is a substantial corpus import, not a manually verified global guide.

- **Chapters:** 133 of 133 index-linked chapter HTML documents were processed. One chapter's `document.lake` metadata file is missing, but its HTML was processed. 8,466 text/content nodes and 5,860 image references are accounted for. The importer records image paths and does not copy tutorial image bytes.
- **Selectable cards:** 5,562 stable, deduplicated feature records currently load. 23 have independently licensed photos (24 photo files); 5,539 are text-only. These are parser outputs, so long emphasized phrases and other noisy observations still need semantic review before every record can be described as a polished clue.
- **Evidence:** 8,466 source facts and 8,602 parsed claims trace to local chapters. The current data has 5,102 distinct location-feature probability estimates and 28 explicit interaction estimates. Probabilities are centralized qualitative initial estimates, not measured frequency data. No automated validator can establish that a tutorial statement is true.
- **Translation:** 5,033 clue labels remain pending English translation review. The app shell is bilingual and defaults to English; the source knowledge itself is Chinese-first, so do not claim complete English content coverage.
- **Regions:** Brazil has one complete 27-unit state partition. Six partial source-mentioned schemes are retained but not scored. There is no basis in this corpus for fabricated local proportions.
- **Media rights:** The 5,860 images referenced from local chapters have no verified per-image redistribution license in the archive metadata and are not published. Existing 24 Commons photographs have their own source, author and license records and serve only as visual examples. No capture-location claims are inferred from them.
- **Model quality:** Regression tests establish deterministic likelihood calculations, not predictive accuracy. Human review should focus next on phrase boundaries, evidence relations, estimate bands, and source-specific exceptions.

Regenerate the per-chapter accounting with `npm run data:report`. Exact counts and chapter paths are in [DATA_COVERAGE.md](DATA_COVERAGE.md); how to interpret estimates is in [SCORING.md](SCORING.md).
