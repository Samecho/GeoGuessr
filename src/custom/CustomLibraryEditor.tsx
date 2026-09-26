import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { Download, ImagePlus, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { categories, countries, regionSchemeByCountry } from '../data/knowledge'
import type { CustomClue, CustomLibrary, CustomWeight } from './library'
import { CUSTOM_KIND, imageFileToDataUrl, mergeCustomLibraries, parseCustomLibrary } from './library'
import type { Language } from '../i18n'

type DraftWeight = { locationId: string; seen: string; absent: string }
type Draft = { id: string | null; en: string; zh: string; categoryId: string; imageDataUrl: string; weights: DraftWeight[]; supersedesClueIds: string[]; cardCrop?: CustomClue['cardCrop'] }
const newDraft = (): Draft => ({ id: null, en: '', zh: '', categoryId: 'camera', imageDataUrl: '', weights: [], supersedesClueIds: [] })
const fromClue = (clue: CustomClue): Draft => ({ id: clue.id, en: clue.appearance.en, zh: clue.appearance.zh,
  categoryId: clue.categoryId, imageDataUrl: clue.imageDataUrl || '', supersedesClueIds: clue.supersedesClueIds || [], cardCrop: clue.cardCrop,
  weights: clue.weights.map((row) => ({ locationId: row.locationId, seen: String(row.seenMultiplier), absent: String(row.absentMultiplier) })) })

const copy = {
  en: {
    title: 'My clue library', note: 'Create visual clues with your own location multipliers. Saved only in this browser; export JSON for a backup or another device.',
    new: 'New clue', export: 'Export JSON', import: 'Import JSON', saved: 'Clues in this library', empty: 'No custom clues yet. Add one below.',
    edit: 'Edit', remove: 'Delete', undo: 'Undo delete', en: 'English clue label', zh: 'Chinese clue label', category: 'Category',
    image: 'Example image', imageHelp: 'Upload, drop, or focus this area and press Ctrl+V to paste an image.', upload: 'Choose image', paste: 'Paste from clipboard', removeImage: 'Remove image',
    weights: 'Location weights', weightsHelp: '1× leaves a location unchanged. 10× makes this observation ten times more likely there than at unspecified places; it does not add ten percentage points.',
    country: 'Choose country', region: 'Target', wholeCountry: 'Whole country', addWeight: 'Add location', seen: 'When seen ×', absent: 'When clearly absent ×',
    save: 'Save clue', create: 'Create clue', cancel: 'Cancel edit', oneName: 'Enter at least one clue label.', oneWeight: 'Add at least one location weight.',
    invalidWeight: 'Each multiplier must be between 0.01× and 1000×.', already: 'That location is already included.', choose: 'Choose a country first.',
    imageError: 'Could not use that image.', saveMessage: 'Clue saved locally.', imported: 'JSON imported and merged.', importError: 'Could not import that JSON file.', pasteError: 'No supported image is available on the clipboard.',
    yourWeights: 'These are your estimates. Joint region evidence is averaged into the parent country under the uniform region prior; the region chart remains conditional on the selected country.',
  },
  zh: {
    title: '我的线索题库', note: '创建自己的视觉线索并设定地点乘数。只保存在本浏览器；导出 JSON 可备份或转到其他设备。',
    new: '新建线索', export: '导出 JSON', import: '导入 JSON', saved: '我的线索', empty: '还没有自定义线索。请在下方添加。',
    edit: '编辑', remove: '删除', undo: '撤销删除', en: '英文线索名称', zh: '中文线索名称', category: '分类',
    image: '示例图片', imageHelp: '上传、拖入，或点此区域后按 Ctrl+V 粘贴图片。', upload: '选择图片', paste: '从剪贴板粘贴', removeImage: '移除图片',
    weights: '地点权重', weightsHelp: '1× 不改变地点。10× 表示在该地点看见此线索的相对似然是未设置地点的十倍，并非直接加十个百分点。',
    country: '选择国家', region: '目标地点', wholeCountry: '整个国家', addWeight: '添加地点', seen: '看见时 ×', absent: '明确未出现时 ×',
    save: '保存线索', create: '创建线索', cancel: '取消编辑', oneName: '请至少填写一种语言的名称。', oneWeight: '请至少添加一个地点权重。',
    invalidWeight: '每个乘数必须在 0.01× 到 1000× 之间。', already: '该地点已经添加。', choose: '请先选择国家。',
    imageError: '无法使用这张图片。', saveMessage: '线索已保存在本地。', imported: '已导入并合并 JSON。', importError: '无法导入此 JSON 文件。', pasteError: '剪贴板中没有受支持的图片。',
    yourWeights: '这些是你设定的估计值。各地区的联合证据按均匀地区先验汇总到父国；地区图仍以已选择的国家为条件。',
  },
} as const

export function CustomLibraryEditor({ library, onChange, language }: { library: CustomLibrary; onChange: (value: CustomLibrary) => void; language: Language }) {
  const T = copy[language]
  const [draft, setDraft] = useState<Draft>(newDraft)
  const [targetCountry, setTargetCountry] = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [message, setMessage] = useState('')
  const [deleted, setDeleted] = useState<CustomClue | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setMessage(''), [language])
  const imageInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)
  const currentRegions = targetCountry ? regionSchemeByCountry.get(targetCountry)?.regions || [] : []
  const allNames = new Map([...countries.map((country) => [country.id, country.name[language]] as const),
    ...[...regionSchemeByCountry.values()].flatMap((scheme) => scheme.regions.map((region) => [region.id, region.name[language]] as const))])
  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const attachImage = async (file: File | null | undefined) => {
    if (!file) return
    setBusy(true)
    try { setField('imageDataUrl', await imageFileToDataUrl(file)); setMessage('') }
    catch (error) { setMessage(`${T.imageError} ${error instanceof Error ? error.message : ''}`) }
    finally { setBusy(false) }
  }
  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const file = [...event.clipboardData.items].find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
    if (file) { event.preventDefault(); void attachImage(file) }
  }
  const handleDrop = (event: DragEvent<HTMLElement>) => { event.preventDefault(); void attachImage(event.dataTransfer.files[0]) }
  const pasteButton = async () => {
    try {
      if (!navigator.clipboard?.read) throw new Error(T.pasteError)
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((value) => ['image/png', 'image/jpeg', 'image/webp'].includes(value))
        if (type) { const blob = await item.getType(type); await attachImage(new File([blob], 'pasted-image', { type })); return }
      }
      throw new Error(T.pasteError)
    } catch (error) { setMessage(error instanceof Error ? error.message : T.pasteError) }
  }
  const addWeight = () => {
    if (!targetCountry) { setMessage(T.choose); return }
    const id = targetLocation || targetCountry
    if (draft.weights.some((row) => row.locationId === id)) { setMessage(T.already); return }
    setField('weights', [...draft.weights, { locationId: id, seen: '10', absent: '1' }])
    setMessage('')
  }
  const save = () => {
    const en = draft.en.trim() || draft.zh.trim()
    const zh = draft.zh.trim() || draft.en.trim()
    if (!en || !zh) { setMessage(T.oneName); return }
    if (!draft.weights.length) { setMessage(T.oneWeight); return }
    const weights: CustomWeight[] = draft.weights.map((row) => ({ locationId: row.locationId, seenMultiplier: Number(row.seen), absentMultiplier: Number(row.absent) }))
    if (weights.some((row) => !Number.isFinite(row.seenMultiplier) || !Number.isFinite(row.absentMultiplier) || row.seenMultiplier < 0.01 || row.seenMultiplier > 1000 || row.absentMultiplier < 0.01 || row.absentMultiplier > 1000)) {
      setMessage(T.invalidWeight); return
    }
    const item: CustomClue = { id: draft.id || `custom-${crypto.randomUUID()}`, appearance: { en, zh }, categoryId: draft.categoryId,
      ...(draft.imageDataUrl ? { imageDataUrl: draft.imageDataUrl } : {}), weights,
      ...(draft.supersedesClueIds.length ? { supersedesClueIds: draft.supersedesClueIds } : {}),
      ...(draft.cardCrop && draft.imageDataUrl ? { cardCrop: draft.cardCrop } : {}) }
    try {
      onChange(parseCustomLibrary({ schemaVersion: 1, kind: CUSTOM_KIND,
        clues: draft.id ? library.clues.map((clue) => clue.id === draft.id ? item : clue) : [...library.clues, item] }))
      setDraft(newDraft()); setMessage(T.saveMessage)
    } catch (error) { setMessage(error instanceof Error ? error.message : T.invalidWeight) }
  }
  const removeClue = (item: CustomClue) => {
    setDeleted(item)
    onChange({ ...library, clues: library.clues.filter((clue) => clue.id !== item.id) })
    if (draft.id === item.id) setDraft(newDraft())
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'street-clues-custom-library.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  const importJson = async (file: File | null | undefined) => {
    if (!file) return
    try {
      if (file.size > 100_000_000) throw new Error('JSON file exceeds 100 MB.')
      const incoming = parseCustomLibrary(JSON.parse(await file.text()))
      onChange(mergeCustomLibraries(library, incoming))
      setMessage(T.imported)
    } catch (error) { setMessage(`${T.importError} ${error instanceof Error ? error.message : ''}`) }
    if (jsonInput.current) jsonInput.current.value = ''
  }

  return <section className="custom-editor" aria-label={T.title}>
    <div className="custom-editor-head"><div><span className="section-kicker">{T.title}</span><h2>{T.title}</h2><p>{T.note}</p></div><div className="custom-editor-actions">
      <button type="button" onClick={() => { setDraft(newDraft()); setMessage('') }}><Plus size={15} /> {T.new}</button>
      <button type="button" onClick={exportJson}><Upload size={15} /> {T.export}</button>
      <button type="button" onClick={() => jsonInput.current?.click()}><Download size={15} /> {T.import}</button>
      <input ref={jsonInput} type="file" accept=".json,application/json" className="sr-only" aria-label={T.import} onChange={(event) => void importJson(event.target.files?.[0])} />
    </div></div>
    {message && <p className="custom-message" role="status">{message}</p>}
    <div className="custom-editor-grid"><aside className="custom-clue-list"><h3>{T.saved} <span className="count-pill">{library.clues.length}</span></h3>
      {deleted && <button type="button" className="custom-undo" onClick={() => { onChange(mergeCustomLibraries(library, { ...library, clues: [deleted] })); setDeleted(null) }}><RotateCcw size={14} /> {T.undo}</button>}
      {library.clues.length ? library.clues.map((item) => <div className={`custom-list-item ${draft.id === item.id ? 'active' : ''}`} key={item.id}>
        {item.imageDataUrl ? <img src={item.imageDataUrl} alt="" /> : <span className="custom-list-placeholder"><ImagePlus size={18} /></span>}
        <span>{item.appearance[language]}<small>{item.weights.length} {T.weights.toLowerCase()}</small></span>
        <button type="button" onClick={() => { setDraft(fromClue(item)); setMessage('') }} aria-label={`${T.edit}: ${item.appearance[language]}`}><Pencil size={15} /></button>
        <button type="button" onClick={() => removeClue(item)} aria-label={`${T.remove}: ${item.appearance[language]}`}><Trash2 size={15} /></button>
      </div>) : <p className="small-note">{T.empty}</p>}
    </aside>
    <div className="custom-form"><div className="custom-form-row"><label>{T.en}<input value={draft.en} maxLength={120} onChange={(event) => setField('en', event.target.value)} placeholder="Black Street View car" /></label><label>{T.zh}<input value={draft.zh} maxLength={120} onChange={(event) => setField('zh', event.target.value)} placeholder="黑色街景车" /></label><label>{T.category}<select value={draft.categoryId} onChange={(event) => setField('categoryId', event.target.value)}>{categories.map((category) => <optgroup key={category.id} label={category.name[language]}>{category.children.map((child) => <option key={child.id} value={child.id}>{child.name[language]}</option>)}</optgroup>)}</select></label></div>
      <div className="custom-form-columns"><div><h3>{T.image}</h3><div className="custom-dropzone" tabIndex={0} onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} aria-label={T.imageHelp}>
        {draft.imageDataUrl ? <img src={draft.imageDataUrl} alt={draft.en || draft.zh || T.image} /> : <><ImagePlus size={28} /><span>{T.imageHelp}</span></>}
      </div><div className="custom-image-actions"><button type="button" disabled={busy} onClick={() => imageInput.current?.click()}>{T.upload}</button><button type="button" disabled={busy} onClick={() => void pasteButton()}>{T.paste}</button>{draft.imageDataUrl && <button type="button" onClick={() => setField('imageDataUrl', '')}>{T.removeImage}</button>}</div><input ref={imageInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label={T.upload} onChange={(event) => { void attachImage(event.target.files?.[0]); event.target.value = '' }} /></div>
      <div><h3>{T.weights}</h3><p className="custom-help">{T.weightsHelp}</p><div className="custom-target-add"><label>{T.country}<select value={targetCountry} onChange={(event) => { setTargetCountry(event.target.value); setTargetLocation('') }}><option value="">{T.country}</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name[language]}</option>)}</select></label><label>{T.region}<select value={targetLocation} disabled={!targetCountry} onChange={(event) => setTargetLocation(event.target.value)}><option value="">{T.wholeCountry}</option>{currentRegions.map((region) => <option key={region.id} value={region.id}>{region.name[language]}</option>)}</select></label><button type="button" onClick={addWeight}><Plus size={14} /> {T.addWeight}</button></div>
        <div className="custom-weight-list">{draft.weights.map((row, index) => <div className="custom-weight-row" key={row.locationId}><strong>{allNames.get(row.locationId) || row.locationId}</strong><label>{T.seen}<input type="number" min="0.01" max="1000" step="any" value={row.seen} onChange={(event) => setField('weights', draft.weights.map((item, i) => i === index ? { ...item, seen: event.target.value } : item))} /></label><label>{T.absent}<input type="number" min="0.01" max="1000" step="any" value={row.absent} onChange={(event) => setField('weights', draft.weights.map((item, i) => i === index ? { ...item, absent: event.target.value } : item))} /></label><button type="button" aria-label={`${T.remove}: ${allNames.get(row.locationId)}`} onClick={() => setField('weights', draft.weights.filter((item) => item.locationId !== row.locationId))}><Trash2 size={15} /></button></div>)}</div><p className="custom-help">{T.yourWeights}</p></div></div>
      <div className="custom-form-actions"><button type="button" className="custom-save" onClick={save}>{draft.id ? T.save : T.create}</button>{draft.id && <button type="button" onClick={() => setDraft(newDraft())}>{T.cancel}</button>}</div>
    </div></div>
  </section>
}
