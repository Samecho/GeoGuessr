import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCustomLibrary } from './library'
import { rankCustomCandidates } from './scoring'
import manifest from '../data/europe-library-manifest.json'

const library = parseCustomLibrary(JSON.parse(readFileSync('public/libraries/europe.json', 'utf8')))
const ids = manifest.candidateCountryIds
const rank = (clueId: string) => rankCustomCandidates(ids, library, [{ clueId, mode: 'seen', certainty: 'certain' }], { kind: 'country' })
const share = (rows: ReturnType<typeof rank>, id: string) => rows.find((row) => row.id === id)!.share

describe('Europe library calibration', () => {
  it('gives a distinctive domain or language a decisive but non-absolute share', () => {
    expect(share(rank('custom-europe-domain-fi'), 'loc:finland')).toBeGreaterThan(0.9)
    expect(share(rank('custom-europe-language-finnish'), 'loc:finland')).toBeGreaterThan(0.9)
  })
  it('keeps shared language and driving-side observations shared', () => {
    const german = rank('custom-europe-language-german')
    expect(german[0].share).toBeLessThan(0.35)
    const left = rank('custom-europe-driving-left')
    expect(left.slice(0, 2).map((row) => row.id)).toEqual(['loc:ireland', 'loc:united-kingdom'])
    expect(left[0].share).toBeLessThan(0.5)
  })
  it('leaves broad landscape weak while a specific pole can stand out', () => {
    const forest = library.clues.find((clue) => clue.appearance.en === 'Wooded road with dense trees on both sides')!
    const pole = library.clues.find((clue) => clue.appearance.en === 'Concrete utility pole with rectangular holes down its centre')!
    expect(rank(forest.id)[0].share).toBeLessThan(0.1)
    expect(share(rank(pole.id), 'loc:poland')).toBeGreaterThan(0.8)
  })
  it('normalizes the active candidates and removes evidence without residue', () => {
    const empty = rankCustomCandidates(ids, library, [], { kind: 'country' })
    expect(empty.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 12)
    expect(empty.every((row) => Math.abs(row.share - 1 / 38) < 1e-12)).toBe(true)
    const subset = rankCustomCandidates(['loc:finland', 'loc:sweden'], library, [{ clueId: 'custom-europe-domain-fi', mode: 'seen', certainty: 'certain' }], { kind: 'country' })
    expect(subset.map((row) => row.id)).toEqual(['loc:finland', 'loc:sweden'])
    expect(subset.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 12)
  })
})
