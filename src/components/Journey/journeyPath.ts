export type PathPoint = { x: number; y: number }
export type FlowObstacle = PathPoint & { hw: number; hh: number; side: 'left' | 'right' }

const smoothstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
// C1 positive part, always >= max(0, value), with zero influence beyond -width.
const softPositive = (value: number, width: number) => value <= -width ? 0
  : value >= width ? value : (value + width) ** 2 / (4 * width)

/** Deform only card-adjacent portions of our existing M + C organic path.
 * x changes locally; the original monotone y and card-to-card flow are retained.
 * Hermite pieces share derivatives, so neither route joins nor shoulders have corners.
 * Both visible paths receive this same d; there is no separate clock route.
 */
export function detourJourneyPath(d: string, obstacles: readonly FlowObstacle[], clearance: number) {
  if (!obstacles.length) return d
  const values = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  const feather = clearance * 3
  const project = (p: PathPoint) => {
    let x = p.x
    for (const box of obstacles) {
      const dy = Math.abs(p.y - box.y)
      const core = box.hh + clearance
      if (dy >= core + feather) continue
      const weight = dy <= core ? 1 : 1 - smoothstep((dy - core) / feather)
      const sign = box.side === 'right' ? 1 : -1
      let smoothing = clearance
      let bowSize = clearance * 0.28
      for (const other of obstacles) {
        if (other.side === box.side) continue
        const otherDy = Math.abs(p.y - other.y), otherCore = other.hh + clearance
        if (otherDy >= otherCore + feather) continue
        const influence = otherDy <= otherCore ? 1 : 1 - smoothstep((otherDy - otherCore) / feather)
        const corridor = Math.abs(other.x - box.x) - other.hw - box.hw - 2 * clearance
        if (corridor > 0) {
          smoothing = Math.min(smoothing, clearance + (Math.min(clearance, corridor * 0.3) - clearance) * influence)
          bowSize = Math.min(bowSize, clearance * 0.28 + (Math.min(clearance * 0.28, corridor * 0.15) - clearance * 0.28) * influence)
        }
      }
      // A slight convex arc avoids a long, ruler-straight bypass beside a card.
      const bow = bowSize * Math.exp(-2 * (dy / core) ** 2)
      const edge = box.x + sign * (box.hw + clearance + bow)
      x += sign * weight * softPositive(sign * (edge - x), smoothing)
    }
    return { x, y: p.y }
  }
  const f = (n: number) => n.toFixed(3)
  let start = { x: values[0], y: values[1] }
  const first = project(start)
  let result = `M ${f(first.x)} ${f(first.y)}`
  for (let index = 2; index < values.length; index += 6) {
    const a = start
    const b = { x: values[index], y: values[index + 1] }
    const c = { x: values[index + 2], y: values[index + 3] }
    const end = { x: values[index + 4], y: values[index + 5] }
    const at = (t: number) => {
      const u = 1 - t
      return project({
        x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * end.x,
        y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * end.y,
      })
    }
    const derivative = (t: number) => {
      const h = 0.00001, left = at(t - h), right = at(t + h)
      return { x: (right.x - left.x) / (2 * h), y: (right.y - left.y) / (2 * h) }
    }
    const pieces = Math.max(48, Math.ceil((end.y - a.y) / (clearance * 0.5)))
    for (let part = 0; part < pieces; part++) {
      const t0 = part / pieces, t1 = (part + 1) / pieces
      const p = at(t0), q = at(t1), dp = derivative(t0), dq = derivative(t1)
      const k = 1 / (3 * pieces)
      result += ` C ${f(p.x + dp.x * k)} ${f(p.y + dp.y * k)}, ${f(q.x - dq.x * k)} ${f(q.y - dq.y * k)}, ${f(q.x)} ${f(q.y)}`
    }
    start = end
  }
  return result
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
