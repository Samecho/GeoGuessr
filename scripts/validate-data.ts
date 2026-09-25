import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// The validator traverses heterogeneous JSON records and performs explicit runtime shape checks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>
const root = process.cwd()
const dataDir = resolve(root, 'src/data/knowledge')
const issues: string[] = []
const read = async (name: string): Promise<JsonObject> => JSON.parse(await readFile(resolve(dataDir, name), 'utf8')) as JsonObject
const unique = (items: JsonObject[], label: string) => {
  const ids = items.map((item) => item.id)
  const seen = new Set<string>()
  for (const id of ids) if (!id || seen.has(id)) issues.push(`${label}: missing or duplicate id ${String(id)}`); else seen.add(id)
  return seen
}
const [locationsFile, categoriesFile, featuresFile, factsFile, claimsFile, estimatesFile, imagesFile, interactionsFile, regionsFile, progressFile, paramsFile] = await Promise.all([
  'locations.json','categories.json','features.json','facts.json','claims.json','estimates.json','images.json','interactions.json','regions.json','import-progress.json','model-parameters.json',
].map(read))
const photoCuration = JSON.parse(await readFile(resolve(dataDir, 'photo-curation.json'), 'utf8')) as JsonObject
const runtimeFeaturesFile = JSON.parse(await readFile(resolve(dataDir, 'runtime-features.json'), 'utf8')) as JsonObject
const clueInfoFile = JSON.parse(await readFile(resolve(dataDir, 'clue-info.json'), 'utf8')) as JsonObject
const locations = locationsFile.locations as JsonObject[]
const categories = categoriesFile.categories as JsonObject[]
const features = featuresFile.features as JsonObject[]
const runtimeFeatures = runtimeFeaturesFile.features as JsonObject[]
const clueInfo = clueInfoFile.clues as JsonObject[]
const facts = factsFile.facts as JsonObject[]
const claims = claimsFile.claims as JsonObject[]
const estimates = estimatesFile.estimates as JsonObject[]
const images = imagesFile.images as JsonObject[]
const interactions = interactionsFile.interactions as JsonObject[]
const regions = regionsFile.regionSchemes as JsonObject[]
const locationIds = unique(locations,'location')
const featureIds = unique(features,'feature')
const runtimeFeatureIds = unique(runtimeFeatures,'runtime feature')
const clueInfoIds = new Set(clueInfo.map((item) => String(item.featureId)))
if (clueInfoIds.size !== clueInfo.length) issues.push('clue info contains duplicate feature IDs')
if (clueInfo.length !== features.length || features.some((feature) => !clueInfoIds.has(feature.id))) issues.push('clue info index does not cover every full feature record')
for (const detail of clueInfo) {
  if (!featureIds.has(detail.featureId) || !Array.isArray(detail.sourceNotes) || !Array.isArray(detail.sourceUrls) || !detail.relations) issues.push(`clue info ${detail.featureId}: malformed or dangling record`)
  for (const url of detail.sourceUrls || []) if (!url.startsWith('https://')) issues.push(`clue info ${detail.featureId}: invalid source URL`)
  for (const note of detail.sourceNotes || []) if (!note.section || !note.excerpt || !note.url?.startsWith('https://')) issues.push(`clue info ${detail.featureId}: malformed source excerpt`)
}
if (runtimeFeatures.length !== features.length || features.some((feature) => !runtimeFeatureIds.has(feature.id))) issues.push('runtime feature index does not match the full feature records')
for (const feature of runtimeFeatures) if (!feature.appearance?.en || !feature.appearance?.zh || !feature.categoryId || !Array.isArray(feature.evidenceGroupIds) || !Array.isArray(feature.assetIds)) issues.push(`runtime feature ${feature.id}: missing required inference/UI fields`)
const factIds = unique(facts,'fact')
const claimIds = unique(claims,'claim')
const imageIds = unique(images,'image')
const photoAssets = photoCuration.assets as JsonObject[]
const photoAssetIds = unique(photoAssets,'approved photo asset')
const interactionIds = unique(interactions,'interaction')
const categoryIds = new Set<string>()
const modes = new Map<string,string>()
for (const group of categories) {
  if (!group.name?.en || !group.name?.zh || !Array.isArray(group.children)) issues.push(`category group ${group.id}: translations or children missing`)
  categoryIds.add(group.id)
  for (const child of group.children || []) {
    if (categoryIds.has(child.id)) issues.push(`category duplicate id ${child.id}`)
    categoryIds.add(child.id)
    if (!child.name?.en || !child.name?.zh) issues.push(`category ${child.id}: translation missing`)
    if (!['single','multiple'].includes(child.selectionMode)) issues.push(`category ${child.id}: invalid selectionMode`)
    modes.set(child.id, child.selectionMode)
  }
}
const sourceFileFormat = (path: unknown) => typeof path === 'string' && path.startsWith('tuxundoc/') && !path.startsWith('public/')
const locationMap = new Map(locations.map((location) => [location.id,location]))
for (const location of locations) {
  if (!location.name?.en || !location.name?.zh) issues.push(`location ${location.id}: translation missing`)
  if (!location.source?.metadataPath || !sourceFileFormat(location.source?.path)) issues.push(`location ${location.id}: missing local source reference`)
  if (location.parentId && !locationIds.has(location.parentId)) issues.push(`location ${location.id}: unknown parent ${location.parentId}`)
  const visited = new Set<string>([location.id]); let parentId = location.parentId
  while (parentId) { if (visited.has(parentId)) { issues.push(`location parent cycle at ${location.id}`); break }; visited.add(parentId); parentId = locationMap.get(parentId)?.parentId }
}
for (const asset of photoAssets) {
  if (asset.status !== 'approved' || !asset.path?.startsWith('/images/') || !asset.sourceUrl?.startsWith('https://') || !asset.author || !asset.license || !asset.licenseUrl?.startsWith('https://') || !asset.attribution || !asset.redistribution || !asset.reviewed) issues.push(`photo asset ${asset.id}: incomplete license, attribution, or review record`)
  const publicPath = resolve(root, 'public', asset.path?.slice(1) || '')
  if (!existsSync(publicPath)) issues.push(`photo asset ${asset.id}: public file missing at ${asset.path}`)
}
const photoMatches = photoCuration.matches as JsonObject[]
for (const match of photoMatches) {
  if (!photoAssetIds.has(match.assetId) || !featureIds.has(match.featureId) || !match.basis) issues.push(`photo match ${match.assetId}: missing approved asset, target clue, or visual basis`)
}
for (const feature of features) {
  if (!Array.isArray(feature.assetIds)) issues.push(`feature ${feature.id}: assetIds must be declared`)
  for (const id of feature.assetIds || []) if (!photoAssetIds.has(id)) issues.push(`feature ${feature.id}: unknown redistributable asset ${id}`)
  if (!feature.appearance?.en || !feature.appearance?.zh || !feature.categoryId) issues.push(`feature ${feature.id}: missing label/category`)
  if (!categoryIds.has(feature.categoryId)) issues.push(`feature ${feature.id}: unknown category ${feature.categoryId}`)
  for (const id of feature.factIds || []) if (!factIds.has(id)) issues.push(`feature ${feature.id}: unknown fact ${id}`)
  for (const id of feature.imageIds || []) if (!imageIds.has(id)) issues.push(`feature ${feature.id}: unknown image ${id}`)
  for (const id of feature.evidenceGroupIds || []) if (!factIds.has(id)) issues.push(`feature ${feature.id}: unknown correlation fact ${id}`)
}
for (const fact of facts) {
  if (!locationIds.has(fact.locationId)) issues.push(`fact ${fact.id}: unknown location ${fact.locationId}`)
  if (!fact.source?.path || !fact.source?.url?.startsWith('https://')) issues.push(`fact ${fact.id}: missing chapter trace`)
  if (!fact.sourceHash || !fact.sectionId) issues.push(`fact ${fact.id}: missing section/hash`)
  for (const id of fact.featureIds || []) if (!featureIds.has(id)) issues.push(`fact ${fact.id}: unknown feature ${id}`)
  for (const id of fact.imageIds || []) if (!imageIds.has(id)) issues.push(`fact ${fact.id}: unknown image ${id}`)
}
for (const claim of claims) {
  if (!factIds.has(claim.factId) || !featureIds.has(claim.featureId) || !locationIds.has(claim.locationId)) issues.push(`claim ${claim.id}: broken fact/feature/location reference`)
  if (!['supports','opposes','explicit-absence'].includes(claim.relation)) issues.push(`claim ${claim.id}: invalid relation`)
  if (claim.conditions?.section && typeof claim.conditions.section !== 'string') issues.push(`claim ${claim.id}: malformed conditions`)
}
const estimateKeys = new Set<string>()
for (const estimate of estimates) {
  const key = `${estimate.locationId}\u0000${estimate.featureId}`
  if (estimateKeys.has(key)) issues.push(`duplicate estimate ${key}`); estimateKeys.add(key)
  if (!featureIds.has(estimate.featureId) || !locationIds.has(estimate.locationId) || !factIds.has(estimate.sourceFactId)) issues.push(`estimate ${key}: broken reference`)
  if (!Number.isFinite(estimate.pPresent) || estimate.pPresent <= 0 || estimate.pPresent >= 1) issues.push(`estimate ${key}: pPresent must be finite and in (0,1)`)
  if (estimate.measured !== false || estimate.status !== 'initial-estimate' || !estimate.basisReason || !estimate.basis) issues.push(`estimate ${key}: measurement/estimate status unclear`)
  for (const id of estimate.claimIds || []) if (!claimIds.has(id)) issues.push(`estimate ${key}: unknown source claim ${id}`)
  for (const id of estimate.sourceFactIds || []) if (!factIds.has(id)) issues.push(`estimate ${key}: unknown source fact ${id}`)
}
for (const image of images) {
  if (!sourceFileFormat(image.sourcePath) || !sourceFileFormat(image.originalPath)) issues.push(`image ${image.id}: source path must point into ignored tuxundoc archive`)
  if (image.status !== 'source-only' || image.redistributionStatus === 'approved') issues.push(`image ${image.id}: unreviewed tutorial asset cannot enter the public build`)
  if (image.author || image.license !== 'unknown from local metadata') issues.push(`image ${image.id}: do not infer attribution or a license absent from local records`)
}
for (const interaction of interactions) {
  if (!interactionIds.has(interaction.id) || !locationIds.has(interaction.locationId) || !factIds.has(interaction.sourceFactId)) issues.push(`interaction ${interaction.id}: broken source/location ref`)
  if (interaction.featureIds.length < 2 || interaction.featureIds.some((id: string) => !featureIds.has(id))) issues.push(`interaction ${interaction.id}: invalid feature set`)
  if (!Number.isFinite(interaction.likelihoodRatio) || interaction.likelihoodRatio <= 0 || interaction.measured !== false) issues.push(`interaction ${interaction.id}: invalid initial LR estimate`)
}

for (const scheme of regions) {
  if (!locationIds.has(scheme.countryId) || !Array.isArray(scheme.regions) || !scheme.regions.length) issues.push(`region scheme ${scheme.countryId}: missing parent or regions`)
  const seenRegions = new Set<string>()
  for (const region of scheme.regions || []) {
    if (!locationIds.has(region.id) || locationMap.get(region.id)?.parentId !== scheme.countryId) issues.push(`region scheme ${scheme.countryId}: invalid child ${region.id}`)
    if (seenRegions.has(region.id)) issues.push(`region scheme ${scheme.countryId}: duplicate child ${region.id}`)
    seenRegions.add(region.id)
    if (!region.name?.en || !region.name?.zh || !region.coverageSource?.startsWith('https://')) issues.push(`region scheme ${scheme.countryId}: missing localized label/source`)
  }
  if (scheme.complete && scheme.regions.length !== locations.filter((location) => location.parentId === scheme.countryId).length) issues.push(`region scheme ${scheme.countryId}: complete partition omits child locations`)
}
const brazil = regions.find((scheme) => scheme.countryId === 'loc:brazil')
if (!brazil?.complete || brazil.regions.length !== 27) issues.push('Brazil source-coded state partition is not complete (expected 27 source-listed codes)')
if (regions.some((scheme) => scheme.countryId === 'loc:india' && scheme.complete)) issues.push('India incomplete source-mentioned region set must not be shown as a full distribution')
const audit = progressFile.audit
if (audit.sourceChapters !== locations.filter((location) => location.candidate).length || audit.chapterProgress.length !== audit.sourceChapters) issues.push('chapter progress does not cover every source chapter/candidate')
if (audit.chapterProgress.some((chapter: JsonObject) => chapter.status !== 'imported')) issues.push('some chapter HTML is missing')
if (audit.paragraphAudit.filter((item: JsonObject) => item.hasText).length !== audit.sourceTextBlocks) issues.push('paragraph audit total mismatch')
if (audit.imageReferences !== images.length) issues.push('image reference total mismatch')
if (audit.photoCurationMatches !== photoMatches.length || audit.photoCurationIssues?.length) issues.push('photo curation import audit has unmatched or invalid items')
if (photoMatches.some((match) => !(features.find((feature) => feature.id === match.featureId)?.assetIds || []).includes(match.assetId))) issues.push('photo curation/import output does not attach every reviewed photo to its declared clue')
const publishedImages = photoAssets.map((asset) => asset.path)
for (const file of (await import('node:fs')).readdirSync(resolve(root, 'public/images'))) {
  const publicPath = `/images/${file}`
  if (!publishedImages.includes(publicPath)) issues.push(`unreviewed or unused image is present in public output: ${publicPath}`)
}
const params = paramsFile.parameters
for (const [name,value] of Object.entries(params.qualitativePrevalenceBands as Record<string,number>)) if (!Number.isFinite(value) || value <= 0 || value >= 1) issues.push(`parameter ${name}: expected probability inside (0,1)`)
for (const [name,value] of Object.entries(params.observationModel as Record<string,number|string>)) if (typeof value === 'number' && (value <= 0 || value >= 1)) issues.push(`observation parameter ${name}: expected probability inside (0,1)`)
// Validate original files when the ignored archive exists locally; CI can validate the committed trace data alone.
let localSourceChecked = false
if (existsSync(resolve(root,'tuxundoc','index.html'))) {
  localSourceChecked = true
  for (const chapter of audit.chapterProgress as JsonObject[]) if (!existsSync(resolve(root,chapter.chapter,'index.html'))) issues.push(`local source HTML missing: ${chapter.chapter}`)
  for (const image of images) if (!existsSync(resolve(root,image.originalPath))) issues.push(`local source image missing: ${image.originalPath}`)
}
const candidates = locations.filter((location) => location.candidate)
const needsReport = process.argv.includes('--write-report')
if (issues.length) {
  console.error(`Data validation failed (${issues.length} issue(s))`)
  for (const issue of issues.slice(0,100)) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  const textOnly = features.filter((feature) => !(feature.assetIds || []).length).length
  const pictured = features.length - textOnly
  const scoredFeatureCount = new Set(estimates.map((estimate) => estimate.featureId)).size
  console.log(`Validated ${candidates.length} candidate locations (${locations.length} total with regional units), ${features.length} deduplicated clues, ${facts.length} source facts, ${claims.length} evidence claims, ${estimates.length} initial probability estimates, ${interactions.length} source-backed interaction rules, and ${images.length} private source-image references.`)
  console.log(`Scoring coverage: ${scoredFeatureCount} clue IDs have at least one probability estimate; ${features.length-scoredFeatureCount} clue IDs are informational only. `)
  console.log(`Cards: ${pictured} with licensed photos (${photoAssets.length} image files), ${textOnly} text-only; clues pending English translation review: ${features.filter((feature) => feature.translationStatus === 'needs-translation').length}; complete regional schemes: ${regions.filter((scheme) => scheme.complete).length}; incomplete source-mentioned schemes: ${regions.filter((scheme) => !scheme.complete).length}.`)
  console.log(`Local 8 GB archive files: ${localSourceChecked ? 'verified against disk' : 'not mounted; source paths and hashes validated'}. Archive images approved for publication: ${images.filter((item) => item.redistributionStatus === 'approved').length}.`)
  if (needsReport) {
    const countBy = (rows: JsonObject[], key: string) => rows.reduce((out, row) => out.set(String(row[key]), (out.get(String(row[key])) || 0) + 1), new Map<string,number>())
    const featuresByLocation = countBy(claims.filter((claim) => claim.relation === 'supports' || claim.relation === 'explicit-absence'), 'locationId')
    const factsByLocation = countBy(facts, 'locationId')
    const estimatesByLocation = countBy(estimates, 'locationId')
    const progressById = new Map((audit.chapterProgress as JsonObject[]).map((row) => [row.locationId, row]))
    const schemeById = new Map(regions.map((scheme) => [scheme.countryId, scheme]))
    const translationDebt = features.filter((feature) => feature.translationStatus === 'needs-translation').length
    const unclassified = (audit.paragraphAudit as JsonObject[]).filter((row) => row.hasText && !row.hasExtractedFeature).length
    const rows = candidates.map((location) => {
      const progress = progressById.get(location.id) || {}
      const scheme = schemeById.get(location.id)
      const chapter = String(progress.chapter || location.source?.path || '—')
      const sourceName = String(location.name?.en || location.id).replaceAll('|','/')
      return `| ${sourceName} | ${location.kind} | ${location.continent} | ${featuresByLocation.get(location.id) || 0} | ${factsByLocation.get(location.id) || 0} | ${estimatesByLocation.get(location.id) || 0} | ${progress.imagesReferenced || 0} | ${scheme ? `${scheme.regions.length} ${scheme.complete ? 'complete' : 'partial'}` : '—'} | \`${chapter}\` | ${progress.missingLake ? 'HTML only; .lake missing' : 'HTML + metadata'} |`
    }).join('\n')
    const report = `# Local knowledge coverage report\n\nGenerated by \`npm run data:report\` from the read-only \`tuxundoc/\` archive on ${String(audit.sourceVersion?.capturedAt || 'unknown')}. Geographic claims use only this local source archive. A source citation and extracted text do not mean the claim has been manually fact-checked.\n\n## Corpus and imported clue records\n\n- Chapter entry: \`tuxundoc/index.html\`; ${audit.sourceChapters} linked chapters processed.\n- ${locations.length} location records: ${candidates.length} default candidates and ${locations.length-candidates.length} non-candidate regional units. This source-driven candidate list includes Antarctica. Only a manually chosen scope filters candidates.\n- ${features.length} deduplicated observation cards: ${scoredFeatureCount} have at least one probability estimate; ${features.length-scoredFeatureCount} have no location-specific estimate yet. ${pictured} have ${photoAssets.length} individually licensed example images across ${new Set(photoMatches.map((match) => match.featureId)).size} clues; ${textOnly} are text-only.\n- ${facts.length} source text facts, ${claims.length} parsed location-feature claims, ${estimates.length} distinct initial probability estimates, and ${interactions.length} explicit source-backed interaction estimates.\n- ${images.length} embedded tutorial image references are retained as private source pointers; their per-image redistribution rights are unknown, so zero are copied into the public build.\n- ${unclassified} text nodes have no extracted selectable feature and remain preserved in the audit for review. This is not semantic/manual review completion.\n- ${translationDebt} card labels still need a proper English translation review.\n- ${regions.filter((scheme) => scheme.complete).length} complete and ${regions.filter((scheme) => !scheme.complete).length} partial source-mentioned region schemes. Only complete, mutually exclusive schemes are scored.\n\n## Candidate chapters\n\n| Candidate | Type | Continent | Location claims | Source facts | Estimates | Source image refs (private) | Region scheme | Local chapter | Source files |\n|---|---|---|---:|---:|---:|---:|---|---|---|\n${rows}\n\n## Estimate and review limitations\n\nThe archive provides qualitative descriptions, not controlled frequency counts. Each \`pPresent\` value is therefore marked \`initial-estimate\` and generated from centralized language bands in \`model-parameters.json\`; it is not a measured probability. Missing source mentions stay at the shared neutral background in the inference engine. Duplicate clues and source facts are deduplicated by stable IDs and source hashes. The report is an import accounting, not a claim that all 8 GB of source media is licensed or all prose is manually reviewed.\n`
    await (await import('node:fs/promises')).writeFile(resolve(root,'docs/DATA_COVERAGE.md'),report,'utf8')
    console.log('Wrote docs/DATA_COVERAGE.md')
  }
}
