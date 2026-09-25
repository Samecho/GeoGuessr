import type { Clue, EvidenceEstimate, Text2 } from './types'
import locationsFile from './knowledge/locations.json'
import detailUrl from './knowledge/playable-clue-info.json?url'

type Location = { id: string; name: Text2 }
type ClueDetails = {
  featureId: string
  sourceNotes: { section: string; excerpt: string; url: string }[]
  sourceUrls: string[]
  relations: Record<'supports' | 'opposes' | 'explicit-absence', string[]>
}
type DetailFile = { schemaVersion: number; clues: ClueDetails[] }
const locations = (locationsFile as { locations: Location[] }).locations
const locationById = new Map(locations.map((location) => [location.id, location]))
let detailsPromise: Promise<Map<string, ClueDetails>> | undefined
function getDetails(): Promise<Map<string, ClueDetails>> {
  detailsPromise ||= fetch(detailUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Unable to load clue source details (${response.status})`)
    const file = await response.json() as DetailFile
    return new Map(file.clues.map((clue) => [clue.featureId, clue]))
  })
  return detailsPromise
}
const relationLabel: Record<string, Text2> = {
  supports: { en: 'source supports', zh: '原文支持' },
  opposes: { en: 'source opposes', zh: '原文反对' },
  'explicit-absence': { en: 'source explicitly notes absence', zh: '原文明确提到缺少' },
}

export async function loadClueInfo(clue: Clue, estimates: EvidenceEstimate[]): Promise<Clue> {
  const byId = await getDetails()
  const detail = byId.get(clue.id)
  const fittedCount = estimates.filter((estimate) => estimate.featureId === clue.id).length
  const en: string[] = []
  const zh: string[] = []
  for (const relation of ['supports', 'opposes', 'explicit-absence'] as const) {
    const places = (detail?.relations[relation] || []).map((id) => locationById.get(id)).filter((place): place is Location => !!place)
    if (!places.length) continue
    en.push(`${relationLabel[relation].en}: ${places.map((place) => place.name.en).join(', ')}`)
    zh.push(`${relationLabel[relation].zh}：${places.map((place) => place.name.zh).join('、')}`)
  }
  const notes = detail?.sourceNotes || []
  return {
    ...clue,
    identify: {
      en: notes.length ? 'The original source notes are in Chinese. Open the cited chapter to review their wording and conditions.' : 'The local chapter has no explanatory excerpt for this visual feature.',
      zh: notes.map((note) => `${note.section}：${note.excerpt}`).join(' · ') || '本地章节记录了该视觉特征，但没有对应解释摘录。',
    },
    geography: {
      en: en.join(' · ') || 'No source-backed location relation is recorded.',
      zh: zh.join('；') || '尚无可追溯的地点关系。',
    },
    strength: {
      en: fittedCount ? `${fittedCount} location-specific initial estimate(s); none are measured frequencies.` : 'No location-specific prevalence estimate is available; missing mentions are neutral.',
      zh: fittedCount ? `${fittedCount} 条地点特定的初始估计；均非实测频率。` : '没有地点特定的出现率估计；资料未提及保持中性。',
    },
    caveat: {
      en: 'Qualitative source wording is encoded as centralized initial estimates, not measured frequencies. Unknown locations are not treated as absences; repeated images do not add evidence.',
      zh: '定性原文通过集中参数转换为初始估计，并非实测频率。未知地点不作反证；重复图片不会重复加权。',
    },
    sourceUrls: detail?.sourceUrls || [],
  }
}
