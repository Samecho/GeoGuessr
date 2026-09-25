# Street Clues

A browser-only GeoGuessr practice aid. Pick any visual observation, mark certainty or a clearly absent feature, choose a geographic scope, and inspect country and conditional region match shares. The existing React interface and deterministic likelihood engine are preserved.

## Run

Node.js 22 is required for the site. Rebuilding the local data and image copies also needs Python 3; install its pinned helpers with `python -m pip install -r requirements-data.txt`.

| Command | Purpose |
|---|---|
| `npm ci` | Install locked JavaScript dependencies |
| `npm run dev` | Run the site locally |
| `npm run import:tuxundoc` | Read all chapters under the ignored, unmodified `tuxundoc/` archive |
| `npm run data:curate` | Build the playable bilingual library from reviewed phrases, context corrections and image choices |
| `npm run photos:prepare` | Resize all 5,860 source images into `public/source-images/` without cropping |
| `npm run data:validate` | Check references, bilingual card wording, reviewed photo mapping, and the complete image set |
| `npm run data:report` | Validate and regenerate `docs/DATA_COVERAGE.md` |
| `npm test` | Run inference and data regression tests |
| `npm run test:e2e` | Run Playwright browser checks |
| `npm run typecheck`, `npm run lint`, `npm run build` | Verify and build the static site |
| `npm run preview` | Serve `dist/` locally |

`npm run build` outputs a static `dist/`; a VM can serve that directory through any ordinary static web server. For a VM root URL, build with `VITE_BASE=/`; for a subpath, set `VITE_BASE=/your-path/`. No runtime API, server function, login, key, or database is required.

## Data and provenance

The **only geographic knowledge source** is the local `tuxundoc/index.html` and its 133 linked chapter HTML/metadata files. The original approximately 8 GB archive is ignored by Git and kept unchanged. `scripts/import_tuxundoc.py` creates a traceable raw extraction (`locations.json`, `facts.json`, `claims.json`, `features.json`, `estimates.json`, `images.json`, `interactions.json`, `regions.json`, `import-progress.json`). An emphasized phrase in prose is only a candidate, not automatically a user-ready observation.

`scripts/curated-clues.tsv` holds reviewed Chinese and English appearance labels and exact source-phrase mappings. `scripts/manual-fact-clues.json`, `scripts/estimate-context-review.json`, `scripts/interaction-review.json`, and `scripts/photo-review.json` record special fact interpretations, corrected source context, accepted combinations and visually checked card images. `npm run data:curate` generates `playable-*.json` and `source-photo-assets.json`. **Only those playable files drive the UI and scoring**; the larger raw extraction stays available for audit and later review. Unknown source mentions do not become negative evidence. Every active estimate points to a local source fact and is marked as estimated rather than measured.

Current checked output: 133 candidates including Antarctica; 220 selectable bilingual clues (121 with visually reviewed source images, 99 text-only), 598 active country/region estimates, two accepted source combinations, and a separate chapter browser for all 5,860 images. The source images are web-sized copies totaling about 351 MB. The original full-resolution archive is never committed. See [coverage](docs/DATA_COVERAGE.md), [scoring](docs/SCORING.md), [image sources](docs/ASSETS.md), and [open work](docs/GAPS.md).

To add a clue, verify the actual visual wording in its chapter, add an exact phrase mapping and bilingual label to `scripts/curated-clues.tsv`, then run `data:curate`. If no parser phrase captures it, cite the relevant fact IDs in `manual-fact-clues.json`. For a photo card, inspect the source image and record the label and chosen instance in `photo-review.json`. To add a location or region, update the source chapter and importer mapping, then verify a complete non-overlapping region scheme before enabling regional percentages. Do not infer an absent feature from a chapter's silence.

## Publishing

`.github/workflows/pages.yml` validates, builds with `/<repository>/` as Vite's base, and deploys the entire `dist/` including all 5,860 web-sized source images to GitHub Pages. In GitHub, set **Settings → Pages → Source** to **GitHub Actions**. The Pages site is publicly reachable during testing; changing the personal repository to private does not itself make its Pages site private. The same static build can later be deployed to a VM by the project owner.

The original tutorial image author and redistribution rights are not established by the local metadata. Publication here is at the project owner's explicit direction for testing; the project does not claim a third-party license. The code's MIT license does **not** cover source images, flag SVGs or fonts. Image IDs, local source paths and Yuque chapter URLs are recorded in `images.json` and `source-photo-assets.json`; see [ASSETS.md](docs/ASSETS.md).
