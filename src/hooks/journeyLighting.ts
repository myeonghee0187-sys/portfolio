/** Shared boundary value: Journey's last ambient frame and Contact's first rays. */
export const CONTACT_ENTRY_LIGHT = 0.35

const STOPS = [[0.8, 0], [0.9, 0.08], [0.97, 0.22], [1, CONTACT_ENTRY_LIGHT]] as const

/** Scroll-only background light; the main Journey stays exactly Carbon Black. */
export function journeyAmbientAt(progress: number) {
  if (progress <= STOPS[0][0]) return 0
  for (let i = 1; i < STOPS.length; i++) {
    const [from, a] = STOPS[i - 1], [to, b] = STOPS[i]
    if (progress <= to) return a + (b - a) * (progress - from) / (to - from)
  }
  return CONTACT_ENTRY_LIGHT
}
