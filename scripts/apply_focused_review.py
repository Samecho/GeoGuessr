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
    # A chapter paragraph can describe several independently visible parts.
    # Expand reviewed scene descriptions into atomic cards while preserving the
    # original source fact as a shared evidence group.
    scene_file = json.loads((ROOT / 'scripts/focused-observation-decompositions.json').read_text(encoding='utf-8'))
    scenes = {(row['slug'], row['elementPrefix'], row['categoryId'], row['originalZh']): row for row in scene_file['entries']}
    if len(scenes) != len(scene_file['entries']):
        raise ValueError('Duplicate scene decomposition')
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
    tiers = json.loads((DATA / 'model-parameters.json').read_text(encoding='utf-8'))['parameters']['visualSpecificityTiers']
    category_ids = {child['id'] for category in categories for child in category['children']}
    by_location = {location['id']: location for location in locations}
    by_image = {image['id']: image for image in images}
    by_asset = {asset['id']: asset for asset in assets}
    by_clue = {(clue['categoryId'], clue['appearance']['zh']): clue for clue in clues}
    fact_by_id = {fact['id']: fact for fact in facts}
    raw_feature_by_id = {feature['id']: feature for feature in read('features.json', 'features')}
    for review in json.loads((ROOT / 'scripts/source-fact-corrections.json').read_text(encoding='utf-8'))['corrections']:
        clue = by_clue.get((review['categoryId'], review['appearanceZh']))
        if clue is None or not review.get('reason'):
            raise ValueError(f"Invalid exact-token review: {review['appearanceZh']}")
        kept = set(review['keepFactIds'])
        rejected = set(review['rejectFactIds'])
        if not kept or kept & rejected or set(clue['evidenceGroupIds']) != kept | rejected:
            raise ValueError(f"Exact-token source facts changed: {review['appearanceZh']}")
        clue['evidenceGroupIds'] = [fact_id for fact_id in clue['evidenceGroupIds'] if fact_id in kept]
        clue['manualFactIds'] = [fact_id for fact_id in clue.get('manualFactIds', []) if fact_id in kept]
        clue['sourcePhraseIds'] = [feature_id for feature_id in clue['sourcePhraseIds']
                                    if any(fact_id in kept for fact_id in raw_feature_by_id[feature_id]['factIds'])]
        kept_images = {image_id for fact_id in kept for image_id in fact_by_id[fact_id]['imageIds']}
        clue['sourceImageIds'] = [image_id for image_id in clue['sourceImageIds'] if image_id in kept_images]
        clue['assetIds'] = [image_id for image_id in clue['assetIds'] if image_id in kept_images]
        detail = next(row for row in details if row['featureId'] == clue['id'])
        valid_notes = {(fact_by_id[fact_id]['section'], fact_by_id[fact_id]['excerpt'][:220],
                        fact_by_id[fact_id]['source']['url']) for fact_id in kept}
        detail['sourceNotes'] = [note for note in detail['sourceNotes']
                                 if (note['section'], note['excerpt'], note['url']) in valid_notes]
        detail['sourceUrls'] = list(dict.fromkeys(fact_by_id[fact_id]['source']['url']
                                                  for fact_id in clue['evidenceGroupIds']))
        retained = []
        for row in estimates:
            if row['featureId'] != clue['id']:
                retained.append(row)
                continue
            row_facts = [fact_id for fact_id in row.get('sourceFactIds', [row['sourceFactId']]) if fact_id in kept]
            if row_facts:
                row['sourceFactIds'] = row_facts
                row['sourceFactId'] = row_facts[0]
                retained.append(row)
        estimates = retained
        retained_places = {row['locationId'] for row in estimates if row['featureId'] == clue['id']}
        for relation in detail['relations']:
            detail['relations'][relation] = [location_id for location_id in detail['relations'][relation]
                                             if location_id in retained_places]
    aliases = json.loads((ROOT / 'scripts/focused-clue-aliases.json').read_text(encoding='utf-8'))['aliases']
    alias_by_focused = {(alias['categoryId'], alias['focusedZh']): alias for alias in aliases}
    if len(alias_by_focused) != len(aliases):
        raise ValueError('Duplicate focused clue alias')
    for detail in details:
        detail['relations'].setdefault('inferred-parent', [])
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
    expanded_lines = []
    original_review_rows = 0
    used_scenes = set()
    for line_no, line in enumerate((ROOT / 'scripts/focused-clues.tsv').read_text(encoding='utf-8').splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        original_review_rows += 1
        parts = line.split('|')
        if len(parts) != 8:
            raise ValueError(f'focused-clues.tsv:{line_no}: expected eight fields')
        slug, element_prefix, category, zh, _, p_text, region_key, photo_text = parts
        scene = scenes.get((slug, element_prefix, category, zh))
        if scene is None:
            expanded_lines.append((line_no, line))
            continue
        if scene['originalZh'] != zh or scene['categoryId'] != category or len(scene['components']) < 2:
            raise ValueError(f'Changed reviewed scene: {slug}/{element_prefix}')
        component_keys = [(part['categoryId'], part['zh']) for part in scene['components']]
        photo_uses = sum(bool(part.get('usePhoto')) for part in scene['components'])
        if (len(set(component_keys)) != len(component_keys) or photo_uses > 1 or
                (photo_text and photo_uses != 1) or
                any(part['categoryId'] not in category_ids or not part['zh'] or not part['en'] or
                    not 0 < float(part.get('pPresent', p_text)) < 1 for part in scene['components'])):
            raise ValueError(f'Invalid reviewed scene components: {slug}/{element_prefix}')
        used_scenes.add((slug, element_prefix, category, zh))
        for component in scene['components']:
            expanded_lines.append((line_no, '|'.join((slug, element_prefix, component['categoryId'],
                component['zh'], component['en'], str(component.get('pPresent', p_text)), region_key,
                photo_text if component.get('usePhoto', False) else ''))))
    if used_scenes != set(scenes):
        raise ValueError(f'Unmatched scene decompositions: {set(scenes) - used_scenes}')
    for line_no, line in expanded_lines:
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
        alias = alias_by_focused.get(key)
        if alias:
            clue = by_clue.get((category, alias['canonicalZh']))
            if clue is None or (key in by_clue and by_clue[key] is not clue):
                raise ValueError(f'focused-clues.tsv:{line_no}: invalid alias {zh}')
            clue['appearance'] = alias['appearance']
            by_clue[key] = clue
            by_clue[(category, alias['appearance']['zh'])] = clue
        else:
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
                      'relations': {'supports': [], 'opposes': [], 'explicit-absence': [], 'inferred-parent': []}}
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

        def add_estimate(target_id: str, probability: float, reason: str, source_relation: str = 'supports'):
            estimate_key = (clue['id'], target_id)
            row = by_estimate.get(estimate_key)
            if row is None:
                row = {
                    'featureId': clue['id'], 'locationId': target_id, 'pPresent': probability,
                    'band': 'paragraph-reviewed-qualitative-estimate', 'basis': 'focused-local-paragraph-review-v1',
                    'basisReason': reason, 'status': 'initial-estimate', 'measured': False,
                    'sourceFactId': fact['id'], 'sourceFactIds': [fact['id']], 'claimIds': [],
                    'sourceRelation': source_relation,
                }
                estimates.append(row)
                by_estimate[estimate_key] = row
            else:
                unique_append(row.setdefault('sourceFactIds', [row['sourceFactId']]), fact['id'])
                row['sourceRelation'] = source_relation
                if row['basis'] == 'focused-local-paragraph-review-v1':
                    # Multiple source paragraphs about one place do not add two
                    # independent likelihood terms. Keep the stronger reviewed
                    # prevalence for this exact visual wording.
                    row['pPresent'] = max(row['pPresent'], probability)
                else:
                    row.update({'pPresent': probability, 'band': 'paragraph-reviewed-qualitative-estimate',
                                'basis': 'focused-local-paragraph-review-v1', 'basisReason': reason})
            # Keep a direct paragraph mention and its inferred parent separate,
            # regardless of whether the occurrence estimate is below 50%.
            unique_append(detail['relations'][source_relation], target_id)

        rationale = f"Local paragraph {fact['source']['path']}#{fact['source']['elementId']}; qualitative occurrence estimate, not a measured frequency."
        add_estimate(location_id, p_present, rationale)
        if region_key:
            # A provincial marker also supports its parent country. It is a
            # separate conditional ranking, so the same evidence is not counted
            # twice in one candidate's likelihood.
            region_count = len(next(scheme['regions'] for scheme in schemes if scheme['countryId'] == country_id))
            parent_probability = 0.5 + (p_present - 0.5) / region_count
            if (clue['id'], country_id) not in by_estimate:
                add_estimate(country_id, parent_probability, rationale + ' Parent-country occurrence marginalizes one documented region under the uniform regional prior; other regions remain unknown.', 'inferred-parent')

    # Some older generic cards also combine separately observable attributes.
    # Keep their source facts and image on the resulting atoms; remove only the
    # overlapping selectable card. Shared facts still form one evidence group.
    base_scenes = [
        (('terrain', '沙丘'), [('soil', '沙质土壤'), ('terrain', '丘陵')]),
        (('terrain', '高大陡峭的山'), [('terrain', '高山'), ('terrain', '陡坡')]),
        (('terrain', '雪山'), [('terrain', '高山'), ('terrain', '积雪')]),
    ]
    for source_key, target_keys in base_scenes:
        source_clue = by_clue.pop(source_key, None)
        if source_clue is None or any(key not in by_clue for key in target_keys):
            raise ValueError(f'Changed reviewed base scene: {source_key}')
        target_clues = [by_clue[key] for key in target_keys]
        source_detail = by_detail.pop(source_clue['id'])
        for target in target_clues:
            target_detail = by_detail[target['id']]
            for fact_id in source_clue['evidenceGroupIds']:
                unique_append(target['evidenceGroupIds'], fact_id)
                unique_append(target.setdefault('manualFactIds', []), fact_id)
            for image_id in source_clue['sourceImageIds']:
                unique_append(target['sourceImageIds'], image_id)
            for note in source_detail['sourceNotes']:
                if note not in target_detail['sourceNotes']:
                    target_detail['sourceNotes'].append(note)
            for url in source_detail['sourceUrls']:
                unique_append(target_detail['sourceUrls'], url)
            for relation, places in source_detail['relations'].items():
                for place in places:
                    unique_append(target_detail['relations'].setdefault(relation, []), place)
        for image_id in source_clue['assetIds']:
            unique_append(target_clues[0]['assetIds'], image_id)
        for row in list(estimates):
            if row['featureId'] != source_clue['id']:
                continue
            estimates.remove(row)
            del by_estimate[(source_clue['id'], row['locationId'])]
            for target in target_clues:
                key = (target['id'], row['locationId'])
                previous = by_estimate.get(key)
                if previous is None:
                    transferred = {**row, 'featureId': target['id'],
                                   'basis': 'decomposed-scene-source-v1',
                                   'basisReason': 'The source scene entails this visible component. Its qualitative occurrence estimate is a conservative component lower bound, not a measured frequency.'}
                    estimates.append(transferred)
                    by_estimate[key] = transferred
                else:
                    previous['pPresent'] = max(previous['pPresent'], row['pPresent'])
                    for fact_id in row.get('sourceFactIds', [row['sourceFactId']]):
                        unique_append(previous.setdefault('sourceFactIds', [previous['sourceFactId']]), fact_id)
        clues.remove(source_clue)
        details.remove(source_detail)

    # Joint terms are optional extras only where a reviewed local paragraph or
    # image identifies the combination. Components from the same paragraph are
    # already grouped by the engine, so these terms add only the extra pattern.
    interactions = read('playable-interactions.json', 'interactions')
    for scene in scene_file['entries']:
        joint = scene.get('interaction')
        if joint is None:
            continue
        key = (scene['slug'], scene['elementPrefix'], scene['categoryId'], scene['originalZh'])
        if key not in used_scenes or not 1 < joint['likelihoodRatio'] < 10 or not joint.get('reason'):
            raise ValueError(f'Invalid reviewed scene interaction: {key}')
        country_id = f"loc:{scene['slug']}"
        fact_matches = [fact for fact in facts_by_chapter[country_id]
                        if fact['source']['elementId'].startswith(scene['elementPrefix'])]
        if len(fact_matches) != 1:
            raise ValueError(f'Changed interaction source: {key}')
        feature_ids = sorted({by_clue[(part['categoryId'], part['zh'])]['id'] for part in scene['components']})
        if len(feature_ids) < 2:
            raise ValueError(f'Interaction has fewer than two observations: {key}')
        original = next(line.split('|') for line in (ROOT / 'scripts/focused-clues.tsv').read_text(encoding='utf-8').splitlines()
                        if line.startswith(scene['slug'] + '|' + scene['elementPrefix'] + '|')
                        and line.split('|')[2:4] == [scene['categoryId'], scene['originalZh']])
        target_id = region_by_key[original[6]] if original[6] else country_id
        targets = [(target_id, joint['likelihoodRatio'])]
        if target_id != country_id:
            region_count = len(next(scheme['regions'] for scheme in schemes if scheme['countryId'] == country_id))
            targets.append((country_id, 1 + (joint['likelihoodRatio'] - 1) / region_count))
        for location_id, lr in targets:
            interactions.append({
                'id': 'interaction-' + hashlib.sha256((str(key) + location_id).encode()).hexdigest()[:16],
                'featureIds': feature_ids, 'locationId': location_id, 'relation': 'interaction',
                'likelihoodRatio': lr, 'certaintyMode': 'minimum', 'condition': 'all-seen',
                'sourceFactId': fact_matches[0]['id'], 'rationale': joint['reason'], 'measured': False,
            })

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
            row['sourceRelation'] = 'opposes'
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

    driving_review = json.loads((ROOT / 'scripts/verified-driving-side.json').read_text(encoding='utf-8'))
    left_p = driving_review['likelihoodForStatedSide']
    right_p = driving_review['likelihoodForOppositeSide']
    if not (0 < right_p < 0.5 < left_p < 1):
        raise ValueError('Invalid reviewed driving-side likelihoods')
    seen_driving_places = set()
    for review in driving_review['entries']:
        target_id, stated_side, fact_id = review['locationId'], review['side'], review['sourceFactId']
        if target_id not in by_location or target_id in seen_driving_places or stated_side not in ('left', 'right') or fact_id not in fact_by_id:
            raise ValueError(f'Invalid reviewed driving-side entry: {target_id}')
        seen_driving_places.add(target_id)
        fact = fact_by_id[fact_id]
        for side, appearance in [('left', '左侧通行'), ('right', '右侧通行')]:
            clue = by_clue[('driving', appearance)]
            probability = left_p if side == stated_side else right_p
            key = (clue['id'], target_id)
            reason = (f"Explicit driving-side statement in {fact['source']['path']}#{fact['source']['elementId']}; "
                      'opposite side is a nonzero engineering exception estimate for the same road, not a measured frequency.')
            row = by_estimate.get(key)
            if row is None:
                row = {'featureId': clue['id'], 'locationId': target_id, 'claimIds': []}
                estimates.append(row)
                by_estimate[key] = row
            row.update({'pPresent': probability, 'sourceRelation': 'supports' if side == stated_side else 'opposes',
                        'band': 'explicit-driving-side-qualitative-estimate',
                        'basis': 'reviewed-driving-side-v1', 'basisReason': reason,
                        'status': 'initial-estimate', 'measured': False,
                        'sourceFactId': fact_id, 'sourceFactIds': [fact_id]})
            unique_append(clue['evidenceGroupIds'], fact_id)
            unique_append(clue.setdefault('manualFactIds', []), fact_id)
            detail = by_detail[clue['id']]
            note = {'section': fact['section'], 'excerpt': fact['excerpt'][:240], 'url': fact['source']['url']}
            if note not in detail['sourceNotes']:
                detail['sourceNotes'].append(note)
            unique_append(detail['sourceUrls'], fact['source']['url'])
            for relation in detail['relations']:
                detail['relations'][relation] = [place for place in detail['relations'][relation] if place != target_id]
            unique_append(detail['relations']['supports' if side == stated_side else 'opposes'], target_id)

    profiles = []
    for spec in json.loads((ROOT / 'scripts/focused-evidence-profiles.json').read_text(encoding='utf-8'))['profiles']:
        clue = by_clue.get((spec['categoryId'], spec['appearanceZh']))
        country_id = f"loc:{spec['sourceCountry']}"
        matches = [fact for fact in facts_by_chapter.get(country_id, [])
                   if (fact['source']['elementId'] or '').startswith(spec['sourceElementPrefix'])]
        if clue is None or len(matches) != 1 or country_id not in focused_countries:
            raise ValueError(f"Invalid evidence profile: {spec['appearanceZh']}")
        fact = matches[0]
        tier = tiers[spec['tier']]
        background = tier['unknownPrevalence']
        specificity = tier['certainSpecificity']
        if not (0 < background < 1 and 0 < specificity < 1):
            raise ValueError(f"Invalid evidence profile probabilities: {spec['appearanceZh']}")
        scheme = next(row for row in schemes if row['countryId'] == country_id)
        region_values = {}
        for key, prevalence in spec['regionLikelihoods'].items():
            region_id = region_by_key.get(key)
            if region_id is None or region_id not in {region['id'] for region in scheme['regions']} or not 0 < prevalence < 1:
                raise ValueError(f"Invalid evidence profile region: {key}")
            region_values[region_id] = prevalence
            estimate_key = (clue['id'], region_id)
            row = by_estimate.get(estimate_key)
            if row is None:
                row = {'featureId': clue['id'], 'locationId': region_id, 'status': 'initial-estimate',
                       'measured': False, 'sourceFactId': fact['id'], 'sourceFactIds': [fact['id']], 'claimIds': []}
                estimates.append(row)
                by_estimate[estimate_key] = row
            row.update({'pPresent': prevalence, 'band': 'distinctive-identity-qualitative-estimate',
                        'basis': 'focused-identity-profile-v1', 'basisReason': spec['reason']})
            unique_append(row.setdefault('sourceFactIds', [row['sourceFactId']]), fact['id'])
            unique_append(by_detail[clue['id']]['relations']['supports'], region_id)
        # Marginalize over the same uniform region prior used by the conditional
        # chart. Undocumented regions take this clue's shared rare background.
        country_prevalence = sum(region_values.get(region['id'], background) for region in scheme['regions']) / len(scheme['regions'])
        country_row = by_estimate[(clue['id'], country_id)]
        country_row.update({'pPresent': country_prevalence, 'band': 'marginalized-identity-estimate',
                            'basis': 'focused-hierarchical-profile-v1', 'basisReason': spec['reason']})
        profiles.append({'featureId': clue['id'], 'tier': spec['tier'], 'unknownPrevalence': background,
                         'certainSpecificity': specificity, 'formalName': spec['formalName'],
                         'sourceFactId': fact['id'], 'basisReason': spec['reason'], 'measured': False})

    profiled_ids = {profile['featureId'] for profile in profiles}
    for spec in json.loads((ROOT / 'scripts/visual-specificity-review.json').read_text(encoding='utf-8'))['entries']:
        clue = by_clue.get((spec['categoryId'], spec['appearanceZh']))
        if clue is None or clue['id'] in profiled_ids or spec['tier'] not in tiers:
            raise ValueError(f"Invalid visual specificity review: {spec['appearanceZh']}")
        fact_id = (clue.get('manualFactIds') or clue['evidenceGroupIds'])[0]
        if fact_id not in {fact['id'] for fact in facts}:
            raise ValueError(f"Visual specificity review without source fact: {spec['appearanceZh']}")
        tier = tiers[spec['tier']]
        background = tier['unknownPrevalence']
        rationale = (f"Reviewed visible wording and local source fact {fact_id}. "
                     f"{tier['interpretation']} This shared background and recognition rate are estimates, not measured geographic frequencies.")
        if 'oppositionPrevalence' in spec:
            opposition = spec['oppositionPrevalence']
            if not (0 < opposition < 0.5) or not spec.get('oppositionReason'):
                raise ValueError(f"Invalid reviewed opposition: {spec['appearanceZh']}")
            comparison_rows = [row for row in estimates if row['featureId'] == clue['id']
                               and row['basis'] == 'focused-local-comparison-v1']
            if not comparison_rows:
                raise ValueError(f"Reviewed opposition without comparison: {spec['appearanceZh']}")
            for row in comparison_rows:
                row['pPresent'] = opposition
                row['band'] = 'specificity-reviewed-comparative-estimate'
                row['basisReason'] += ' ' + spec['oppositionReason'] + ' Exception prevalence is estimated, not measured.'
        for scheme in schemes:
            if not scheme['complete']:
                continue
            region_values = {region['id']: by_estimate[(clue['id'], region['id'])]['pPresent']
                             for region in scheme['regions'] if (clue['id'], region['id']) in by_estimate}
            if not region_values:
                continue
            key = (clue['id'], scheme['countryId'])
            parent = by_estimate.get(key)
            if parent is not None and 'Parent-country occurrence marginalizes' not in parent['basisReason']:
                continue  # A separately cited country-wide observation takes precedence.
            prevalence = sum(region_values.get(region['id'], background) for region in scheme['regions']) / len(scheme['regions'])
            if parent is None:
                source_row = by_estimate[(clue['id'], next(iter(region_values)))]
                parent = {'featureId': clue['id'], 'locationId': scheme['countryId'],
                          'status': 'initial-estimate', 'measured': False,
                          'sourceFactId': source_row['sourceFactId'], 'sourceFactIds': source_row.get('sourceFactIds', [source_row['sourceFactId']]),
                          'claimIds': []}
                estimates.append(parent)
                by_estimate[key] = parent
            parent.update({'pPresent': prevalence, 'band': 'marginalized-specific-visual-estimate',
                           'basis': 'focused-specificity-region-marginal-v1', 'basisReason': rationale})
        profiles.append({'featureId': clue['id'], 'tier': spec['tier'], 'unknownPrevalence': background,
                         'certainSpecificity': tier['certainSpecificity'], 'formalName': clue['appearance'],
                         'sourceFactId': fact_id, 'basisReason': rationale, 'measured': False})
        profiled_ids.add(clue['id'])

    # Provincial plate requirements are source-backed policy facts, but seeing
    # one particular vehicle is a noisy proxy. Keep the two vehicle observations
    # separate and marginalize region estimates under the same uniform prior.
    for review in json.loads((ROOT / 'scripts/reviewed-regional-plate-policy.json').read_text(encoding='utf-8'))['reviews']:
        country_id = review['countryId']
        clue = next((item for item in clues if item['id'] == review['featureId']), None)
        scheme = next((item for item in schemes if item['countryId'] == country_id), None)
        if clue is None or scheme is None or not scheme['complete'] or not review.get('reason'):
            raise ValueError(f'Invalid regional plate policy review: {review["featureId"]}')
        source_ids = [review['mapSourceFactId'], review['exceptionSourceFactId']]
        if len(set(source_ids)) != 2:
            raise ValueError(f'Duplicate regional plate policy sources: {review["featureId"]}')
        if any(fact_id not in fact_by_id or fact_by_id[fact_id]['locationId'] != country_id for fact_id in source_ids):
            raise ValueError(f'Regional plate policy sources changed: {review["featureId"]}')
        region_ids = {region['id'] for region in scheme['regions']}
        values = {region_by_key[key]: value for key, value in review['regionLikelihoods'].items()}
        if set(values) != region_ids or any(not 0 < value < 1 for value in values.values()):
            raise ValueError(f'Regional plate policy partition incomplete: {review["featureId"]}')
        detail = by_detail[clue['id']]
        detail['relations'].setdefault('inferred-condition', [])
        for fact_id in source_ids:
            fact = fact_by_id[fact_id]
            unique_append(clue['evidenceGroupIds'], fact_id)
            unique_append(clue.setdefault('manualFactIds', []), fact_id)
            note = {'section': fact['section'], 'excerpt': fact['excerpt'][:240], 'url': fact['source']['url']}
            if note not in detail['sourceNotes']:
                detail['sourceNotes'].append(note)
            unique_append(detail['sourceUrls'], fact['source']['url'])
            for image_id in fact['imageIds']:
                unique_append(clue['sourceImageIds'], image_id)
        for region_id, probability in values.items():
            if (clue['id'], region_id) in by_estimate:
                raise ValueError(f'Duplicate regional plate estimate: {clue["id"]}/{region_id}')
            fact_id = review['exceptionSourceFactId'] if region_id.endswith((':ca-nb', ':ca-nl')) else review['mapSourceFactId']
            fact = fact_by_id[fact_id]
            row = {'featureId': clue['id'], 'locationId': region_id, 'pPresent': probability,
                   'sourceRelation': 'inferred-condition', 'band': 'reviewed-policy-proxy-estimate',
                   'basis': 'reviewed-regional-plate-policy-v1',
                   'basisReason': f"{review['reason']} Cited in {fact['source']['path']}#{fact['source']['elementId']}",
                   'status': 'initial-estimate', 'measured': False,
                   'sourceFactId': fact_id, 'sourceFactIds': [fact_id], 'claimIds': []}
            estimates.append(row)
            by_estimate[(clue['id'], region_id)] = row
            unique_append(detail['relations']['inferred-condition'], region_id)
        parent = by_estimate.get((clue['id'], country_id))
        if parent is None:
            raise ValueError(f'Missing parent plate estimate: {clue["id"]}/{country_id}')
        parent.update({'pPresent': sum(values.values()) / len(values),
                       'band': 'uniform-region-marginal-estimate',
                       'basis': 'reviewed-regional-plate-marginal-v1',
                       'basisReason': review['reason'] + ' Country value is the uniform-region marginal, not a measured sampling prior.',
                       'sourceRelation': 'supports'})
        for fact_id in source_ids:
            unique_append(parent.setdefault('sourceFactIds', [parent['sourceFactId']]), fact_id)
        unique_append(detail['relations']['supports'], country_id)

    # Review source-extraction polarity separately from occurrence estimates.
    # A sentence can say that a feature exists but is rare, or that a variant
    # is rare while its parent visual feature is common. Neither is opposition.
    for review in json.loads((ROOT / 'scripts/reviewed-source-relations.json').read_text(encoding='utf-8'))['reviews']:
        key = (review['featureId'], review['locationId'])
        row = by_estimate.get(key)
        if (row is None or row['sourceFactId'] != review['sourceFactId'] or
                row['basis'] != 'curated-local-source-v1' or not review.get('reason')):
            raise ValueError(f'Changed source relation awaiting review: {key}')
        detail = by_detail[review['featureId']]
        for relation in detail['relations']:
            detail['relations'][relation] = [place for place in detail['relations'][relation]
                                             if place != review['locationId']]
        if review['action'] == 'remove':
            estimates.remove(row)
            del by_estimate[key]
        elif review['action'] in ('support', 'inferred-parent'):
            if 'pPresent' in review:
                probability = review['pPresent']
                if not 0 < probability < 1:
                    raise ValueError(f'Invalid reviewed likelihood: {key}')
                row['pPresent'] = probability
            relation = 'supports' if review['action'] == 'support' else 'inferred-parent'
            row['sourceRelation'] = relation
            row['basisReason'] += ' Source-polarity review: ' + review['reason']
            unique_append(detail['relations'][relation], review['locationId'])
        else:
            raise ValueError(f'Invalid reviewed source action: {key}')

    # Keep source polarity separate from estimated prevalence. A low chance of
    # seeing a feature is not the same as a source claiming it is absent.
    for row in estimates:
        if row.get('sourceRelation'):
            continue
        place = row['locationId']
        relations = by_detail[row['featureId']]['relations']
        found = [kind for kind in ('supports', 'opposes', 'explicit-absence', 'inferred-parent') if place in relations[kind]]
        row['sourceRelation'] = found[0] if len(found) == 1 else 'mixed' if found else 'unclassified'

    write('locations.json', 'locations', locations, 4)
    write('regions.json', 'regionSchemes', schemes, 4)
    write('playable-features.json', 'features', clues)
    write('playable-estimates.json', 'estimates', estimates)
    write('playable-clue-info.json', 'clues', details)
    write('source-photo-assets.json', 'assets', assets)
    write('playable-evidence-profiles.json', 'profiles', profiles)
    write('playable-interactions.json', 'interactions', interactions)
    print(json.dumps({'focusedSourceRows': original_review_rows, 'atomicObservationRows': sum(counts.values()), 'byChapter': dict(counts),
                      'playableClues': len(clues), 'playableEstimates': len(estimates),
                      'newPhotoAssignments': photo_count, 'comparativeEstimates': comparison_count, 'completeRegionSchemes': len([s for s in schemes if s['complete']])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
