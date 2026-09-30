export type FlowMilestone = { progress: number; minutes: number }

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

/** A reversible C1 mapping. Its slope stays positive (0.22) at each milestone:
 * slow → settle → flow, without a hold, snap or time-based pause. */
export function mapJourneyFlow(progress: number, milestones: readonly FlowMilestone[], reducedMotion = false) {
  const p = clamp01(progress)
  if (reducedMotion) return p
  const knots = [0, ...milestones.map(stop => stop.progress).filter(at => at > 0 && at < 1), 1]
  for (let i = 1; i < knots.length; i++) {
    if (p > knots[i]) continue
    const from = knots[i - 1], span = knots[i] - from
    const t = (p - from) / span
    const eased = 0.22 * t + 0.78 * t * t * (3 - 2 * t)
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
  let total = 0, scale = 1, lastProgress = -1
  let matrix: DOMMatrix | null = null
  let milestones: FlowMilestone[] = []

  return {
    measure(stops: FlowMilestone[] = milestones) {
      total = active.getTotalLength()
      // Cache the SVG's actual viewBox mapping, including subpixel meet/letterboxing.
      // Inferring this from world width alone can drift at fractional viewport sizes.
      matrix = active.getCTM()
      scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1
      milestones = stops
      lastProgress = -1
      const length = total * scale
      active.style.strokeDasharray = `${length}px ${length + 4}px`
    },
    render(scrollProgress: number, reducedMotion = false) {
      if (!total || !milestones.length) return
      const journeyFlowProgress = mapJourneyFlow(scrollProgress, milestones, reducedMotion)
      if (journeyFlowProgress === lastProgress) return journeyFlowProgress
      lastProgress = journeyFlowProgress
      const point = active.getPointAtLength(total * journeyFlowProgress)
      const x = matrix ? point.x * matrix.a + point.y * matrix.c + matrix.e : point.x
      const y = matrix ? point.x * matrix.b + point.y * matrix.d + matrix.f : point.y
      const minutes = journeyMinutesAt(journeyFlowProgress, milestones)
      // All four writes consume this exact progress in the same frame. No DOM measurements.
      active.style.strokeDashoffset = `${total * scale * (1 - journeyFlowProgress)}px`
      marker.style.transform = `translate3d(${x}px, ${y}px, 0)`
      // Unwrapped angles are visually equivalent to modulo 60/12, and continuous at hour boundaries.
      hour.style.transform = `translateX(-50%) rotate(${minutes / 2}deg)`
      minute.style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`
      if (import.meta.env.DEV) {
        marker.dataset.flow = JSON.stringify({ progress: journeyFlowProgress, minutes, x, y })
      }
      return journeyFlowProgress
    },
    clear() {
      active.style.removeProperty('stroke-dasharray')
      active.style.removeProperty('stroke-dashoffset')
      marker.style.removeProperty('transform')
      hour.style.removeProperty('transform')
      minute.style.removeProperty('transform')
      delete marker.dataset.flow
    },
  }
}
