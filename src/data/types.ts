export type Text2 = { en: string; zh: string }
export type Continent = 'Europe' | 'Asia' | 'Africa' | 'North America' | 'South America' | 'Oceania' | 'Antarctica'
export type Country = { id: string; name: Text2; continent: Continent; flagCode?: string; kind: 'country' | 'territory' }
export type Region = { id: string; name: Text2; coverageSource: string }
export type RegionScheme = { schemaVersion: number; countryId: string; granularity: Text2; regions: Region[]; note: Text2; complete: boolean }
export type Category = { id: string; name: Text2; children: { id: string; name: Text2; selectionMode: 'single' | 'multiple' }[] }
export type Asset = {
  id: string; path: string; sourceUrl: string; author: string; license: string; licenseUrl: string
  attribution: string; redistribution: string; reviewed: string; status: 'source-reference'; sourcePath?: string; cardCrop?: 'left' | 'top' | 'bottom'
}
export type Clue = {
  id: string; categoryId: string; groupId: string; appearance: Text2; formalName: Text2
  identify: Text2; geography: Text2; strength: Text2; caveat: Text2
  sourceUrls: string[]; reviewed: string; assetIds: string[]; tags: string[]
  referenceAssetIds?: string[]; exclusionAllowed?: boolean; cardCrop?: 'left' | 'top' | 'bottom'
}
export type EvidenceProfile = {
  featureId: string; unknownPrevalence: number; certainSpecificity?: number
  formalName: Text2; sourceFactId: string; basisReason: string; measured: false
}
export type Observation = { clueId: string; mode: 'seen' | 'excluded'; certainty: 'certain' | 'uncertain' }
export type EvidenceEstimate = {
  featureId: string; locationId: string; pPresent: number; band: string
  basis: string; basisReason: string; status: 'initial-estimate'; measured: false; sourceFactId: string; sourceFactIds?: string[]; claimIds?: string[]
  sourceRelation?: 'supports' | 'opposes' | 'explicit-absence' | 'inferred-parent' | 'inferred-condition' | 'mixed' | 'unclassified'
}
export type InteractionRule = {
  id: string; featureIds: string[]; locationId: string; relation: 'interaction'
  likelihoodRatio: number; certaintyMode: 'minimum'; condition: 'all-seen'
  sourceFactId: string; rationale: string; measured: false
}
