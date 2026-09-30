import { useLayoutEffect, type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useMediaQuery from '../../hooks/useMediaQuery'
import { JOURNEY_CLOCK } from './journeyData'
import { createJourneyFlow, pathExitDistance } from './journeyFlow'
import { detourJourneyPath, pathDistanceAtY, type FlowObstacle } from './journeyPath'

/** Document layout keeps its card order/gaps; one shared path clears the card edges. */
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
    let startY = 80, endY = 80
    let progress = 0
    const render = (value: number) => {
      progress = value
      flow.render(progress, reducedMotion)
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
      const obstacles: FlowObstacle[] = boxes.slice(1).map(box => ({ ...box, side: 'left' }))
      // Keep the original vertical flow; local shoulders move its visible portions
      // into the minimum reserved margin beside the cards. No extra clock rail.
      const x = width / 2, span = height - 160
      const original = `M ${x} 80 C ${x} ${80 + span / 3}, ${x} ${80 + span * 2 / 3}, ${x} ${height - 80}`
      const d = detourJourneyPath(original, obstacles, radius + 4)
      svg.querySelectorAll('path').forEach(path => path.setAttribute('d', d))
      const total = active.getTotalLength()
      const from = pathExitDistance(active, boxes[0], radius + 4) / total
      const to = pathDistanceAtY(active, boxes[boxes.length - 1].y) / total
      startY = active.getPointAtLength(from * total).y
      endY = active.getPointAtLength(to * total).y
      const milestones = JOURNEY_CLOCK.map(stop => ({
        progress: stop.node === 0 ? from : pathDistanceAtY(active, boxes[stop.node].y) / total,
        minutes: stop.minutes,
      }))
      flow.measure(milestones, { from, to })
      if (import.meta.env.DEV) world.parentElement!.dataset.line = JSON.stringify({ length: total, milestones, range: { from, to }, obstacles })
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
      svg.setAttribute('viewBox', originalViewBox)
      svg.style.removeProperty('height')
      if (import.meta.env.DEV) delete world.parentElement!.dataset.line
    }
  }, [enabled, reducedMotion, worldRef])
}
