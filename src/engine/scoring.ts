import type { Observation, Rule } from '../data/types'

export type Ranked = { id: string; share: number; score: number }
export type Breakdown = { top: Ranked[]; others: number; all: Ranked[] }
export const DEFAULT_TAIL_MIX = 0.01

const certainty = (observation: Observation | undefined) =>
  observation ? (observation.certainty === 'certain' ? 1 : 0.38) : 0

export function conditionStrength(rule: Rule, observations: Map<string, Observation>): number {
  const all = rule.when.all || []
  const any = rule.when.any || []
  const excluded = rule.when.excluded || []
  if (!all.length && !any.length && !excluded.length) return 0
  const seen = (id: string) => {
    const observation = observations.get(id)
    return observation?.mode === 'seen' ? certainty(observation) : 0
  }
  const absent = (id: string) => {
    const observation = observations.get(id)
    return observation?.mode === 'excluded' ? certainty(observation) : 0
  }
  const mandatory = [...all.map(seen), ...excluded.map(absent)]
  if (mandatory.some((value) => value === 0)) return 0
  const alternatives = any.length ? Math.max(...any.map(seen)) : 1
  if (alternatives === 0) return 0
  return Math.min(alternatives, ...mandatory)
}

function scoreTarget(id: string, rules: Rule[], observations: Map<string, Observation>): number {
  const active = rules.filter((rule) => rule.targets.includes(id))
    .map((rule) => ({ rule, value: rule.weight * conditionStrength(rule, observations) }))
    .filter(({ value }) => value !== 0)
  const replacedGroups = new Set(active.filter(({ rule }) => rule.relation === 'replace').map(({ rule }) => rule.group))
  const groups = new Map<string, number[]>()
  let extras = 0
  for (const { rule, value } of active) {
    if (rule.relation === 'extra') { extras += value; continue }
    if (replacedGroups.has(rule.group) && rule.relation !== 'replace') continue
    const values = groups.get(rule.group) || []
    values.push(value)
    groups.set(rule.group, values)
  }
  let total = extras
  for (const values of groups.values()) {
    values.sort((a, b) => Math.abs(b) - Math.abs(a))
    total += values[0] + values.slice(1).reduce((sum, value) => sum + value * 0.25, 0)
  }
  return total
}

/** Independent, order-insensitive calculation. Candidate prior is uniform. */
export function rankCandidates(
  candidateIds: string[], rules: Rule[], input: Observation[],
  scope: 'country' | 'region', countryId?: string, tailMix = DEFAULT_TAIL_MIX,
): Ranked[] {
  const ids = [...new Set(candidateIds)].sort()
  if (!ids.length) return []
  const observations = new Map(input.map((observation) => [observation.clueId, observation]))
  const relevant = rules.filter((rule) => rule.scope === scope && (scope === 'country' || rule.countryId === countryId))
  const scores = ids.map((id) => scoreTarget(id, relevant, observations))
  const max = Math.max(...scores)
  const weights = scores.map((score) => Math.exp(Math.max(-700, Math.min(0, score - max))))
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const mix = Math.max(0, Math.min(1, tailMix))
  return ids.map((id, index) => ({
    id, score: scores[index],
    share: (1 - mix) * weights[index] / sum + mix / ids.length,
  })).sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))
}

export function breakdown(ranked: Ranked[], topCount = 5): Breakdown {
  const top = ranked.slice(0, topCount)
  return { top, others: ranked.slice(topCount).reduce((sum, item) => sum + item.share, 0), all: ranked }
}

/** Largest-remainder rounding preserves exactly 100.0 display percentage points. */
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
