import { useEffect, useMemo, useState } from 'react'
import imageIndexUrl from '../data/knowledge/images.json?url'
import type { Country } from '../data/types'

type SourceImage = { id: string; sourcePath: string; chapterId: string; chapterSourceUrl: string; alt: string }
type Props = { language: 'en' | 'zh'; countries: Country[]; ready: boolean }

const imagePath = (image: SourceImage) => `${import.meta.env.BASE_URL}source-images/${image.id}${image.sourcePath.toLowerCase().endsWith('.svg') ? '.svg' : '.webp'}`

export function SourceGallery({ language, countries, ready }: Props) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<SourceImage[] | null>(null)
  const [countryId, setCountryId] = useState('')
  const [limit, setLimit] = useState(48)
  useEffect(() => {
    if (!open || images) return
    let cancelled = false
    void fetch(imageIndexUrl).then((response) => response.json()).then((data: { images: SourceImage[] }) => {
      if (!cancelled) setImages(data.images)
    })
    return () => { cancelled = true }
  }, [open, images])
  const sortedCountries = useMemo(() => [...countries].sort((a, b) => a.name[language].localeCompare(b.name[language])), [countries, language])
  const visible = useMemo(() => (images || []).filter((image) => !countryId || image.chapterId === countryId), [images, countryId])
  return <section className="source-gallery">
    <div className="source-gallery-head"><div><span className="section-kicker">{language === 'en' ? 'SOURCE ARCHIVE' : '原资料图库'}</span><h3>{language === 'en' ? 'Browse all 5,860 source images' : '浏览全部 5,860 张资料图片'}</h3></div><button type="button" className="scope-button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? (language === 'en' ? 'Close' : '收起') : (language === 'en' ? 'Browse' : '浏览')}</button></div>
    {open && <><p className="small-note">{language === 'en' ? 'Images are grouped by their source chapter. Browsing them does not change the match scores. Source authors and redistribution rights are not verified.' : '图片按原资料章节分组。浏览图片不会改变匹配占比。原图片作者和再分发权利尚未核实。'}</p>
      {!ready ? <p className="small-note">{language === 'en' ? 'Image copies are not installed in this build.' : '本次构建尚未安装图片副本。'}</p> : <>
        <label className="source-gallery-filter">{language === 'en' ? 'Chapter' : '章节'} <select value={countryId} onChange={(event) => { setCountryId(event.target.value); setLimit(48) }}><option value="">{language === 'en' ? 'All chapters' : '全部章节'}</option>{sortedCountries.map((country) => <option key={country.id} value={country.id}>{country.name[language]}</option>)}</select></label>
        <p className="small-note">{visible.length} {language === 'en' ? 'images' : '张图片'}</p>
        <div className="source-image-grid">{visible.slice(0, limit).map((image) => <figure key={image.id}><a href={imagePath(image)} target="_blank" rel="noreferrer" aria-label={language === 'en' ? `Open source image ${image.id}` : `打开资料图片 ${image.id}`}><img src={imagePath(image)} alt="" loading="lazy" /></a><figcaption><span>{countries.find((country) => country.id === image.chapterId)?.name[language] || image.chapterId}</span><a href={image.chapterSourceUrl} target="_blank" rel="noreferrer">{language === 'en' ? 'Source' : '来源'}</a></figcaption></figure>)}</div>
        {visible.length > limit && <button type="button" className="load-more" onClick={() => setLimit((value) => value + 48)}>{language === 'en' ? 'Show more' : '显示更多'} · {Math.min(48, visible.length-limit)}</button>}
      </>}
    </>}
  </section>
}
