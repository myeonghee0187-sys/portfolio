export type FlowMilestone = { progress: number; minutes: number }
export type FlowRange = { from: number; to: number }

type PathBox = { x: number; y: number; hw: number; hh: number }
type PathSampler = Pick<SVGPathElement, 'getTotalLength' | 'getPointAtLength'>

/** First fully exposed circle after the path leaves a card. Called only at refresh. */
export function pathExitDistance(path: PathSampler, box: PathBox, radius: number) {
  const total = path.getTotalLength()
  const overlaps = (distance: number) => {
    const point = path.getPointAtLength(distance)
    const dx = Math.max(0, Math.abs(point.x - box.x) - box.hw)
    const dy = Math.max(0, Math.abs(point.y - box.y) - box.hh)
    return dx * dx + dy * dy < radius * radius
  }
  let entered = false
  for (let distance = 0; distance <= total; distance += 2) {
    if (overlaps(distance)) { entered = true; continue }
    if (!entered) continue
    let low = Math.max(0, distance - 2), high = distance
    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2
      if (overlaps(mid)) low = mid
      else high = mid
    }
    return high
  }
  return total
}

/** Last fully exposed point before the path enters its final card. */
export function pathEntryDistance(path: PathSampler, box: PathBox, radius: number) {
  const total = path.getTotalLength()
  return total - pathExitDistance({
    getTotalLength: () => total,
    getPointAtLength: distance => path.getPointAtLength(total - distance),
  }, box, radius)
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

/** Use the existing opening 2% to reveal; never leak across the handoff boundary. */
export function journeyFlowVisibility(progress: number, target = progress, handoffComplete = true, reducedMotion = false) {
  if (!handoffComplete || target <= 0 || progress <= 0) return 0
  return reducedMotion ? 1 : clamp01(Math.min(progress, target) / 0.02)
}

/** A reversible C1 mapping. Milestone speed is 40% of mid-segment speed
 * (0.5 / 1.25), without a hold, snap or time-based pause. */
export function mapJourneyFlow(progress: number, milestones: readonly FlowMilestone[], reducedMotion = false) {
  const p = clamp01(progress)
  if (reducedMotion) return p
  const knots = [0, ...milestones.map(stop => stop.progress).filter(at => at > 0 && at < 1), 1]
  for (let i = 1; i < knots.length; i++) {
    if (p > knots[i]) continue
    const from = knots[i - 1], span = knots[i] - from
    const t = (p - from) / span
    const eased = 0.5 * t + 0.5 * t * t * (3 - 2 * t)
    return from + span * eased
  }
  return 1
}

/** Time is a function of path distance, never of a separate clock timeline. */
export function journeyMinutesAt(progress: number, milestones: readonly FlowMilestone[]) {
  if (progress <= milestones[0].progress) return milestones[0].minutes
  for (let i = 1; i < milestones.length; i++) {
    const a = milestones[i - 1], b = milestones[i]
    if (progress > b.progress) continue
    const t = (progress - a.progress) / (b.progress - a.progress)
    return a.minutes + (b.minutes - a.minutes) * t
  }
  return milestones[milestones.length - 1].minutes
}

/** Shared writer for both the pinned scene and the existing document layout. */
export function createJourneyFlow(world: HTMLElement, active: SVGPathElement) {
  const marker = world.querySelector<HTMLElement>('.journey__marker')!
  const hour = marker.querySelector<HTMLElement>('.journey__marker-hand--hour')!
  const minute = marker.querySelector<HTMLElement>('.journey__marker-hand--minute')!
  let total = 0, scale = 1, lastProgress = -1, lastReveal = -1
  let matrix: DOMMatrix | null = null
  let milestones: FlowMilestone[] = []
  let pathMilestones: FlowMilestone[] = []
  let range: FlowRange = { from: 0, to: 1 }

  return {
    measure(stops: FlowMilestone[] = pathMilestones, window: FlowRange = range) {
      total = active.getTotalLength()
      // Cache the SVG's actual viewBox mapping, including subpixel meet/letterboxing.
      // Inferring this from world width alone can drift at fractional viewport sizes.
      matrix = active.getCTM()
      scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1
      range = window
      pathMilestones = stops
      milestones = stops.map(stop => ({
        ...stop,
        progress: clamp01((stop.progress - range.from) / (range.to - range.from)),
      }))
      lastProgress = -1
      lastReveal = -1
      const length = total * scale
      active.style.strokeDasharray = `${length}px ${length + 4}px`
      active.style.strokeDashoffset = `${length}px`
      active.style.visibility = 'hidden'
    },
    render(scrollProgress: number, reducedMotion = false, reveal = 1) {
      if (!total || !milestones.length) return
      const journeyFlowProgress = mapJourneyFlow(scrollProgress, milestones, reducedMotion)
      const pathProgress = range.from + (range.to - range.from) * journeyFlowProgress
      const opacity = clamp01(reveal)
      if (journeyFlowProgress === lastProgress && opacity === lastReveal) return pathProgress
      lastProgress = journeyFlowProgress
      if (opacity !== lastReveal) {
        world.style.setProperty('--journey-flow-opacity', opacity.toFixed(4))
        world.dataset.flowState = opacity > 0 ? 'active' : 'pre-active'
      }
      lastReveal = opacity
      const point = active.getPointAtLength(total * pathProgress)
      const x = matrix ? point.x * matrix.a + point.y * matrix.c + matrix.e : point.x
      const y = matrix ? point.x * matrix.b + point.y * matrix.d + matrix.f : point.y
      const minutes = journeyMinutesAt(journeyFlowProgress, milestones)
      // All four writes consume this exact progress in the same frame. No DOM measurements.
      const length = total * scale
      const drawn = length * (pathProgress - range.from)
      const painted = opacity > 0 && drawn > 0
      // Start drawing at the clock's exposed start, without changing path geometry.
      // A zero-length round cap can still paint a dot, so hide the active stroke too.
      active.style.visibility = painted ? 'visible' : 'hidden'
      active.style.strokeDasharray = `${painted ? drawn : length}px ${length + 4}px`
      active.style.strokeDashoffset = `${painted ? -length * range.from : length}px`
      marker.style.transform = `translate3d(${x}px, ${y}px, 0)`
      // Unwrapped angles are visually equivalent to modulo 60/12, and continuous at hour boundaries.
      hour.style.transform = `translateX(-50%) rotate(${minutes / 2}deg)`
      minute.style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`
      if (import.meta.env.DEV) {
        marker.dataset.flow = JSON.stringify({ progress: pathProgress, journeyFlowProgress, minutes, x, y, drawn: painted ? drawn : 0 })
      }
      return pathProgress
    },
    clear() {
      active.style.removeProperty('stroke-dasharray')
      active.style.removeProperty('stroke-dashoffset')
      active.style.removeProperty('visibility')
      world.style.removeProperty('--journey-flow-opacity')
      delete world.dataset.flowState
      marker.style.removeProperty('transform')
      hour.style.removeProperty('transform')
      minute.style.removeProperty('transform')
      delete marker.dataset.flow
    },
  }
}
