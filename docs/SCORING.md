# Scoring model

Reviewed 2026-09-26. The chart label **Match share / 匹配占比** means a normalized model share among the currently scoped candidates. It is not calibrated GeoGuessr accuracy or a real map-sampling probability.

## Candidate posterior

For candidate location `c` and observations `o`, the engine computes:

`P(c | o) ∝ P(c) × P(o | c)`

No reliable sampling prior is present in the local tutorial corpus, so candidates in the active hard scope have a uniform prior. Country list size and the number of recorded subregions do not change it. A one-country scope necessarily has a 100% country result; the region panel independently normalizes `P(region | selected country, observations)`.

The engine derives a report likelihood from each location's estimated feature prevalence `p`: `P(seen | c) = sensitivity*p + (1-specificity)*(1-p)`. Explicitly selecting “not visible in this scene” uses the complementary reporting likelihood. It is not equivalent to leaving the clue unselected. “Uncertain” changes the observation sensitivity and specificity; it does not scale the final percentage. The defaults are centralized in `model-parameters.json`: certain sensitivity/specificity .95/.98, uncertain .68/.78, and shared unknown-feature background .5.

The source text is qualitative, not a measured frequency dataset. Words such as “common”, “sometimes”, and “rare” map to centralized initial estimates (.82, .62, .34, .14); explicit absence maps to .03. These values are estimates with a reason and `measured: false`. The playable curation checks parser-generated extreme values against their actual paragraph context and withholds unreviewed extremes. They are not statistics or legal guarantees. A missing mention uses a **shared background for that clue** across all undocumented candidates, so silence alone never becomes a location-specific exclusion. The generic background is .5; 95 individually reviewed concrete metas use a lower shared background based on a centralized visual-specificity tier. These rarity values are engineering assumptions, not source-measured frequencies.

For reviewed concrete metas, `model-parameters.json` defines the `specific` (.05 / .995), `distinctive` (.001 / .999), `near-unique` (.0001 / .9999), and `identity` (.00001 / .99999) tiers as background prevalence / certain-observation specificity. The source-linked `playable-evidence-profiles.json` assigns tiers to exact visual clue IDs; an uncertain observation keeps the conservative global uncertainty model. Eight directly cited contrast groups additionally use reviewed nonzero exception likelihoods. Driving-side likelihoods from 31 explicitly cited source entries covering 31 country relations use a shared .97/.03 engineering pair for the stated/opposite side; unmentioned places remain unknown. These are not observed road frequencies. The Acadian flag is modeled as a shared Maritime cue rather than a New Brunswick-only flag. Its country likelihood is the marginal of Canadian regions under the uniform regional prior.

The engine sums log likelihoods and normalizes with log-sum-exp. It has no fixed tail mixture, 99% ceiling, lock rule, or score-history state. A posterior can reach displayed 0% or 100%; display rounding does not affect calculation. Top 5 plus Others are aggregated from all scoped candidates and then rounded to one decimal with largest remainder.

## Dependence and combinations

Each selectable feature has stable identity, source facts, and evidence-group IDs. Multiple correlated observations extracted from one source fact are conservatively represented by the strongest single candidate-relative marginal term; this avoids treating wording, glyphs, and a word from the same sign as independent evidence. Different facts can still contribute independently. Repeated examples of the same feature are a single clue ID.

The importer proposes interactions when a source paragraph explicitly combines observations; a manual source review keeps only two whose playable wording matches the combination. The current interaction LR is a centralized `1.6` initial estimate, marked `measured: false`, and is an extra interaction term rather than a replacement for its components. Uncertain interaction reliability uses the least certain required observation. This conservative parser will miss implicit combinations; it does not invent them.

Explicit absence in a local country chapter is modeled as a low estimated prevalence for that location. A player's “not visible in this scene” report is separately handled by the observation model. `supports`, `opposes`, and `explicit-absence` remain traceable claims; absent or unclassified source wording never becomes an automatic exclusion.

## Limitations

The present estimates are deterministic and auditable, but not empirically calibrated. The 489 playable labels have reviewed English and Chinese appearance wording, but the original source excerpts remain Chinese-first. Raw parser output is quarantined from scoring. The curation pass corrected 68 context-sensitive extreme estimates and withheld 21 others; midrange estimates still need broader factual review. Canada and 18 African source chapters now have documented conditional region schemes, alongside Brazil (20 complete schemes total). Six other mentioned sets remain partial and are not normalized as if complete. Several African schemes use broad zones or coverage clusters, so their percentages are model estimates at that granularity, not province-level accuracy. These limits are in [GAPS.md](GAPS.md).

Tests verify the math and UI contracts, not geographic accuracy. The synthetic regression with two equal-prior candidates, six independent likelihood ratios of 1.2 and one 0.001 opposing ratio returns approximately 0.298%; synthetic values are not stored as geographic rules.

The playable library is generated from reviewed phrase mappings and cited source facts. The focused Canada/Africa pass also records 95 explicit comparative opposing estimates from cited tutorial contrasts. A region-specific observation has a conditional region likelihood; its parent-country estimate is marginalized under the stated uniform region prior rather than multiplying the same observation twice. A parser phrase, an image, or a source URL alone never adds a scoring rule. Image count does not affect likelihood.
