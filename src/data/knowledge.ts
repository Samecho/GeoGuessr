import type { Asset, Category, Clue, Continent, Country, EvidenceEstimate, InteractionRule, RegionScheme, Text2 } from './types'
import locationsFile from './knowledge/locations.json'
import categoriesFile from './knowledge/categories.json'
import featuresFile from './knowledge/runtime-features.json'
import estimatesFile from './knowledge/estimates.json'
import interactionsFile from './knowledge/interactions.json'
import modelFile from './knowledge/model-parameters.json'
import regionsFile from './knowledge/regions.json'
import photoCurationFile from './knowledge/photo-curation.json'

type LocationRecord = { id: string; kind: 'country' | 'territory' | 'region'; name: Text2; parentId: string | null; continent: Continent; candidate: boolean; flagCode?: string; source: { path: string | null; metadataPath: string; url: string; localCode?: string } }
type FeatureRecord = { id: string; categoryId: string; appearance: Text2; evidenceGroupIds: string[]; assetIds: string[]; translationStatus: string }
type PhotoCuration = { assets: Asset[]; matches: { assetId: string; featureId: string; basis: string }[] }

export const schemaVersion = 3
const en = (value: string): Text2 => ({ en: value, zh: value })
export const locations = (locationsFile as { locations: LocationRecord[] }).locations
export const locationById = new Map(locations.map((location) => [location.id, location]))
export const categories = (categoriesFile as { categories: Category[] }).categories
export const features = (featuresFile as { features: FeatureRecord[] }).features
export const estimates = (estimatesFile as unknown as { estimates: EvidenceEstimate[] }).estimates
export const interactions = (interactionsFile as { interactions: InteractionRule[] }).interactions
export const candidateByLocation = new Map(locations.map((location) => [location.id, location.candidate]))
export const modelParameters = (modelFile as { parameters: { qualitativePrevalenceBands: Record<string, number>; observationModel: { certainSensitivity: number; certainSpecificity: number; uncertainSensitivity: number; uncertainSpecificity: number }; [key: string]: unknown } }).parameters

export const countries: Country[] = locations.filter((location) => location.candidate).map((location) => ({
  id: location.id, name: location.name, continent: location.continent,
  flagCode: location.flagCode?.toLowerCase(), kind: location.kind === 'country' ? 'country' : 'territory',
}))
export const countryById = new Map(countries.map((country) => [country.id, country]))

export const clues: Clue[] = features.map((feature) => ({
  id: feature.id, categoryId: feature.categoryId, groupId: feature.evidenceGroupIds[0] || feature.id,
  appearance: feature.appearance, formalName: feature.appearance,
  identify: { en: 'Loading source notes…', zh: '正在加载来源摘录……' },
  geography: { en: 'Loading supported location relations…', zh: '正在加载地点关系……' },
  strength: en('Initial qualitative estimate; not a measured frequency.'),
  caveat: en('Unknown source mentions are not evidence of absence. Repeated photos do not add evidence.'),
  sourceUrls: [], reviewed: '2026-09-25', assetIds: feature.assetIds || [], referenceAssetIds: [], tags: [feature.categoryId], exclusionAllowed: true,
}))
export const clueById = new Map(clues.map((clue) => [clue.id, clue]))
export const assets: Asset[] = (photoCurationFile as PhotoCuration).assets
export const assetById = new Map(assets.map((asset) => [asset.id, asset]))

export const regionSchemes: RegionScheme[] = (regionsFile as { regionSchemes: RegionScheme[] }).regionSchemes
export const regionSchemeByCountry = new Map(regionSchemes.filter((scheme) => scheme.complete).map((scheme) => [scheme.countryId, scheme]))
export const regionCoverageByCountry = new Map(regionSchemes.map((scheme) => [scheme.countryId, scheme.regions.length]))
