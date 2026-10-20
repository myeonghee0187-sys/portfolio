import type { RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useProjectScrollEffect from './useProjectScrollEffect'

function focusPoints(section: HTMLElement) {
  const points = [...section.querySelectorAll<HTMLElement>('[data-scroll-point]')]
  const lines = [...section.querySelectorAll<HTMLElement>('[data-scroll-line]')]
  let centers: number[] = []
  let active = -1
  const update = () => {
    if (!centers.length) return
    const readingLine = window.scrollY + window.innerHeight / 2
    let next = 0
    for (let i = 1; i < centers.length; i += 1) {
      if (Math.abs(centers[i] - readingLine) < Math.abs(centers[next] - readingLine)) next = i
    }
    if (next === active) return
    active = next
    const id = points[next].dataset.scrollPoint!
    section.dataset.activePoint = id
    points.forEach((point, i) => point.toggleAttribute('data-scroll-active', i === next))
    lines.forEach(line => line.toggleAttribute('data-scroll-active', line.dataset.scrollLine === id))
  }
  const measure = () => {
    const rects = points.map(point => point.getBoundingClientRect())
    // Responsive MAIN copy shares a single row. Traverse its real text bounds
    // left-to-right, rather than assigning identical centers or artificial thirds.
    const sharedRow = Math.max(...rects.map(rect => rect.top)) < Math.min(...rects.map(rect => rect.bottom))
    centers = rects.map((rect, i) => window.scrollY + (
      sharedRow && i === 0 ? rect.top :
        sharedRow && i === rects.length - 1 ? rect.bottom : rect.top + rect.height / 2
    ))
    update()
  }
  const trigger = ScrollTrigger.create({
    id: `project-points-${section.getAttribute('aria-labelledby')}`,
    trigger: section,
    start: () => `top ${window.innerHeight}px`,
    end: 'bottom top',
    onRefresh: measure,
    onUpdate: update,
  })
  measure()
  return {
    refresh: () => trigger.refresh(),
    dispose: () => {
      delete section.dataset.activePoint
      for (const element of [...points, ...lines]) element.removeAttribute('data-scroll-active')
    },
  }
}

/** Compare measured callout centers; never divide the section into equal thirds. */
export default function useScrollPointFocus(sectionRef: RefObject<HTMLElement | null>) {
  useProjectScrollEffect(sectionRef, focusPoints)
}
