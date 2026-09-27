import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { regionSchemeByCountry } from '../data/knowledge'
import type { Observation } from '../data/types'
import { parseCustomLibrary } from './library'
import { rankCustomCandidates } from './scoring'

const library = parseCustomLibrary(JSON.parse(readFileSync(new URL('../../public/libraries/africa.json', import.meta.url), 'utf8')))
const manifest = JSON.parse(readFileSync(new URL('../data/africa-library-manifest.json', import.meta.url), 'utf8')) as { candidateCountryIds: string[] }
const seen = (clueId: string): Observation => ({ clueId, mode: 'seen', certainty: 'certain' })
const right = seen('custom-africa-drive-right')
const green = seen('custom-f4244a96-8f15-49e7-a0c9-1985467a8e08')
const white = seen('custom-db2c9373-9185-4dc6-87ce-ed26614ca4ce')
const yellow = seen('custom-2a854b5b-5304-4fd2-b71b-193ebec31681')
const blue = seen('custom-4b7957fe-6abe-4cf2-a2cf-7e55f3607018')
const greenBand = seen('custom-africa-plates-eswatini-green-bottom')
const pairedPlate = seen('custom-africa-plates-front-white-rear-yellow')
const rank = (observations: Observation[]) => rankCustomCandidates(manifest.candidateCountryIds, library, observations, { kind: 'country' })
const share = (rows: ReturnType<typeof rank>, id: string) => rows.find((row) => row.id === id)!.share

const plateClues = library.clues.filter((clue) => clue.categoryId === 'plates')

describe('built-in Africa plate clues', () => {
  it('offers five consistently worded broad colors and no duplicate green or blue tint card', () => {
    expect(plateClues).toHaveLength(15)
    const broad = [white, yellow, green, blue, seen('custom-africa-plates-black-white')]
    expect(plateClues.slice(0, 5).map((clue) => clue.id)).toEqual(broad.map((item) => item.clueId))
    expect(broad.map((item) => library.clues.find((clue) => clue.id === item.clueId)?.appearance.en)).toEqual([
      'White visible on a license plate', 'Yellow visible on a license plate', 'Green visible on a license plate',
      'Blue visible on a license plate', 'Black visible on a license plate',
    ])
    expect(plateClues.filter((clue) => /green-tinted|green tint|blue-tinted|noticeable blue/i.test(clue.appearance.en))).toHaveLength(0)
    const colorWeight = (clueId: string, locationId: string) => library.clues.find((clue) => clue.id === clueId)?.weights.find((row) => row.locationId === locationId)?.seenMultiplier
    expect(colorWeight(white.clueId, 'loc:tunisia')).toBeGreaterThan(1) // white characters on black plate
    expect(colorWeight(yellow.clueId, 'loc:eswatini')).toBeGreaterThan(1) // yellow detail on a green-banded plate
    expect(colorWeight('custom-africa-plates-black-white', 'loc:namibia')).toBeGreaterThan(1) // black characters on yellow plate
  })

  it('lets a green plate support Nigeria and Free State while verified alternative palettes give modest counter-evidence', () => {
    const weights = library.clues.find((clue) => clue.id === green.clueId)!.weights
    const weight = (id: string) => weights.find((row) => row.locationId === id)?.seenMultiplier
    expect(weight('loc:nigeria')).toBeGreaterThan(1)
    expect(weight('loc:ghana')).toBeGreaterThan(0)
    expect(weight('loc:ghana')).toBeLessThan(1)
    expect(weight('loc:tunisia')).toBeLessThan(1)
    expect(weight('loc:reunion')).toBeUndefined()
    const ranked = rank([right, green])
    expect(ranked[0].id).toBe('loc:nigeria')
    expect(share(ranked, 'loc:nigeria')).toBeGreaterThan(share(ranked, 'loc:tunisia'))
    expect(ranked.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    expect(rank([green, right])).toEqual(ranked)
    const southAfricanRegions = regionSchemeByCountry.get('loc:south-africa')!.regions.map((region) => region.id)
    const regional = rankCustomCandidates(southAfricanRegions, library, [green], { kind: 'region', countryId: 'loc:south-africa' })
    expect(regional[0].id).toBe('loc:south-africa:region:za-fs')
  })

  it('uses a detailed plate once when its broader colors are also selected', () => {
    expect(rank([white, yellow, pairedPlate])).toEqual(rank([pairedPlate]))
    expect(rank([white, green, greenBand])).toEqual(rank([greenBand]))
    const longKenyan = seen('custom-africa-plates-kenya-long-white-square-yellow')
    expect(rank([white, yellow, pairedPlate, longKenyan])).toEqual(rank([longKenyan]))
  })
})
