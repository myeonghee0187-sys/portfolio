import { useLayoutEffect, type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useMediaQuery from '../../hooks/useMediaQuery'
import { JOURNEY_CLOCK } from './journeyData'
import { createJourneyFlow, journeyFlowVisibility } from './journeyFlow'
import { longSCurve, pathDistanceAtY } from './journeyPath'
import { journeyAmbientAt } from '../../hooks/journeyLighting'

/** Document layout keeps its card order/gaps; one shared path clears the card edges. */
export default function useJourneyDocumentFlow(enabled: boolean, worldRef: RefObject<HTMLDivElement | null>) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useLayoutEffect(() => {
    const world = worldRef.current
    if (!enabled || !world) return
    const svg = world.querySelector<SVGSVGElement>('.journey__path')!
    const active = svg.querySelector<SVGPathElement>('.journey__path-active')!
    const nodes = [...world.querySelectorAll<HTMLElement>('.journey__node')]
    const stage = world.parentElement!
    const flow = createJourneyFlow(world, active)
    const originalViewBox = svg.getAttribute('viewBox')!
    let height = 0
    let startY = 80, endY = 80
    let progress = 0
    const render = (value: number) => {
      progress = value
      flow.render(progress, reducedMotion, journeyFlowVisibility(progress, progress, true, reducedMotion))
      stage.style.setProperty('--contact-ambient', journeyAmbientAt(progress).toFixed(4))
    }
    const measure = () => {
      const bounds = world.getBoundingClientRect()
      const width = bounds.width
      height = bounds.height
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.style.height = `${height}px`
      const radius = parseFloat(getComputedStyle(world.querySelector('.journey__marker')!).getPropertyValue('--marker-size')) / 2
      const boxes = nodes.map(node => {
        const r = node.querySelector('.journey__card')!.getBoundingClientRect()
        return { x: r.left - bounds.left + r.width / 2, y: r.top - bounds.top + r.height / 2, hw: r.width / 2, hh: r.height / 2 }
      })
      // The existing mobile gutter carries the same three broad spans. Its
      // amplitude is bounded by the complete clock radius, not individual cards.
      const left = radius + 4
      const right = Math.min(...boxes.map(box => box.x - box.hw)) - radius - 4
      const x = (left + right) / 2
      const firstY = boxes[0].y + boxes[0].hh + radius + 4
      const lastY = boxes[boxes.length - 1].y
      const span = lastY - firstY
      const d = longSCurve([
        { x, y: firstY }, { x: right, y: firstY + span / 3 },
        { x: left, y: firstY + span * 2 / 3 }, { x, y: lastY },
      ])
      svg.querySelectorAll('path').forEach(path => path.setAttribute('d', d))
      const total = active.getTotalLength()
      // Unlike the former card-crossing route, both endpoints are already clear.
      const from = 0, to = 1
      startY = active.getPointAtLength(from * total).y
      endY = active.getPointAtLength(to * total).y
      const milestones = JOURNEY_CLOCK.map(stop => ({
        progress: stop.node === 0 ? from : pathDistanceAtY(active, boxes[stop.node].y) / total,
        minutes: stop.minutes,
      }))
      flow.measure(milestones, { from, to })
      if (import.meta.env.DEV) world.parentElement!.dataset.line = JSON.stringify({ length: total, milestones, range: { from, to } })
      render(progress)
    }
    measure()
    const trigger = ScrollTrigger.create({
      id: 'journey-document-flow', trigger: world,
      start: () => `top+=${startY} center`, end: () => `top+=${endY} center`,
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
      stage.style.removeProperty('--contact-ambient')
      svg.setAttribute('viewBox', originalViewBox)
      svg.style.removeProperty('height')
      if (import.meta.env.DEV) delete world.parentElement!.dataset.line
    }
  }, [enabled, reducedMotion, worldRef])
}
