import { useLayoutEffect, type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useMediaQuery from '../../hooks/useMediaQuery'
import { JOURNEY_CLOCK } from './journeyData'
import { createJourneyFlow } from './journeyFlow'

/** Mobile/reduced-motion keeps the existing document cards and central vertical line. */
export default function useJourneyDocumentFlow(enabled: boolean, worldRef: RefObject<HTMLDivElement | null>) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useLayoutEffect(() => {
    const world = worldRef.current
    if (!enabled || !world) return
    const svg = world.querySelector<SVGSVGElement>('.journey__path')!
    const active = svg.querySelector<SVGPathElement>('.journey__path-active')!
    const nodes = [...world.querySelectorAll<HTMLElement>('.journey__node')]
    const flow = createJourneyFlow(world, active)
    const originalViewBox = svg.getAttribute('viewBox')!
    let height = 0
    let progress = 0
    const render = (value: number) => {
      progress = value
      flow.render(progress, reducedMotion)
    }
    const measure = () => {
      const bounds = world.getBoundingClientRect()
      const width = bounds.width
      height = bounds.height
      // The previous CSS background occupied center / 1px calc(100% - 160px).
      // Represent exactly that geometry in the existing SVG so line and clock share it.
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.style.height = `${height}px`
      svg.querySelectorAll('path').forEach(path => path.setAttribute('d', `M ${width / 2} 80 L ${width / 2} ${height - 80}`))
      const total = active.getTotalLength()
      const milestones = JOURNEY_CLOCK.map(stop => ({
        progress: stop.node === 0 ? 0 : (nodes[stop.node].getBoundingClientRect().top - bounds.top - 80) / total,
        minutes: stop.minutes,
      }))
      flow.measure(milestones)
      if (import.meta.env.DEV) world.parentElement!.dataset.line = JSON.stringify({ length: total, milestones })
      render(progress)
    }
    measure()
    const trigger = ScrollTrigger.create({
      id: 'journey-document-flow', trigger: world,
      start: 'top+=80 center', end: () => `top+=${height - 80} center`,
      invalidateOnRefresh: true,
      onUpdate: self => render(self.progress),
      onRefresh: self => render(self.progress),
    })
    ScrollTrigger.addEventListener('revert', measure)
    let live = true
    let refreshId = 0
    const refresh = () => {
      cancelAnimationFrame(refreshId)
      refreshId = requestAnimationFrame(() => { if (live) ScrollTrigger.refresh() })
    }
    // Also catches late font/card wrapping changes without per-scroll layout reads.
    const observer = new ResizeObserver(refresh)
    observer.observe(world)
    document.fonts.ready.then(() => { if (live) refresh() })
    refresh()
    return () => {
      live = false
      cancelAnimationFrame(refreshId)
      observer.disconnect()
      ScrollTrigger.removeEventListener('revert', measure)
      trigger?.kill()
      flow.clear()
      svg.setAttribute('viewBox', originalViewBox)
      svg.style.removeProperty('height')
      if (import.meta.env.DEV) delete world.parentElement!.dataset.line
    }
  }, [enabled, reducedMotion, worldRef])
}
