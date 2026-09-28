import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { regionSchemeByCountry } from '../data/knowledge'
import type { Observation } from '../data/types'
import { parseCustomLibrary } from './library'
import { rankCustomCandidates } from './scoring'

const library = parseCustomLibrary(JSON.parse(readFileSync(new URL('../../public/libraries/africa.json', import.meta.url), 'utf8')))
const manifest = JSON.parse(readFileSync(new URL('../data/africa-library-manifest.json', import.meta.url), 'utf8')) as { candidateCountryIds: string[] }
const seen = (clueId: string, certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId, mode: 'seen', certainty })
const rank = (observations: Observation[]) => rankCustomCandidates(manifest.candidateCountryIds, library, observations, { kind: 'country' })
const share = (rows: ReturnType<typeof rank>, id: string) => rows.find((row) => row.id === id)!.share
const roof = 'custom-6c338862-7fa0-443d-8a76-3246f2ed7c1a'
const taxi = 'custom-a5fae3fd-e8af-44bd-87ed-3af7e78018b7'
const ugandaMinibus = 'custom-935fe5dd-bee7-40f1-98df-d3f3414dd64b'
const marker = 'custom-30d1f2e2-e03f-4349-879d-7c555316d7ea'
const followCar = 'custom-19741861-0967-4d63-8fc4-f4323106ce04'
const policeCar = 'custom-ba9597a3-b908-4092-8ecd-9e1465afa280'

const newIds = [
  marker, roof, 'custom-ae8383bd-a007-4fe7-8bc0-7891383eeb5b', taxi,
  'custom-9b28bb9f-6b9b-4efa-a751-ff6a89d9b2ea', ugandaMinibus,
  'custom-4f247d78-566e-4f1c-af9a-fb7be896433e',
  'custom-4a56d36d-6685-44d3-b44b-cfaeea354ca8',
  'custom-9b7fcd82-22a9-4e7d-8c3e-32dc65dbcc90',
  'custom-f7c97976-152e-418b-8c92-5c439e4d5d58',
  'custom-5d9f542e-a828-47b0-b5d7-dff535d9253b',
  'custom-2759df03-7582-4980-830c-16df5ce86f67',
]

describe('Africa Plus merge', () => {
  it('keeps supplied photos, corrects bilingual visual descriptions, and absorbs duplicate text notes', () => {
    expect(library.clues).toHaveLength(109)
    expect(new Set(newIds).size).toBe(12)
    for (const id of newIds) {
      const clue = library.clues.find((item) => item.id === id)
      expect(clue?.imageDataUrl).toMatch(/^data:image\/(?:jpeg|png|webp);base64,/)
      expect(clue?.appearance.en).not.toMatch(/[\u3400-\u9fff]/)
      expect(clue?.appearance.zh).toMatch(/[\u3400-\u9fff]/)
    }
    expect(library.clues.find((item) => item.id === taxi)?.categoryId).toBe('road-vehicles')
    expect(library.clues.find((item) => item.id === 'custom-ae8383bd-a007-4fe7-8bc0-7891383eeb5b')?.categoryId).toBe('poles')
    expect(library.clues.find((item) => item.id === followCar)?.weights.map((row) => row.locationId)).toEqual(['loc:tunisia', 'loc:nigeria', 'loc:kenya'])
    expect(library.clues.find((item) => item.id === 'custom-43972249-2d0b-4efd-a0ce-c6d503c46663')).toBeDefined()
  })

  it('shares red-topped marker evidence and makes a distinctive taxi stronger than broad terrain', () => {
    const markerRows = rank([seen(marker)])
    expect(share(markerRows, 'loc:tunisia')).toBeCloseTo(share(markerRows, 'loc:senegal'))
    expect(share(markerRows, 'loc:tunisia')).toBeGreaterThan(share(markerRows, 'loc:ghana'))
    expect(share(rank([seen(taxi)]), 'loc:ghana')).toBeGreaterThan(share(rank([seen('custom-9b7fcd82-22a9-4e7d-8c3e-32dc65dbcc90')]), 'loc:botswana'))
  })

  it('keeps detailed car evidence from counting again as generic roof rack or follow car', () => {
    for (const id of ['custom-5030a807-62dc-4934-b46c-af7607cb4673', 'custom-8918381d-ec66-4e5f-b94c-8b03a7631a4f']) {
      expect(rank([seen(roof), seen(id)])).toEqual(rank([seen(id)]))
    }
    expect(rank([seen(followCar), seen(policeCar)])).toEqual(rank([seen(policeCar)]))
  })

  it('lets the Kampala minibus support Uganda and redistribute within Uganda only once', () => {
    const countryRows = rank([seen(ugandaMinibus)])
    expect(share(countryRows, 'loc:uganda') / share(countryRows, 'loc:botswana')).toBeCloseTo(10)
    const regions = regionSchemeByCountry.get('loc:uganda')!.regions.map((region) => region.id)
    const regionRows = rankCustomCandidates(regions, library, [seen(ugandaMinibus)], { kind: 'region', countryId: 'loc:uganda' })
    expect(regionRows[0].id).toBe('loc:uganda:region:ug-capital')
    expect(regionRows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('remains order-independent, reversible, normalized, and less decisive when uncertain', () => {
    const a = seen(taxi)
    const b = seen(marker)
    expect(rank([a, b])).toEqual(rank([b, a]))
    expect(rank([a, b].filter((item) => item.clueId !== b.clueId))).toEqual(rank([a]))
    expect(share(rank([seen(taxi, 'uncertain')]), 'loc:ghana')).toBeLessThan(share(rank([a]), 'loc:ghana'))
    expect(rank([a, b]).reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })
})
