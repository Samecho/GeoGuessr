import { describe, expect, it } from 'vitest'
import { countries } from './countries'
import { geographicGroups, geographicGroupById, toggleGroupIds } from './geographic-groups'

const memberIds = new Set(countries.map((country) => country.id))
const group = (id: string) => geographicGroupById.get(id)!.countryIds

describe('manual geographic presets', () => {
  it('has only unique, real candidate IDs in each preset', () => {
    for (const item of geographicGroups) {
      expect(item.countryIds.length).toBeGreaterThan(0)
      expect(new Set(item.countryIds).size).toBe(item.countryIds.length)
      for (const id of item.countryIds) expect(memberIds.has(id)).toBe(true)
    }
  })

  it('combines continents and can remove one without changing the other', () => {
    const europe = group('continent:Europe')
    const africa = group('continent:Africa')
    const both = toggleGroupIds(toggleGroupIds([], europe), africa)
    expect(both).toHaveLength(europe.length + africa.length)
    expect(both).toContain('loc:ghana')
    expect(both).toContain('loc:poland')
    expect(toggleGroupIds(both, europe)).toEqual(africa)
  })

  it('keeps East Asia, Southeast Asia and Latin America as distinct selectable sets', () => {
    const east = group('east-asia'), southeast = group('southeast-asia'), latin = group('latin-america')
    expect(east).toContain('loc:japan')
    expect(east).not.toContain('loc:thailand')
    expect(southeast).toContain('loc:thailand')
    expect(southeast).not.toContain('loc:japan')
    expect(latin).toContain('loc:mexico')
    expect(latin).toContain('loc:brazil')
    expect(latin).not.toContain('loc:falkland-islands')
    expect(latin).not.toContain('loc:curacao')
    expect(group('northern-europe')).toContain('loc:sweden')
    expect(group('western-europe')).toContain('loc:france')
    expect(toggleGroupIds(east, southeast)).toHaveLength(east.length + southeast.length)
  })
})
