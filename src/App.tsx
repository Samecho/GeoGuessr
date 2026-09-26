import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, ChevronRight, Globe2, Info, RotateCcw, Search, X, ZoomIn } from 'lucide-react'
import { countries, countryById } from './data/countries'
import { categories } from './data/categories'
import { clues } from './data/clues'
import { assetById } from './data/assets'
import { regionSchemeByCountry, regionCoverageByCountry } from './data/regions'
import { estimates, interactions, modelParameters, features, locations, candidateByLocation, evidenceProfileByClue } from './data/knowledge'
import { scopedClueIds } from './data/clue-scope'
import type { Clue, Observation } from './data/types'
import { geographicGroups, toggleGroupIds, type GeographicGroup } from './data/geographic-groups'
import { rankCandidates } from './engine/scoring'
import { RankingChart } from './components/RankingChart'
import { SourceGallery } from './components/SourceGallery'
import { ui, type Language } from './i18n'
import { CustomLibraryEditor } from './custom/CustomLibraryEditor'
import { customClueToCard, emptyCustomLibrary, parseCustomLibrary, loadCustomLibrary, saveCustomLibrary, type CustomLibrary } from './custom/library'
import { customClueRelevant, rankCustomCandidates } from './custom/scoring'
import africaManifest from './data/africa-library-manifest.json'
import './styles.css'

type Scope = { type: 'global' } | { type: 'countries'; ids: string[] }
type LibraryId = 'global' | 'africa' | 'personal'
type PageId = 'match' | 'edit'
const EMPTY_LOCAL_LIBRARY = emptyCustomLibrary()
const AFRICA_CANDIDATES = new Set(africaManifest.candidateCountryIds)
const firstLanguage = (): Language => localStorage.getItem('street-clues-language') === 'zh' ? 'zh' : 'en'

function App() {
  const [language, setLanguage] = useState<Language>(firstLanguage)
  const [scope, setScope] = useState<Scope>({ type: 'global' })
  const [pageId, setPageId] = useState<PageId>('match')
  const [libraryId, setLibraryId] = useState<LibraryId>('global')
  const [africaLibrary, setAfricaLibrary] = useState<CustomLibrary | null>(null)
  const [africaError, setAfricaError] = useState('')
  const [africaObservations, setAfricaObservations] = useState<Record<string, Observation>>({})
  const [officialObservations, setOfficialObservations] = useState<Record<string, Observation>>({})
  const [customObservations, setCustomObservations] = useState<Record<string, Observation>>({})
  const [customLibrary, setCustomLibrary] = useState<CustomLibrary>(emptyCustomLibrary)
  const [customLoaded, setCustomLoaded] = useState(false)
  const [customStorageError, setCustomStorageError] = useState('')
  const [customSaveStatus, setCustomSaveStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveVersion = useRef(0)
  const [observations, setObservations] = libraryId === 'global'
    ? [officialObservations, setOfficialObservations] as const
    : libraryId === 'africa' ? [africaObservations, setAfricaObservations] as const
    : [customObservations, setCustomObservations] as const
  const [openGroups, setOpenGroups] = useState<string[]>(['roads', 'writing'])
  const [categoryId, setCategoryId] = useState('all')
  const [infoId, setInfoId] = useState<string | null>(null)
  const [infoContent, setInfoContent] = useState<Clue | null>(null)
  const [zoom, setZoom] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [viewCountry, setViewCountry] = useState<string | null>(null)
  const previousScopeKey = useRef('global')
  const [countrySearch, setCountrySearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [showShareInfo, setShowShareInfo] = useState(false)
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryLimit, setGalleryLimit] = useState(48)
  const [showAllCountryClues, setShowAllCountryClues] = useState(false)
  const [photosReady, setPhotosReady] = useState(false)
  const L = ui[language]

  useEffect(() => {
    let active = true
    void loadCustomLibrary().then((value) => { if (active) setCustomLibrary(value) })
      .catch((error: unknown) => { if (active) { setCustomStorageError(error instanceof Error ? error.message : String(error)); setCustomSaveStatus('error') } })
      .finally(() => { if (active) setCustomLoaded(true) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!customLoaded || customStorageError) return
    const version = ++saveVersion.current
    setCustomSaveStatus('saving')
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveCustomLibrary(customLibrary))
    void saveQueue.current.then(() => { if (version === saveVersion.current) setCustomSaveStatus('saved') })
      .catch((error: unknown) => { setCustomStorageError(error instanceof Error ? error.message : String(error)); setCustomSaveStatus('error') })
  }, [customLibrary, customLoaded, customStorageError])
  useEffect(() => {
    if (libraryId !== 'africa' || africaLibrary || africaError) return
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}libraries/africa.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() })
      .then((value: unknown) => { if (!controller.signal.aborted) setAfricaLibrary(parseCustomLibrary(value)) })
      .catch((error: unknown) => { if (!controller.signal.aborted) setAfricaError(error instanceof Error ? error.message : String(error)) })
    return () => controller.abort()
  }, [libraryId, africaLibrary, africaError])
  useEffect(() => { setPhotoIndex(0) }, [infoId])
  useEffect(() => { void fetch(`${import.meta.env.BASE_URL}source-images/ready.json`).then((response) => response.ok ? response.json() : null).then((manifest: { convertedCount?: number } | null) => setPhotosReady(manifest?.convertedCount === 5860)).catch(() => setPhotosReady(false)) }, [])
  useEffect(() => { localStorage.setItem('street-clues-language', language); document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en' }, [language])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setInfoId(null); setZoom(false); setShowShareInfo(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isGlobalLibrary = libraryId === 'global'
  const selectableCountries = useMemo(() => countries.filter((country) => libraryId !== 'africa' || AFRICA_CANDIDATES.has(country.id)), [libraryId])
  const scopedCountries = useMemo(() => selectableCountries.filter((country) => scope.type === 'global' || scope.ids.includes(country.id)), [scope, selectableCountries])
  const scopedIds = useMemo(() => scopedCountries.map((country) => country.id), [scopedCountries])
  const activeLocalLibrary = libraryId === 'africa' ? africaLibrary || EMPTY_LOCAL_LIBRARY : customLibrary
  const localCards = useMemo(() => activeLocalLibrary.clues.map((clue) => customClueToCard(clue, libraryId === 'africa' ? 'africa' : 'personal')), [activeLocalLibrary, libraryId])
  const activeClues = isGlobalLibrary ? clues : localCards
  const activeClueById = useMemo(() => new Map(activeClues.map((clue) => [clue.id, clue])), [activeClues])
  const localImages = useMemo(() => new Map(activeLocalLibrary.clues.map((clue) => [clue.id, clue.imageDataUrl || ''])), [activeLocalLibrary])
  const selected = useMemo(() => Object.values(observations).filter((item) => activeClueById.has(item.clueId)), [observations, activeClueById])
  const applyCustomLibrary = (next: CustomLibrary) => {
    setCustomLibrary(next)
    const ids = new Set(next.clues.map((clue) => clue.id))
    setCustomObservations((current) => Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))))
  }
  const imageForClue = (clue: Clue) => !isGlobalLibrary ? localImages.get(clue.id) || '' :
    clue.assetIds.length && photosReady ? `${import.meta.env.BASE_URL}${assetById.get(clue.assetIds[0])!.path.slice(1)}` : ''
  const dependenceGroups = useMemo(() => new Map(features.map((feature) => [feature.id, feature.evidenceGroupIds])), [])
  const parentByLocation = useMemo(() => new Map(locations.map((location) => [location.id, location.parentId])), [])
  const backgroundByFeature = useMemo(() => new Map([...evidenceProfileByClue].map(([id, profile]) => [id, profile.unknownPrevalence])), [])
  const canChooseCountryClues = scope.type === 'countries' && scopedIds.length === 1 && regionSchemeByCountry.get(scopedIds[0])?.complete === true
  const scopedRelevance = useMemo(() => !isGlobalLibrary || scope.type === 'global' ? null : scopedClueIds(scopedIds, estimates, regionSchemeByCountry, parentByLocation, backgroundByFeature, showAllCountryClues), [isGlobalLibrary, scope.type, scopedIds, parentByLocation, backgroundByFeature, showAllCountryClues])
  const availableClues = useMemo(() => !isGlobalLibrary
    ? localCards.filter((clue) => scope.type === 'global' || customClueRelevant(activeLocalLibrary.clues.find((item) => item.id === clue.id)!, scopedIds))
    : scopedRelevance ? clues.filter((clue) => scopedRelevance.has(clue.id)) : clues,
  [isGlobalLibrary, scope.type, scopedIds, localCards, activeLocalLibrary, scopedRelevance])
  const activeCategoryId = categoryId === 'all' || availableClues.some((clue) => clue.categoryId === categoryId) ? categoryId : 'all'
  const scoringOptions = useMemo(() => ({ model: modelParameters.observationModel, dependenceGroups, interactions, parentByLocation, candidateByLocation, evidenceProfiles: evidenceProfileByClue }), [dependenceGroups, parentByLocation])
  const countryRanks = useMemo(() => !isGlobalLibrary
    ? rankCustomCandidates(scopedIds, activeLocalLibrary, selected, { kind: 'country' })
    : rankCandidates(scopedIds, estimates, selected, { ...scoringOptions, scope: 'country' }),
  [isGlobalLibrary, scopedIds, selected, scoringOptions, activeLocalLibrary])
  const scheme = viewCountry ? regionSchemeByCountry.get(viewCountry) : undefined
  const regionRanks = useMemo(() => scheme
    ? !isGlobalLibrary
      ? rankCustomCandidates(scheme.regions.map((region) => region.id), activeLocalLibrary, selected, { kind: 'region', countryId: scheme.countryId })
      : rankCandidates(scheme.regions.map((region) => region.id), estimates, selected, { ...scoringOptions, scope: 'region', parentId: scheme.countryId })
    : [], [scheme, selected, scoringOptions, isGlobalLibrary, activeLocalLibrary])

  useEffect(() => {
    const key = scope.type === 'global' ? 'global' : `countries:${[...scope.ids].sort().join(',')}`
    const changed = key !== previousScopeKey.current
    setViewCountry((current) => {
      if (current && !scopedIds.includes(current)) return null
      if (changed && scopedIds.length === 1 && !current) return scopedIds[0]
      return current
    })
    previousScopeKey.current = key
  }, [scope, scopedIds])

  const toggleGroup = (group: GeographicGroup) => {
    setScope((current) => {
      const next = toggleGroupIds(current.type === 'countries' ? current.ids : [], group.countryIds)
      return next.length ? { type: 'countries', ids: next } : { type: 'global' }
    })
  }
  const groupIsSelected = (group: GeographicGroup) => scope.type === 'countries' && group.countryIds.every((id) => scope.ids.includes(id))
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
      if (subcategory?.selectionMode === 'single') activeClues.filter((candidate) => candidate.categoryId === clue.categoryId).forEach((candidate) => { delete next[candidate.id] })
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
  const matchesQuery = (clue: Clue) => !gallerySearch.trim() || `${clue.appearance.en} ${clue.appearance.zh}`.toLocaleLowerCase().includes(gallerySearch.trim().toLocaleLowerCase())
  const displayedClues = availableClues.filter((clue) => !!imageForClue(clue) && (activeCategoryId === 'all' || clue.categoryId === activeCategoryId)
    && (!isGlobalLibrary || activeCategoryId !== 'brands' || brandFilter === 'all' || clue.tags.includes(brandFilter)) && matchesQuery(clue))
  const textOnly = availableClues.filter((clue) => !imageForClue(clue) && (activeCategoryId === 'all' || clue.categoryId === activeCategoryId) && matchesQuery(clue))
  const visibleTextOnly = textOnly.slice(0, galleryLimit)
  const infoClue = infoId && infoContent?.id === infoId ? infoContent : undefined
  const infoImage = infoClue ? !isGlobalLibrary ? localImages.get(infoClue.id) || '' :
    photosReady && infoClue.assetIds.length ? `${import.meta.env.BASE_URL}${assetById.get(infoClue.assetIds[photoIndex] || infoClue.assetIds[0])!.path.slice(1)}` : '' : ''
  const openInfo = (clue: Clue) => {
    setInfoId(clue.id); setInfoContent(clue)
    if (!isGlobalLibrary) {
      const item = activeLocalLibrary.clues.find((candidate) => candidate.id === clue.id)
      if (item) {
        const names = new Map([...countries.map((country) => [country.id, country.name] as const),
          ...[...regionSchemeByCountry.values()].flatMap((scheme) => scheme.regions.map((region) => [region.id, region.name] as const))])
        const list = (lang: Language) => item.weights.map((row) => `${names.get(row.locationId)?.[lang] || row.locationId}: ${row.seenMultiplier}× / ${row.absentMultiplier}×`).join('; ')
        setInfoContent({ ...clue, geography: { en: list('en'), zh: list('zh') } })
      }
      return
    }
    void import('./data/knowledge-info').then(async ({ loadClueInfo }) => {
      const details = await loadClueInfo(clue, estimates)
      setInfoContent((current) => current?.id === clue.id ? details : current)
    })
  }
  const exactGroup = scope.type === 'countries' ? geographicGroups.find((group) => group.countryIds.length === scope.ids.length && group.countryIds.every((id) => scope.ids.includes(id))) : undefined
  const scopeTitle = scope.type === 'global' ? (libraryId === 'africa' ? (language === 'en' ? 'Africa library candidates' : '非洲题库候选') : L.global) : exactGroup ? exactGroup.name[language] : `${scopedIds.length} ${L.countries.toLowerCase()}`

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Globe2 size={21} strokeWidth={2.2} /></span><span><strong>Street Clues</strong><small>{L.subtitle}</small></span></div>
      <nav className="library-tabs" aria-label={language === 'en' ? 'Workspace tabs' : '工作区标签'}>
        <button type="button" className={pageId === 'match' ? 'active' : ''} aria-current={pageId === 'match' ? 'page' : undefined} onClick={() => { setPageId('match'); setInfoId(null) }}>{language === 'en' ? 'Match clues' : '匹配线索'}</button>
        <button type="button" className={pageId === 'edit' ? 'active' : ''} aria-current={pageId === 'edit' ? 'page' : undefined} onClick={() => { setPageId('edit'); setInfoId(null) }}>{language === 'en' ? 'Edit library' : '编辑题库'}</button>
      </nav>
      <div className="top-actions">
        <div className="scope-inline"><span className="eyebrow">{L.scope}</span><span className="scope-current">{scopeTitle} <span className="count-pill">{scopedIds.length}</span></span></div>
        <button type="button" className="language-switch" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} aria-label={language === 'en' ? 'Switch to Simplified Chinese' : '切换到英语'}>{language === 'en' ? '简体中文' : 'English'}</button>
      </div>
    </header>

    {pageId === 'match' && <>
    <section className="library-picker" aria-label={language === 'en' ? 'Choose clue library' : '选择线索题库'}>
      <span className="section-kicker">{language === 'en' ? 'CLUE LIBRARY' : '线索题库'}</span>
      <div className="library-picker-buttons">{(['global', 'africa', 'personal'] as const).map((id) => <button type="button" key={id} className={libraryId === id ? 'active' : ''} aria-pressed={libraryId === id} onClick={() => { setLibraryId(id); setCategoryId('all'); setGallerySearch(''); setInfoId(null); setViewCountry(null) }}>{id === 'global' ? (language === 'en' ? 'Global library' : '全球题库') : id === 'africa' ? (language === 'en' ? 'Africa library' : '非洲题库') : (language === 'en' ? 'My library' : '我的题库')}</button>)}</div>
      {libraryId === 'africa' && <span className="library-picker-note">{language === 'en' ? `${africaManifest.clueCount} clues · ${africaManifest.candidateCountryIds.length} documented candidates` : `${africaManifest.clueCount} 条线索 · ${africaManifest.candidateCountryIds.length} 个已录入候选`}</span>}
      {libraryId === 'africa' && !africaLibrary && <span className="library-picker-note" role="status">{africaError ? (language === 'en' ? `Could not load Africa library: ${africaError}` : `非洲题库加载失败：${africaError}`) : (language === 'en' ? 'Loading library…' : '正在加载题库……')}</span>}
    </section>
    <section className="scope-panel" aria-label={L.scope}>
      <div className="scope-panel-head"><div><span className="section-kicker">01 / {L.scope}</span><h2>{scopeTitle}</h2></div><span className="muted">{scopedIds.length} {L.count}</span></div>
      <div className="scope-controls">
        <button type="button" className={`scope-button ${scope.type === 'global' ? 'chosen' : ''}`} onClick={() => setScope({ type: 'global' })}>{libraryId === 'africa' ? (language === 'en' ? 'All library candidates' : '全部题库候选') : L.global}</button>
        {geographicGroups.filter((group) => group.kind === 'continent' && (libraryId !== 'africa' || group.countryIds.some((id) => AFRICA_CANDIDATES.has(id)))).map((group) => <button type="button" key={group.id} className={`scope-button ${groupIsSelected(group) ? 'chosen' : ''}`} aria-pressed={groupIsSelected(group)} onClick={() => toggleGroup(group)}>{group.name[language]}</button>)}
        <details className="country-picker"><summary className={`scope-button ${scope.type === 'countries' ? 'chosen' : ''}`}>{L.custom} <ChevronDown size={14} /></summary>
          <div className="country-picker-popover"><label className="search-field"><Search size={15} /><input type="search" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} placeholder={L.searchCountry} aria-label={L.searchCountry} /></label>
            <div className="country-options">{selectableCountries.filter((country) => country.name[language].toLocaleLowerCase().includes(countrySearch.toLocaleLowerCase()) || country.id.toLowerCase().includes(countrySearch.toLowerCase())).map((country) => <label key={country.id} className="country-option"><input type="checkbox" checked={scope.type === 'countries' && scope.ids.includes(country.id)} onChange={() => toggleCountry(country.id)} />{country.flagCode ? <img src={`${import.meta.env.BASE_URL}flags/${country.flagCode}.svg`} alt="" /> : <span className="flag-fallback" aria-hidden="true">{country.continent === 'Antarctica' ? '◇' : '•'}</span>}<span>{country.name[language]}</span></label>)}</div>
          </div></details>
      </div>
      {libraryId !== 'africa' && <div className="scope-region-controls"><span className="section-kicker">{language === 'en' ? 'REGIONAL PRESETS · COMBINE FREELY' : '地区组合 · 可多选'}</span><div className="scope-controls">{geographicGroups.filter((group) => group.kind === 'region').map((group) => <button type="button" key={group.id} className={`scope-button ${groupIsSelected(group) ? 'chosen' : ''}`} aria-pressed={groupIsSelected(group)} onClick={() => toggleGroup(group)}>{group.name[language]}</button>)}</div></div>}
      {scope.type === 'countries' && scope.ids.length <= 12 && <div className="scope-chips">{scope.ids.map((id) => <button type="button" className="scope-chip" key={id} onClick={() => toggleCountry(id)}>{countryById.get(id)?.name[language]} <X size={13} /></button>)}</div>}
    </section>

    <main className="workspace">
      <aside className="tree-panel" aria-label={L.library}>
        <div className="panel-heading"><span className="section-kicker">02 / {L.library}</span><h2><BookOpen size={18} /> {L.library}</h2></div>
        <button type="button" className={`tree-all ${activeCategoryId === 'all' ? 'active' : ''}`} onClick={() => setCategoryId('all')}>{L.allClues}<span>{availableClues.length}</span></button>
        {categories.filter((category) => category.children.some((child) => availableClues.some((clue) => clue.categoryId === child.id))).map((category) => {
          const open = openGroups.includes(category.id)
          return <div className="tree-group" key={category.id}>
            <button type="button" className="tree-parent" onClick={() => setOpenGroups((current) => open ? current.filter((id) => id !== category.id) : [...current, category.id])} aria-expanded={open}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span>{category.name[language]}</span></button>
            {open && <div className="tree-children">{category.children.filter((child) => availableClues.some((clue) => clue.categoryId === child.id)).map((child) => <button type="button" key={child.id} className={`tree-child ${activeCategoryId === child.id ? 'active' : ''}`} onClick={() => setCategoryId(child.id)}><span>{child.name[language]}</span><small>{availableClues.filter((clue) => clue.categoryId === child.id).length}</small></button>)}</div>}
          </div>
        })}
        <div className="tree-foot">{language === 'en' ? 'Local rules · no account · no live API' : '本地规则 · 无需账号 · 无实时 API'}</div>
      </aside>

      <section className="gallery-panel" aria-label={L.gallery}>
        <div className="panel-heading gallery-heading"><div><span className="section-kicker">03 / {L.gallery}</span><h2>{activeCategoryId === 'all' ? (!isGlobalLibrary ? (language === 'en' ? (libraryId === 'africa' ? 'Africa clues' : 'My clues') : (libraryId === 'africa' ? '非洲线索' : '我的线索')) : L.all) : categories.flatMap((category) => category.children).find((child) => child.id === activeCategoryId)?.name[language]}</h2></div><span className="gallery-count">{language === 'en' ? `${displayedClues.length} illustrated · ${textOnly.length} text-only` : `${displayedClues.length} 个图片线索 · ${textOnly.length} 个文字线索`}</span></div>
        {isGlobalLibrary && canChooseCountryClues && <div className="gallery-mode" role="group" aria-label={L.countryClueMode}>
          <button type="button" className={!showAllCountryClues ? 'active' : ''} aria-pressed={!showAllCountryClues} onClick={() => setShowAllCountryClues(false)}>{L.regionClues}</button>
          <button type="button" className={showAllCountryClues ? 'active' : ''} aria-pressed={showAllCountryClues} onClick={() => setShowAllCountryClues(true)}>{L.allCitedCountryClues}</button>
        </div>}
        {isGlobalLibrary && canChooseCountryClues && showAllCountryClues && <p className="gallery-mode-note">{L.allCitedCountryCluesHelp}</p>}
        <p className="exclusion-help">{L.exclusionHelp}</p>
        <label className="search-field clue-search"><Search size={15} /><input type="search" value={gallerySearch} onChange={(event) => { setGallerySearch(event.target.value); setGalleryLimit(48) }} placeholder={L.searchClues} aria-label={L.searchClues} /></label>
        {isGlobalLibrary && activeCategoryId === 'brands' && <div className="brand-filters" aria-label={language === 'en' ? 'Visual filter' : '视觉筛选'}>{['all','red','yellow','wordmark'].map((tag) => <button type="button" className={brandFilter === tag ? 'active' : ''} key={tag} onClick={() => setBrandFilter(tag)}>{tag === 'all' ? L.allClues : tag === 'red' ? (language === 'en' ? 'Red' : '红色') : tag === 'yellow' ? (language === 'en' ? 'Yellow' : '黄色') : (language === 'en' ? 'Wordmark' : '文字标志')}</button>)}</div>}
        {displayedClues.length ? <div className="clue-grid">{displayedClues.map((clue) => {
          const asset = isGlobalLibrary ? assetById.get(clue.assetIds[0]) : undefined
          const chosen = observations[clue.id]
          return <article className={`clue-card clue-${clue.id} ${chosen ? 'is-selected' : ''}`} key={clue.id}>
            <button type="button" className="clue-main" onClick={() => selectSeen(clue)} aria-pressed={chosen?.mode === 'seen'}>
              <span className="photo-wrap"><img className={clue.cardCrop || asset?.cardCrop ? `crop-${clue.cardCrop || asset?.cardCrop}` : undefined} src={imageForClue(clue)} loading="lazy" alt={clue.appearance[language]} /><span className="photo-check">{chosen?.mode === 'seen' ? <Check size={16} /> : null}</span></span>
              <span className="clue-label">{clue.appearance[language]}</span>
            </button>
            <button type="button" className="info-button" onClick={() => openInfo(clue)} aria-label={`${L.info}: ${clue.appearance[language]}`}><Info size={17} /></button>
            {chosen && <div className="card-state"><button type="button" className={chosen.mode === 'seen' ? 'state-active' : ''} onClick={() => selectSeen(clue)}>{L.seen}</button>{clue.exclusionAllowed && <button type="button" className={chosen.mode === 'excluded' ? 'state-active' : ''} onClick={() => selectExcluded(clue)}>{L.excluded}</button>}<button type="button" className="certainty-toggle" onClick={() => toggleCertainty(clue.id)}>{chosen.certainty === 'certain' ? L.certain : L.uncertain}</button></div>}
            {!chosen && clue.exclusionAllowed && <button type="button" className="card-exclude" onClick={() => selectExcluded(clue)}><span aria-hidden="true">−</span><span className="sr-only">{L.excluded}</span></button>}
          </article>
        })}</div> : <div className="gallery-empty">{!isGlobalLibrary ? (language === 'en' ? 'No illustrated clues in this view.' : '当前视图没有带图线索。') : L.noPhotos}</div>}
        {textOnly.length > 0 && <section className="text-observations"><h3>{!isGlobalLibrary ? (language === 'en' ? 'Text clues' : '文字线索') : L.textOnly}</h3><div className="text-clue-list">{visibleTextOnly.map((clue) => { const chosen = observations[clue.id]; return <div className={`text-clue ${chosen ? 'is-selected' : ''}`} key={clue.id}><button type="button" className="text-clue-pick" onClick={() => selectSeen(clue)} aria-pressed={chosen?.mode === 'seen'}>{chosen?.mode === 'seen' && <Check size={14} />}{clue.appearance[language]}</button><button type="button" className="text-clue-info" onClick={() => openInfo(clue)} aria-label={`${L.info}: ${clue.appearance[language]}`}><Info size={15} /></button>{chosen ? <><button type="button" className={`text-state ${chosen.mode === 'excluded' ? 'active' : ''}`} onClick={() => selectExcluded(clue)}>{L.excluded}</button><button type="button" className="text-certainty" onClick={() => toggleCertainty(clue.id)}>{chosen.certainty === 'certain' ? L.certain : L.uncertain}</button></> : <button type="button" className="text-state text-state-empty" onClick={() => selectExcluded(clue)} aria-label={`${L.excluded}: ${clue.appearance[language]}`} title={L.excluded}>−</button>}</div> })}</div></section>}
        {textOnly.length > galleryLimit && <button type="button" className="load-more" onClick={() => setGalleryLimit((limit) => limit + 48)}>{L.showMore} · {Math.min(textOnly.length - galleryLimit, 48)} / {textOnly.length - galleryLimit}</button>}
        {!displayedClues.length && !textOnly.length && <p className="small-note">{L.categoriesEmpty}</p>}
        {isGlobalLibrary && <SourceGallery language={language} countries={countries} ready={photosReady} />}
      </section>

      <section className={`results-panel ${viewCountry ? 'has-region' : ''}`} aria-label={L.countryResults}>
        <div className="results-top"><div><span className="section-kicker">04 / {L.selected}</span><h2>{L.selected} <span className="count-pill dark">{selected.length}</span></h2></div><button type="button" className="clear-button" onClick={() => setObservations({})} disabled={!selected.length}><RotateCcw size={14} /> {L.clear}</button></div>
        {selected.length ? <div className="selection-list">{selected.map((observation) => {
          const clue = activeClueById.get(observation.clueId)!
          return <div className="selection-chip" key={observation.clueId}><span className={`selection-mode ${observation.mode === 'excluded' ? 'negative' : ''}`}>{observation.mode === 'seen' ? L.seen : L.excluded}</span><span className="selection-name">{clue.appearance[language]}</span><button type="button" onClick={() => toggleCertainty(clue.id)}>{observation.certainty === 'certain' ? L.certain : L.uncertain}</button><button type="button" className="remove-selection" onClick={() => setObservations((current) => { const next = { ...current }; delete next[clue.id]; return next })} aria-label={`${L.close}: ${clue.appearance[language]}`}><X size={14} /></button></div>
        })}</div> : <p className="selection-empty">{L.noSelected}</p>}
        <div className="charts-grid">
          <section className="chart-card"><div className="chart-head"><div><span className="section-kicker">05 / {L.countryResults}</span><h2>{L.countryResults} <button type="button" className="inline-info" aria-label={L.share} onClick={() => setShowShareInfo(!showShareInfo)}><Info size={15} /></button></h2></div><span className="chart-unit">{L.share}</span></div>
            {showShareInfo && <p className="share-explain">{!isGlobalLibrary ? (language === 'en' ? 'Match share from location likelihood multipliers under a uniform candidate prior. These are estimates, not calibrated accuracy.' : '按地点似然乘数与候选均匀先验计算匹配占比；乘数是估计值，不是校准后的正确率。') : L.aboutShare}</p>}
            {!scopedIds.length ? <div className="chart-empty">{language === 'en' ? 'No candidates in this library match the current geographic scope.' : '当前地理范围与此题库没有重合候选。'}</div> : selected.length || scopedIds.length === 1 ? <RankingChart ranked={countryRanks} language={language} label={(id) => countryById.get(id)?.name[language] || id} flagCodeFor={(id) => countryById.get(id)?.flagCode} activeId={viewCountry} onPick={setViewCountry} /> : <div className="chart-empty">{L.noEvidence}</div>}
            <label className="inspect-select"><span>{L.selectCountry}</span><select value={viewCountry || ''} onChange={(event) => setViewCountry(event.target.value || null)}><option value="">{L.noCountry}</option>{scopedCountries.map((country) => <option key={country.id} value={country.id}>{country.name[language]}</option>)}</select></label>
          </section>
          {viewCountry && <section className="chart-card region-card"><div className="chart-head"><div><span className="section-kicker">06 / {L.regionResults}</span><h2>{countryById.get(viewCountry)?.name[language]}</h2></div><button type="button" className="close-region" onClick={() => setViewCountry(null)} aria-label={L.close}><X size={18} /></button></div>
            <p className="region-caption">{scheme?.granularity[language]} · {L.conditional}</p>
            {!scheme ? <div className="chart-empty">{regionCoverageByCountry.get(viewCountry) ? `${L.regionPartial} (${regionCoverageByCountry.get(viewCountry)})` : L.noRegionScheme}</div> : <RankingChart ranked={regionRanks} language={language} label={(id) => scheme.regions.find((region) => region.id === id)?.name[language] || id} othersLabel={language === 'en' ? 'Other regions' : '其他地区'} />}
          </section>}
        </div>
      </section>
    </main>
    </>}
    {pageId === 'edit' && <>
      <div className="custom-toolbar"><span>{customStorageError ? (language === 'en' ? `Local save failed: ${customStorageError}` : `本地保存失败：${customStorageError}`) : customSaveStatus === 'saving' ? (language === 'en' ? 'Saving locally…' : '正在保存到本地……') : customSaveStatus === 'saved' ? (language === 'en' ? 'Saved in this browser' : '已保存在本浏览器') : (language === 'en' ? 'Loading local library…' : '正在读取本地题库……')}</span></div>
      {customLoaded && <CustomLibraryEditor library={customLibrary} onChange={applyCustomLibrary} language={language} />}
    </>}

    {infoClue && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setInfoId(null); setZoom(false) } }}><section className="info-modal" role="dialog" aria-modal="true" aria-label={infoClue.formalName[language]}><button type="button" className="modal-close" onClick={() => { setInfoId(null); setZoom(false) }} aria-label={L.close}><X size={19} /></button><span className="section-kicker">{L.info}</span><h2>{infoClue.formalName[language]}</h2>{infoImage && <button type="button" className="modal-image" onClick={() => setZoom(true)} aria-label={L.enlarge}><img src={infoImage} alt={infoClue.appearance[language]} /><span><ZoomIn size={18} /> {L.enlarge}</span></button>}
      {isGlobalLibrary && photosReady && infoClue.assetIds.length > 1 && <div className="instance-strip" aria-label={language === 'en' ? 'Photo examples' : '图片实例'}>{infoClue.assetIds.map((id, index) => <button type="button" key={id} className={photoIndex === index ? 'active' : ''} onClick={() => setPhotoIndex(index)} aria-label={`${language === 'en' ? 'Photo' : '图片'} ${index + 1}`} aria-pressed={photoIndex === index}><img src={`${import.meta.env.BASE_URL}${assetById.get(id)!.path.slice(1)}`} alt="" loading="lazy" /></button>)}</div>}
      {isGlobalLibrary && infoClue.referenceAssetIds?.map((id) => <figure className="source-figure" key={id}><img src={`${import.meta.env.BASE_URL}${assetById.get(id)!.path.slice(1)}`} alt={L.sourceDiagram} loading="lazy" /><figcaption>{L.sourceDiagram}</figcaption></figure>)}
      <div className="info-details"><h3>{L.identify}</h3><p>{infoClue.identify[language]}</p><h3>{L.geography}</h3><p>{infoClue.geography[language]}</p><h3>{L.strength}</h3><p>{infoClue.strength[language]}</p><h3>{L.caveat}</h3><p>{infoClue.caveat[language]}</p>{isGlobalLibrary && <><h3>{L.sources}</h3><ul>{infoClue.sourceUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></li>)}</ul>{(photosReady ? [...infoClue.assetIds, ...(infoClue.referenceAssetIds || [])] : []).map((id) => { const asset = assetById.get(id)!; return <p className="credit" key={id}><strong>{L.asset}:</strong> <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.author}</a> · <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.license}</a> · {L.reviewed}: {asset.reviewed}</p> })}<p className="credit">{L.reviewed}: {infoClue.reviewed}</p></>}</div></section></div>}
    {zoom && infoImage && infoClue && <div className="zoom-backdrop" role="presentation" onClick={() => setZoom(false)}><button type="button" className="zoom-close" onClick={() => setZoom(false)} aria-label={L.close}><X size={24} /></button><img src={infoImage} alt={infoClue.appearance[language]} /></div>}
  </div>
}
export default App

