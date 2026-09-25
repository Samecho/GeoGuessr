#!/usr/bin/env python3
"""Build the playable library from reviewed source phrases.

The large importer remains an audit of the local chapters. This step is deliberately
an allowlist: a bold phrase in prose is not automatically a usable observation.
"""
from __future__ import annotations

import json
import hashlib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/knowledge'


def read(name, key):
    return json.loads((DATA / name).read_text(encoding='utf-8'))[key]


def write(name, key, value):
    (DATA / name).write_text(json.dumps({'schemaVersion': 4, key: value}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def main():
    specs = []
    for line in (ROOT / 'scripts/curated-clues.tsv').read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        category, zh, en, phrases = line.split('|')
        specs.append({'id': 'clue-' + hashlib.sha256((category + '|' + zh).encode()).hexdigest()[:16], 'categoryId': category, 'appearance': {'zh': zh, 'en': en}, 'sourcePhrases': phrases.split(';') if phrases else [zh]})
    raw = read('features.json', 'features')
    photo_review = json.loads((ROOT / 'scripts/photo-review.json').read_text(encoding='utf-8'))
    facts = {x['id']: x for x in read('facts.json', 'facts')}
    estimates = read('estimates.json', 'estimates')
    images = {x['id']: x for x in read('images.json', 'images')}
    by_name = defaultdict(list)
    for feature in raw:
        by_name[feature['appearance']['zh']].append(feature)
    raw_to_curated = {}
    curated, details, photo_assets, missing = [], [], {}, []
    for spec in specs:
        matches = [feature for name in spec['sourcePhrases'] for feature in by_name[name] if feature['categoryId'] == spec['categoryId']]
        # The raw parser sometimes assigns a concise phrase to the surrounding
        # chapter category. Exact phrase matches may be manually reclassified.
        if not matches:
            matches = [feature for name in spec['sourcePhrases'] for feature in by_name[name]]
        if not matches:
            missing.append(f"{spec['categoryId']}:{spec['appearance']['zh']}")
            continue
        fact_ids = list(dict.fromkeys(fid for feature in matches for fid in feature['factIds']))
        image_ids = list(dict.fromkeys(iid for feature in matches for iid in feature['imageIds']))
        # Keep a few adjacent examples on the card. All 5,860 source images are
        # converted separately for private chapter browsing and later review.
        preferred = photo_review['preferredIndex'].get(spec['appearance']['zh'], 0)
        if image_ids and preferred >= len(image_ids):
            raise ValueError(f"Reviewed photo index out of range: {spec['appearance']['zh']}")
        displayed_images = [] if spec['appearance']['zh'] not in photo_review['reviewedPhotoLabels'] or spec['appearance']['zh'] in photo_review['textOnly'] or not image_ids else [image_ids[preferred]]
        for image_id in displayed_images:
            image = images[image_id]
            photo_assets[image_id] = {
                'id': image_id, 'path': f"/source-images/{image_id}{'.svg' if image['sourcePath'].lower().endswith('.svg') else '.webp'}",
                'sourceUrl': image['chapterSourceUrl'], 'sourcePath': image['sourcePath'],
                'author': 'Image author unverified in local archive',
                'license': 'Original image rights unverified; user-directed test publication',
                'licenseUrl': image['chapterSourceUrl'],
                'attribution': image['chapterSourceUrl'],
                'redistribution': 'user-directed-test-publication', 'reviewed': '2026-09-25',
                'status': 'source-reference',
            }
        curated.append({
            'id': spec['id'], 'appearance': spec['appearance'],
            'categoryId': spec['categoryId'], 'evidenceGroupIds': fact_ids,
            'assetIds': displayed_images, 'translationStatus': 'reviewed',
            'sourcePhraseIds': [feature['id'] for feature in matches],
            'sourceImageIds': image_ids,
        })
        for feature in matches:
            if feature['id'] in raw_to_curated and raw_to_curated[feature['id']] != spec['id']:
                raise ValueError(f"Source phrase {feature['id']} mapped to two clues")
            raw_to_curated[feature['id']] = spec['id']
        source_notes = []
        urls = []
        for fact_id in fact_ids:
            fact = facts[fact_id]
            url = fact['source']['url']
            if url not in urls:
                urls.append(url)
            if len(source_notes) < 4:
                source_notes.append({'section': fact['section'], 'excerpt': fact['excerpt'][:220], 'url': url})
        details.append({'featureId': spec['id'], 'sourceNotes': source_notes, 'sourceUrls': urls, 'relations': {'supports': [], 'opposes': [], 'explicit-absence': []}})
    if missing:
        (DATA / 'curation-missing.json').write_text(json.dumps({'schemaVersion': 4, 'missing': missing}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    grouped = defaultdict(list)
    for estimate in estimates:
        clue_id = raw_to_curated.get(estimate['featureId'])
        if clue_id:
            grouped[(clue_id, estimate['locationId'])].append(estimate)
    playable_estimates = []
    for (clue_id, location_id), rows in sorted(grouped.items()):
        # Same local paragraph may contribute several synonyms. Keep each source
        # fact once and use its median prevalence estimate.
        by_fact = defaultdict(list)
        for row in rows:
            for fact_id in row.get('sourceFactIds') or [row['sourceFactId']]:
                by_fact[fact_id].append(row['pPresent'])
        source_values = sorted(sorted(values)[len(values)//2] for values in by_fact.values())
        n = len(source_values)
        p = source_values[n//2] if n % 2 else (source_values[n//2-1] + source_values[n//2]) / 2
        reference = rows[0]
        playable_estimates.append({
            'featureId': clue_id, 'locationId': location_id,
            'pPresent': p, 'band': 'curated-median-source-estimate',
            'basis': 'curated-local-source-v1',
            'basisReason': 'Median of distinct source facts for reviewed visual wording; qualitative prevalence remains an estimate, not a measurement.',
            'status': 'initial-estimate', 'measured': False,
            'sourceFactId': reference['sourceFactId'],
            'sourceFactIds': sorted(by_fact),
            'claimIds': sorted({claim_id for row in rows for claim_id in row.get('claimIds', [])}),
        })
    context_review = json.loads((ROOT / 'scripts/estimate-context-review.json').read_text(encoding='utf-8'))
    reviewed = {(row['zh'], row['locationId']): row for row in context_review['adjustments']}
    names_by_id = {item['id']: item['appearance']['zh'] for item in curated}
    safe_estimates, withheld = [], []
    used_reviews = set()
    for row in playable_estimates:
        if 0.05 < row['pPresent'] < 0.95:
            safe_estimates.append(row)
            continue
        key = (names_by_id[row['featureId']], row['locationId'])
        override = reviewed.get(key)
        if override:
            used_reviews.add(key)
            row.update({'pPresent': override['pPresent'], 'band': 'context-reviewed-qualitative-estimate', 'basis': 'manual-source-context-review-v1', 'basisReason': override['reason']})
            safe_estimates.append(row)
        else:
            withheld.append({'featureId': row['featureId'], 'zh': key[0], 'locationId': row['locationId'], 'sourceFactIds': row['sourceFactIds'], 'reason': 'Automated extreme wording was not established as prevalence of this exact visible feature at this geographic scale.'})
    unused_reviews = set(reviewed) - used_reviews
    if unused_reviews:
        raise ValueError(f'Context review entries did not match a flagged estimate: {sorted(unused_reviews)}')
    playable_estimates = safe_estimates
    write('estimate-context-audit.json', 'withheld', withheld)
    detail_by_id = {item['featureId']: item for item in details}
    claim_by_id = {x['id']: x for x in read('claims.json', 'claims')}
    for row in playable_estimates:
        detail = detail_by_id[row['featureId']]
        for claim_id in row['claimIds']:
            claim = claim_by_id[claim_id]
            places = detail['relations'][claim['relation']]
            if claim['locationId'] not in places:
                places.append(claim['locationId'])

    manual = json.loads((ROOT / 'scripts/manual-fact-clues.json').read_text(encoding='utf-8'))
    for item in manual['clues']:
        fact_ids = list(dict.fromkeys(row['sourceFactId'] for row in item['estimates']))
        if any(fact_id not in facts for fact_id in fact_ids):
            raise ValueError(f"Manual clue {item['id']} has an unknown source fact")
        curated.append({'id': item['id'], 'appearance': item['appearance'], 'categoryId': item['categoryId'], 'evidenceGroupIds': fact_ids, 'assetIds': [], 'translationStatus': 'reviewed', 'sourcePhraseIds': [], 'manualFactIds': fact_ids, 'sourceImageIds': []})
        notes = [{'section': facts[fact_id]['section'], 'excerpt': facts[fact_id]['excerpt'][:220], 'url': facts[fact_id]['source']['url']} for fact_id in fact_ids]
        details.append({'featureId': item['id'], 'sourceNotes': notes[:4], 'sourceUrls': list(dict.fromkeys(note['url'] for note in notes)), 'relations': {'supports': [row['locationId'] for row in item['estimates'] if row['pPresent'] >= 0.5], 'opposes': [row['locationId'] for row in item['estimates'] if row['pPresent'] < 0.5], 'explicit-absence': []}})
        for row in item['estimates']:
            playable_estimates.append({'featureId': item['id'], 'locationId': row['locationId'], 'pPresent': row['pPresent'], 'band': 'manual-source-interpretation', 'basis': 'manual-local-source-v1', 'basisReason': row['reason'], 'status': 'initial-estimate', 'measured': False, 'sourceFactId': row['sourceFactId'], 'sourceFactIds': [row['sourceFactId']], 'claimIds': []})

    playable_interactions = []
    approved_interaction_facts = set(json.loads((ROOT / 'scripts/interaction-review.json').read_text(encoding='utf-8'))['approvedSourceFactIds'])
    for rule in read('interactions.json', 'interactions'):
        mapped = [raw_to_curated.get(fid) for fid in rule['featureIds']]
        if rule['sourceFactId'] in approved_interaction_facts and all(mapped) and len(set(mapped)) > 1:
            playable_interactions.append({**rule, 'featureIds': sorted(set(mapped))})
    write('playable-features.json', 'features', curated)
    write('playable-estimates.json', 'estimates', playable_estimates)
    write('playable-interactions.json', 'interactions', playable_interactions)
    write('playable-clue-info.json', 'clues', details)
    write('source-photo-assets.json', 'assets', list(photo_assets.values()))
    print(json.dumps({'playableClues': len(curated), 'withAdjacentPhotos': sum(bool(x['assetIds']) for x in curated), 'textOnly': sum(not x['assetIds'] for x in curated), 'reviewedCardPhotoFiles': len(photo_assets), 'sourceImageRefsLinked': len(set(iid for x in curated for iid in x['sourceImageIds'])), 'estimates': len(playable_estimates), 'interactions': len(playable_interactions), 'sourceFeaturesQuarantined': len(raw)-len(raw_to_curated), 'curationPhrasesNotFound': len(missing), 'extremeEstimatesWithheld': len(withheld), 'extremeEstimatesReviewed': len(used_reviews)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
