export type PathPoint = { x: number; y: number }
export type JourneyPathBox = PathPoint & { hw: number; hh: number }

/** Three long cubics, independent of the card count. Control points occupy
 * thirds of each vertical span; shared vertical tangents keep the ribbon quiet.
 * y is strictly increasing, so card milestones can still be measured by height.
 */
export function longSCurve(points: readonly [PathPoint, PathPoint, PathPoint, PathPoint]) {
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
export function journeySCurve(boxes: readonly JourneyPathBox[], clearance: number) {
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
    { x: intro.x, y: intro.y + intro.hh / 2 },
    { x: visual.x - visual.hw - clearance - 12, y: visual.y },
    { x: ai.x - ai.hw - clearance - 26, y: ai.y + 260 },
    { x: last.x, y: last.y - last.hh / 2 },
  ] as const
  return { d: longSCurve(points), offsets, boxes: placed }
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
