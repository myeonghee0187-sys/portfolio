export type PathPoint = { x: number; y: number }
export type JourneyPathBox = PathPoint & { hw: number; hh: number }

/** Three long cubics, independent of the card count. Control points occupy
 * thirds of each vertical span; shared vertical tangents keep the ribbon quiet.
 * y is strictly increasing, so card milestones can still be measured by height.
 */
export function longSCurve(points: readonly [PathPoint, PathPoint, PathPoint, PathPoint]) {
  return cubicPath(points)
}

/** A short vertical entry shares its tangent with the three existing broad spans. */
export function leadInSCurve(points: readonly [PathPoint, PathPoint, PathPoint, PathPoint], leadIn: number) {
  return cubicPath([points[0], { ...points[0], y: points[0].y + leadIn }, ...points.slice(1)])
}

/** Cubic spans through the points, every knot with a vertical tangent (no side kinks). */
export function cubicPath(points: readonly PathPoint[]) {
  const f = (value: number) => value.toFixed(3)
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], tangent = (b.y - a.y) / 3
    d += ` C ${f(a.x)} ${f(a.y + tangent)}, ${f(b.x)} ${f(b.y - tangent)}, ${f(b.x)} ${f(b.y)}`
  }
  return d
}

/** Keep the existing layout, opening only the two tight opposing-card gaps.
 * Offsets are measured in SVG units and applied at refresh, never while scrolling.
 * The route is designed once across three broad spans, not projected around cards.
 */
export function journeySCurve(boxes: readonly JourneyPathBox[], clearance: number, opening: { startInset: number; leadIn: number }) {
  const offsets = boxes.map(() => 0)
  for (const [left, right] of [[1, 2], [4, 5]]) {
    const gap = boxes[right].x - boxes[right].hw - boxes[left].x - boxes[left].hw
    const shift = Math.max(0, (2 * clearance + 28 - gap) / 2)
    offsets[left] = -shift
    offsets[right] = shift
  }
  const placed = boxes.map((box, i) => ({ ...box, x: box.x + offsets[i] }))
  const intro = placed[0], visual = placed[2], ai = placed[5], last = placed[6]
  const points = [
    // Starts at the first card's bottom-center (a hair inside it). The part under the card is
    // masked by the card footprint, so the visible line leaves the card border with no gap.
    { x: intro.x, y: intro.y + intro.hh - opening.startInset },
    { x: visual.x - visual.hw - clearance - 12, y: visual.y },
    { x: ai.x - ai.hw - clearance - 26, y: ai.y + 260 },
    { x: last.x, y: last.y - last.hh / 2 },
  ] as const
  return { d: leadInSCurve(points, opening.leadIn), offsets, boxes: placed }
}

/** The route retains increasing y: measure its distance at the actual card anchor. */
export function pathDistanceAtY(path: SVGPathElement, y: number) {
  let low = 0, high = path.getTotalLength()
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2
    if (path.getPointAtLength(mid).y < y) low = mid
    else high = mid
  }
  return (low + high) / 2
}
