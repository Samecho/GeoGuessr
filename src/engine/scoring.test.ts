import { describe, expect, it } from 'vitest'
import { breakdown, displayTenths, posteriorFromLikelihoodRatios, rankCandidates } from './scoring'
import type { EvidenceEstimate, Observation, InteractionRule } from '../data/types'

const seen = (clueId: string, certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId, mode: 'seen', certainty })
const absent = (clueId: string, certainty: Observation['certainty'] = 'certain'): Observation => ({ clueId, mode: 'excluded', certainty })
const estimate = (featureId: string, locationId: string, pPresent: number, sourceFactId = `${featureId}-${locationId}`): EvidenceEstimate => ({
  featureId, locationId, pPresent, band: 'synthetic', basis: 'synthetic regression only', basisReason: 'Synthetic math test, not geographic data.', status: 'initial-estimate', measured: false, sourceFactId,
})
const share = (rows: ReturnType<typeof rankCandidates>, id: string) => rows.find((row) => row.id === id)!.share

describe('probability evidence model', () => {
  it('matches the independent likelihood-ratio calculation in log space', () => {
    const rows = posteriorFromLikelihoodRatios(['target','other'], {
      target: [...Array(6).fill(1.2), 0.001], other: [],
    })
    expect(share(rows,'target') * 100).toBeCloseTo(0.298, 3)
    expect(rows.reduce((sum,row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('uses a uniform prior, preserves a single candidate, and keeps hard-scope candidates only', () => {
    const uniform = rankCandidates(['A','B','C'], [], [])
    expect(uniform.map((row) => row.share)).toEqual([1/3,1/3,1/3])
    expect(rankCandidates(['B'], [], [seen('x')])[0].share).toBe(1)
    expect(rankCandidates([], [], [])).toEqual([])
    const scoped = rankCandidates(['A','B'], [estimate('x','A',0.99),estimate('x','OUTSIDE',0.01)], [seen('x')])
    expect(scoped.map((row) => row.id)).toEqual(['A','B'])
    expect(scoped.reduce((sum,row) => sum + row.share, 0)).toBeCloseTo(1)
  })

  it('leaves unknown and unselected evidence neutral; deletion is reversible and selection order independent', () => {
    const data = [estimate('a','A',0.8),estimate('a','B',0.5),estimate('b','A',0.65),estimate('b','B',0.5)]
    expect(rankCandidates(['A','B'], data, [])).toEqual(rankCandidates(['A','B'], data, [seen('not-imported')]))
    const both = [seen('a'),seen('b')]
    expect(rankCandidates(['A','B'], data, both)).toEqual(rankCandidates(['A','B'], data, [...both].reverse()))
    expect(rankCandidates(['A','B'], data, both.slice(0,1))).toEqual(rankCandidates(['A','B'], data, [seen('a')]))
  })

  it('models explicit absence separately from omission and attenuates uncertain recognition', () => {
    const data = [estimate('x','A',0.95),estimate('x','B',0.5)]
    const noSelection = rankCandidates(['A','B'], data, [])
    const seenCertain = rankCandidates(['A','B'], data, [seen('x')])
    const seenUncertain = rankCandidates(['A','B'], data, [seen('x','uncertain')])
    const absentCertain = rankCandidates(['A','B'], data, [absent('x')])
    const absentUncertain = rankCandidates(['A','B'], data, [absent('x','uncertain')])
    expect(share(noSelection,'A')).toBe(0.5)
    expect(share(seenCertain,'A')).toBeGreaterThan(share(seenUncertain,'A'))
    expect(share(absentCertain,'A')).toBeLessThan(share(absentUncertain,'A'))
    expect(share(seenCertain,'A')).toBeGreaterThan(0.5)
    expect(share(absentCertain,'A')).toBeLessThan(0.5)
  })

  it('does not turn a rare source-supported occurrence into opposition to unknown places', () => {
    const low = { ...estimate('rare', 'A', 0.34), sourceRelation: 'supports' as const }
    const frequent = { ...estimate('rare', 'B', 0.62), sourceRelation: 'supports' as const }
    const ranked = rankCandidates(['A', 'B', 'UNKNOWN'], [low, frequent], [seen('rare')])
    expect(share(ranked, 'A')).toBeCloseTo(share(ranked, 'UNKNOWN'))
    expect(share(ranked, 'B')).toBeGreaterThan(share(ranked, 'A'))
    const alone = rankCandidates(['A', 'UNKNOWN'], [low], [seen('rare')])
    expect(share(alone, 'A')).toBeCloseTo(0.5)
    const opposed = rankCandidates(['A', 'UNKNOWN'], [
      { ...estimate('rare', 'A', 0.03), sourceRelation: 'opposes' },
    ], [seen('rare')])
    expect(share(opposed, 'A')).toBeLessThan(0.5)
  })

  it('allows independent evidence to overcome weak opposing evidence', () => {
    const data = [estimate('oppose','A',0.1),estimate('oppose','B',0.9),estimate('distinctive','A',0.99),estimate('distinctive','B',0.01)]
    const result = rankCandidates(['A','B'], data, [seen('oppose'),seen('distinctive')])
    expect(result[0].id).toBe('A')
  })

  it('does not multiply features co-mentioned in one source fact without a joint model', () => {
    const data = [estimate('a','A',0.9,'same-fact'),estimate('a','B',0.5,'same-fact'),estimate('b','A',0.9,'same-fact'),estimate('b','B',0.5,'same-fact')]
    const dependencyGroups = new Map<string,string[]>([['a',['same-fact']],['b',['same-fact']]])
    const one = rankCandidates(['A','B'], data, [seen('a')])
    const correlated = rankCandidates(['A','B'], data, [seen('a'),seen('b')], { dependenceGroups: dependencyGroups })
    expect(correlated).toEqual(one)
    const independent = rankCandidates(['A','B'], data, [seen('a'),seen('b')])
    expect(share(independent,'A')).toBeGreaterThan(share(correlated,'A'))
  })

  it('applies documented combinations as extra interaction terms only when every clue is seen', () => {
    const data = [estimate('a','A',0.7),estimate('a','B',0.5),estimate('b','A',0.7),estimate('b','B',0.5)]
    const combo: InteractionRule = { id:'combo', featureIds:['a','b'], locationId:'A', relation:'interaction', likelihoodRatio:1.6, certaintyMode:'minimum', condition:'all-seen', sourceFactId:'fact', rationale:'synthetic', measured:false }
    const singles = rankCandidates(['A','B'], data, [seen('a'),seen('b')])
    const withCombo = rankCandidates(['A','B'], data, [seen('a'),seen('b')], { interactions:[combo] })
    const partial = rankCandidates(['A','B'], data, [seen('a')], { interactions:[combo] })
    expect(share(withCombo,'A')).toBeGreaterThan(share(singles,'A'))
    expect(partial).toEqual(rankCandidates(['A','B'], data, [seen('a')]))
  })

  it('keeps country priors independent from the number of child regions', () => {
    const data = [estimate('state-only','A:state:1',0.99)]
    const parentByLocation = new Map<string,string|null>([['A:state:1','A'],['A:state:2','A']])
    const countries = rankCandidates(['A','B'], data, [seen('state-only')], { scope:'country', parentByLocation })
    expect(share(countries,'A')).toBe(0.5)
    const regions = rankCandidates(['A:state:1','A:state:2'], data, [seen('state-only')], { scope:'region', parentId:'A', parentByLocation })
    expect(share(regions,'A:state:1')).toBeGreaterThan(share(regions,'A:state:2'))
  })

  it('normalizes Top 5 plus Others and rounds displayed rows to 100.0', () => {
    const rows = rankCandidates(Array.from({length:9},(_,i)=>`C${i}`), [estimate('x','C0',0.7)], [seen('x')])
    const result = breakdown(rows)
    expect(result.top).toHaveLength(5)
    expect(result.all.reduce((sum,row)=>sum+row.share,0)).toBeCloseTo(1)
    expect(result.others).toBeCloseTo(result.all.slice(5).reduce((sum,row)=>sum+row.share,0))
    expect(displayTenths([...result.top.map((row)=>row.share),result.others]).reduce((sum,n)=>sum+n,0)).toBe(100)
    expect(breakdown(rows.slice(0,3)).top).toHaveLength(3)
  })

  it('remains stable for extreme evidence without a tail floor or invalid shares', () => {
    const data = Array.from({length:1200},(_,i)=>[estimate(`f${i}`,'A',0.999),estimate(`f${i}`,'B',0.001)]).flat()
    const rows = rankCandidates(['A','B'], data, data.filter((row)=>row.locationId==='A').map((row)=>seen(row.featureId)))
    expect(rows[0].id).toBe('A')
    expect(rows.every((row)=>Number.isFinite(row.share) && row.share >= 0 && row.share <= 1)).toBe(true)
    expect(rows.reduce((sum,row)=>sum+row.share,0)).toBeCloseTo(1)
  })
})
