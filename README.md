# Street Clues

A browser-only visual clue library for GeoGuessr practice. Pick any visible clue, set confidence or explicit absence, and inspect the live country ranking. Selecting one country reveals its conditional region distribution. The interface, language switch, hard scope selector, clue tree, and charts remain the existing application; the knowledge data and inference model now load from versioned JSON.

## Run and verify

Requires Node.js 22 and npm.

| Command | Purpose |
|---|---|
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start local development |
| `npm run build` | Typecheck and build static `dist/` |
| `npm run preview` | Preview the built site locally |
| `npm test` | Run deterministic inference tests |
| `npm run test:e2e` | Run Playwright UI checks (`npx playwright install chromium` first) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript |
| `npm run data:validate` | Validate IDs, references, estimates, photos, and local archive paths when present |
| `npm run data:report` | Validate and regenerate the per-chapter coverage report |
| `npm run import:tuxundoc` | Re-import all linked local chapters (read-only source) |

## Data layout

`src/data/knowledge/` is the versioned knowledge base. It is split into `locations.json`, `categories.json`, `features.json`, the compact `runtime-features.json`, `facts.json`, `claims.json`, `estimates.json`, `images.json`, `interactions.json`, `regions.json`, `import-progress.json`, `model-parameters.json`, `photo-curation.json`, and the compact `clue-info.json`. Each file has a schema version and stable IDs. The app loads compact inference records up front; `clue-info.json` is fetched only when a user opens a clue info panel. Full source facts, claims and image references remain available for audit but do not enter the first-load JavaScript. The pure engine is in `src/engine/scoring.ts`.

The sole geographic source for this import is the local `tuxundoc/index.html` chapter index and its linked chapter HTML/metadata. The original `tuxundoc/` directory is ignored by Git, read-only to the importer, and excluded from deployment. Every fact traces to a local path, section ID, source element or ordinal, and content hash. The generated [coverage report](docs/DATA_COVERAGE.md) lists all default candidates and each processed chapter. Import accounting is not a manual factual review.

The source currently yields 133 default candidate locations, including Antarctica; a user's selected scope is the only candidate filter. It also yields 5,562 deduplicated clue records, 8,466 source text facts, 8,602 parsed claims, 5,102 probability estimates, and 28 interaction estimates. There are 23 illustrated clue records using 24 separately licensed photo files and 5,539 text-only records. The 5,860 embedded tutorial-image references remain private because image-level redistribution rights could not be established. See [coverage](docs/DATA_COVERAGE.md), [scoring](docs/SCORING.md), [assets](docs/ASSETS.md), and [remaining review work](docs/GAPS.md).

## Update knowledge

1. Keep the original `tuxundoc/` archive unchanged.
2. Run `npm run import:tuxundoc`; it reads each linked chapter's HTML and metadata, records image paths without copying image bytes, and replaces the generated JSON deterministically.
3. Review `import-progress.json`, source links and excerpts. Unknown mentions stay unknown; they do not create absence estimates.
4. Edit `photo-curation.json` only for independently redistributable assets with complete attribution, license, source path and a visual match. A photo's capture location is not a geographic claim.
5. Run `npm run data:validate`, `npm run data:report`, `npm test`, typecheck, lint, Playwright, and build.

The qualitative word bands in `model-parameters.json` are centralized initial probability estimates, not measured prevalence. For newly reviewed data, separate the source fact/relationship from numerical estimates and give each estimate a reason. A valid source URL alone does not establish that a conclusion is correct. See [the scoring model and limits](docs/SCORING.md).

## GitHub Pages

`.github/workflows/pages.yml` validates and builds with the repository subpath as Vite's base, then deploys through GitHub Pages when pushed to `main`. Set **Settings → Pages → Source** to **GitHub Actions**. For a root `username.github.io` repository, use `/` as the base instead. The workflow is a deployment configuration; it does not prove a deploy succeeded. Check the latest Actions run and site URL after pushing.

Third-party photo and font licenses are separate from any license applied to project code. No production server, backend, API key, user account, screenshot upload, OCR, or location lookup is used.
