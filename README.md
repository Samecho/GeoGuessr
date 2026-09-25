# Street Clues

A bilingual, browser-only visual clue reference for **practice sessions where outside aids are allowed**. The user freely selects observations, adjusts certainty and geographic scope, and sees a country ranking plus an optional conditional region ranking. There is no account, backend, runtime AI, API key, screenshot reader or location lookup.

## Run

Requires Node 22 and npm. Run `npm ci`, then `npm run dev`. The first visit is English; the language switch persists in local storage. Observations and hard scope stay in the current browser session. `Clear clues` keeps language and scope.

| Command | Purpose |
|---|---|
| `npm run dev` | Local Vite server |
| `npm run build` | Typecheck and build static `dist/` |
| `npm run preview` | Inspect the built files locally |
| `npm test` | Deterministic rule-engine tests |
| `npm run test:e2e` | Playwright Chromium UI checks (`npx playwright install chromium` first) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run data:validate` | Data references, translations, flags and public asset checks |
| `npm run data:validate -- --write-report` | Regenerate `docs/DATA_COVERAGE.md` |

## Data and design

- `src/data/countries.ts`: 113 current official road-imagery candidates, including limited-road regions as distinct IDs. The full candidate-by-candidate audit is in [`docs/DATA_COVERAGE.md`](docs/DATA_COVERAGE.md); boundary decisions are in [`docs/COVERAGE.md`](docs/COVERAGE.md).
- `src/data/regions.ts`: mutually exclusive US, Canada and Brazil partitions. A region panel without an active reviewed local rule shows a neutral empty state. India is deliberately a region-data gap while road-car extent and internal partition evidence are checked.
- `src/data/categories.ts`, `clues.ts`, `rules.ts`: bilingual category tree, observations and sourced heuristic conditions. Rules are separate from React and evaluated from scratch. See [`docs/SCORING.md`](docs/SCORING.md).
- `src/data/assets.ts`: approved, attributed local real photos only. Photo credits and separate third-party licenses are in [`docs/ASSETS.md`](docs/ASSETS.md). These images are not relicensed by this project's code license.
- `src/i18n.ts` and each data item's `{ en, zh }`: UI and content translations. Add both languages with every user-facing data change; IDs and score calculation never depend on the display language.

To add a country, first verify official **road-car** coverage and record its source, date and extent in `countries.ts` and `docs/COVERAGE.md`; add a local flag SVG under its stable ID. A candidate listing alone does not constitute a researched clue profile. Add an internal scheme only after checking imagery extent and a non-overlapping partition. Add a clue with a plain visual appearance label, its source and an approved asset ID; multiple photos of one feature stay under one clue ID. For any new photo, document its author, original URL, license, license link, attribution and redistribution basis in `assets.ts`; run the validator and visually check the image. Add a rule with a short evidence-based rationale, source, review date, condition, target, group and weight; add a regression test for strong rules. Source URL syntax validation is not factual review.

## GitHub Pages

The committed workflow validates, builds with `VITE_BASE=/<repository-name>/`, uploads `dist/`, and deploys on a push to `main` or a manual run. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. For a `username.github.io` root site, change the workflow's `VITE_BASE` to `/`. The bundle uses relative asset URLs derived from Vite's base path and requires no production Node server. The first live deployment was verified on 2026-09-25.

## Engineering defaults and present limits

Uniform prior among manually scoped candidates; uncertain evidence coefficient 0.38; correlated rule group subsequent contributions 0.25; optional conservative tail mix 1%; one-decimal largest-remainder display rounding; 300 ms rank motion with reduced-motion support. These are engineering defaults, **not measured GeoGuessr map probabilities**. Country and region inference depth is currently uneven. The precise remaining gaps are in [`docs/GAPS.md`](docs/GAPS.md).
