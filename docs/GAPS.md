# Remaining review work

Status 2026-09-25. The site now presents 220 reviewed bilingual clue labels and all 5,860 source images, while retaining the existing interaction model and charts.

- **Corpus coverage:** All 133 linked chapter HTML files were processed. The playable library uses 220 concise observations and 598 active estimates; 5,317 extracted phrase IDs remain raw audit candidates. Fifty-one proposed phrase mappings were not found by the parser. Country name in the candidate list does not mean its local clues are complete.
- **Photo matching:** 121 clue cards use 117 visually checked image files. The remaining 99 are text cards; all 5,860 images are still available in the chapter browser. Only primary card images were visually inspected, so later source image instances need review before attaching them to a clue card.
- **Geographic inference:** The tutorial supplies qualitative advice, not measured observation frequencies or GeoGuessr map sampling priors. The 598 active prevalence values are engineering estimates. Twenty-one extreme parser estimates were withheld and 68 corrected after context review; ordinary midrange estimates still need broader source-by-source factual review.
- **Regions:** Brazil has a complete, mutually exclusive 27-state scheme. Six other source-mentioned schemes are incomplete and show a neutral empty state rather than fabricated percentages.
- **Rights:** The original tutorial images do not carry verified per-image author and redistribution metadata in the local archive. They are included in the public test build at the project owner's direction. The code license does not extend to them. The eventual VM publication should resolve any rights questions appropriate to its access policy.

`npm run data:report` regenerates [the candidate and rule coverage table](DATA_COVERAGE.md). [SCORING.md](SCORING.md) explains the model.
