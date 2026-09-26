import { describe, expect, it } from 'vitest'
import { countries, regionSchemeByCountry } from '../data/knowledge'
import type { Observation } from '../data/types'
import { CUSTOM_KIND, emptyCustomLibrary, mergeCustomLibraries, parseCustomLibrary, type CustomLibrary } from './library'
import { customClueRelevant, rankCustomCandidates } from './scoring'

const entry: CustomLibrary['clues'][number] = {
  id: 'custom-example123', appearance: { en: 'Black Street View car', zh: '黑色街景车' }, categoryId: 'camera',
  weights: [
    { locationId: 'loc:canada', seenMultiplier: 5, absentMultiplier: 0.8 },
    { locationId: 'loc:canada:region:ca-ab', seenMultiplier: 20, absentMultiplier: 0.1 },
  ],
}
const library: CustomLibrary = { schemaVersion: 1, kind: CUSTOM_KIND, clues: [entry] }
const seen = (certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId: entry.id, mode: 'seen', certainty })
const absent: Observation = { clueId: entry.id, mode: 'excluded', certainty: 'certain' }
const getShare = (rows: ReturnType<typeof rankCustomCandidates>, id: string) => rows.find((row) => row.id === id)!.share

describe('custom library', () => {
  it('validates versioned JSON and rejects untrusted targets, duplicate IDs and SVG images', () => {
    expect(parseCustomLibrary(library)).toEqual(library)
    const focused = { ...entry, imageDataUrl: 'data:image/png;base64,YQ==', cardCrop: 'left-half' }
    expect(parseCustomLibrary({ ...library, clues: [focused] }).clues[0].cardCrop).toBe('left-half')
    expect(() => parseCustomLibrary({ ...library, clues: [{ ...focused, cardCrop: 'center' }] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, clues: [{ ...entry, cardCrop: 'left-half' }] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, clues: [entry, entry] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, clues: [{ ...entry, weights: [{ locationId: 'loc:unknown', seenMultiplier: 2, absentMultiplier: 1 }] }] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, clues: [{ ...entry, imageDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, schemaVersion: 2 })).toThrow()
    expect(mergeCustomLibraries(emptyCustomLibrary(), library)).toEqual(library)
  })

  it('uses user multipliers without mixing in official clues, and selection order is stable', () => {
    const ids = ['loc:canada', 'loc:united-states', 'loc:nigeria']
    const baseline = rankCustomCandidates(ids, library, [], { kind: 'country' })
    expect(baseline.every((row) => row.share === 1 / 3)).toBe(true)
    const certain = rankCustomCandidates(ids, library, [seen()], { kind: 'country' })
    const unsure = rankCustomCandidates(ids, library, [seen('uncertain')], { kind: 'country' })
    expect(getShare(certain, 'loc:canada')).toBeGreaterThan(getShare(unsure, 'loc:canada'))
    expect(getShare(unsure, 'loc:canada')).toBeGreaterThan(1 / 3)
    expect(rankCustomCandidates(ids, library, [{ clueId: 'official-clue', mode: 'seen', certainty: 'certain' }], { kind: 'country' })).toEqual(baseline)
    expect(rankCustomCandidates(ids, library, [seen(), { clueId: 'official-clue', mode: 'seen', certainty: 'certain' }], { kind: 'country' })).toEqual(certain)
    expect(certain.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('marginalizes a province weight into its parent and keeps region shares conditional', () => {
    const canadianRegions = regionSchemeByCountry.get('loc:canada')!.regions.map((region) => region.id)
    const regionRanks = rankCustomCandidates(canadianRegions, library, [seen()], { kind: 'region', countryId: 'loc:canada' })
    expect(regionRanks[0].id).toBe('loc:canada:region:ca-ab')
    expect(getShare(regionRanks, 'loc:canada:region:ca-ab')).toBeCloseTo(20 / (20 + canadianRegions.length - 1))
    const countryRanks = rankCustomCandidates(['loc:canada', 'loc:united-states'], library, [seen()], { kind: 'country' })
    const expectedCanadaMultiplier = 5 * ((20 + canadianRegions.length - 1) / canadianRegions.length)
    expect(getShare(countryRanks, 'loc:canada')).toBeCloseTo(expectedCanadaMultiplier / (expectedCanadaMultiplier + 1))
    expect(customClueRelevant(entry, ['loc:canada'])).toBe(true)
    expect(customClueRelevant(entry, ['loc:nigeria'])).toBe(false)
  })

  it('marginalizes joint province evidence without assigning clues to different provinces', () => {
    const regions = regionSchemeByCountry.get('loc:canada')!.regions.map((region) => region.id)
    const alberta = { ...entry, id: 'custom-alberta1', weights: [{ locationId: 'loc:canada:region:ca-ab', seenMultiplier: 10, absentMultiplier: 1 }] }
    const britishColumbia = { ...entry, id: 'custom-british1', weights: [{ locationId: 'loc:canada:region:ca-bc', seenMultiplier: 10, absentMultiplier: 1 }] }
    const twoClues: CustomLibrary = { ...library, clues: [alberta, britishColumbia] }
    const observations: Observation[] = [
      { clueId: alberta.id, mode: 'seen', certainty: 'certain' },
      { clueId: britishColumbia.id, mode: 'seen', certainty: 'certain' },
    ]
    const ranked = rankCustomCandidates(['loc:canada', 'loc:united-states'], twoClues, observations, { kind: 'country' })
    const jointMarginal = (10 + 10 + regions.length - 2) / regions.length
    expect(getShare(ranked, 'loc:canada')).toBeCloseTo(jointMarginal / (jointMarginal + 1))
    expect(rankCustomCandidates(['loc:canada', 'loc:united-states'], twoClues, [...observations].reverse(), { kind: 'country' })).toEqual(ranked)
    const conditional = rankCustomCandidates(regions, twoClues, observations, { kind: 'region', countryId: 'loc:canada' })
    expect(getShare(conditional, 'loc:canada:region:ca-ab')).toBeCloseTo(10 / (20 + regions.length - 2))
    expect(getShare(conditional, 'loc:canada:region:ca-bc')).toBeCloseTo(10 / (20 + regions.length - 2))
  })

  it('replaces overlapping broad evidence without making a second plate vote', () => {
    const broad = { ...entry, id: 'custom-broadplate', weights: [{ locationId: 'loc:canada', seenMultiplier: 5, absentMultiplier: 0.8 }] }
    const detail = { ...entry, id: 'custom-detailplate', supersedesClueIds: [broad.id],
      weights: [{ locationId: 'loc:canada', seenMultiplier: 20, absentMultiplier: 1 }] }
    const plateLibrary = parseCustomLibrary({ ...library, clues: [broad, detail] })
    const ids = ['loc:canada', 'loc:united-states']
    const broadSeen: Observation = { clueId: broad.id, mode: 'seen', certainty: 'certain' }
    const detailSeen: Observation = { clueId: detail.id, mode: 'seen', certainty: 'certain' }
    const detailUnsure: Observation = { ...detailSeen, certainty: 'uncertain' }
    const single = rankCustomCandidates(ids, plateLibrary, [detailSeen], { kind: 'country' })
    const both = rankCustomCandidates(ids, plateLibrary, [broadSeen, detailSeen], { kind: 'country' })
    expect(both).toEqual(single)
    expect(rankCustomCandidates(ids, plateLibrary, [detailSeen, broadSeen], { kind: 'country' })).toEqual(single)
    const partly = rankCustomCandidates(ids, plateLibrary, [broadSeen, detailUnsure], { kind: 'country' })
    const expected = Math.sqrt(5 * 20)
    expect(getShare(partly, 'loc:canada')).toBeCloseTo(expected / (expected + 1))
    const broadAbsent: Observation = { ...broadSeen, mode: 'excluded' }
    const contradictory = rankCustomCandidates(ids, plateLibrary, [broadAbsent, detailSeen], { kind: 'country' })
    expect(getShare(contradictory, 'loc:canada')).toBeCloseTo((0.8 * 20) / (0.8 * 20 + 1))
    expect(() => parseCustomLibrary({ ...library, clues: [{ ...detail, supersedesClueIds: [detail.id] }] })).toThrow()
    expect(() => parseCustomLibrary({ ...library, clues: [
      { ...broad, supersedesClueIds: [detail.id] }, detail,
    ] })).toThrow()
  })

  it('uses separate clearly absent multipliers and remains finite for extreme valid weights', () => {
    const candidateIds = countries.map((country) => country.id)
    const ranks = rankCustomCandidates(candidateIds, library, [absent], { kind: 'country' })
    expect(getShare(ranks, 'loc:canada')).toBeLessThan(getShare(ranks, 'loc:nigeria'))
    const extreme = parseCustomLibrary({ ...library, clues: [{ ...entry, weights: [{ locationId: 'loc:canada', seenMultiplier: 1000, absentMultiplier: 0.01 }] }] })
    const extremeRanks = rankCustomCandidates(candidateIds, extreme, [seen()], { kind: 'country' })
    expect(extremeRanks.every((row) => Number.isFinite(row.share) && row.share >= 0 && row.share <= 1)).toBe(true)
    expect(extremeRanks.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })
})
