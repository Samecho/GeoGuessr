import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Observation } from '../data/types'
import { parseCustomLibrary } from './library'
import { rankCustomCandidates } from './scoring'

const library = parseCustomLibrary(JSON.parse(readFileSync(new URL('../../public/libraries/africa.json', import.meta.url), 'utf8')))
const manifest = JSON.parse(readFileSync(new URL('../data/africa-library-manifest.json', import.meta.url), 'utf8')) as { candidateCountryIds: string[] }
const seen = (clueId: string): Observation => ({ clueId, mode: 'seen', certainty: 'certain' })
const right = seen('custom-africa-drive-right')
const whiteCenter = seen('custom-africa-white-center')
const greenPlate = seen('custom-africa-plates-south-africa-free-state-green')
const rank = (observations: Observation[]) => rankCustomCandidates(manifest.candidateCountryIds, library, observations, { kind: 'country' })
const share = (rows: ReturnType<typeof rank>, id: string) => rows.find((row) => row.id === id)!.share

describe('built-in Africa evidence calibration', () => {
  it('keeps a common white centerline weak, and a clearly observed plate can outweigh it', () => {
    const broad = rank([right, whiteCenter])
    expect(share(broad, 'loc:tunisia') / share(broad, 'loc:nigeria')).toBeLessThanOrEqual(1.2)
    const withPlate = rank([right, whiteCenter, greenPlate])
    expect(share(withPlate, 'loc:nigeria')).toBeGreaterThan(share(withPlate, 'loc:tunisia'))
    expect(withPlate.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    expect(rank([greenPlate, whiteCenter, right])).toEqual(withPlate)
    expect(rank([right, whiteCenter])).toEqual(broad)
  })

})
