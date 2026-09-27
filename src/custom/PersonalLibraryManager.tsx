import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Language } from '../i18n'
import { emptyCustomLibrary, MAX_PERSONAL_LIBRARIES, type CustomLibraryCollection } from './library'

export function PersonalLibraryManager({ collection, onChange, language }: {
  collection: CustomLibraryCollection
  onChange: (value: CustomLibraryCollection) => void
  language: Language
}) {
  const selected = collection.libraries.find((entry) => entry.id === collection.activeId)!
  const [name, setName] = useState(selected.name)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { setName(selected.name); setDeleteArmed(false) }, [selected.id, selected.name])
  const text = language === 'en' ? {
    title: 'My libraries', choose: 'Edit library', name: 'Library name', rename: 'Save name', create: 'New library',
    remove: 'Delete library', confirm: 'Confirm delete', cancel: 'Cancel', last: 'Keep at least one personal library.',
    duplicate: 'Choose a different library name.', invalid: 'Enter a library name (up to 80 characters).',
    full: 'You have reached the limit of 30 personal libraries.', created: 'New library created. Add its clues below.',
    renamed: 'Library renamed.', deleted: 'Library deleted.',
  } : {
    title: '我的题库', choose: '编辑题库', name: '题库名称', rename: '保存名称', create: '新建题库',
    remove: '删除题库', confirm: '确认删除', cancel: '取消', last: '至少保留一个个人题库。',
    duplicate: '请使用不同的题库名称。', invalid: '请输入题库名称（最多 80 个字符）。',
    full: '最多可创建 30 个个人题库。', created: '已创建新题库，请在下方添加线索。',
    renamed: '题库已重命名。', deleted: '题库已删除。',
  }
  const create = () => {
    if (collection.libraries.length >= MAX_PERSONAL_LIBRARIES) { setMessage(text.full); return }
    const base = language === 'en' ? 'My library' : '我的题库'
    let number = 2
    while (collection.libraries.some((entry) => entry.name.toLocaleLowerCase() === `${base} ${number}`.toLocaleLowerCase())) number++
    const next = { id: `personal-${crypto.randomUUID()}`, name: `${base} ${number}`, library: emptyCustomLibrary() }
    onChange({ ...collection, activeId: next.id, libraries: [...collection.libraries, next] })
    setMessage(text.created)
  }
  const rename = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 80) { setMessage(text.invalid); return }
    if (collection.libraries.some((entry) => entry.id !== selected.id && entry.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) { setMessage(text.duplicate); return }
    onChange({ ...collection, libraries: collection.libraries.map((entry) => entry.id === selected.id ? { ...entry, name: trimmed } : entry) })
    setMessage(text.renamed)
  }
  const remove = () => {
    if (collection.libraries.length === 1) { setMessage(text.last); return }
    if (!deleteArmed) { setDeleteArmed(true); return }
    const libraries = collection.libraries.filter((entry) => entry.id !== selected.id)
    onChange({ ...collection, activeId: libraries[0].id, libraries })
    setDeleteArmed(false)
    setMessage(text.deleted)
  }
  return <section className="personal-library-manager" aria-label={text.title}>
    <div className="personal-library-manager-title"><strong>{text.title}</strong><span>{collection.libraries.length}</span></div>
    <label>{text.choose}<select value={selected.id} onChange={(event) => { setMessage(''); onChange({ ...collection, activeId: event.target.value }) }}>{collection.libraries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.library.clues.length})</option>)}</select></label>
    <label>{text.name}<input value={name} maxLength={80} onChange={(event) => { setName(event.target.value); setDeleteArmed(false) }} onKeyDown={(event) => { if (event.key === 'Enter') rename() }} /></label>
    <button type="button" onClick={rename}>{text.rename}</button>
    <button type="button" className="personal-library-create" onClick={create}><Plus size={15} /> {text.create}</button>
    <button type="button" className={deleteArmed ? 'personal-library-delete armed' : 'personal-library-delete'} onClick={remove}><Trash2 size={15} /> {deleteArmed ? text.confirm : text.remove}</button>
    {deleteArmed && <button type="button" onClick={() => setDeleteArmed(false)}>{text.cancel}</button>}
    {message && <span role="status" className="personal-library-message">{message}</span>}
  </section>
}
