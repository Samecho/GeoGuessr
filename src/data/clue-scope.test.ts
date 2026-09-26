import { describe, expect, it } from 'vitest'
import { scopedClueIds } from './clue-scope'
import { clues, countries, estimates, locations, regionSchemeByCountry } from './knowledge'

const parentByLocation = new Map(locations.map((location) => [location.id, location.parentId]))
const id = (english: string) => clues.find((clue) => clue.appearance.en === english)?.id

describe('source-backed gallery relevance', () => {
  it('shows provincial evidence but hides only national or unrelated clues in Canada scope', () => {
    const visible = scopedClueIds(['loc:canada'], estimates, regionSchemeByCountry, parentByLocation)
    expect(visible.has(id('Yellow star on blue stripe of tricolor flag')!)).toBe(true)
    expect(visible.has(id('Vehicle without a front plate')!)).toBe(true)
    expect(visible.has(id('Vehicle with a front plate')!)).toBe(true)
    expect(visible.has(id('Traffic keeps right')!)).toBe(false)
    expect(visible.has(id('Tamil text')!)).toBe(false)
    expect(visible.has(id('MAXIMUM on a speed sign')!)).toBe(false)
  })

  it('lets users inspect country-cited observations even without a regional likelihood', () => {
    const allCited = scopedClueIds(['loc:canada'], estimates, regionSchemeByCountry, parentByLocation, new Map(), true)
    expect(allCited.has(id('MAXIMUM on a speed sign')!)).toBe(true)
    expect(allCited.has(id('Vehicle without a front plate')!)).toBe(true)
    expect(allCited.has(id('Traffic keeps right')!)).toBe(false)
    expect(allCited.has(id('Tamil text')!)).toBe(false)
  })

  it('retains sourced opposition as a selectable clue within a hard scope', () => {
    const contrary = { ...estimates[0], featureId: 'synthetic-opposition-only',
      locationId: 'loc:canada:region:ca-bc', pPresent: 0.03,
      basis: 'focused-local-comparison-v1', sourceRelation: 'opposes' as const }
    const regional = scopedClueIds(['loc:canada'], [...estimates, contrary], regionSchemeByCountry, parentByLocation)
    expect(regional.has(contrary.featureId)).toBe(true)
    const countries = scopedClueIds(['loc:canada', 'loc:united-states'], [...estimates,
      { ...contrary, locationId: 'loc:canada' }], regionSchemeByCountry, parentByLocation)
    expect(countries.has(contrary.featureId)).toBe(true)
  })

  it('uses all manually scoped candidates and does not use their current rank', () => {
    const africa = countries.filter((country) => country.continent === 'Africa').map((country) => country.id)
    const african = scopedClueIds(africa, estimates, regionSchemeByCountry, parentByLocation)
    expect(african.has(id('Solid blue vehicle plate')!)).toBe(true)
    expect(african.has(id('Yellow star on blue stripe of tricolor flag')!)).toBe(false)
    const northAmerica = scopedClueIds(['loc:canada', 'loc:united-states'], estimates, regionSchemeByCountry, parentByLocation)
    expect(northAmerica.has(id('MAXIMUM on a speed sign')!)).toBe(true)
    expect(northAmerica.has(id('Yellow star on blue stripe of tricolor flag')!)).toBe(true)
  })
})
