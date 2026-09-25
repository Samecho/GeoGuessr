import { describe, expect, it } from 'vitest'
import { categories, clues, estimates, features, interactions } from './knowledge'
import { rankCandidates } from '../engine/scoring'

const clue = (english: string) => clues.find((item) => item.appearance.en === english)
const estimate = (english: string, locationId: string) => estimates.find((item) => item.featureId === clue(english)?.id && item.locationId === locationId)

describe('reviewed local knowledge regressions', () => {
  it('keeps distinct vehicles with and without front plates selectable together', () => {
    const front = clue('Vehicle with a front plate')
    const noFront = clue('Vehicle without a front plate')
    expect(front).toBeDefined()
    expect(noFront).toBeDefined()
    expect(front?.id).not.toBe(noFront?.id)
    expect(categories.flatMap((group) => group.children).find((category) => category.id === 'plates')?.selectionMode).toBe('multiple')
    const selected = [front!, noFront!].map((item) => ({ clueId: item.id, mode: 'seen' as const, certainty: 'certain' as const }))
    const ranked = rankCandidates(['loc:canada', 'loc:curacao'], estimates, selected)
    expect(ranked).toHaveLength(2)
    expect(ranked.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1)
  })

  it('does not turn nearby negation or unrelated uniqueness into strong evidence', () => {
    expect(estimate('Flat terrain', 'loc:netherlands')?.pPresent).toBe(0.82)
    expect(estimate('White front plate and yellow rear plate', 'loc:united-kingdom')?.pPresent).toBe(0.82)
    expect(estimate('Vehicle with a front plate', 'loc:dominican')).toBeUndefined()
    expect(estimate('The word STOP', 'loc:canada')).toBeUndefined()
    expect(estimates.filter((item) => item.pPresent <= 0.05)).toHaveLength(0)
  })

  it('only uses reviewed joint evidence with actual matching observations', () => {
    expect(interactions).toHaveLength(2)
    expect(interactions.some((rule) => rule.locationId === 'loc:italy')).toBe(false)
    expect(interactions.some((rule) => rule.locationId === 'loc:ghana')).toBe(true)
    expect(features).toHaveLength(clues.length)
    expect(features.every((feature) => feature.translationStatus === 'reviewed')).toBe(true)
  })
})
