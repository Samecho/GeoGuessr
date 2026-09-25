import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { countries, schemaVersion as countrySchemaVersion } from '../src/data/countries'
import { categories, schemaVersion as categorySchemaVersion } from '../src/data/categories'
import { clues, schemaVersion as clueSchemaVersion } from '../src/data/clues'
import { rules, schemaVersion as ruleSchemaVersion } from '../src/data/rules'
import { regionSchemes, schemaVersion as regionSchemaVersion } from '../src/data/regions'
import { assets, schemaVersion as assetSchemaVersion } from '../src/data/assets'

const errors: string[] = []
if ([countrySchemaVersion, categorySchemaVersion, clueSchemaVersion, ruleSchemaVersion, regionSchemaVersion, assetSchemaVersion].some((version) => version !== 1)) errors.push('Unsupported data schemaVersion')
const fail = (message: string) => errors.push(message)
const unique = (label: string, ids: string[]) => { const seen = new Set<string>(); ids.forEach((id) => { if (!id || seen.has(id)) fail(`${label}: duplicate/empty ${id}`); seen.add(id) }) }
const translated = (label: string, value: { en: string; zh: string }) => { if (!value?.en?.trim() || !value?.zh?.trim()) fail(`${label}: missing translation`) }
const url = (label: string, value: string) => { try { const parsed = new URL(value); if (!['https:', 'http:'].includes(parsed.protocol)) fail(`${label}: invalid protocol`) } catch { fail(`${label}: invalid URL ${value}`) } }
const countryIds = new Set(countries.map((country) => country.id))
const categoryIds = new Set(categories.flatMap((category) => category.children.map((child) => child.id)))
const clueIds = new Set(clues.map((clue) => clue.id))
const assetIds = new Set(assets.map((asset) => asset.id))

unique('countries', countries.map((country) => country.id))
unique('categories', [...categories.map((category) => category.id), ...categories.flatMap((category) => category.children.map((child) => child.id))])
unique('clues', clues.map((clue) => clue.id))
unique('rules', rules.map((rule) => rule.id))
unique('assets', assets.map((asset) => asset.id))
unique('region schemes', regionSchemes.map((scheme) => scheme.countryId))

for (const country of countries) {
  translated(country.id, country.name); translated(country.id + ' note', country.coverageNote)
  url(country.id + ' coverage', country.coverageSource)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(country.reviewed)) fail(`${country.id}: invalid review date`)
  if (!existsSync(join('public', 'flags', `${country.id.toLowerCase()}.svg`))) fail(`${country.id}: missing local flag`)
}
for (const category of categories) {
  translated(category.id, category.name)
  unique(category.id + ' children', category.children.map((child) => child.id))
  for (const child of category.children) translated(child.id, child.name)
}
for (const asset of assets) {
  if (asset.status !== 'approved') fail(`${asset.id}: unapproved public asset`)
  if (!asset.author || !asset.attribution || !asset.license || !asset.redistribution) fail(`${asset.id}: incomplete attribution/license basis`)
  url(asset.id + ' source', asset.sourceUrl); url(asset.id + ' license', asset.licenseUrl)
  if (!existsSync(join('public', asset.path.replace(/^\//, '')))) fail(`${asset.id}: file missing ${asset.path}`)
}
for (const clue of clues) {
  if (!categoryIds.has(clue.categoryId)) fail(`${clue.id}: invalid category`)
  for (const field of ['appearance','formalName','identify','geography','strength','caveat'] as const) translated(`${clue.id}.${field}`, clue[field])
  if (!clue.sourceUrls.length) fail(`${clue.id}: no sources`)
  clue.sourceUrls.forEach((source) => url(clue.id, source))
  clue.assetIds.forEach((id) => { if (!assetIds.has(id)) fail(`${clue.id}: unknown asset ${id}`) })
  clue.referenceAssetIds?.forEach((id) => { if (!assetIds.has(id)) fail(`${clue.id}: unknown reference asset ${id}`) })
}
for (const scheme of regionSchemes) {
  if (!countryIds.has(scheme.countryId)) fail(`${scheme.countryId}: scheme for excluded country`)
  if (scheme.schemaVersion !== 1 || scheme.regions.length < 2) fail(`${scheme.countryId}: invalid scheme`)
  translated(scheme.countryId + ' granularity', scheme.granularity)
  translated(scheme.countryId + ' note', scheme.note)
  unique(scheme.countryId + ' regions', scheme.regions.map((region) => region.id))
  scheme.regions.forEach((region) => { translated(`${scheme.countryId}/${region.id}`, region.name); url(`${scheme.countryId}/${region.id}`, region.coverageSource) })
}
for (const rule of rules) {
  if (!Number.isFinite(rule.weight) || Math.abs(rule.weight) > 100) fail(`${rule.id}: invalid weight`)
  if (!rule.group || !rule.sourceUrls.length) fail(`${rule.id}: missing group/source`)
  translated(rule.id + ' rationale', rule.rationale)
  rule.sourceUrls.forEach((source) => url(rule.id, source))
  const predicates = [...(rule.when.all || []), ...(rule.when.any || []), ...(rule.when.excluded || [])]
  if (!predicates.length) fail(`${rule.id}: no conditions`)
  predicates.forEach((id) => { if (!clueIds.has(id)) fail(`${rule.id}: unknown clue ${id}`) })
  ;(rule.when.excluded || []).forEach((id) => { if (!clues.find((clue) => clue.id === id)?.exclusionAllowed) fail(`${rule.id}: exclusion not allowed on ${id}`) })
  if (!rule.targets.length) fail(`${rule.id}: no targets`)
  if (rule.scope === 'country') rule.targets.forEach((id) => { if (!countryIds.has(id)) fail(`${rule.id}: target ${id} outside coverage`) })
  else {
    const scheme = regionSchemes.find((item) => item.countryId === rule.countryId)
    if (!scheme) fail(`${rule.id}: no region scheme`)
    rule.targets.forEach((id) => { if (!scheme?.regions.some((region) => region.id === id)) fail(`${rule.id}: invalid region ${id}`) })
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`Validated ${countries.length} candidates, ${regionSchemes.length} region schemes, ${clues.length} clues, ${rules.length} rules and ${assets.length} approved assets.`)

if (process.argv.includes('--write-report')) {
  const lines = [
    '# Data coverage report', '',
    'Generated by `npm run data:validate -- --write-report` on 2026-09-25. Presence in the candidate list does not mean its clue profile is complete.', '',
    '| ID | Candidate | Continent | Road extent | Coverage source | Country rules | Region scheme | Region rules | Photo-linked clues |',
    '|---|---|---|---|---|---:|---|---:|---:|',
    ...countries.map((country) => {
      const countryRules = rules.filter((rule) => rule.scope === 'country' && rule.targets.includes(country.id))
      const regionRules = rules.filter((rule) => rule.scope === 'region' && rule.countryId === country.id)
      const photoClues = new Set(countryRules.flatMap((rule) => [...(rule.when.all || []), ...(rule.when.any || [])]).filter((id) => clues.find((clue) => clue.id === id)?.assetIds.length))
      const scheme = regionSchemes.find((item) => item.countryId === country.id)
      return `| ${country.id} | ${country.name.en} / ${country.name.zh} | ${country.continent} | ${country.coverage} | [source](${country.coverageSource}) | ${countryRules.length} | ${scheme ? `${scheme.granularity.en} (${scheme.regions.length})` : 'none reviewed'} | ${regionRules.length} | ${photoClues.size} |`
    }), '',
    'Rule counts include broad shared conditions such as driving side. They do **not** indicate country-specific research depth or statistical calibration.', '',
    '## Cross-country clues', '',
    ...clues.filter((clue) => rules.filter((rule) => rule.scope === 'country' && rule.targets.length > 1 && [...(rule.when.all || []), ...(rule.when.any || [])].includes(clue.id)).length).map((clue) => `- ${clue.appearance.en} (${clue.id})`), '',
    '## Open gaps', '',
    '- Many candidates still have only broad driving-side or shared-writing support; rule counts do not mean a country has a deep clue profile.',
    '- Most countries have no reviewed internal region scheme or region rules. Brazil has two coarse landscape rules in its five-region scheme; India has no published region scheme.',
    '- Street View car/camera meta and many reflector-post, pole, guardrail, terrain, plant, soil and building variants await independently licensed photos and further source review.',
    '- Approved assets have recorded licenses; additional photos require manual visual and rights review.', '',
  ]
  mkdirSync('docs', { recursive: true })
  writeFileSync('docs/DATA_COVERAGE.md', lines.join('\n'))
}
