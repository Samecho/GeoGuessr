import type { EvidenceEstimate, RegionScheme } from './types'

/** Gallery relevance follows cited location evidence, never the live ranking. */
export function scopedClueIds(
  countryIds: readonly string[],
  estimates: readonly EvidenceEstimate[],
  completeSchemes: ReadonlyMap<string, RegionScheme>,
  parentByLocation: ReadonlyMap<string, string | null>,
  backgroundByFeature: ReadonlyMap<string, number> = new Map(),
): Set<string> {
  const countries = new Set(countryIds)
  const visible = new Set<string>()
  if (!countries.size) return visible

  if (countries.size === 1) {
    const countryId = countryIds[0]
    const scheme = completeSchemes.get(countryId)
    if (scheme?.complete) {
      const regionIds = new Set(scheme.regions.map((region) => region.id))
      const perFeature = new Map<string, Map<string, number>>()
      for (const row of estimates) {
        if (!regionIds.has(row.locationId) || row.basis === 'focused-local-comparison-v1') continue
        const regions = perFeature.get(row.featureId) || new Map<string, number>()
        regions.set(row.locationId, row.pPresent)
        perFeature.set(row.featureId, regions)
      }
      for (const [featureId, regions] of perFeature) {
        const unknown = backgroundByFeature.get(featureId) ?? 0.5
        const likelihoods = scheme.regions.map((region) => regions.get(region.id) ?? unknown)
        if (Math.max(...likelihoods) - Math.min(...likelihoods) > 0.01) visible.add(featureId)
      }
      return visible
    }
  }

  for (const row of estimates) {
    if (row.basis === 'focused-local-comparison-v1' || row.pPresent <= 0.05) continue
    const countryId = countries.has(row.locationId) ? row.locationId : parentByLocation.get(row.locationId)
    if (countryId && countries.has(countryId)) visible.add(row.featureId)
  }
  return visible
}
