export type ScreenPoint = readonly [number, number]
export type ScreenQuad = readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint]

export const DEVICE_FRAME = { width: 1672, height: 941 }
/** Nontransparent bounds measured from the unchanged original image340.png. */
export const DEVICE_CONTENT = { x: 672, y: 101, width: 966, height: 713 }

/** Maps a native screenshot rectangle onto the four measured display corners. */
export function screenProjection(quad: ScreenQuad, width: number, height: number, scale: number): number[] {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const denominator = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / denominator
  const h = (dx1 * dy3 - dx3 * dy1) / denominator
  return [
    (x1 - x0 + g * x1) * scale / width, (y1 - y0 + g * y1) * scale / width, 0, g / width,
    (x3 - x0 + h * x3) * scale / height, (y3 - y0 + h * y3) * scale / height, 0, h / height,
    0, 0, 1, 0, x0 * scale, y0 * scale, 0, 1,
  ]
}

export const DEVICE_SCREENS = [
  { id: 'desktop', width: 1425, height: 986, quad: [[691, 149], [1452, 120], [1453, 617], [691, 605]] },
  { id: 'tablet', width: 445, height: 700, quad: [[1364, 375], [1620, 373], [1620, 780], [1364, 774]] },
  { id: 'mobile', width: 305, height: 700, quad: [[1254, 500], [1385, 499], [1385, 802], [1254, 800]] },
] as const satisfies readonly { id: string; width: number; height: number; quad: ScreenQuad }[]
