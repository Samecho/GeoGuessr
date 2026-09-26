#!/usr/bin/env python3
"""Summarize the reviewed Canada/Africa slice without treating raw extraction as curation."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/knowledge'


def read(name, key):
    return json.loads((DATA / name).read_text(encoding='utf-8'))[key]


locations = read('locations.json', 'locations')
facts = read('facts.json', 'facts')
images = read('images.json', 'images')
clues = read('playable-features.json', 'features')
estimates = read('playable-estimates.json', 'estimates')
schemes = read('regions.json', 'regionSchemes')
fact_counts = Counter(row['locationId'] for row in facts)
image_counts = Counter(row['chapterId'] for row in images)
focused_counts = Counter()
for line in (ROOT / 'scripts/focused-clues.tsv').read_text(encoding='utf-8').splitlines():
    if line and not line.startswith('#'):
        focused_counts[line.split('|', 1)[0]] += 1

rows = []
for country in locations:
    if not country['candidate'] or (country['continent'] != 'Africa' and country['id'] != 'loc:canada'):
        continue
    country_id = country['id']
    scheme = next(row for row in schemes if row['countryId'] == country_id)
    related = {country_id, *(region['id'] for region in scheme['regions'])}
    applicable = [row for row in estimates if row['locationId'] in related]
    relevant_ids = {row['featureId'] for row in applicable}
    relevant = [clue for clue in clues if clue['id'] in relevant_ids]
    illustrated = sum(bool(clue['assetIds']) for clue in relevant)
    rows.append(f"| {country['name']['en']} | {fact_counts[country_id]} | {image_counts[country_id]} | "
                f"{focused_counts[country_id.removeprefix('loc:')]} | {len(relevant)} | {illustrated} | "
                f"{len(relevant)-illustrated} | {len(applicable)} | {len(scheme['regions'])} |")

report = '''# Canada and Africa focused review

Updated 2026-09-25. Counts below are generated from the current playable data and the paragraph review table. A source block or image counted here is **not** necessarily a usable visual clue. “Active clues” counts any clue with a country or regional likelihood for that place, including shared clues from other chapters. “Focused rows” counts source-backed review decisions; repeated wording can map to one stable clue ID.

The supplied local index defines the requested candidate scope. This table covers every one of its 18 African chapters plus Canada. It reports content depth within that scope, not a broader sovereign-state inventory.

| Chapter | Source blocks | Source images | Focused rows | Active clues | Illustrated | Text | Estimates | Conditional regions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
''' + '\n'.join(rows) + '''

## Outstanding review

- The tutorial is qualitative; all prevalence numbers are initial estimates and are marked `measured: false`.
- All 18 African chapters in the supplied documentation are represented. Further work concerns clue depth, photo matching and estimate calibration within the requested scope.
- Image shortage varies by chapter. Some nearby source images are maps, answer labels, repeated examples, or do not visibly show the chosen feature. Text cards remain selectable and scored.
- Tanzania, Egypt and Réunion have fewer usable illustrated observations than the larger chapters. Their geography is especially limited to the source's documented coverage.
- Region schemes use provinces where supported (Canada, South Africa) and broad zones or documented coverage clusters elsewhere. Their uniform within-country prior is an engineering assumption.
- Source excerpts in Info remain Chinese-first even where the appearance labels are bilingual.
- Re-running `npm run data:curate` rebuilds the focused slice from stable source IDs without duplicate clues. This report can be regenerated with `npm run data:focus-report`.
'''
(ROOT / 'docs/FOCUSED_REVIEW.md').write_text(report, encoding='utf-8')
print(f'Wrote docs/FOCUSED_REVIEW.md for {len(rows)} chapters')
