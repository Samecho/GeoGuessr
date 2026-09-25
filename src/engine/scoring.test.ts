import { describe, expect, it } from 'vitest'
import { rankCandidates, breakdown, displayTenths, conditionStrength } from './scoring'
import type { Observation, Rule } from '../data/types'
import { countries } from '../data/countries'
import { rules } from '../data/rules'

const seen = (clueId: string, certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId, mode: 'seen', certainty })
const excluded = (clueId: string): Observation => ({ clueId, mode: 'excluded', certainty: 'certain' })
const ids = countries.map((country) => country.id)

describe('deterministic inference', () => {
  it('normalizes all valid candidates and display rows', () => {
    const result = rankCandidates(ids, rules, [seen('japan-stop')], 'country')
    expect(result[0].id).toBe('JP')
    expect(result.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    const { top, others } = breakdown(result)
    expect(displayTenths([...top.map((row) => row.share), others]).reduce((sum, n) => sum + n, 0)).toBe(100)
    expect(result.every((row) => Number.isFinite(row.share) && row.share > 0)).toBe(true)
  })
  it('handles zero clues, single and short scopes without invented candidates', () => {
    const uniform = rankCandidates(['US','CA'], rules, [], 'country')
    expect(uniform.map((row) => row.share)).toEqual([0.5, 0.5])
    expect(rankCandidates(['CA'], rules, [], 'country')[0].share).toBe(1)
    expect(rankCandidates([], rules, [], 'country')).toEqual([])
    expect(breakdown(uniform).others).toBe(0)
    expect(displayTenths([])).toEqual([])
  })
  it('honors hard scope even in tail and Others', () => {
    const result = rankCandidates(['US','CA'], rules, [seen('japan-stop')], 'country')
    expect(result.map((row) => row.id)).toEqual(['CA','US'])
    expect(result.every((row) => row.share === 0.5)).toBe(true)
  })
  it('is independent of order and reversible after deletion', () => {
    const a = [seen('yellow-rear'), seen('drive-left'), seen('cyrillic')]
    expect(rankCandidates(ids, rules, a, 'country')).toEqual(rankCandidates(ids, rules, [...a].reverse(), 'country'))
    expect(rankCandidates(ids, rules, a.slice(0, 2), 'country')).toEqual(rankCandidates(ids, rules, [seen('drive-left'),seen('yellow-rear')], 'country'))
  })
  it('keeps unknown, unselected and explicit exclusion distinct', () => {
    const unknown = rankCandidates(['JP','TH'], rules, [], 'country')
    const omitted = rankCandidates(['JP','TH'], rules, [seen('front-plate-seen')], 'country')
    const absent = rankCandidates(['JP','TH'], rules, [excluded('japan-stop')], 'country')
    expect(omitted).toEqual(unknown)
    expect(absent.find((row) => row.id === 'JP')!.share).toBeLessThan(0.5)
    const uncertainAbsent = rankCandidates(['JP','TH'], rules, [{ ...excluded('japan-stop'), certainty: 'uncertain' }], 'country')
    expect(uncertainAbsent.find((row) => row.id === 'JP')!.share).toBeGreaterThan(absent.find((row) => row.id === 'JP')!.share)
  })
  it('weakens uncertain evidence and lets opposite vehicle observations coexist', () => {
    const certain = rankCandidates(['JP','TH'], rules, [seen('japan-stop')], 'country')
    const uncertain = rankCandidates(['JP','TH'], rules, [seen('japan-stop','uncertain')], 'country')
    expect(certain.find((row) => row.id === 'JP')!.share).toBeGreaterThan(uncertain.find((row) => row.id === 'JP')!.share)
    const plates = [seen('front-plate-seen'), seen('front-plate-absent')]
    expect(rankCandidates(['ON','AB'], rules, plates, 'region', 'CA').length).toBe(2)
  })
  it('triggers sourced product combo beyond individual clauses', () => {
    const both = rankCandidates(['GB','IE'], rules, [seen('yellow-rear'),seen('drive-left')], 'country')
    const alone = rankCandidates(['GB','IE'], rules, [seen('yellow-rear')], 'country')
    expect(both[0].id).toBe('GB')
    expect(both[0].share).toBeGreaterThan(alone[0].share)
  })
  it('supports all/any/explicit exclusion, replacement, and correlation with synthetic rules', () => {
    const base: Rule = { id: 'synthetic', scope: 'country', targets: ['A'], when: { all: ['x'], any: ['y','z'], excluded: ['q'] }, weight: 2, group: 'g', relation: 'single', sourceUrls: ['https://example.com/'], rationale: { en: 'test', zh: '测试' }, reviewed: '2026-09-25' }
    const obs = [seen('x'), seen('z','uncertain'), excluded('q')]
    expect(conditionStrength(base, new Map(obs.map((o) => [o.clueId,o])))).toBe(0.38)
    const weak = { ...base, id: 'weak', when: { all: ['x'] }, weight: 1 }
    const replace = { ...base, id: 'replace', when: { all: ['x'] }, weight: 3, relation: 'replace' as const }
    const withReplace = rankCandidates(['A','B'], [base, weak, replace], [seen('x'),seen('z'),excluded('q')], 'country', undefined, 0)
    const direct = rankCandidates(['A','B'], [replace], [seen('x')], 'country', undefined, 0)
    expect(withReplace).toEqual(direct)
    const correlated = rankCandidates(['A','B'], [weak, { ...weak, id: 'duplicate' }], [seen('x')], 'country', undefined, 0)
    const independent = rankCandidates(['A','B'], [{ ...weak, group: 'g1' }, { ...weak, id: 'duplicate', group: 'g2' }], [seen('x')], 'country', undefined, 0)
    expect(correlated[0].share).toBeLessThan(independent[0].share)
  })
  it('keeps extreme weights finite', () => {
    const huge: Rule = { ...rules[0], id: 'huge', targets: ['A'], weight: 100000, when: { all: ['x'] } }
    const result = rankCandidates(['A','B','C'], [huge], [seen('x')], 'country')
    expect(result.every((row) => Number.isFinite(row.share) && row.share > 0)).toBe(true)
    expect(result.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
  })
})
