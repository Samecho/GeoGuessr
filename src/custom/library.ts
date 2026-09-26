import { categories, countries, regionSchemes } from '../data/knowledge'
import type { Clue, Text2 } from '../data/types'

export const CUSTOM_SCHEMA_VERSION = 1
export const CUSTOM_KIND = 'street-clues-custom-library'
export const MAX_CUSTOM_CLUES = 500
export const MAX_IMAGE_DATA_LENGTH = 5_000_000
export type CustomWeight = { locationId: string; seenMultiplier: number; absentMultiplier: number }
export type CustomClue = { id: string; appearance: Text2; categoryId: string; imageDataUrl?: string; weights: CustomWeight[]; supersedesClueIds?: string[]; cardCrop?: 'left-half' | 'right-half' | 'top-half' | 'bottom-half' }
export type CustomLibrary = { schemaVersion: 1; kind: typeof CUSTOM_KIND; clues: CustomClue[] }
export const emptyCustomLibrary = (): CustomLibrary => ({ schemaVersion: CUSTOM_SCHEMA_VERSION, kind: CUSTOM_KIND, clues: [] })

const categoryIds = new Set(categories.flatMap((category) => category.children.map((child) => child.id)))
const countryIds = new Set(countries.map((country) => country.id))
const completeRegions = new Set(regionSchemes.filter((scheme) => scheme.complete).flatMap((scheme) => scheme.regions.map((region) => region.id)))
const allowedTargets = new Set([...countryIds, ...completeRegions])
const imagePattern = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const validMultiplier = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0.01 && value <= 1000

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
    if (raw.cardCrop !== undefined && (!['left-half', 'right-half', 'top-half', 'bottom-half'].includes(String(raw.cardCrop)) || !raw.imageDataUrl)) {
      throw new Error(`Invalid image focus in clue ${index + 1}.`)
    }
    if (raw.imageDataUrl !== undefined && (typeof raw.imageDataUrl !== 'string' || raw.imageDataUrl.length > MAX_IMAGE_DATA_LENGTH || !imagePattern.test(raw.imageDataUrl))) {
      throw new Error(`Invalid image in clue ${index + 1}. Use PNG, JPEG or WebP.`)
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
      ...(raw.imageDataUrl ? { imageDataUrl: raw.imageDataUrl } : {}), weights,
      ...(raw.supersedesClueIds ? { supersedesClueIds: raw.supersedesClueIds as string[] } : {}),
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
export async function loadCustomLibrary(): Promise<CustomLibrary> {
  const db = await openDatabase()
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(DOCUMENT_KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Could not load custom library.'))
    })
    return value === undefined ? emptyCustomLibrary() : parseCustomLibrary(value)
  } finally { db.close() }
}
export async function saveCustomLibrary(value: CustomLibrary): Promise<void> {
  const safe = parseCustomLibrary(value)
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
