export type Text2 = { en: string; zh: string }
export type Continent = 'Europe' | 'Asia' | 'Africa' | 'North America' | 'South America' | 'Oceania'
export type Country = {
  id: string
  name: Text2
  continent: Continent
  coverage: 'road' | 'limited-road'
  coverageNote: Text2
  coverageSource: string
  reviewed: string
}
export type Region = { id: string; name: Text2; coverageSource: string }
export type RegionScheme = { schemaVersion: 1; countryId: string; granularity: Text2; regions: Region[]; note: Text2 }
export type Category = { id: string; name: Text2; children: { id: string; name: Text2; selectionMode: 'single' | 'multiple' }[] }
export type Asset = {
  id: string; path: string; sourceUrl: string; author: string; license: string; licenseUrl: string
  attribution: string; redistribution: string; reviewed: string; status: 'approved'
}
export type Clue = {
  id: string; categoryId: string; groupId: string; appearance: Text2; formalName: Text2
  identify: Text2; geography: Text2; strength: Text2; caveat: Text2
  sourceUrls: string[]; reviewed: string; assetIds: string[]; tags: string[]
  referenceAssetIds?: string[]
  exclusionAllowed?: boolean
}
export type Observation = { clueId: string; mode: 'seen' | 'excluded'; certainty: 'certain' | 'uncertain' }
export type Rule = {
  id: string; scope: 'country' | 'region'; targets: string[]; countryId?: string
  when: { all?: string[]; any?: string[]; excluded?: string[] }
  weight: number; group: string; relation: 'single' | 'extra' | 'replace'
  sourceUrls: string[]; rationale: Text2; reviewed: string
}
