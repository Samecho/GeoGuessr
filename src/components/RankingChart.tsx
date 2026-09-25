import { useLayoutEffect, useRef } from 'react'
import type { Ranked } from '../engine/scoring'
import { breakdown, displayTenths } from '../engine/scoring'
import type { Language } from '../i18n'
import { ui } from '../i18n'

type Props = {
  ranked: Ranked[]
  language: Language
  label: (id: string) => string
  flag?: boolean
  activeId?: string | null
  onPick?: (id: string) => void
  othersLabel?: string
}

export function RankingChart({ ranked, language, label, flag = false, activeId, onPick, othersLabel }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const previous = useRef(new Map<string, { top: number; left: number; width: number; clone: HTMLElement }>())
  const { top, others } = breakdown(ranked)
  const values = displayTenths([...top.map((row) => row.share), others])

  useLayoutEffect(() => {
    const container = listRef.current
    if (!container) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) container.querySelectorAll('.rank-ghost').forEach((ghost) => ghost.remove())
    const rect = container.getBoundingClientRect()
    const next = new Map<string, { top: number; left: number; width: number; clone: HTMLElement }>()
    const currentNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-rank-id]'))
    currentNodes.forEach((node) => {
      const id = node.dataset.rankId!
      const position = node.getBoundingClientRect()
      const prior = previous.current.get(id)
      node.getAnimations().forEach((animation) => animation.cancel())
      if (!reduced) {
        if (prior) {
          const delta = prior.top - (position.top - rect.top)
          if (Math.abs(delta) > 1) node.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' })
        } else if (id !== '__others__') {
          node.animate([{ transform: 'translateY(' + Math.max(30, container.clientHeight - (position.top - rect.top) - position.height) + 'px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, easing: 'ease-out' })
        }
      }
      next.set(id, { top: position.top - rect.top, left: position.left - rect.left, width: position.width, clone: node.cloneNode(true) as HTMLElement })
    })
    if (!reduced) for (const [id, prior] of previous.current) {
      if (id === '__others__' || next.has(id)) continue
      const ghost = prior.clone
      ghost.classList.add('rank-ghost')
      ghost.removeAttribute('data-rank-id')
      ghost.style.top = `${prior.top}px`
      ghost.style.left = `${prior.left}px`
      ghost.style.width = `${prior.width}px`
      container.appendChild(ghost)
      ghost.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(26px)' }], { duration: 280, easing: 'ease-in' }).onfinish = () => ghost.remove()
      window.setTimeout(() => ghost.remove(), 350)
    }
    previous.current = next
  }, [ranked, language, label])

  return <div className="rank-list" ref={listRef}>
    {top.map((row, index) => {
      const content = <>
        <span className="rank-identity">{flag && <img className="flag" src={`${import.meta.env.BASE_URL}flags/${row.id.toLowerCase()}.svg`} alt="" />}<span className="rank-name">{label(row.id)}</span></span>
        <span className="rank-meter"><span className="rank-fill" style={{ width: `${Math.max(1.5, row.share * 100)}%` }} /></span>
        <span className="rank-value">{values[index].toFixed(1)}%</span>
      </>
      return onPick
        ? <button type="button" className={`rank-row ${activeId === row.id ? 'active' : ''}`} data-rank-id={row.id} key={row.id} onClick={() => onPick(row.id)} aria-label={`${label(row.id)} ${values[index].toFixed(1)}%`}>{content}</button>
        : <div className="rank-row" data-rank-id={row.id} key={row.id}>{content}</div>
    })}
    {<div className="rank-row others" data-rank-id="__others__" key="others">
      <span className="rank-identity"><span className="others-dot">•••</span><span className="rank-name">{othersLabel || ui[language].others}</span></span>
      <span className="rank-meter"><span className="rank-fill" style={{ width: `${Math.max(1.5, others * 100)}%` }} /></span>
      <span className="rank-value">{values[values.length - 1].toFixed(1)}%</span>
    </div>}
  </div>
}


