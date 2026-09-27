import { categories, countries, regionSchemes } from '../data/knowledge'
import type { Clue, Text2 } from '../data/types'

export const CUSTOM_SCHEMA_VERSION = 1
export const CUSTOM_KIND = 'street-clues-custom-library'
export const MAX_CUSTOM_CLUES = 500
export const MAX_IMAGE_DATA_LENGTH = 5_000_000
export type CustomWeight = { locationId: string; seenMultiplier: number; absentMultiplier: number }
export type PhotoCredit = { imageIndex: number; sourceUrl: string; author: string; license: string; licenseUrl: string; modification: string }
export type CustomClue = { id: string; appearance: Text2; categoryId: string; imageDataUrl?: string; additionalImageDataUrls?: string[]; photoCredits?: PhotoCredit[]; weights: CustomWeight[]; supersedesClueIds?: string[]; regionalWeightMode?: 'conditional'; cardCrop?: 'left-half' | 'right-half' | 'top-half' | 'bottom-half' }
export type CustomLibrary = { schemaVersion: 1; kind: typeof CUSTOM_KIND; clues: CustomClue[] }
export const emptyCustomLibrary = (): CustomLibrary => ({ schemaVersion: CUSTOM_SCHEMA_VERSION, kind: CUSTOM_KIND, clues: [] })
export const COLLECTION_KIND = 'street-clues-library-collection'
export const DEFAULT_PERSONAL_ID = 'personal-default'
export const MAX_PERSONAL_LIBRARIES = 30
export type NamedCustomLibrary = { id: string; name: string; library: CustomLibrary }
export type CustomLibraryCollection = { schemaVersion: 1; kind: typeof COLLECTION_KIND; activeId: string; libraries: NamedCustomLibrary[] }
export const emptyCustomLibraryCollection = (): CustomLibraryCollection => ({
  schemaVersion: 1, kind: COLLECTION_KIND, activeId: DEFAULT_PERSONAL_ID,
  libraries: [{ id: DEFAULT_PERSONAL_ID, name: 'My library', library: emptyCustomLibrary() }],
})

export function parseCustomLibraryCollection(value: unknown): CustomLibraryCollection {
  // Version 1 stored a single library under the same IndexedDB key. Keep every clue and image.
  if (isRecord(value) && value.kind === CUSTOM_KIND) {
    return { ...emptyCustomLibraryCollection(), libraries: [{ id: DEFAULT_PERSONAL_ID, name: 'My library', library: parseCustomLibrary(value) }] }
  }
  if (!isRecord(value) || value.schemaVersion !== 1 || value.kind !== COLLECTION_KIND ||
    !Array.isArray(value.libraries) || value.libraries.length < 1 || value.libraries.length > MAX_PERSONAL_LIBRARIES ||
    typeof value.activeId !== 'string') throw new Error('Invalid personal library collection.')
  const ids = new Set<string>()
  const names = new Set<string>()
  const libraries: NamedCustomLibrary[] = value.libraries.map((raw) => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !/^personal-[a-zA-Z0-9_-]{7,80}$/.test(raw.id) || ids.has(raw.id) ||
      typeof raw.name !== 'string' || !raw.name.trim() || raw.name.trim().length > 80 || names.has(raw.name.trim().toLocaleLowerCase())) throw new Error('Invalid personal library name or ID.')
    ids.add(raw.id)
    names.add(raw.name.trim().toLocaleLowerCase())
    return { id: raw.id, name: raw.name.trim(), library: parseCustomLibrary(raw.library) }
  })
  if (!ids.has(value.activeId)) throw new Error('Selected personal library is missing.')
  return { schemaVersion: 1, kind: COLLECTION_KIND, activeId: value.activeId, libraries }
}

const categoryIds = new Set(categories.flatMap((category) => category.children.map((child) => child.id)))
const countryIds = new Set(countries.map((country) => country.id))
const completeRegions = new Set(regionSchemes.filter((scheme) => scheme.complete).flatMap((scheme) => scheme.regions.map((region) => region.id)))
const allowedTargets = new Set([...countryIds, ...completeRegions])
const imagePattern = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const validMultiplier = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0.01 && value <= 1000
const validHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 500) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

export function parseCustomLibrary(value: unknown): CustomLibrary {
  if (!isRecord(value) || value.schemaVersion !== CUSTOM_SCHEMA_VERSION || value.kind !== CUSTOM_KIND || !Array.isArray(value.clues) || value.clues.length > MAX_CUSTOM_CLUES) {
    throw new Error('Invalid custom library format or unsupported version.')
  }
  const ids = new Set<string>()
  const clues: CustomClue[] = value.clues.map((raw, index) => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !/^custom-[a-zA-Z0-9_-]{8,80}$/.test(raw.id) || ids.has(raw.id) ||
      !isRecord(raw.appearance) || typeof raw.appearance.en !== 'string' || typeof raw.appearance.zh !== 'string' ||
      !raw.appearance.en.trim() || !raw.appearance.zh.trim() || raw.appearance.en.length > 120 || raw.appearance.zh.length > 120 ||
      typeof raw.categoryId !== 'string' || !categoryIds.has(raw.categoryId) || !Array.isArray(raw.weights) || raw.weights.length > allowedTargets.size) {
      throw new Error(`Invalid clue at item ${index + 1}.`)
    }
    ids.add(raw.id)
    if (raw.supersedesClueIds !== undefined && (!Array.isArray(raw.supersedesClueIds) || raw.supersedesClueIds.length > 20 ||
      raw.supersedesClueIds.some((id) => typeof id !== 'string' || !/^custom-[a-zA-Z0-9_-]{8,80}$/.test(id) || id === raw.id) ||
      new Set(raw.supersedesClueIds).size !== raw.supersedesClueIds.length)) {
      throw new Error(`Invalid superseded clue IDs in clue ${index + 1}.`)
    }
    if (raw.regionalWeightMode !== undefined && raw.regionalWeightMode !== 'conditional') {
      throw new Error(`Invalid regional weight mode in clue ${index + 1}.`)
    }
    if (raw.cardCrop !== undefined && (!['left-half', 'right-half', 'top-half', 'bottom-half'].includes(String(raw.cardCrop)) || !raw.imageDataUrl)) {
      throw new Error(`Invalid image focus in clue ${index + 1}.`)
    }
    if (raw.imageDataUrl !== undefined && (typeof raw.imageDataUrl !== 'string' || raw.imageDataUrl.length > MAX_IMAGE_DATA_LENGTH || !imagePattern.test(raw.imageDataUrl))) {
      throw new Error(`Invalid image in clue ${index + 1}. Use PNG, JPEG or WebP.`)
    }
    if (raw.additionalImageDataUrls !== undefined && (!raw.imageDataUrl || !Array.isArray(raw.additionalImageDataUrls) ||
      raw.additionalImageDataUrls.length > 8 || raw.additionalImageDataUrls.some((url) => typeof url !== 'string' ||
        url.length > MAX_IMAGE_DATA_LENGTH || !imagePattern.test(url)) ||
      new Set([raw.imageDataUrl, ...raw.additionalImageDataUrls]).size !== raw.additionalImageDataUrls.length + 1)) {
      throw new Error(`Invalid additional images in clue ${index + 1}.`)
    }
    const imageCount = (raw.imageDataUrl ? 1 : 0) + (Array.isArray(raw.additionalImageDataUrls) ? raw.additionalImageDataUrls.length : 0)
    if (raw.photoCredits !== undefined && (!Array.isArray(raw.photoCredits) || raw.photoCredits.length > imageCount ||
      raw.photoCredits.some((credit) => !isRecord(credit) || !Number.isInteger(credit.imageIndex) ||
        (credit.imageIndex as number) < 0 || (credit.imageIndex as number) >= imageCount ||
        !validHttpsUrl(credit.sourceUrl) || !validHttpsUrl(credit.licenseUrl) ||
        typeof credit.author !== 'string' || !credit.author.trim() || credit.author.length > 120 ||
        typeof credit.license !== 'string' || !credit.license.trim() || credit.license.length > 100 ||
        typeof credit.modification !== 'string' || credit.modification.length > 200) ||
      new Set(raw.photoCredits.map((credit) => isRecord(credit) ? credit.imageIndex : -1)).size !== raw.photoCredits.length)) {
      throw new Error(`Invalid photo credits in clue ${index + 1}.`)
    }
    const seenTargets = new Set<string>()
    const weights: CustomWeight[] = raw.weights.map((row, weightIndex) => {
      if (!isRecord(row) || typeof row.locationId !== 'string' || !allowedTargets.has(row.locationId) || seenTargets.has(row.locationId) ||
        !validMultiplier(row.seenMultiplier) || !validMultiplier(row.absentMultiplier)) {
        throw new Error(`Invalid location weight ${weightIndex + 1} in clue ${index + 1}.`)
      }
      seenTargets.add(row.locationId)
      return { locationId: row.locationId, seenMultiplier: row.seenMultiplier, absentMultiplier: row.absentMultiplier }
    })
    return { id: raw.id, categoryId: raw.categoryId, appearance: { en: raw.appearance.en.trim(), zh: raw.appearance.zh.trim() },
      ...(raw.imageDataUrl ? { imageDataUrl: raw.imageDataUrl } : {}),
      ...(raw.additionalImageDataUrls?.length ? { additionalImageDataUrls: raw.additionalImageDataUrls as string[] } : {}),
      ...(raw.photoCredits?.length ? { photoCredits: raw.photoCredits as PhotoCredit[] } : {}), weights,
      ...(raw.supersedesClueIds ? { supersedesClueIds: raw.supersedesClueIds as string[] } : {}),
      ...(raw.regionalWeightMode ? { regionalWeightMode: 'conditional' as const } : {}),
      ...(raw.cardCrop ? { cardCrop: raw.cardCrop as CustomClue['cardCrop'] } : {}) }
  })
  const byId = new Map(clues.map((clue) => [clue.id, clue]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) return
    if (visiting.has(id)) throw new Error('Custom clue replacement references form a cycle.')
    visiting.add(id)
    for (const broadId of byId.get(id)?.supersedesClueIds || []) {
      if (byId.has(broadId)) visit(broadId)
    }
    visiting.delete(id)
    visited.add(id)
  }
  clues.forEach((clue) => visit(clue.id))
  return { schemaVersion: 1, kind: CUSTOM_KIND, clues }
}

export function customClueToCard(item: CustomClue, source: 'personal' | 'africa' = 'personal'): Clue {
  return {
    id: item.id, categoryId: item.categoryId, groupId: item.id, appearance: item.appearance, formalName: item.appearance,
    identify: source === 'africa' ? { en: 'Select when this visual feature is actually observed.', zh: '实际看见该视觉特征时选择。' } : { en: 'Your own visual observation.', zh: '你添加的视觉观察。' },
    geography: source === 'africa' ? { en: 'The supported locations are listed below.', zh: '支持的地点列于下方。' } : { en: 'The location multipliers below are your estimates.', zh: '地点乘数由你自行设定。' },
    strength: source === 'africa' ? { en: 'Curated initial likelihood estimates, not measured geographic frequencies.', zh: '整理后的初始似然估计，并非实测地理频率。' } : { en: 'Custom likelihood multipliers; not measured geographic frequencies.', zh: '自定义似然乘数；不是实测地理频率。' },
    caveat: { en: 'Unspecified places stay at 1×. An absent observation uses its separate absent multiplier.', zh: '未设置的地点保持 1×。明确未出现时使用单独的缺失乘数。' },
    sourceUrls: [], reviewed: '', assetIds: item.imageDataUrl ? [item.id] : [], tags: [item.categoryId], exclusionAllowed: true,
    cardCrop: item.cardCrop,
  }
}

const DB_NAME = 'street-clues-custom-library'
const STORE = 'documents'
const DOCUMENT_KEY = 'main'
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local storage.'))
  })
}
export async function loadCustomLibraryCollection(): Promise<CustomLibraryCollection> {
  const db = await openDatabase()
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(DOCUMENT_KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Could not load custom library.'))
    })
    return value === undefined ? emptyCustomLibraryCollection() : parseCustomLibraryCollection(value)
  } finally { db.close() }
}
export async function saveCustomLibraryCollection(value: CustomLibraryCollection): Promise<void> {
  const safe = parseCustomLibraryCollection(value)
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).put(safe, DOCUMENT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('Could not save custom library.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not save custom library.'))
    })
  } finally { db.close() }
}

export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
    throw new Error('Choose a PNG, JPEG or WebP image under 15 MB.')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image conversion is unavailable in this browser.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/webp', 0.84)
    if (dataUrl.length > MAX_IMAGE_DATA_LENGTH || !imagePattern.test(dataUrl)) throw new Error('Converted image is too large.')
    return dataUrl
  } finally { bitmap.close() }
}

export function mergeCustomLibraries(current: CustomLibrary, incoming: CustomLibrary): CustomLibrary {
  const merged = new Map(current.clues.map((clue) => [clue.id, clue]))
  incoming.clues.forEach((clue) => merged.set(clue.id, clue))
  return parseCustomLibrary({ schemaVersion: 1, kind: CUSTOM_KIND, clues: [...merged.values()] })
}
