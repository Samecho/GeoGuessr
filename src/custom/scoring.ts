import { regionSchemeByCountry } from '../data/knowledge'
import type { Observation } from '../data/types'
import type { Ranked } from '../engine/scoring'
import type { CustomLibrary, CustomWeight } from './library'

export type CustomRankingScope = { kind: 'country' } | { kind: 'region'; countryId: string }
const reliability = (observation: Observation) => observation.certainty === 'certain' ? 1 : 0.5
const multiplierFor = (row: CustomWeight | undefined, observation: Observation) =>
  row ? observation.mode === 'seen' ? row.seenMultiplier : row.absentMultiplier : 1

/** User-entered likelihood ratios, with a uniform prior over the active candidate set. */
export function rankCustomCandidates(candidateIds: readonly string[], library: CustomLibrary, observations: readonly Observation[], scope: CustomRankingScope): Ranked[] {
  const ids = [...new Set(candidateIds)].sort((a, b) => a.localeCompare(b))
  if (!ids.length) return []
  const clueById = new Map(library.clues.map((clue) => [clue.id, clue]))
  const uniqueObservations = [...new Map(observations.filter((item) => clueById.has(item.clueId)).map((item) => [item.clueId, item])).values()]
    .sort((a, b) => a.clueId.localeCompare(b.clueId))
  const effects = uniqueObservations.map((observation) => ({
    observation,
    targets: new Map(clueById.get(observation.clueId)!.weights.map((row) => [row.locationId, row])),
  }))
  const logEvidence = (id: string) => effects.reduce((sum, { observation, targets }) =>
    sum + Math.log(multiplierFor(targets.get(id), observation)) * reliability(observation), 0)
  const scores = ids.map((id) => {
    let score = logEvidence(id)
    if (scope.kind === 'country') {
      const regions = regionSchemeByCountry.get(id)?.regions || []
      if (regions.length) {
        // Marginalize the joint regional evidence once. Averaging each clue
        // separately would imply that every clue can come from a different region.
        const regionScores = regions.map((region) => logEvidence(region.id))
        const maximum = Math.max(...regionScores)
        score += maximum + Math.log(regionScores.reduce((sum, value) => sum + Math.exp(value - maximum), 0) / regions.length)
      }
    }
    return { id, score }
  })
  const max = Math.max(...scores.map((item) => item.score))
  const weights = scores.map((item) => Math.exp(item.score - max))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return scores.map((item, index) => ({ ...item, share: weights[index] / total }))
    .sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))
}

export function customClueRelevant(clue: CustomLibrary['clues'][number], countryIds: readonly string[]): boolean {
  if (!clue.weights.length) return true
  const countries = new Set(countryIds)
  return clue.weights.some((row) => countries.has(row.locationId) ||
    [...countries].some((countryId) => regionSchemeByCountry.get(countryId)?.regions.some((region) => region.id === row.locationId)))
}
