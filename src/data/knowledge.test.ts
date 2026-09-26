import { describe, expect, it } from 'vitest'
import { categories, clues, countries, estimates, evidenceProfileByClue, features, interactions, locations, regionSchemeByCountry } from './knowledge'
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
    expect(estimates.filter((item) => item.pPresent <= 0.05).every((item) =>
      item.pPresent > 0 && ['focused-local-comparison-v1', 'focused-specificity-region-marginal-v1', 'reviewed-driving-side-v1'].includes(item.basis))).toBe(true)
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

  it('treats the Acadian flag as a rare exact design across countries and a shared Maritime cue within Canada', () => {
    const flag = clue('Yellow star on blue stripe of tricolor flag')!
    const selected = [{ clueId: flag.id, mode: 'seen' as const, certainty: 'certain' as const }]
    const options = { evidenceProfiles: evidenceProfileByClue, parentByLocation, candidateByLocation: new Map(locations.map((place) => [place.id, place.candidate])) }
    const global = rankCandidates(countries.map((country) => country.id), estimates, selected, { ...options, scope: 'country' })
    expect(global[0].id).toBe('loc:canada')
    expect(global[0].share).toBeGreaterThan(0.9)
    const scheme = regionSchemeByCountry.get('loc:canada')!
    const regions = rankCandidates(scheme.regions.map((region) => region.id), estimates, selected,
      { ...options, scope: 'region', parentId: 'loc:canada' })
    expect(regions[0].id).toBe('loc:canada:region:ca-nb')
    expect(regions[0].share).toBeGreaterThan(0.5)
    expect(regions.find((region) => region.id === 'loc:canada:region:ca-ns')!.share).toBeGreaterThan(0.1)
    expect(regions.reduce((sum, region) => sum + region.share, 0)).toBeCloseTo(1)
    const unsure = rankCandidates(countries.map((country) => country.id), estimates,
      [{ clueId: flag.id, mode: 'seen', certainty: 'uncertain' }], { ...options, scope: 'country' })
    expect(unsure.find((country) => country.id === 'loc:canada')!.share).toBeLessThan(global[0].share)
  })

  it('lets several independent strong metas dominate weak appearance cues in their supported scope', () => {
    const options = { evidenceProfiles: evidenceProfileByClue, parentByLocation,
      candidateByLocation: new Map(locations.map((place) => [place.id, place.candidate])) }
    const kenyaBrand = clue('Safaricom shop sign or advert')!
    const global = rankCandidates(countries.map((country) => country.id), estimates,
      [{ clueId: kenyaBrand.id, mode: 'seen', certainty: 'certain' }], { ...options, scope: 'country' })
    expect(global[0].id).toBe('loc:kenya')
    expect(global[0].share).toBeGreaterThan(0.7)

    const africa = countries.filter((country) => country.continent === 'Africa').map((country) => country.id)
    const bluePlate = clue('Solid blue vehicle plate')!
    const africaRanks = rankCandidates(africa, estimates,
      [{ clueId: bluePlate.id, mode: 'seen', certainty: 'certain' }], { ...options, scope: 'country' })
    expect(africaRanks[0].id).toBe('loc:senegal')
    expect(africaRanks[0].share).toBeGreaterThan(0.8)

    for (const [countryId, label, expectedRegion] of [
      ['loc:canada', 'ARRÊT on a stop sign', 'loc:canada:region:ca-qc'],
      ['loc:south-africa', 'Trident-shaped pole top', 'loc:south-africa:region:za-kzn'],
    ] as const) {
      const scheme = regionSchemeByCountry.get(countryId)!
      const ranks = rankCandidates(scheme.regions.map((region) => region.id), estimates,
        [{ clueId: clue(label)!.id, mode: 'seen', certainty: 'certain' }],
        { ...options, scope: 'region', parentId: countryId })
      expect(ranks[0].id).toBe(expectedRegion)
      expect(ranks[0].share).toBeGreaterThan(0.85)
    }
    const mountains = clue('High continuous mountains')!
    const weak = rankCandidates(countries.map((country) => country.id), estimates,
      [{ clueId: mountains.id, mode: 'seen', certainty: 'certain' }], { ...options, scope: 'country' })
    expect(weak[0].share).toBeLessThan(0.1)
  })

  it('shows one illustrated clue for each reviewed duplicate visual observation', () => {
    for (const label of ['Broad rectangular red sign with white chevron', 'Narrow upright red-and-white chevron sign',
      'Single red chevron on broad white sign', 'Two red chevrons on white sign',
      'Opposing red chevrons on white sign', 'Red chevron on narrow upright white sign',
      'Tea plantation', 'White front plate and yellow rear plate',
      'Round bollard with two broad black bands', 'Sugarcane field', 'Coastal sugarcane fields']) {
      const matches = clues.filter((item) => item.appearance.en === label)
      expect(matches).toHaveLength(1)
      expect(matches[0].assetIds.length).toBeGreaterThan(0)
    }
    expect(clues.some((item) => item.appearance.zh === '红底白箭头')).toBe(false)
  })

  it('uses explicit driving-side facts without making Thailand a right-driving favorite', () => {
    const right = clue('Traffic keeps right')!
    expect(right.assetIds).toHaveLength(0)
    expect(estimate('Traffic keeps right', 'loc:thailand')?.pPresent).toBe(0.03)
    expect(estimate('Traffic keeps right', 'loc:laos')?.pPresent).toBe(0.97)
    expect(estimate('Traffic keeps right', 'loc:canada')).toBeUndefined()
    const ranked = rankCandidates(countries.map((country) => country.id), estimates,
      [{ clueId: right.id, mode: 'seen', certainty: 'certain' }],
      { scope: 'country', parentByLocation, evidenceProfiles: evidenceProfileByClue })
    expect(ranked[0].id).not.toBe('loc:thailand')
    expect(ranked.find((row) => row.id === 'loc:thailand')!.share).toBeLessThan(0.01)
  })

  it('does not match the Turkish stop word inside unrelated place names', () => {
    const dur = clue('DUR on a stop sign')!
    expect(dur.assetIds.length).toBeGreaterThan(0)
    expect(estimate('DUR on a stop sign', 'loc:australia')).toBeUndefined()
    expect(estimate('DUR on a stop sign', 'loc:spain')).toBeUndefined()
    const words = ['DUR on a stop sign', 'BERHENTI on a stop sign',
      'Rainbow-pattern vehicle plate', 'Safaricom shop sign or advert'] as const
    const targets = ['loc:turkey', 'loc:malaysia', 'loc:hawaii', 'loc:kenya'] as const
    for (let index = 0; index < words.length; index++) {
      const selected = [{ clueId: clue(words[index])!.id, mode: 'seen' as const, certainty: 'certain' as const }]
      const ranks = rankCandidates(countries.map((country) => country.id), estimates, selected,
        { scope: 'country', parentByLocation, evidenceProfiles: evidenceProfileByClue,
          candidateByLocation: new Map(locations.map((place) => [place.id, place.candidate])) })
      expect(ranks[0].id).toBe(targets[index])
      expect(ranks[0].share).toBeGreaterThan(0.9)
    }
    const nunavut = clue('Blue green bilingual street sign')!
    const scheme = regionSchemeByCountry.get('loc:canada')!
    const regions = rankCandidates(scheme.regions.map((region) => region.id), estimates,
      [{ clueId: nunavut.id, mode: 'seen', certainty: 'certain' }],
      { scope: 'region', parentId: 'loc:canada', parentByLocation, evidenceProfiles: evidenceProfileByClue })
    expect(regions[0].id).toBe('loc:canada:region:ca-nu')
    expect(regions[0].share).toBeGreaterThan(0.9)
  })

  it('treats the green-backed road sign as a weak British Columbia mention, not contrary evidence', () => {
    const green = clue('Green back of a road sign')!
    const bc = estimate(green.appearance.en, 'loc:canada:region:ca-bc')!
    expect(bc.pPresent).toBe(0.34)
    expect(bc.sourceRelation).toBe('supports')
    expect(estimate(green.appearance.en, 'loc:canada')?.sourceRelation).toBe('inferred-parent')
    const regions = rankCandidates(['loc:canada:region:ca-bc', 'loc:canada:region:ca-on'], estimates,
      [{ clueId: green.id, mode: 'seen', certainty: 'certain' }],
      { scope: 'region', parentId: 'loc:canada', parentByLocation })
    expect(regions.find((row) => row.id === 'loc:canada:region:ca-bc')!.share)
      .toBeGreaterThanOrEqual(regions.find((row) => row.id === 'loc:canada:region:ca-on')!.share)
  })

  it('keeps reviewed rare appearances as source support and removes mismatched excerpts', () => {
    for (const [label, locationId, probability] of [
      ['White edge line', 'loc:qatar', 0.82],
      ['White letters on black plate', 'loc:singapore', 0.82],
      ['Yellow chevron on black', 'loc:luxembourg', 0.82],
      ['Flat terrain', 'loc:slovakia', 0.62],
      ['Pine trees', 'loc:philippines', 0.62],
      ['Farmland', 'loc:united-states', 0.14],
    ] as const) {
      expect(estimate(label, locationId)?.sourceRelation).toBe('supports')
      expect(estimate(label, locationId)?.pPresent).toBe(probability)
    }
    expect(estimate('Russian text', 'loc:russia')).toBeUndefined()
    expect(estimate('Taxi', 'loc:indonesia')).toBeUndefined()
    expect(estimate('Hindi text', 'loc:nepal')).toBeUndefined()
    expect(estimates.filter((row) => row.sourceRelation === 'opposes').every((row) => row.pPresent < 0.5)).toBe(true)
    expect(estimates.some((row) => row.sourceRelation === 'mixed' || row.sourceRelation === 'unclassified')).toBe(false)
    expect(estimate('Tamil text', 'loc:sri-lanka')?.sourceRelation).toBe('supports')
    expect(estimate('Finnish text', 'loc:sweden')).toBeUndefined()
    expect(estimate('Wetland', 'loc:brazil')?.sourceRelation).toBe('inferred-parent')
  })

  it('uses an explicit Canadian and American sign-word contrast', () => {
    const maximum = clue('MAXIMUM on a speed sign')!
    const ranked = rankCandidates(['loc:canada', 'loc:united-states'], estimates,
      [{ clueId: maximum.id, mode: 'seen', certainty: 'certain' }])
    expect(ranked[0].id).toBe('loc:canada')
    expect(estimate(maximum.appearance.en, 'loc:united-states')?.pPresent).toBeLessThan(0.5)
    expect(ranked.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('keeps differently shaped red chevron signs separate and retains frequency comparisons', () => {
    const broad = clue('Single red chevron on broad white sign')!
    const double = clue('Two red chevrons on white sign')!
    const opposing = clue('Opposing red chevrons on white sign')!
    const narrow = clue('Red chevron on narrow upright white sign')!
    expect(new Set([broad.id, double.id, opposing.id, narrow.id]).size).toBe(4)
    expect(estimate(broad.appearance.en, 'loc:denmark')?.pPresent).toBe(0.82)
    expect(estimate(broad.appearance.en, 'loc:turkey')?.pPresent).toBe(0.62)
    expect(estimate(broad.appearance.en, 'loc:jordan')).toBeUndefined()
    expect(estimate(double.appearance.en, 'loc:jordan')?.pPresent).toBe(0.62)
    expect(estimate(opposing.appearance.en, 'loc:bulgaria')?.pPresent).toBe(0.62)
    expect(estimate(narrow.appearance.en, 'loc:argentina')?.pPresent).toBe(0.82)
    const ranked = rankCandidates(['loc:denmark', 'loc:turkey'], estimates,
      [{ clueId: broad.id, mode: 'seen', certainty: 'certain' }],
      { scope: 'country', parentByLocation, evidenceProfiles: evidenceProfileByClue })
    expect(ranked[0].id).toBe('loc:denmark')
    expect(ranked[0].share).toBeGreaterThan(0.5)
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
    const marker = clue('Round bollard with two broad black bands')!
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
