import { describe, expect, it } from 'vitest'
import { categories, clues, countries, estimates, features, interactions, locations, regionSchemeByCountry } from './knowledge'
import { rankCandidates } from '../engine/scoring'

const clue = (english: string) => clues.find((item) => item.appearance.en === english)
const estimate = (english: string, locationId: string) => estimates.find((item) => item.featureId === clue(english)?.id && item.locationId === locationId)

describe('reviewed local knowledge regressions', () => {
  it('keeps distinct vehicles with and without front plates selectable together', () => {
    const front = clue('Vehicle with a front plate')
    const noFront = clue('Vehicle without a front plate')
    expect(front).toBeDefined()
    expect(noFront).toBeDefined()
    expect(front?.id).not.toBe(noFront?.id)
    expect(categories.flatMap((group) => group.children).find((category) => category.id === 'plates')?.selectionMode).toBe('multiple')
    const selected = [front!, noFront!].map((item) => ({ clueId: item.id, mode: 'seen' as const, certainty: 'certain' as const }))
    const ranked = rankCandidates(['loc:canada', 'loc:curacao'], estimates, selected)
    expect(ranked).toHaveLength(2)
    expect(ranked.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1)
  })

  it('does not turn nearby negation or unrelated uniqueness into strong evidence', () => {
    expect(estimate('Flat terrain', 'loc:netherlands')?.pPresent).toBe(0.82)
    expect(estimate('White front plate and yellow rear plate', 'loc:united-kingdom')?.pPresent).toBe(0.82)
    expect(estimate('Vehicle with a front plate', 'loc:dominican')).toBeUndefined()
    expect(estimate('The word STOP', 'loc:canada')).toBeUndefined()
    expect(estimates.filter((item) => item.pPresent <= 0.05)).toHaveLength(0)
  })

  it('only uses reviewed joint evidence with actual matching observations', () => {
    expect(interactions).toHaveLength(2)
    expect(interactions.some((rule) => rule.locationId === 'loc:italy')).toBe(false)
    expect(interactions.some((rule) => rule.locationId === 'loc:ghana')).toBe(true)
    expect(features).toHaveLength(clues.length)
    expect(features.every((feature) => feature.translationStatus === 'reviewed')).toBe(true)
  })
})


describe('Canada and Africa paragraph review', () => {
  const parentByLocation = new Map(locations.map((place) => [place.id, place.parentId]))

  it('gives every locally documented African candidate active evidence', () => {
    const africa = countries.filter((country) => country.continent === 'Africa')
    expect(africa).toHaveLength(18)
    for (const country of africa) {
      expect(estimates.some((row) => row.locationId === country.id)).toBe(true)
      expect(regionSchemeByCountry.get(country.id)?.complete).toBe(true)
    }
    expect(estimates.filter((row) => row.locationId === 'loc:canada').length).toBeGreaterThan(40)
  })

  it('uses an explicit Canadian and American sign-word contrast', () => {
    const maximum = clue('MAXIMUM on a speed sign')!
    const ranked = rankCandidates(['loc:canada', 'loc:united-states'], estimates,
      [{ clueId: maximum.id, mode: 'seen', certainty: 'certain' }])
    expect(ranked[0].id).toBe('loc:canada')
    expect(estimate(maximum.appearance.en, 'loc:united-states')?.pPresent).toBeLessThan(0.5)
    expect(ranked.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('uses source-backed opposing comparisons for African visual differences', () => {
    const blue = clue('Solid blue vehicle plate')!
    const ranked = rankCandidates(['loc:senegal', 'loc:ghana', 'loc:nigeria'], estimates,
      [{ clueId: blue.id, mode: 'seen', certainty: 'certain' }])
    expect(ranked[0].id).toBe('loc:senegal')
    expect(estimate(blue.appearance.en, 'loc:ghana')?.pPresent).toBeLessThan(0.5)
    expect(estimate(blue.appearance.en, 'loc:nigeria')?.pPresent).toBeLessThan(0.5)
    expect(ranked.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('scores province observations conditionally without changing the country scope', () => {
    const scheme = regionSchemeByCountry.get('loc:canada')!
    expect(scheme.regions).toHaveLength(13)
    const marker = clue('Round bollard with two black bands')!
    const selected = [{ clueId: marker.id, mode: 'seen' as const, certainty: 'certain' as const }]
    const regionRanks = rankCandidates(scheme.regions.map((region) => region.id), estimates, selected,
      { scope: 'region', parentId: 'loc:canada', parentByLocation })
    expect(regionRanks[0].id).toBe('loc:canada:region:ca-ab')
    expect(regionRanks.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    const countryRanks = rankCandidates(['loc:canada'], estimates, selected,
      { scope: 'country', parentByLocation })
    expect(countryRanks).toHaveLength(1)
    expect(countryRanks[0].share).toBe(1)
  })

  it('keeps documented African regional partitions mutually exclusive', () => {
    for (const [id, count] of [['loc:south-africa', 9], ['loc:egypt', 2],
      ['loc:lesotho', 2], ['loc:sao-tome-and-principe', 2], ['loc:uganda', 8]] as const) {
      const scheme = regionSchemeByCountry.get(id)!
      expect(scheme?.complete).toBe(true)
      expect(new Set(scheme.regions.map((region) => region.id)).size).toBe(count)
      expect(scheme.regions).toHaveLength(count)
      for (const region of scheme.regions) expect(parentByLocation.get(region.id)).toBe(id)
    }
  })
})
