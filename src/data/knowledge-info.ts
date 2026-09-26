import type { Clue, EvidenceEstimate, Text2 } from './types'
import locationsFile from './knowledge/locations.json'
import { evidenceProfileByClue } from './knowledge'
import detailUrl from './knowledge/playable-clue-info.json?url'

type Location = { id: string; name: Text2 }
type ClueDetails = {
  featureId: string
  sourceNotes: { section: string; excerpt: string; url: string }[]
  sourceUrls: string[]
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
  'inferred-parent': { en: 'parent location inferred from regional source', zh: '由地区原文推及上级地点' },
  mixed: { en: 'mixed source context; check excerpt', zh: '原文语境混合，请核对摘录' },
  unclassified: { en: 'location estimate awaiting source-polarity review', zh: '地点估计的原文关系待复核' },
}

export async function loadClueInfo(clue: Clue, estimates: EvidenceEstimate[]): Promise<Clue> {
  const byId = await getDetails()
  const detail = byId.get(clue.id)
  const fittedCount = estimates.filter((estimate) => estimate.featureId === clue.id).length
  const en: string[] = []
  const zh: string[] = []
  for (const relation of ['supports', 'opposes', 'explicit-absence', 'inferred-parent', 'mixed', 'unclassified'] as const) {
    const places = estimates.filter((estimate) => estimate.featureId === clue.id && estimate.sourceRelation === relation)
      .map((estimate) => locationById.get(estimate.locationId)).filter((place): place is Location => !!place)
    if (!places.length) continue
    en.push(`${relationLabel[relation].en}: ${places.map((place) => place.name.en).join(', ')}`)
    zh.push(`${relationLabel[relation].zh}：${places.map((place) => place.name.zh).join('、')}`)
  }
  const notes = detail?.sourceNotes || []
  const profile = evidenceProfileByClue.get(clue.id)
  return {
    ...clue,
    formalName: profile?.formalName || clue.formalName,
    identify: {
      en: notes.length ? 'The original source notes are in Chinese. Open the cited chapter to review their wording and conditions.' : 'The local chapter has no explanatory excerpt for this visual feature.',
      zh: notes.map((note) => `${note.section}：${note.excerpt}`).join(' · ') || '本地章节记录了该视觉特征，但没有对应解释摘录。',
    },
    geography: {
      en: en.join(' · ') || 'No source-backed location relation is recorded.',
      zh: zh.join('；') || '尚无可追溯的地点关系。',
    },
    strength: {
      en: fittedCount ? `${fittedCount} location-specific initial estimate(s); none are measured frequencies.${profile ? ' This exact design uses a source-reviewed rare-feature background and observation-recognition estimate.' : ''}` : 'No location-specific prevalence estimate is available; missing mentions are neutral.',
      zh: fittedCount ? `${fittedCount} 条地点特定的初始估计；均非实测频率。${profile ? '这一具体外观采用经原文核对的稀有特征背景率与辨认可靠度估计。' : ''}` : '没有地点特定的出现率估计；资料未提及保持中性。',
    },
    caveat: {
      en: 'Qualitative source wording is encoded as centralized initial estimates, not measured frequencies. Unknown locations are not treated as absences; repeated images do not add evidence.',
      zh: '定性原文通过集中参数转换为初始估计，并非实测频率。未知地点不作反证；重复图片不会重复加权。',
    },
    sourceUrls: detail?.sourceUrls || [],
  }
}
