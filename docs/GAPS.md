# Remaining review work

Status 2026-09-25. The existing UI and scoring engine now use 494 bilingual clues, 1,136 active qualitative estimates, and all 5,860 source images in the chapter browser. Canada and every one of the archive's 18 African chapters received a focused paragraph review. This is a substantial expansion, not a claim that geographic accuracy is fully validated.

- **Requested candidate scope:** The local `tuxundoc/index.html` defines the complete requested country/territory set. All 18 African chapters in that set and Canada are active candidates with focused evidence. Candidate inclusion is complete for this scope; depth and factual calibration remain separate review work.
- **Chapter depth:** The focused pass added 286 source-backed rows, but not every one of the 8,466 source blocks describes a selectable visual feature. Some potentially useful prose and alternate appearances remain to review. [FOCUSED_REVIEW.md](FOCUSED_REVIEW.md) gives chapter counts and outstanding issues.
- **Photo matching:** 328 clue cards use 316 inspected source images; 166 remain text cards. Their source block may have no adjacent image, may contain an infographic or answer-revealing map, or may show a different visual. The 5,860-image chapter browser does not imply a semantic match to every clue. Tanzania, Egypt and Réunion still have especially few illustrated cards. Some thumbnails with tutorial map insets merit further browser review.
- **Geographic inference:** Prevalences and observation error rates are initial estimates, not measured frequencies. The 95 new contrasts cite direct chapter comparisons; silence in another chapter remains unknown. Broad region partitions provide conditional distributions but cannot support province-level precision. Midrange legacy estimates and geographic exceptions still need more source-by-source review.
- **Translation:** Card labels are bilingual. Source excerpts in the detail panel remain predominantly Chinese; full English translations of every note have not been written.
- **Permission metadata:** The owner reports permission from the tutorial author for this project. The archive does not carry individual image author/license fields. The code MIT license excludes source images.

`npm run data:report` regenerates [candidate and rule coverage](DATA_COVERAGE.md). [SCORING.md](SCORING.md) explains the model.
