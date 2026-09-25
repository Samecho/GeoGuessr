import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, ChevronRight, Globe2, Info, RotateCcw, Search, X, ZoomIn } from 'lucide-react'
import { countries, countryById } from './data/countries'
import { categories } from './data/categories'
import { clues, clueById } from './data/clues'
import { assetById } from './data/assets'
import { regionSchemeByCountry } from './data/regions'
import { rules } from './data/rules'
import type { Clue, Continent, Observation } from './data/types'
import { conditionStrength, rankCandidates } from './engine/scoring'
import { RankingChart } from './components/RankingChart'
import { ui, type Language } from './i18n'
import './styles.css'

type Scope = { type: 'global' } | { type: 'continent'; continent: Continent } | { type: 'countries'; ids: string[] }
const continentLabels: Record<Continent, { en: string; zh: string }> = {
  Europe: { en: 'Europe', zh: '欧洲' }, Asia: { en: 'Asia', zh: '亚洲' }, Africa: { en: 'Africa', zh: '非洲' },
  'North America': { en: 'North America', zh: '北美洲' }, 'South America': { en: 'South America', zh: '南美洲' }, Oceania: { en: 'Oceania', zh: '大洋洲' },
}
const firstLanguage = (): Language => localStorage.getItem('street-clues-language') === 'zh' ? 'zh' : 'en'

function App() {
  const [language, setLanguage] = useState<Language>(firstLanguage)
  const [scope, setScope] = useState<Scope>({ type: 'global' })
  const [observations, setObservations] = useState<Record<string, Observation>>({})
  const [openGroups, setOpenGroups] = useState<string[]>(['roads', 'writing'])
  const [categoryId, setCategoryId] = useState('all')
  const [infoId, setInfoId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [viewCountry, setViewCountry] = useState<string | null>(null)
  const previousScopeKey = useRef('global')
  const [countrySearch, setCountrySearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [showShareInfo, setShowShareInfo] = useState(false)
  const L = ui[language]

  useEffect(() => { setPhotoIndex(0) }, [infoId])
  useEffect(() => { localStorage.setItem('street-clues-language', language); document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en' }, [language])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setInfoId(null); setZoom(false); setShowShareInfo(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scopedCountries = useMemo(() => countries.filter((country) => scope.type === 'global' ||
    (scope.type === 'continent' ? country.continent === scope.continent : scope.ids.includes(country.id))), [scope])
  const scopedIds = useMemo(() => scopedCountries.map((country) => country.id), [scopedCountries])
  const selected = useMemo(() => Object.values(observations), [observations])
  const countryRanks = useMemo(() => rankCandidates(scopedIds, rules, selected, 'country'), [scopedIds, selected])
  const scheme = viewCountry ? regionSchemeByCountry.get(viewCountry) : undefined
  const hasRegionEvidence = !!(scheme && rules.some((rule) => rule.scope === 'region' && rule.countryId === viewCountry && conditionStrength(rule, new Map(selected.map((o) => [o.clueId, o]))) > 0))
  const regionRanks = useMemo(() => scheme && hasRegionEvidence
    ? rankCandidates(scheme.regions.map((region) => region.id), rules, selected, 'region', scheme.countryId)
    : [], [scheme, hasRegionEvidence, selected])

  useEffect(() => {
    const key = scope.type === 'global' ? 'global' : scope.type === 'continent' ? scope.continent : `countries:${[...scope.ids].sort().join(',')}`
    const changed = key !== previousScopeKey.current
    setViewCountry((current) => {
      if (current && !scopedIds.includes(current)) return null
      if (changed && scopedIds.length === 1 && !current) return scopedIds[0]
      return current
    })
    previousScopeKey.current = key
  }, [scope, scopedIds])

  const toggleCountry = (id: string) => {
    setScope((current) => {
      const ids = current.type === 'countries' ? current.ids : []
      const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
      return next.length ? { type: 'countries', ids: next } : { type: 'global' }
    })
  }
  const selectSeen = (clue: Clue) => {
    setObservations((current) => {
      const next = { ...current }
      if (next[clue.id]?.mode === 'seen') { delete next[clue.id]; return next }
      const subcategory = categories.flatMap((category) => category.children).find((child) => child.id === clue.categoryId)
      if (subcategory?.selectionMode === 'single') clues.filter((candidate) => candidate.categoryId === clue.categoryId).forEach((candidate) => { delete next[candidate.id] })
      next[clue.id] = { clueId: clue.id, mode: 'seen', certainty: current[clue.id]?.certainty || 'certain' }
      return next
    })
  }
  const selectExcluded = (clue: Clue) => {
    if (!clue.exclusionAllowed) return
    setObservations((current) => {
      const next = { ...current }
      if (next[clue.id]?.mode === 'excluded') delete next[clue.id]
      else next[clue.id] = { clueId: clue.id, mode: 'excluded', certainty: current[clue.id]?.certainty || 'certain' }
      return next
    })
  }
  const toggleCertainty = (id: string) => setObservations((current) => {
    const observation = current[id]
    if (!observation) return current
    return { ...current, [id]: { ...observation, certainty: observation.certainty === 'certain' ? 'uncertain' : 'certain' } }
  })
  const displayedClues = clues.filter((clue) => clue.assetIds.length && (categoryId === 'all' || clue.categoryId === categoryId)
    && (categoryId !== 'brands' || brandFilter === 'all' || clue.tags.includes(brandFilter)))
  const textOnly = clues.filter((clue) => !clue.assetIds.length && (categoryId === 'all' || clue.categoryId === categoryId))
  const infoClue = infoId ? clueById.get(infoId) : undefined
  const scopeTitle = scope.type === 'global' ? L.global : scope.type === 'continent' ? continentLabels[scope.continent][language] : `${scope.ids.length} ${L.countries.toLowerCase()}`

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Globe2 size={21} strokeWidth={2.2} /></span><span><strong>Street Clues</strong><small>{L.subtitle}</small></span></div>
      <div className="top-actions">
        <div className="scope-inline"><span className="eyebrow">{L.scope}</span><span className="scope-current">{scopeTitle} <span className="count-pill">{scopedIds.length}</span></span></div>
        <button type="button" className="language-switch" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} aria-label={language === 'en' ? 'Switch to Simplified Chinese' : '切换到英语'}>{language === 'en' ? '简体中文' : 'English'}</button>
      </div>
    </header>

    <section className="scope-panel" aria-label={L.scope}>
      <div className="scope-panel-head"><div><span className="section-kicker">01 / {L.scope}</span><h2>{scopeTitle}</h2></div><span className="muted">{scopedIds.length} {L.count}</span></div>
      <div className="scope-controls">
        <button type="button" className={`scope-button ${scope.type === 'global' ? 'chosen' : ''}`} onClick={() => setScope({ type: 'global' })}>{L.global}</button>
        {(Object.keys(continentLabels) as Continent[]).map((continent) => <button type="button" key={continent} className={`scope-button ${scope.type === 'continent' && scope.continent === continent ? 'chosen' : ''}`} onClick={() => setScope({ type: 'continent', continent })}>{continentLabels[continent][language]}</button>)}
        <details className="country-picker"><summary className={`scope-button ${scope.type === 'countries' ? 'chosen' : ''}`}>{L.custom} <ChevronDown size={14} /></summary>
          <div className="country-picker-popover"><label className="search-field"><Search size={15} /><input type="search" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} placeholder={L.searchCountry} aria-label={L.searchCountry} /></label>
            <div className="country-options">{countries.filter((country) => country.name[language].toLocaleLowerCase().includes(countrySearch.toLocaleLowerCase()) || country.id.toLowerCase().includes(countrySearch.toLowerCase())).map((country) => <label key={country.id} className="country-option"><input type="checkbox" checked={scope.type === 'countries' && scope.ids.includes(country.id)} onChange={() => toggleCountry(country.id)} /><img src={`${import.meta.env.BASE_URL}flags/${country.id.toLowerCase()}.svg`} alt="" /><span>{country.name[language]}</span></label>)}</div>
          </div></details>
      </div>
      {scope.type === 'countries' && <div className="scope-chips">{scope.ids.map((id) => <button type="button" className="scope-chip" key={id} onClick={() => toggleCountry(id)}>{countryById.get(id)?.name[language]} <X size={13} /></button>)}</div>}
    </section>

    <main className="workspace">
      <aside className="tree-panel" aria-label={L.library}>
        <div className="panel-heading"><span className="section-kicker">02 / {L.library}</span><h2><BookOpen size={18} /> {L.library}</h2></div>
        <button type="button" className={`tree-all ${categoryId === 'all' ? 'active' : ''}`} onClick={() => setCategoryId('all')}>{L.allClues}<span>{clues.length}</span></button>
        {categories.map((category) => {
          const open = openGroups.includes(category.id)
          return <div className="tree-group" key={category.id}>
            <button type="button" className="tree-parent" onClick={() => setOpenGroups((current) => open ? current.filter((id) => id !== category.id) : [...current, category.id])} aria-expanded={open}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span>{category.name[language]}</span></button>
            {open && <div className="tree-children">{category.children.map((child) => <button type="button" key={child.id} className={`tree-child ${categoryId === child.id ? 'active' : ''}`} onClick={() => setCategoryId(child.id)}><span>{child.name[language]}</span><small>{clues.filter((clue) => clue.categoryId === child.id).length || '·'}</small></button>)}</div>}
          </div>
        })}
        <div className="tree-foot">{language === 'en' ? 'Local rules · no account · no live API' : '本地规则 · 无需账号 · 无实时 API'}</div>
      </aside>

      <section className="gallery-panel" aria-label={L.gallery}>
        <div className="panel-heading gallery-heading"><div><span className="section-kicker">03 / {L.gallery}</span><h2>{categoryId === 'all' ? L.all : categories.flatMap((category) => category.children).find((child) => child.id === categoryId)?.name[language]}</h2></div><span className="gallery-count">{displayedClues.length} {language === 'en' ? 'photo clues' : '个图像线索'}</span></div>
        <p className="exclusion-help">{L.exclusionHelp}</p>
        {categoryId === 'brands' && <div className="brand-filters" aria-label={language === 'en' ? 'Visual filter' : '视觉筛选'}>{['all','red','yellow','wordmark'].map((tag) => <button type="button" className={brandFilter === tag ? 'active' : ''} key={tag} onClick={() => setBrandFilter(tag)}>{tag === 'all' ? L.allClues : tag === 'red' ? (language === 'en' ? 'Red' : '红色') : tag === 'yellow' ? (language === 'en' ? 'Yellow' : '黄色') : (language === 'en' ? 'Wordmark' : '文字标志')}</button>)}</div>}
        {displayedClues.length ? <div className="clue-grid">{displayedClues.map((clue) => {
          const asset = assetById.get(clue.assetIds[0])!
          const chosen = observations[clue.id]
          return <article className={`clue-card clue-${clue.id} ${chosen ? 'is-selected' : ''}`} key={clue.id}>
            <button type="button" className="clue-main" onClick={() => selectSeen(clue)} aria-pressed={chosen?.mode === 'seen'}>
              <span className="photo-wrap"><img src={`${import.meta.env.BASE_URL}${asset.path.slice(1)}`} loading="lazy" alt={clue.appearance[language]} /><span className="photo-check">{chosen?.mode === 'seen' ? <Check size={16} /> : null}</span></span>
              <span className="clue-label">{clue.appearance[language]}</span>
            </button>
            <button type="button" className="info-button" onClick={() => setInfoId(clue.id)} aria-label={`${L.info}: ${clue.appearance[language]}`}><Info size={17} /></button>
            {chosen && <div className="card-state"><button type="button" className={chosen.mode === 'seen' ? 'state-active' : ''} onClick={() => selectSeen(clue)}>{L.seen}</button>{clue.exclusionAllowed && <button type="button" className={chosen.mode === 'excluded' ? 'state-active' : ''} onClick={() => selectExcluded(clue)}>{L.excluded}</button>}<button type="button" className="certainty-toggle" onClick={() => toggleCertainty(clue.id)}>{chosen.certainty === 'certain' ? L.certain : L.uncertain}</button></div>}
            {!chosen && clue.exclusionAllowed && <button type="button" className="card-exclude" onClick={() => selectExcluded(clue)}>{L.excluded}</button>}
          </article>
        })}</div> : <div className="gallery-empty">{L.noPhotos}</div>}
        {textOnly.length > 0 && <section className="text-observations"><h3>{L.textOnly}</h3><div className="text-clue-list">{textOnly.map((clue) => <div className={`text-clue ${observations[clue.id] ? 'is-selected' : ''}`} key={clue.id}><button type="button" className="text-clue-pick" onClick={() => selectSeen(clue)} aria-pressed={observations[clue.id]?.mode === 'seen'}>{observations[clue.id]?.mode === 'seen' && <Check size={14} />}{clue.appearance[language]}</button><button type="button" className="text-clue-info" onClick={() => setInfoId(clue.id)} aria-label={`${L.info}: ${clue.appearance[language]}`}><Info size={15} /></button>{observations[clue.id] && <button type="button" className="text-certainty" onClick={() => toggleCertainty(clue.id)}>{observations[clue.id].certainty === 'certain' ? L.certain : L.uncertain}</button>}</div>)}</div></section>}
        {!displayedClues.length && !textOnly.length && <p className="small-note">{L.categoriesEmpty}</p>}
      </section>

      <section className={`results-panel ${viewCountry ? 'has-region' : ''}`} aria-label={L.countryResults}>
        <div className="results-top"><div><span className="section-kicker">04 / {L.selected}</span><h2>{L.selected} <span className="count-pill dark">{selected.length}</span></h2></div><button type="button" className="clear-button" onClick={() => setObservations({})} disabled={!selected.length}><RotateCcw size={14} /> {L.clear}</button></div>
        {selected.length ? <div className="selection-list">{selected.map((observation) => {
          const clue = clueById.get(observation.clueId)!
          return <div className="selection-chip" key={observation.clueId}><span className={`selection-mode ${observation.mode === 'excluded' ? 'negative' : ''}`}>{observation.mode === 'seen' ? L.seen : L.excluded}</span><span className="selection-name">{clue.appearance[language]}</span><button type="button" onClick={() => toggleCertainty(clue.id)}>{observation.certainty === 'certain' ? L.certain : L.uncertain}</button><button type="button" className="remove-selection" onClick={() => setObservations((current) => { const next = { ...current }; delete next[clue.id]; return next })} aria-label={`${L.close}: ${clue.appearance[language]}`}><X size={14} /></button></div>
        })}</div> : <p className="selection-empty">{L.noSelected}</p>}
        <div className="charts-grid">
          <section className="chart-card"><div className="chart-head"><div><span className="section-kicker">05 / {L.countryResults}</span><h2>{L.countryResults} <button type="button" className="inline-info" aria-label={L.share} onClick={() => setShowShareInfo(!showShareInfo)}><Info size={15} /></button></h2></div><span className="chart-unit">{L.share}</span></div>
            {showShareInfo && <p className="share-explain">{L.aboutShare}</p>}
            {selected.length ? <RankingChart ranked={countryRanks} language={language} label={(id) => countryById.get(id)?.name[language] || id} flag activeId={viewCountry} onPick={setViewCountry} /> : <div className="chart-empty">{L.noEvidence}</div>}
            <label className="inspect-select"><span>{L.selectCountry}</span><select value={viewCountry || ''} onChange={(event) => setViewCountry(event.target.value || null)}><option value="">{L.noCountry}</option>{scopedCountries.map((country) => <option key={country.id} value={country.id}>{country.name[language]}</option>)}</select></label>
          </section>
          {viewCountry && <section className="chart-card region-card"><div className="chart-head"><div><span className="section-kicker">06 / {L.regionResults}</span><h2>{countryById.get(viewCountry)?.name[language]}</h2></div><button type="button" className="close-region" onClick={() => setViewCountry(null)} aria-label={L.close}><X size={18} /></button></div>
            <p className="region-caption">{scheme?.granularity[language]} · {L.conditional}</p>
            {!scheme ? <div className="chart-empty">{L.noRegionScheme}</div> : !hasRegionEvidence ? <div className="chart-empty">{L.noRegionData}</div> : <RankingChart ranked={regionRanks} language={language} label={(id) => scheme.regions.find((region) => region.id === id)?.name[language] || id} othersLabel={language === 'en' ? 'Other regions' : '其他地区'} />}
          </section>}
        </div>
      </section>
    </main>

    {infoClue && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setInfoId(null); setZoom(false) } }}><section className="info-modal" role="dialog" aria-modal="true" aria-label={infoClue.formalName[language]}><button type="button" className="modal-close" onClick={() => { setInfoId(null); setZoom(false) }} aria-label={L.close}><X size={19} /></button><span className="section-kicker">{L.info}</span><h2>{infoClue.formalName[language]}</h2>{infoClue.assetIds.length > 0 && <button type="button" className="modal-image" onClick={() => setZoom(true)} aria-label={L.enlarge}><img src={`${import.meta.env.BASE_URL}${assetById.get(infoClue.assetIds[photoIndex] || infoClue.assetIds[0])!.path.slice(1)}`} alt={infoClue.appearance[language]} /><span><ZoomIn size={18} /> {L.enlarge}</span></button>}
      {infoClue.assetIds.length > 1 && <div className="instance-strip" aria-label={language === 'en' ? 'Photo examples' : '图片实例'}>{infoClue.assetIds.map((id, index) => <button type="button" key={id} className={photoIndex === index ? 'active' : ''} onClick={() => setPhotoIndex(index)} aria-label={`${language === 'en' ? 'Photo' : '图片'} ${index + 1}`} aria-pressed={photoIndex === index}><img src={`${import.meta.env.BASE_URL}${assetById.get(id)!.path.slice(1)}`} alt="" loading="lazy" /></button>)}</div>}
      {infoClue.referenceAssetIds?.map((id) => <figure className="source-figure" key={id}><img src={`${import.meta.env.BASE_URL}${assetById.get(id)!.path.slice(1)}`} alt={L.sourceDiagram} loading="lazy" /><figcaption>{L.sourceDiagram}</figcaption></figure>)}
      <div className="info-details"><h3>{L.identify}</h3><p>{infoClue.identify[language]}</p><h3>{L.geography}</h3><p>{infoClue.geography[language]}</p><h3>{L.strength}</h3><p>{infoClue.strength[language]}</p><h3>{L.caveat}</h3><p>{infoClue.caveat[language]}</p><h3>{L.sources}</h3><ul>{infoClue.sourceUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></li>)}</ul>{[...infoClue.assetIds, ...(infoClue.referenceAssetIds || [])].map((id) => { const asset = assetById.get(id)!; return <p className="credit" key={id}><strong>{L.asset}:</strong> <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.author}</a> · <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.license}</a> · {L.reviewed}: {asset.reviewed}</p> })}<p className="credit">{L.reviewed}: {infoClue.reviewed}</p></div></section></div>}
    {zoom && infoClue?.assetIds.length && <div className="zoom-backdrop" role="presentation" onClick={() => setZoom(false)}><button type="button" className="zoom-close" onClick={() => setZoom(false)} aria-label={L.close}><X size={24} /></button><img src={`${import.meta.env.BASE_URL}${assetById.get(infoClue.assetIds[photoIndex] || infoClue.assetIds[0])!.path.slice(1)}`} alt={infoClue.appearance[language]} /></div>}
  </div>
}
export default App

