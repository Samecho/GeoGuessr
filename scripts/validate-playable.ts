import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Source extraction and the reviewed playable library are validated separately.
// Shape checks cannot establish that a tutorial's geographic claim is true.
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const root = process.cwd()
const dir = resolve(root, 'src/data/knowledge')
const file = async (name: string, key: string): Promise<Row[]> => (JSON.parse(await readFile(resolve(dir, name), 'utf8')) as Row)[key]
const errors: string[] = []
const ids = (rows: Row[], name: string) => {
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) errors.push(`${name}: duplicate or missing ID ${String(row.id)}`)
    seen.add(row.id)
  }
  return seen
}
const [locations, categories, rawFeatures, facts, claims, rawEstimates, images, rawInteractions, regions, playable, estimates, interactions, details, assets, profiles] = await Promise.all([
  ['locations.json','locations'],['categories.json','categories'],['features.json','features'],['facts.json','facts'],
  ['claims.json','claims'],['estimates.json','estimates'],['images.json','images'],['interactions.json','interactions'],
  ['regions.json','regionSchemes'],['playable-features.json','features'],['playable-estimates.json','estimates'],
  ['playable-interactions.json','interactions'],['playable-clue-info.json','clues'],['source-photo-assets.json','assets'],['playable-evidence-profiles.json','profiles'],
].map(([name, key]) => file(name, key)))
const locationIds = ids(locations, 'location')
const rawFeatureIds = ids(rawFeatures, 'raw feature')
const factIds = ids(facts, 'fact')
const claimIds = ids(claims, 'claim')
const imageIds = ids(images, 'image')
ids(rawInteractions, 'raw interaction')
const playableIds = ids(playable, 'playable clue')
ids(interactions, 'playable interaction')
const assetIds = ids(assets, 'source asset')
const profileIds = new Set<string>()
for (const profile of profiles) {
  if (!profile.featureId || profileIds.has(profile.featureId)) errors.push(`evidence profile: duplicate or missing clue ID ${String(profile.featureId)}`)
  profileIds.add(profile.featureId)
}
const tierFile = JSON.parse(await readFile(resolve(dir, 'model-parameters.json'), 'utf8')) as Row
const tiers = tierFile.parameters?.visualSpecificityTiers || {}
const categoryIds = new Set(categories.flatMap((group) => group.children.map((child: Row) => child.id)))
if (locations.filter((row) => row.candidate).length !== 133) errors.push('candidate list no longer matches 133 local chapters')
if (images.length !== 5860) errors.push('local image index no longer contains 5,860 entries')
for (const location of locations) {
  if (!location.name?.en || !location.name?.zh || !location.source?.path?.startsWith('tuxundoc/')) errors.push(`location ${location.id}: translation or local source missing`)
  if (location.parentId && !locationIds.has(location.parentId)) errors.push(`location ${location.id}: unknown parent`)
}
for (const fact of facts) {
  if (!locationIds.has(fact.locationId) || !fact.source?.path?.startsWith('tuxundoc/') || !fact.source?.url?.startsWith('https://')) errors.push(`fact ${fact.id}: source trace missing`)
  for (const id of fact.featureIds || []) if (!rawFeatureIds.has(id)) errors.push(`fact ${fact.id}: unknown extracted feature ${id}`)
}
for (const claim of claims) if (!factIds.has(claim.factId) || !rawFeatureIds.has(claim.featureId) || !locationIds.has(claim.locationId)) errors.push(`claim ${claim.id}: broken reference`)
for (const row of rawEstimates) if (!rawFeatureIds.has(row.featureId) || !locationIds.has(row.locationId) || !factIds.has(row.sourceFactId) || !(row.pPresent > 0 && row.pPresent < 1)) errors.push(`source estimate ${row.featureId}/${row.locationId}: invalid`)
for (const image of images) {
  if (!image.sourcePath?.startsWith('tuxundoc/') || !locationIds.has(image.chapterId)) errors.push(`image ${image.id}: invalid source trace`)
  if (existsSync(resolve(root, 'tuxundoc/index.html')) && !existsSync(resolve(root, image.sourcePath))) errors.push(`image ${image.id}: local original missing`)
}
const imageMap = new Map(images.map((image) => [image.id, image]))
for (const asset of assets) {
  const image = imageMap.get(asset.id)
  if (!image || asset.sourcePath !== image.sourcePath || asset.sourceUrl !== image.chapterSourceUrl || asset.redistribution !== 'user-directed-test-publication') errors.push(`asset ${asset.id}: source mapping or rights status invalid`)
  if (!asset.path?.startsWith('/source-images/') || !existsSync(resolve(root, 'public', asset.path.slice(1)))) errors.push(`asset ${asset.id}: missing converted file`)
  if (!asset.author || !asset.license || !asset.attribution || !asset.reviewed) errors.push(`asset ${asset.id}: incomplete source or rights metadata`)
  if (asset.cardCrop !== undefined && !['left', 'top', 'bottom'].includes(asset.cardCrop)) errors.push(`asset ${asset.id}: invalid card crop`)
}
const rawMap = new Map(rawFeatures.map((feature) => [feature.id, feature]))
const detailIds = new Set(details.map((detail) => detail.featureId))
if (detailIds.size !== playable.length) errors.push('playable clue details do not match clues')
const visibleLabels = new Set<string>()
const englishLabels = new Set<string>()
for (const clue of playable) {
  const labelKey = `${clue.categoryId}/${clue.appearance?.zh}`
  if (visibleLabels.has(labelKey)) errors.push(`clue ${clue.id}: duplicate visible observation ${labelKey}`)
  visibleLabels.add(labelKey)
  const zh = clue.appearance?.zh || '', en = clue.appearance?.en || ''
  const englishKey = `${clue.categoryId}/${en.trim().toLocaleLowerCase('en')}`
  if (englishLabels.has(englishKey)) errors.push(`clue ${clue.id}: duplicate English observation ${englishKey}`)
  englishLabels.add(englishKey)
  if (clue.cardCrop !== undefined && !['left', 'top', 'bottom'].includes(clue.cardCrop)) errors.push(`clue ${clue.id}: invalid card crop`)
  if (!categoryIds.has(clue.categoryId) || !zh || !en || /视觉特征|^(?:这种|这些|也许|例如|比如)/.test(zh) || zh.length > 34 || /[\u3400-\u9fff]/.test(en)) errors.push(`clue ${clue.id}: unreviewed wording or category`)
  if ((!clue.sourcePhraseIds?.length && !clue.manualFactIds?.length) || clue.sourcePhraseIds.some((id: string) => !rawFeatureIds.has(id)) || (clue.manualFactIds || []).some((id: string) => !factIds.has(id))) errors.push(`clue ${clue.id}: source phrase or manual fact missing`)
  for (const id of clue.assetIds || []) if (!assetIds.has(id) || !clue.sourceImageIds?.includes(id)) errors.push(`clue ${clue.id}: image without adjacent source link ${id}`)
  for (const id of clue.sourceImageIds || []) if (!imageIds.has(id)) errors.push(`clue ${clue.id}: unknown source image ${id}`)
  for (const id of clue.evidenceGroupIds || []) if (!factIds.has(id)) errors.push(`clue ${clue.id}: unknown source fact ${id}`)
  for (const id of clue.sourcePhraseIds) if (!rawMap.get(id)?.factIds.some((factId: string) => clue.evidenceGroupIds.includes(factId))) errors.push(`clue ${clue.id}: phrase/fact mismatch`)
}
const playableMap = new Map(playable.map((clue) => [clue.id, clue]))
for (const profile of profiles) {
  const clue = playableMap.get(profile.featureId)
  const tier = tiers[profile.tier]
  if (!clue || !factIds.has(profile.sourceFactId) || !clue.evidenceGroupIds.includes(profile.sourceFactId) ||
      !tier || !Number.isFinite(profile.unknownPrevalence) || profile.unknownPrevalence <= 0 || profile.unknownPrevalence >= 1 ||
      !Number.isFinite(profile.certainSpecificity) || profile.certainSpecificity <= 0 || profile.certainSpecificity >= 1 ||
      profile.unknownPrevalence !== tier.unknownPrevalence || profile.certainSpecificity !== tier.certainSpecificity ||
      !profile.formalName?.en || !profile.formalName?.zh || !profile.basisReason || profile.measured !== false) {
    errors.push(`evidence profile ${profile.featureId}: missing source, tier, or valid probabilities`)
  }
}
for (const asset of assets) if (!playable.some((clue) => clue.assetIds.includes(asset.id))) errors.push(`asset ${asset.id}: not attached to a playable clue`)
const estimateKeys = new Set<string>()
for (const row of estimates) {
  const key = `${row.featureId}/${row.locationId}`
  if (estimateKeys.has(key) || !playableIds.has(row.featureId) || !locationIds.has(row.locationId) || !factIds.has(row.sourceFactId) || !Number.isFinite(row.pPresent) || row.pPresent <= 0 || row.pPresent >= 1 || row.measured !== false) errors.push(`playable estimate ${key}: invalid`)
  estimateKeys.add(key)
  for (const id of row.claimIds || []) if (!claimIds.has(id)) errors.push(`playable estimate ${key}: unknown claim ${id}`)
}
for (const rule of interactions) if (!locationIds.has(rule.locationId) || !factIds.has(rule.sourceFactId) || rule.featureIds.length < 2 || rule.featureIds.some((id: string) => !playableIds.has(id))) errors.push(`interaction ${rule.id}: invalid`)
const locationMap = new Map(locations.map((location) => [location.id, location]))
const schemeCountries = new Set<string>()
for (const scheme of regions) {
  if (schemeCountries.has(scheme.countryId) || !locationMap.get(scheme.countryId)?.candidate) errors.push(`region scheme ${scheme.countryId}: duplicate or invalid country`)
  schemeCountries.add(scheme.countryId)
  if (!scheme.granularity?.en || !scheme.granularity?.zh || !scheme.note?.en || !scheme.note?.zh) errors.push(`region scheme ${scheme.countryId}: missing bilingual description`)
  const schemeRegionIds = new Set<string>()
  for (const region of scheme.regions) {
    const location = locationMap.get(region.id)
    if (schemeRegionIds.has(region.id) || !location || location.parentId !== scheme.countryId || (scheme.complete && location.candidate) || !region.name?.en || !region.name?.zh || !region.coverageSource?.startsWith('https://')) errors.push(`region ${region.id}: invalid, duplicated or mismatched parent`)
    schemeRegionIds.add(region.id)
  }
  if (scheme.complete && schemeRegionIds.size < 2) errors.push(`region scheme ${scheme.countryId}: complete scheme needs distinct areas`)
}
for (const location of locations) if (location.id.includes(':region:') && !regions.some((scheme) => scheme.regions.some((region: Row) => region.id === location.id))) errors.push(`region ${location.id}: not assigned to a scheme`)
const focusedCountries = new Set(['loc:canada', ...locations.filter((location) => location.candidate && location.continent === 'Africa').map((location) => location.id)])
for (const countryId of focusedCountries) if (!regions.some((scheme) => scheme.countryId === countryId && scheme.complete)) errors.push(`focused country ${countryId}: complete regional scheme missing`)
const photoDir = resolve(root, 'public/source-images')
const manifest = JSON.parse(await readFile(resolve(photoDir, 'ready.json'), 'utf8')) as Row
if (manifest.convertedCount !== 5860 || Object.keys(manifest.failures || {}).length) errors.push('image conversion manifest is incomplete')
const expected = new Set(images.map((image) => `${image.id}${image.sourcePath.toLowerCase().endsWith('.svg') ? '.svg' : '.webp'}`))
const actual = readdirSync(photoDir).filter((name) => name !== 'ready.json')
if (actual.length !== expected.size || actual.some((name) => !expected.has(name))) errors.push('converted source image set differs from the 5,860-image index')
if (existsSync(resolve(root, 'public/images')) && readdirSync(resolve(root, 'public/images')).length) errors.push('old external photo assets remain in public/images')
const bytes = actual.reduce((sum, name) => sum + statSync(resolve(photoDir, name)).size, 0)
if (bytes >= 950_000_000) errors.push('converted image set leaves too little room within Pages 1 GB site limit')
if (errors.length) {
  console.error(`Data validation failed: ${errors.length} issue(s)`)
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  const illustrated = playable.filter((clue) => clue.assetIds.length).length
  const quarantined = rawFeatures.length - new Set(playable.flatMap((clue) => clue.sourcePhraseIds || [])).size
  const scored = new Set(estimates.map((estimate) => estimate.featureId)).size
  const chaptersWithEstimates = new Set(estimates.map((estimate) => estimate.locationId)).size
  console.log(`Validated ${locations.filter((row) => row.candidate).length} candidates, ${playable.length} reviewed bilingual clues (${illustrated} illustrated, ${playable.length-illustrated} text), ${scored} scored clues, ${estimates.length} estimates across ${chaptersWithEstimates} locations, and all ${images.length} source images (${(bytes/1e6).toFixed(1)} MB).`)
  if (process.argv.includes('--write-report')) {
    const byLocation = new Map<string, number>()
    for (const estimate of estimates) byLocation.set(estimate.locationId, (byLocation.get(estimate.locationId) || 0) + 1)
    const rows = locations.filter((row) => row.candidate).map((row) => `| ${row.name.en} | ${byLocation.get(row.id) || 0} | ${row.source.path} |`).join('\n')
    await writeFile(resolve(root, 'docs/DATA_COVERAGE.md'), `# Data coverage\n\nUpdated 2026-09-26. The only geographic source is the local Tuxundoc archive. Automated source extraction is preserved for audit; only manually chosen visual phrases enter the playable library. Inclusion does not certify every geographic claim.\n\n- ${locations.filter((row) => row.candidate).length} candidates and ${facts.length} source text blocks.\n- ${playable.length} reviewed bilingual clue labels: ${illustrated} with adjacent source images, ${playable.length-illustrated} text only.\n- ${estimates.length} active estimates for ${scored} clue IDs across ${chaptersWithEstimates} country/region units. Estimates use qualitative tiers, not measured frequencies.\n- ${images.length} source images converted without cropping; ${(bytes/1e6).toFixed(1)} MB published in the user-directed Pages test build. The project owner reports permission from the source author for this project; per-image author metadata is not in the archive.\n- ${quarantined} extracted phrase records are retained as raw audit candidates, not displayed or scored.\n\n| Candidate | Active estimate count | Local source chapter |\n|---|---:|---|\n${rows}\n`, 'utf8')
    console.log('Wrote docs/DATA_COVERAGE.md')
  }
}
