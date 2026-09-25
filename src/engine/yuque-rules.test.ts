import { describe, expect, it } from 'vitest'
import { rankCandidates } from './scoring'
import { rules } from '../data/rules'
import { clues } from '../data/clues'
import type { Observation } from '../data/types'

const seen = (clueId: string, certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId, mode: 'seen', certainty })
const share = (ids: string[], observations: Observation[], id: string, scope: 'country' | 'region' = 'country', countryId?: string) =>
  rankCandidates(ids, rules, observations, scope, countryId).find((entry) => entry.id === id)!.share

describe('reviewed Yuque expansion', () => {
  it('has unique evidence IDs and a material bilingual catalogue expansion', () => {
    expect(new Set(clues.map((clue) => clue.id)).size).toBe(clues.length)
    expect(clues.length).toBeGreaterThan(60)
    expect(clues.filter((clue) => clue.assetIds.length).length).toBeGreaterThan(20)
    expect(clues.every((clue) => clue.appearance.en && clue.appearance.zh)).toBe(true)
  })
  it('shares a stop word across countries and weakens uncertain evidence', () => {
    const scope = ['MX', 'GT', 'TR']
    const certain = [seen('mexico-alto')]
    expect(share(scope, certain, 'MX')).toBeGreaterThan(share(scope, certain, 'GT'))
    expect(share(scope, certain, 'GT')).toBeGreaterThan(share(scope, certain, 'TR'))
    expect(share(scope, [seen('mexico-alto', 'uncertain')], 'MX')).toBeLessThan(share(scope, certain, 'MX'))
    expect(share(scope, [], 'MX')).toBeCloseTo(1 / 3)
  })
  it('does not mistake a shared script for country exclusivity', () => {
    const result = rankCandidates(['IN', 'NP', 'BD'], rules, [seen('devanagari-headline')], 'country')
    expect(result[0].share).toBeCloseTo(result[1].share)
    expect(result[0].share).toBeGreaterThan(result[2].share)
  })
  it('keeps Brazil country and conditional region shares separate', () => {
    const observations = [seen('brazil-caatinga')]
    expect(share(['BR', 'AR'], observations, 'BR')).toBeGreaterThan(0.5)
    const regions = rankCandidates(['N', 'NE', 'CW', 'SE', 'S'], rules, observations, 'region', 'BR')
    expect(regions[0].id).toBe('NE')
    expect(regions.reduce((sum, region) => sum + region.share, 0)).toBeCloseTo(1)
    expect(regions[0].share).toBeGreaterThan(share(['BR', 'AR'], observations, 'BR') / 5)
  })
  it('preserves order independence and limits correlated southern road clues', () => {
    const scope = ['ZA', 'BW', 'NG']
    const observations = [seen('southern-yellow-edge'), seen('southern-triple-center'), seen('drive-left')]
    expect(rankCandidates(scope, rules, observations, 'country')).toEqual(rankCandidates(scope, rules, [...observations].reverse(), 'country'))
    const both = share(scope, observations, 'ZA')
    const one = share(scope, [seen('southern-yellow-edge'), seen('drive-left')], 'ZA')
    expect(both).toBeGreaterThan(one)
    expect(both).toBeLessThan(1)
    expect(share(scope, [], 'ZA')).toBeCloseTo(1 / 3)
  })
  it('keeps Turkish writing out of the road-covered Cyprus candidate', () => {
    const cyTurkish = rules.filter((rule) => rule.scope === 'country' && rule.targets.includes('CY') &&
      [...(rule.when.all || []), ...(rule.when.any || [])].some((id) => id === 'turkey-dur' || id === 'turkish-dotless-i'))
    expect(cyTurkish).toHaveLength(0)
    expect(share(['TR', 'CY'], [seen('turkey-dur')], 'TR')).toBeGreaterThan(0.5)
    expect(share(['GR', 'CY'], [seen('greek-script')], 'GR')).toBeCloseTo(0.5)
  })})
