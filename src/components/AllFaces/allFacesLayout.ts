/*
 * ALL FACES 배치 — 열 때(mount)마다 한 번 새로 정하는 "매번 조금씩 다른 전시 배치".
 *
 * 완전한 random이 아니라 안전 영역 안의 random이다.
 *   안전 영역  화면에서 위쪽 bar(ALL FACES / CLOSE)와 좌우 / 아래 여백을 뺀 곳. 원 + floating 폭까지 이 안에 들어온다
 *   데스크톱   안전 영역을 3열 x 2행 칸으로 나눈다. 세 project가 서로 다른 열에 들어가고(좌우로 넓게),
 *              행은 random이되 셋이 모두 같은 행은 아니다(한 줄로 서지 않는다). 칸 안에서 위치를 다시 random으로 흔든다
 *   모바일     3행(위 / 가운데 / 아래)에 하나씩, 가로 자리는 random이되 셋이 모두 같은 세로줄에 서지 않는다
 *   한 줄 방지 세 원이 가로 / 세로 / 사선의 한 줄로 늘어서면 다시 뽑는다(너무 규칙적인 배치를 피한다)
 *   겹침 방지  원 중심 사이 거리가 (지름 + floating 폭 x 2 + 여유)보다 가까우면 처음부터 다시 뽑는다(최대 400번)
 *   fallback   400번 안에 못 찾으면(좁은 화면에서 드물게) 뽑은 것 중 원 사이가 가장 넓은 배치를 쓴다.
 *              안전 영역 자체가 원을 담지 못할 만큼 작을 때만 이전의 고정 배치를 쓴다
 * project와 칸의 짝도 매번 섞는다. 결과는 화면 비율(중심 0~1)이라 열려 있는 동안 창 크기가 바뀌어도 다시 뽑지 않는다.
 */

export const MOBILE_QUERY = '(max-width: 760px)'

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value))

/** 원 지름(px). CSS의 --size와 같은 식이다. */
export const orbSize = (vw: number, mobile: boolean) => (mobile ? clamp(128, vw * 0.38, 170) : clamp(240, vw * 0.2, 360))

/** floating이 base 자리에서 벗어나는 최대 거리(px, x / y 진폭의 최댓값 + hover 확대분). 겹침 / 화면 밖 계산에 쓴다. */
const floatReach = (mobile: boolean) => (mobile ? 16 : 26)

export type OrbPlacement = {
  /** 원 중심(화면 비율 0~1). */
  cx: number
  cy: number
}

export type OrbFloat = {
  /** x / y 진폭(px), 회전(deg), 숨쉬기 최대 배율. */
  ax: number
  ay: number
  rot: number
  scale: number
  /** x / y 한 방향 이동 시간(s). 서로 다르게 두어 같은 선을 오가지 않는다. */
  dx: number
  dy: number
  /** 시작 위상(음수 delay, s). */
  px: number
  py: number
}

type Rect = { l: number; t: number; r: number; b: number }

function safeArea(vw: number, vh: number, mobile: boolean): Rect {
  return mobile
    ? { l: 16, t: 92, r: vw - 16, b: vh - 28 }
    : { l: Math.max(32, vw * 0.06), t: Math.max(104, vh * 0.12), r: vw - Math.max(32, vw * 0.06), b: vh - Math.max(36, vh * 0.05) }
}

const shuffle = <T,>(items: T[], rand: () => number) => {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 이전 고정 배치(원의 bounding box, 화면 %). 200번 안에 겹치지 않는 random 배치를 못 찾을 때만 쓴다. */
const FALLBACK: Record<string, { desktop: [number, number]; mobile: [number, number] }> = {
  // [left 기준 %, top 기준 %] — 원 중심으로 바꿔 쓴다.
  f45: { desktop: [12.5, 24], mobile: [10, 20] },
  tchaikim: { desktop: [67.75, 33], mobile: [53, 42] },
  jaduya: { desktop: [44, 52.7], mobile: [16, 70] },
}

/**
 * project id 순서대로 원 중심(화면 비율)을 돌려준다. rand는 [0, 1) 난수(테스트에서 바꿔 끼울 수 있다).
 */
export function randomLayout(ids: string[], vw: number, vh: number, mobile: boolean, rand: () => number = Math.random): OrbPlacement[] {
  const size = orbSize(vw, mobile)
  const r = size / 2
  const reach = floatReach(mobile)
  const area = safeArea(vw, vh, mobile)
  // 원 중심이 움직일 수 있는 범위(원 + floating 폭이 안전 영역 안).
  const inner: Rect = { l: area.l + r + reach, t: area.t + r + reach, r: area.r - r - reach, b: area.b - r - reach }
  const minDist = size + reach * 2 + (mobile ? 10 : 28)
  const n = ids.length
  /** 조건을 다 채우지 못했을 때 쓸, 지금까지 원 사이가 가장 넓었던 배치. */
  let best: { gap: number; centers: { x: number; y: number }[] } | null = null

  for (let attempt = 0; attempt < 400 && inner.r > inner.l && inner.b > inner.t; attempt++) {
    const centers: { x: number; y: number }[] = []
    if (!mobile) {
      // 3열 x 2행. 열은 project마다 다르고, 행은 random(셋이 모두 같은 행이면 다시 뽑는다).
      const cols = shuffle([0, 1, 2], rand).slice(0, n)
      const rows = cols.map(() => (rand() < 0.5 ? 0 : 1))
      if (n > 2 && rows.every((row) => row === rows[0])) continue
      const cw = (area.r - area.l) / 3
      const rh = (area.b - area.t) / 2
      cols.forEach((col, i) => {
        const cell: Rect = { l: area.l + cw * col, r: area.l + cw * (col + 1), t: area.t + rh * rows[i], b: area.t + rh * (rows[i] + 1) }
        const l = Math.max(inner.l, cell.l), rr = Math.min(inner.r, cell.r)
        const t = Math.max(inner.t, cell.t), b = Math.min(inner.b, cell.b)
        centers.push({ x: l + (Math.max(rr, l) - l) * rand(), y: t + (Math.max(b, t) - t) * rand() })
      })
    } else {
      // 3행에 하나씩. 가로는 왼쪽 / 가운데 / 오른쪽 셋 중 random(셋이 모두 같은 줄이면 다시 뽑는다).
      const lanes = Array.from({ length: n }, () => Math.floor(rand() * 3))
      if (n > 2 && lanes.every((lane) => lane === lanes[0])) continue
      const rh = (area.b - area.t) / n
      const span = inner.r - inner.l
      lanes.forEach((lane, i) => {
        const t = Math.max(inner.t, area.t + rh * i), b = Math.min(inner.b, area.t + rh * (i + 1))
        const x = inner.l + span * ((lane + rand()) / 3)
        centers.push({ x, y: t + (Math.max(b, t) - t) * rand() })
      })
    }
    // 한 줄(가로 / 세로 / 사선)로 늘어선 배치는 버린다 — 어느 원이든 나머지 두 원을 잇는 선에서 원 지름의 0.6배 이상 떨어져 있어야 한다.
    if (n === 3) {
      const off = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
      const [p0, p1, p2] = centers
      if (Math.min(off(p0, p1, p2), off(p1, p0, p2), off(p2, p0, p1)) < size * 0.6) continue
    }
    let gap = Infinity
    centers.forEach((a, i) => centers.forEach((b, j) => {
      if (j > i) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y) - minDist)
    }))
    if (gap < 0) {
      if (!best || gap > best.gap) best = { gap, centers }
      continue
    }
    // project와 자리의 짝도 섞는다 — 같은 모양이어도 어느 project가 어디에 올지 매번 다르다.
    return shuffle(centers, rand).map((c) => ({ cx: c.x / vw, cy: c.y / vh }))
  }

  if (best) return shuffle(best.centers, rand).map((c) => ({ cx: c.x / vw, cy: c.y / vh }))

  return ids.map((id) => {
    const spot = FALLBACK[id] ?? { desktop: [40, 40], mobile: [30, 40] }
    const [left, top] = mobile ? spot.mobile : spot.desktop
    return { cx: (left / 100) * 1 + r / vw, cy: (top / 100) * 1 + r / vh }
  })
}

/**
 * project마다 다른 idle floating 값. 자기 자리 근처에서 숨 쉬듯만 움직인다.
 *   x ±8~18px, y ±10~20px(모바일은 조금 작게), 회전 ±1~2°, 숨쉬기 1 -> 1.01~1.02, 한 방향 4~8s, 시작 위상 random.
 */
export function randomFloat(mobile: boolean, rand: () => number = Math.random): OrbFloat {
  const k = mobile ? 0.6 : 1
  const between = (a: number, b: number) => a + (b - a) * rand()
  const dx = between(4.6, 7.8)
  const dy = between(4, 7)
  return {
    ax: between(8, 18) * k,
    ay: between(10, 20) * k,
    rot: between(1, 2) * (rand() < 0.5 ? -1 : 1),
    scale: between(1.01, 1.02),
    dx,
    dy,
    px: -between(0, dx * 2),
    py: -between(0, dy * 2),
  }
}
