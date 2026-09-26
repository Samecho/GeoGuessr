import { countries } from './countries'
import type { Continent, Text2 } from './types'

export type GeographicGroup = { id: string; name: Text2; countryIds: string[]; kind: 'continent' | 'region' }

const continentNames: Record<Continent, Text2> = {
  Europe: { en: 'Europe', zh: '欧洲' }, Asia: { en: 'Asia', zh: '亚洲' },
  Africa: { en: 'Africa', zh: '非洲' }, 'North America': { en: 'North America', zh: '北美洲' },
  'South America': { en: 'South America', zh: '南美洲' }, Oceania: { en: 'Oceania', zh: '大洋洲' },
  Antarctica: { en: 'Antarctica', zh: '南极洲' },
}

const continentGroups: GeographicGroup[] = (Object.keys(continentNames) as Continent[]).map((continent) => ({
  id: `continent:${continent}`, name: continentNames[continent], kind: 'continent',
  countryIds: countries.filter((country) => country.continent === continent).map((country) => country.id),
}))

const regionalDefinitions: { id: string; name: Text2; countryIds: string[] }[] = [
  { id: 'southeast-asia', name: { en: 'Southeast Asia', zh: '东南亚' }, countryIds: [
    'loc:cambodia', 'loc:indonesia', 'loc:laos', 'loc:malaysia', 'loc:philippines',
    'loc:singapore', 'loc:thailand', 'loc:vietnam',
  ] },
  { id: 'east-asia', name: { en: 'East Asia', zh: '东亚' }, countryIds: [
    'loc:china', 'loc:japan', 'loc:mongolia', 'loc:south-korea',
  ] },
  { id: 'eastern-europe', name: { en: 'Eastern Europe', zh: '东欧' }, countryIds: [
    'loc:belarus', 'loc:bulgaria', 'loc:czechia', 'loc:estonia', 'loc:hungary',
    'loc:latvia', 'loc:lithuania', 'loc:poland', 'loc:romania', 'loc:russia',
    'loc:slovakia', 'loc:ukraine',
  ] },
  { id: 'northern-europe', name: { en: 'Northern Europe', zh: '北欧' }, countryIds: [
    'loc:denmark', 'loc:faroe-islands', 'loc:finland', 'loc:iceland', 'loc:norway', 'loc:svalbard', 'loc:sweden',
  ] },
  { id: 'western-europe', name: { en: 'Western Europe', zh: '西欧' }, countryIds: [
    'loc:andorra', 'loc:austria', 'loc:belgium', 'loc:france', 'loc:germany',
    'loc:ireland', 'loc:liechtenstein', 'loc:luxembourg', 'loc:monaco',
    'loc:netherlands', 'loc:switzerland', 'loc:united-kingdom',
  ] },
  { id: 'latin-america', name: { en: 'Latin America', zh: '拉丁美洲' }, countryIds: [
    'loc:argentina', 'loc:bolivia', 'loc:brazil', 'loc:chile', 'loc:colombia',
    'loc:ecuador', 'loc:peru', 'loc:uruguay',
    'loc:costa_rica', 'loc:dominican', 'loc:guatemala', 'loc:martinique',
    'loc:mexico', 'loc:panama', 'loc:puerto-rico',
  ] },
]

export const geographicGroups: GeographicGroup[] = [
  ...continentGroups,
  ...regionalDefinitions.map((group) => ({ ...group, kind: 'region' as const })),
]

export const geographicGroupById = new Map(geographicGroups.map((group) => [group.id, group]))

/** Presets only change the user's hard scope. They never depend on live rank. */
export function toggleGroupIds(currentIds: readonly string[], groupIds: readonly string[]): string[] {
  const selected = new Set(currentIds)
  const remove = groupIds.every((id) => selected.has(id))
  for (const id of groupIds) if (remove) selected.delete(id); else selected.add(id)
  return countries.map((country) => country.id).filter((id) => selected.has(id))
}
