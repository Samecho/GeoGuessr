import type { EvidenceEstimate, EvidenceProfile, InteractionRule, Observation } from '../data/types'

export type Ranked = { id: string; share: number; score: number }
export type Breakdown = { top: Ranked[]; others: number; all: Ranked[] }
export type ObservationModel = {
  certainSensitivity: number; certainSpecificity: number
  uncertainSensitivity: number; uncertainSpecificity: number
  unknownLocationFeature: number
  uncertainInteractionReliability: number
}
export type RankingOptions = {
  scope?: 'country' | 'region'
  parentId?: string
  model?: Partial<ObservationModel>
  dependenceGroups?: ReadonlyMap<string, readonly string[]>
  interactions?: readonly InteractionRule[]
  parentByLocation?: ReadonlyMap<string, string | null>
  candidateByLocation?: ReadonlyMap<string, boolean>
  evidenceProfiles?: ReadonlyMap<string, EvidenceProfile>
}

export const DEFAULT_MODEL: ObservationModel = {
  certainSensitivity: 0.95, certainSpecificity: 0.98,
  uncertainSensitivity: 0.68, uncertainSpecificity: 0.78,
  unknownLocationFeature: 0.5, uncertainInteractionReliability: 0.55,
}
const normalizeModel = (model?: Partial<ObservationModel>): ObservationModel => ({ ...DEFAULT_MODEL, ...model })

function reportProbability(pPresent: number, observation: Observation, model: ObservationModel, profile?: EvidenceProfile): number {
  const p = Math.min(1, Math.max(0, pPresent))
  const sensitivity = observation.certainty === 'certain' ? model.certainSensitivity : model.uncertainSensitivity
  const specificity = observation.certainty === 'certain' ? (profile?.certainSpecificity ?? model.certainSpecificity) : model.uncertainSpecificity
  return observation.mode === 'seen'
    ? sensitivity * p + (1 - specificity) * (1 - p)
    : (1 - sensitivity) * p + specificity * (1 - p)
}

function unionFindComponents(observations: Observation[], groups: ReadonlyMap<string, readonly string[]> = new Map()): Observation[][] {
  const parent = new Map(observations.map((observation) => [observation.clueId, observation.clueId]))
  const find = (id: string): string => {
    const current = parent.get(id) || id
    if (current === id) return id
    const root = find(current)
    parent.set(id, root)
    return root
  }
  const join = (a: string, b: string) => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const evidenceToClues = new Map<string, string[]>()
  for (const observation of observations) for (const evidenceId of groups.get(observation.clueId) || []) {
    evidenceToClues.set(evidenceId, [...(evidenceToClues.get(evidenceId) || []), observation.clueId])
  }
  for (const clueIds of evidenceToClues.values()) for (let i = 1; i < clueIds.length; i++) join(clueIds[0], clueIds[i])
  const components = new Map<string, Observation[]>()
  for (const observation of observations) components.set(find(observation.clueId), [...(components.get(find(observation.clueId)) || []), observation])
  return [...components.values()]
}

function estimateMap(estimates: EvidenceEstimate[], options: RankingOptions) {
  const map = new Map<string, number>()
  const scope = options.scope || 'country'
  for (const estimate of estimates) {
    if (scope === 'country' && options.parentByLocation?.get(estimate.locationId) && options.candidateByLocation?.get(estimate.locationId) !== true) continue
    if (scope === 'region' && options.parentId && options.parentByLocation?.get(estimate.locationId) !== options.parentId) continue
    map.set(`${estimate.locationId}\u0000${estimate.featureId}`, estimate.pPresent)
  }
  return map
}

/**
 * Candidate-relative likelihood model. Each location starts with the same prior;
 * missing feature estimates use the shared background prevalence, never absence.
 * Unknown-dependence features extracted from one source fact are conservatively
 * represented by the strongest single marginal term until a joint estimate exists.
 */
export function rankCandidates(
  candidateIds: string[], estimates: EvidenceEstimate[], input: Observation[], options: RankingOptions = {},
): Ranked[] {
  const ids = [...new Set(candidateIds)].sort((a, b) => a.localeCompare(b))
  if (!ids.length) return []
  const observations = [...new Map(input.map((observation) => [observation.clueId, observation])).values()]
    .sort((a, b) => a.clueId.localeCompare(b.clueId))
  const model = normalizeModel(options.model)
  const byFeatureLocation = estimateMap(estimates, options)
  // A rare positive mention must not become negative evidence solely because
  // the unmeasured shared background was initialized to a higher value.
  // Within the active candidate set, use the lowest documented support as
  // a conservative reference when it is below the default background.
  const candidateSet = new Set(ids)
  const supportedMinimum = new Map<string, number>()
  for (const estimate of estimates) {
    if (!['supports', 'inferred-parent'].includes(estimate.sourceRelation || '') || !candidateSet.has(estimate.locationId)) continue
    const previous = supportedMinimum.get(estimate.featureId)
    supportedMinimum.set(estimate.featureId, previous === undefined ? estimate.pPresent : Math.min(previous, estimate.pPresent))
  }
  const components = unionFindComponents(observations, options.dependenceGroups)
  const activeInteractions = (options.interactions || []).filter((rule) => rule.condition === 'all-seen' && rule.featureIds.length > 1)
  const scores = ids.map((id) => {
    let logLikelihood = 0
    for (const component of components) {
      const deltas = component.map((observation) => {
        const profile = options.evidenceProfiles?.get(observation.clueId)
        const background = Math.min(profile?.unknownPrevalence ?? model.unknownLocationFeature,
          supportedMinimum.get(observation.clueId) ?? 1)
        const p = byFeatureLocation.get(`${id}\u0000${observation.clueId}`) ?? background
        const observedLog = Math.log(reportProbability(p, observation, model, profile))
        const backgroundLog = Math.log(reportProbability(background, observation, model, profile))
        return { featureId: observation.clueId, delta: observedLog - backgroundLog }
      })
      deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.featureId.localeCompare(b.featureId))
      logLikelihood += deltas[0]?.delta || 0
    }
    for (const rule of activeInteractions) {
      if (rule.locationId !== id) continue
      const selected = rule.featureIds.map((featureId) => observations.find((item) => item.clueId === featureId))
      if (selected.some((item) => !item || item.mode !== 'seen')) continue
      const reliability = Math.min(...selected.map((item) => item!.certainty === 'certain' ? 1 : model.uncertainInteractionReliability))
      logLikelihood += Math.log(rule.likelihoodRatio) * reliability
    }
    return { id, score: logLikelihood }
  })
  const max = Math.max(...scores.map((item) => item.score))
  const weights = scores.map((item) => Math.exp(item.score - max))
  const total = weights.reduce((sum, item) => sum + item, 0)
  return scores.map((item, index) => ({ id: item.id, score: item.score, share: weights[index] / total }))
    .sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))
}

export function breakdown(ranked: Ranked[], topCount = 5): Breakdown {
  const top = ranked.slice(0, topCount)
  return { top, others: ranked.slice(topCount).reduce((sum, item) => sum + item.share, 0), all: ranked }
}

/** Largest-remainder rounding preserves 100.0 displayed points without altering inference. */
export function displayTenths(shares: number[]): number[] {
  if (!shares.length) return []
  const raw = shares.map((share) => Math.max(0, share) * 1000)
  const floors = raw.map(Math.floor)
  const left = Math.max(0, 1000 - floors.reduce((a, b) => a + b, 0))
  const order = raw.map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (let i = 0; i < left; i++) floors[order[i % order.length].index]++
  return floors.map((value) => value / 10)
}

/** Pure log-space normalization primitive for synthetic likelihood-ratio regressions. */
export function posteriorFromLikelihoodRatios(candidateIds: string[], evidenceLrs: Readonly<Record<string, readonly number[]>>): Ranked[] {
  const ids = [...new Set(candidateIds)].sort((a, b) => a.localeCompare(b))
  if (!ids.length) return []
  const scores = ids.map((id) => ({ id, score: (evidenceLrs[id] || []).reduce((sum, lr) => sum + Math.log(lr), 0) }))
  const max = Math.max(...scores.map((item) => item.score))
  const weights = scores.map((item) => Math.exp(item.score - max))
  const total = weights.reduce((sum, item) => sum + item, 0)
  return scores.map((item, index) => ({ ...item, share: weights[index] / total })).sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))
}
