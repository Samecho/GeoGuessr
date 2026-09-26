#!/usr/bin/env python3
"""Apply paragraph-reviewed Canada/Africa observations to the playable library.

This is an overlay over curate_clues.py's clean output. The source archive stays
read-only. Re-running data:curate starts from the base library, so no duplicate
clues, estimates, photos, or regions accumulate.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/knowledge'


def read(name: str, key: str):
    return json.loads((DATA / name).read_text(encoding='utf-8'))[key]


def write(name: str, key: str, value, version: int = 4):
    (DATA / name).write_text(json.dumps({'schemaVersion': version, key: value}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def unique_append(target: list, value):
    if value not in target:
        target.append(value)


def main():
    locations = [row for row in read('locations.json', 'locations') if ':region:' not in row['id']]
    focused_countries = {config['countryId'] for config in json.loads((ROOT / 'scripts/focused-regions.json').read_text(encoding='utf-8'))['schemes']}
    schemes = [row for row in read('regions.json', 'regionSchemes') if row['countryId'] not in focused_countries]
    clues = read('playable-features.json', 'features')
    estimates = read('playable-estimates.json', 'estimates')
    details = read('playable-clue-info.json', 'clues')
    assets = read('source-photo-assets.json', 'assets')
    facts = read('facts.json', 'facts')
    images = read('images.json', 'images')
    categories = read('categories.json', 'categories')
    category_ids = {child['id'] for category in categories for child in category['children']}
    by_location = {location['id']: location for location in locations}
    by_image = {image['id']: image for image in images}
    by_asset = {asset['id']: asset for asset in assets}
    by_clue = {(clue['categoryId'], clue['appearance']['zh']): clue for clue in clues}
    by_detail = {detail['featureId']: detail for detail in details}
    by_estimate = {(row['featureId'], row['locationId']): row for row in estimates}
    facts_by_chapter = {}
    for fact in facts:
        facts_by_chapter.setdefault(fact['locationId'], []).append(fact)

    scheme_file = json.loads((ROOT / 'scripts/focused-regions.json').read_text(encoding='utf-8'))
    region_by_key = {}
    for config in scheme_file['schemes']:
        country = by_location[config['countryId']]
        regions = []
        for key, en, zh in config['regions']:
            region_id = f"{config['countryId']}:region:{key.replace(':', '-')}"
            if key in region_by_key or region_id in by_location:
                raise ValueError(f'Duplicate focused region: {key}')
            region_by_key[key] = region_id
            record = {
                'id': region_id, 'kind': 'region', 'name': {'en': en, 'zh': zh},
                'parentId': country['id'], 'continentId': country['continentId'],
                'continent': country['continent'], 'candidate': False, 'flagCode': None,
                'knownAttributes': {}, 'unknownAttributes': ['streetViewGeneration', 'roadEnvironment'],
                'source': {**country['source'], 'localCode': key},
            }
            locations.append(record)
            by_location[region_id] = record
            regions.append({'id': region_id, 'name': record['name'], 'coverageSource': country['source']['url']})
        schemes = [scheme for scheme in schemes if scheme['countryId'] != country['id']]
        schemes.append({
            'schemaVersion': 4, 'countryId': country['id'], 'granularity': config['granularity'],
            'regions': regions, 'complete': True,
            'note': {
                'en': 'The documented areas form a nonoverlapping partition. Uniform region prior is an engineering assumption, not a map sampling frequency.',
                'zh': '资料所述区域组成互斥分区。地区均匀先验是工程假设，并非地图抽样频率。',
            },
        })

    counts = Counter()
    photo_count = 0
    for line_no, line in enumerate((ROOT / 'scripts/focused-clues.tsv').read_text(encoding='utf-8').splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        parts = line.split('|')
        if len(parts) != 8:
            raise ValueError(f'focused-clues.tsv:{line_no}: expected eight fields')
        slug, element_prefix, category, zh, en, p_text, region_key, photo_text = parts
        if category not in category_ids or not zh or not en or not element_prefix:
            raise ValueError(f'focused-clues.tsv:{line_no}: invalid category, wording, or source block')
        p_present = float(p_text)
        if not 0 < p_present < 1:
            raise ValueError(f'focused-clues.tsv:{line_no}: invalid prevalence')
        country_id = f'loc:{slug}'
        matches = [fact for fact in facts_by_chapter.get(country_id, []) if fact['source']['elementId'].startswith(element_prefix)]
        if len(matches) != 1:
            raise ValueError(f'focused-clues.tsv:{line_no}: {country_id}/{element_prefix} resolved to {len(matches)} blocks')
        fact = matches[0]
        location_id = region_by_key[region_key] if region_key else country_id
        if region_key and by_location[location_id]['parentId'] != country_id:
            raise ValueError(f'focused-clues.tsv:{line_no}: region belongs to another country')
        counts[slug] += 1
        key = (category, zh)
        clue = by_clue.get(key)
        if clue is None:
            clue_id = 'clue-' + hashlib.sha256((category + '|' + zh).encode()).hexdigest()[:16]
            if any(existing['id'] == clue_id for existing in clues):
                raise ValueError(f'focused-clues.tsv:{line_no}: duplicate clue ID')
            clue = {
                'id': clue_id, 'appearance': {'zh': zh, 'en': en}, 'categoryId': category,
                'evidenceGroupIds': [], 'assetIds': [], 'translationStatus': 'reviewed',
                'sourcePhraseIds': [], 'manualFactIds': [], 'sourceImageIds': [],
            }
            clues.append(clue)
            by_clue[key] = clue
            detail = {'featureId': clue_id, 'sourceNotes': [], 'sourceUrls': [],
                      'relations': {'supports': [], 'opposes': [], 'explicit-absence': []}}
            details.append(detail)
            by_detail[clue_id] = detail
        elif clue['appearance']['en'] != en:
            # Existing reviewed wording has precedence; the local observation is
            # still joined to the same evidence ID.
            pass
        unique_append(clue['evidenceGroupIds'], fact['id'])
        unique_append(clue.setdefault('manualFactIds', []), fact['id'])
        detail = by_detail[clue['id']]
        note = {'section': fact['section'], 'excerpt': fact['excerpt'][:240], 'url': fact['source']['url']}
        if note not in detail['sourceNotes']:
            detail['sourceNotes'].append(note)
        unique_append(detail['sourceUrls'], fact['source']['url'])
        for image_id in fact['imageIds']:
            unique_append(clue['sourceImageIds'], image_id)
        if photo_text:
            photo_parts = photo_text.split(':')
            photo_index = int(photo_parts[0])
            card_crop = photo_parts[1] if len(photo_parts) == 2 else None
            if card_crop not in (None, 'left'):
                raise ValueError(f'focused-clues.tsv:{line_no}: invalid thumbnail crop')
            if photo_index < 0 or photo_index >= len(fact['imageIds']):
                raise ValueError(f'focused-clues.tsv:{line_no}: image index out of range')
            image_id = fact['imageIds'][photo_index]
            unique_append(clue['assetIds'], image_id)
            if image_id not in by_asset:
                image = by_image[image_id]
                asset = {
                    'id': image_id,
                    'path': f"/source-images/{image_id}{'.svg' if image['sourcePath'].lower().endswith('.svg') else '.webp'}",
                    'sourceUrl': image['chapterSourceUrl'], 'sourcePath': image['sourcePath'],
                    'author': 'Tutorial image; owner reports authorization from its author',
                    'license': 'Owner-reported permission for this project',
                    'licenseUrl': image['chapterSourceUrl'], 'attribution': image['chapterSourceUrl'],
                    'redistribution': 'user-directed-test-publication', 'reviewed': '2026-09-25',
                    'status': 'source-reference',
                    **({'cardCrop': card_crop} if card_crop else {}),
                }
                assets.append(asset)
                by_asset[image_id] = asset
            elif card_crop and by_asset[image_id].get('cardCrop') not in (None, card_crop):
                raise ValueError(f'focused-clues.tsv:{line_no}: contradictory card crop')
            if card_crop:
                by_asset[image_id]['cardCrop'] = card_crop
            photo_count += 1

        def add_estimate(target_id: str, probability: float, reason: str):
            estimate_key = (clue['id'], target_id)
            row = by_estimate.get(estimate_key)
            if row is None:
                row = {
                    'featureId': clue['id'], 'locationId': target_id, 'pPresent': probability,
                    'band': 'paragraph-reviewed-qualitative-estimate', 'basis': 'focused-local-paragraph-review-v1',
                    'basisReason': reason, 'status': 'initial-estimate', 'measured': False,
                    'sourceFactId': fact['id'], 'sourceFactIds': [fact['id']], 'claimIds': [],
                }
                estimates.append(row)
                by_estimate[estimate_key] = row
            else:
                unique_append(row.setdefault('sourceFactIds', [row['sourceFactId']]), fact['id'])
                if row['basis'] == 'focused-local-paragraph-review-v1':
                    # Multiple source paragraphs about one place do not add two
                    # independent likelihood terms. Keep the stronger reviewed
                    # prevalence for this exact visual wording.
                    row['pPresent'] = max(row['pPresent'], probability)
                else:
                    row.update({'pPresent': probability, 'band': 'paragraph-reviewed-qualitative-estimate',
                                'basis': 'focused-local-paragraph-review-v1', 'basisReason': reason})
            relation = 'supports' if probability > 0.5 else 'opposes' if probability < 0.5 else None
            if relation:
                unique_append(detail['relations'][relation], target_id)

        rationale = f"Local paragraph {fact['source']['path']}#{fact['source']['elementId']}; qualitative occurrence estimate, not a measured frequency."
        add_estimate(location_id, p_present, rationale)
        if region_key:
            # A provincial marker also supports its parent country. It is a
            # separate conditional ranking, so the same evidence is not counted
            # twice in one candidate's likelihood.
            region_count = len(next(scheme['regions'] for scheme in schemes if scheme['countryId'] == country_id))
            parent_probability = 0.5 + (p_present - 0.5) / region_count
            if (clue['id'], country_id) not in by_estimate:
                add_estimate(country_id, parent_probability, rationale + ' Parent-country occurrence marginalizes one documented region under the uniform regional prior; other regions remain unknown.')

    comparison_count = 0
    for line_no, line in enumerate((ROOT / 'scripts/focused-comparisons.tsv').read_text(encoding='utf-8').splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        parts = line.split('|')
        if len(parts) != 7:
            raise ValueError(f'focused-comparisons.tsv:{line_no}: expected seven fields')
        slug, element_prefix, category, zh, target_spec, p_text, reason = parts
        clue = by_clue.get((category, zh))
        if clue is None:
            raise ValueError(f'focused-comparisons.tsv:{line_no}: unknown exact clue {category}/{zh}')
        matches = [fact for fact in facts_by_chapter.get(f'loc:{slug}', []) if fact['source']['elementId'].startswith(element_prefix)]
        if len(matches) != 1:
            raise ValueError(f'focused-comparisons.tsv:{line_no}: source block resolved to {len(matches)} facts')
        fact = matches[0]
        p_present = float(p_text)
        if not 0 < p_present < 0.5:
            raise ValueError(f'focused-comparisons.tsv:{line_no}: opposition likelihood must be between 0 and 0.5')
        if target_spec.startswith('africa-except:') or target_spec.startswith('africa-mainland-except:'):
            excluded = target_spec.split(':', 1)[1]
            targets = [location['id'] for location in locations if location['continent'] == 'Africa'
                       and location['candidate'] and location['id'] != f'loc:{excluded}'
                       and (not target_spec.startswith('africa-mainland-') or location['id'] not in {
                           'loc:madagascar', 'loc:reunion', 'loc:sao-tome-and-principe'})]
        elif target_spec.startswith('scheme-except:'):
            keep_id = region_by_key[target_spec.split(':', 1)[1]]
            parent_id = by_location[keep_id]['parentId']
            targets = [region['id'] for scheme in schemes if scheme['countryId'] == parent_id
                       for region in scheme['regions'] if region['id'] != keep_id]
        else:
            targets = target_spec.split(',')
        for target_id in targets:
            if target_id not in by_location:
                raise ValueError(f'focused-comparisons.tsv:{line_no}: unknown target {target_id}')
            key = (clue['id'], target_id)
            row = by_estimate.get(key)
            basis_reason = f"Comparative statement in {fact['source']['path']}#{fact['source']['elementId']}: {reason} Qualitative estimate, not measured."
            if row is None:
                row = {'featureId': clue['id'], 'locationId': target_id, 'pPresent': p_present,
                       'band': 'paragraph-reviewed-comparative-estimate', 'basis': 'focused-local-comparison-v1',
                       'basisReason': basis_reason, 'status': 'initial-estimate', 'measured': False,
                       'sourceFactId': fact['id'], 'sourceFactIds': [fact['id']], 'claimIds': []}
                estimates.append(row)
                by_estimate[key] = row
            else:
                row.update({'pPresent': p_present, 'band': 'paragraph-reviewed-comparative-estimate',
                            'basis': 'focused-local-comparison-v1', 'basisReason': basis_reason})
                unique_append(row.setdefault('sourceFactIds', [row['sourceFactId']]), fact['id'])
            comparison_count += 1
            detail = by_detail[clue['id']]
            unique_append(detail['relations']['opposes'], target_id)
        unique_append(clue['evidenceGroupIds'], fact['id'])
        unique_append(clue.setdefault('manualFactIds', []), fact['id'])
        detail = by_detail[clue['id']]
        note = {'section': fact['section'], 'excerpt': fact['excerpt'][:240], 'url': fact['source']['url']}
        if note not in detail['sourceNotes']:
            detail['sourceNotes'].append(note)
        unique_append(detail['sourceUrls'], fact['source']['url'])

    write('locations.json', 'locations', locations, 4)
    write('regions.json', 'regionSchemes', schemes, 4)
    write('playable-features.json', 'features', clues)
    write('playable-estimates.json', 'estimates', estimates)
    write('playable-clue-info.json', 'clues', details)
    write('source-photo-assets.json', 'assets', assets)
    print(json.dumps({'focusedSourceRows': sum(counts.values()), 'byChapter': dict(counts),
                      'playableClues': len(clues), 'playableEstimates': len(estimates),
                      'newPhotoAssignments': photo_count, 'comparativeEstimates': comparison_count, 'completeRegionSchemes': len([s for s in schemes if s['complete']])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
