import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_CLOCK, JOURNEY_NODES } from './journeyData'
import { HANDOFF_VIEWPORTS, JOURNEY_VIEWPORTS, PANEL_TRIGGER_ID, panelTiming } from '../../hooks/panelTiming'

gsap.registerPlugin(ScrollTrigger)

/*
 * journey-master 진행률(0 -> 1) 안에서 빛이 길을 따라 그려지는 구간.
 * 이 구간에서 빛의 길이는 scroll과 1:1이다(ease 없음) — 처음부터 지금 위치까지 하나로 이어져 있고,
 * card를 지나도 느려지거나 멈추지 않는다. 앞(0 ~ 0.02)은 첫 card, 뒤(0.88 ~ 1)는 STILL UPDATING에 머무는 시간이다.
 */
const LINE_FROM = 0.02
const LINE_TO = 0.88
/** card가 켜지고 / 물러나는 데 걸리는 진행률. */
const NODE_RAMP = 0.04
/** 다음 card까지 가는 길 중 이만큼 지났을 때 지금 card가 물러나기 시작한다. 빛과는 무관하다. */
const NODE_LEAVE = 0.5
/**
 * 화면에 그리는 진행률이 scroll 진행률을 따라잡는 비율(60fps 한 frame). 약 110ms 만에 대부분 따라붙는 작은 smoothing —
 * wheel 한 칸의 계단만 녹이고, 멈추면 바로 선다. anchor snap / card pause / 되감김 없음.
 */
const SMOOTHING = 0.14

/**
 * Journey -> Contact handoff. Journey는 끝까지 어둡고, 마지막 구간에서만 Contact 쪽 빛(.journey__handoff)이
 * 화면 아래에서 들어온다. [진행률, opacity] — 0.78까지 0, 0.90에 0.12, 1.00에 0.35.
 * 이어서 Contact의 Light Rays가 0.35에서 출발해 0.5까지 올라간다(useContactScene).
 */
/**
 * Journey의 Time Marker(journeyData.JOURNEY_CLOCK)가 움직이는 방식.
 *   rail   marker가 지나는 길. line 그대로이되, line이 card 밑으로 들어가는 구간(card + marker 반지름 + RAIL_GAP 안)은
 *          그 card 가장자리 바깥으로 밀어낸다 — marker는 card 위에 그려지지만 card 글자를 가리지 않고, 언제나 보인다.
 *   머묾   card에 line이 닿는 순간(marks) 그 card 가장자리(rail 위)에 도착해, 다음 card까지 가는 길의 DOCK_HOLD만큼 머문다.
 *          camera가 먼저 움직여 marker가 화면 가장자리(DOCK_MARGIN)에 닿을 것 같으면 그 전에 출발한다.
 *   이동   다음 머묾 자리까지 rail을 따라 sine in-out으로 흐른다(자석처럼 붙지 않는다). line 끝을 앞지르지 않는다.
 *   시간   언제나 보인다. 머무는 동안은 그 card의 시간, 이동하는 동안은 두 시간 사이를 분 단위로 이어서 흐른다.
 * 모두 journey-master 진행률 하나에서 나온다 — 되감으면 같은 값을 거꾸로 지난다.
 */
const RAIL_GAP = 12
const RAIL_STEP = 4
const DOCK_HOLD = 0.3
/** 머무는 marker가 있을 수 있는 화면 위 / 아래 가장자리(px, Header 아래부터). marker 반지름이 더해진다. */
const DOCK_MARGIN = 140
const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(v => parseInt(v, 10))
  return h * 60 + m
}

const CONTACT_AMBIENT: ReadonlyArray<readonly [number, number]> = [
  [0.78, 0],
  [0.9, 0.12],
  [1, 0.35],
]

type Options = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
}

type Point = { x: number; y: number }

/**
 * 경로의 곡률(Catmull-Rom tension). 점 Pi의 접선 Ti = (P(i+1) - P(i-1)) x TENSION,
 * 두 점 사이는 Cubic Bézier  C  Pi + Ti / 3,  P(i+1) - T(i+1) / 3,  P(i+1).
 * 0.5가 표준 Catmull-Rom이다. 이 값에서 card 사이가 큰 S 곡선으로 이어지고, 점 사이에서 넘치거나 꺾이지 않는다.
 */
const TENSION = 0.5

/**
 * anchor가 card 안쪽으로 들어가 있는 정도(card 크기 비율). 경로는 card 가운데가 아니라 경로 쪽 변에 가까운 이 점을 지난다.
 * 점이 변 위에 있으면 부드러운 곡선이 변을 따라 스치며 테두리 직전에서 잘려 보인다. 25% 안쪽이면 곡선이 card 테두리를
 * 비스듬히가 아니라 뚜렷한 각도로 지나 불투명한 surface 아래로 들어간다 — 선은 테두리까지 빈틈없이 닿고(겹침은 수십 px),
 * card 안쪽 구간은 보이지 않는다.
 */
const ANCHOR_INSET = 0.25

/**
 * 점들을 하나의 부드러운 경로로 잇는다(가지 없음, M 하나에 C만 이어진다).
 * 모든 점에서 접선이 앞뒤 점으로 정해지므로(Catmull-Rom) 곡률이 card마다 끊기지 않고 이어진다 —
 * 세로 -> 가로 -> 세로로 꺾이는 연결이 없다. 좌우 꼭짓점에서는 접선이 세로라 경로 전체가 큰 물결(S 곡선의 연속)이 된다. 처음 / 마지막 점은 세로 접선이다(첫 card 아래로 나가고, 마지막 card 위로 들어간다).
 */
function buildSmoothPath(points: Point[]): string {
  const n = points.length
  if (n < 2) return ''
  const tangent = (i: number): Point => {
    if (i === 0 || i === n - 1) {
      const a = points[i === 0 ? 0 : n - 2]
      const b = points[i === 0 ? 1 : n - 1]
      return { x: 0, y: 2 * TENSION * Math.abs(b.y - a.y) }
    }
    const prev = points[i - 1], here = points[i], next = points[i + 1]
    // 좌우로 가장 멀리 간 점(앞뒤 점이 모두 한쪽에 있는 점)은 물결의 꼭짓점이다. 여기서는 가로 접선을 0으로 둔다 —
    // 곡선이 그 자리에서 넘쳐 바깥으로 튀지 않고, 좌우 사이가 직선 사선이 아니라 큰 S 곡선으로 이어진다.
    const turning = (prev.x - here.x) * (next.x - here.x) > 0
    return { x: turning ? 0 : (next.x - prev.x) * TENSION, y: (next.y - prev.y) * TENSION }
  }
  const f = (v: number) => v.toFixed(2)
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i], p1 = points[i + 1]
    const t0 = tangent(i), t1 = tangent(i + 1)
    d += ` C ${f(p0.x + t0.x / 3)} ${f(p0.y + t0.y / 3)}, ${f(p1.x - t1.x / 3)} ${f(p1.y - t1.y / 3)}, ${f(p1.x)} ${f(p1.y)}`
  }
  return d
}

/** 진행률 -> 값(구간마다 선형). 첫 점 앞 / 마지막 점 뒤는 양 끝 값. */
function piecewise(stops: ReadonlyArray<readonly [number, number]>, p: number) {
  if (p <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [p0, v0] = stops[i - 1]
    const [p1, v1] = stops[i]
    if (p <= p1) return v0 + ((v1 - v0) * (p - p0)) / (p1 - p0)
  }
  return stops[stops.length - 1][1]
}

/**
 * 단조 cubic 보간(Fritsch-Carlson). 점을 정확히 지나고, 점 사이에서 넘치거나(overshoot) 멈추지 않는다.
 * camera가 card마다 서지 않고 한 흐름으로 움직이게 하는 데 쓴다. 처음 / 끝 구간이 평평하면 거기서만 천천히 서고 출발한다.
 */
function monotoneCubic(xs: number[], ys: number[]) {
  const n = xs.length
  const h = xs.slice(1).map((x, i) => x - xs[i])
  const d = h.map((w, i) => (ys[i + 1] - ys[i]) / w)
  const m = xs.map((_, i) => {
    if (i === 0) return d[0]
    if (i === n - 1) return d[n - 2]
    if (d[i - 1] * d[i] <= 0) return 0
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  })
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const t = (x - xs[i]) / h[i]
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
  }
}

const clamp01 = gsap.utils.clamp(0, 1)

/**
 * 선형 + soft landing. 앞 75%는 scroll에 1:1(ease none)이고, 마지막 25%만 속도가 0까지 줄어든다.
 * 완전한 선형이면 도착하는 frame에서 움직이던 속도 그대로 멈춰 "딱 붙는" 느낌이 남는다(scrub이 있어도
 * 계속 scroll하는 동안에는 그 지점을 같은 속도로 지나간다). 속도는 끊기지 않고 이어진다.
 */
const LANDING = 0.75
const softLanding = (t: number) => {
  const k = 2 / (1 + LANDING)
  if (t <= LANDING) return k * t
  const u = t - LANDING
  return k * LANDING + k * u - (k * u * u) / (2 * (1 - LANDING))
}

export default function useJourneyInteraction({ enabled, sectionRef, stageRef, worldRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, world = worldRef.current
    if (!enabled || !section || !stage || !world) return
    const facesScene = document.querySelector<HTMLElement>('.faces__scene')
    const facesCanvas = document.querySelector<HTMLElement>('.faces__canvas')
    const panels = () => ScrollTrigger.getById(PANEL_TRIGGER_ID)
    const handoffStart = () => (panels()?.start ?? 0) + panelTiming.facesDistance
    const journeyStart = () => handoffStart() + innerHeight * HANDOFF_VIEWPORTS
    const nodes = JOURNEY_NODES.map(n => world.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!)
    const active = world.querySelector<SVGPathElement>('.journey__path-active')!
    const paths = world.querySelectorAll<SVGPathElement>('.journey__path path')
    const marker = world.querySelector<HTMLElement>('.journey__marker')
    const markerGlass = marker?.querySelector<HTMLElement>('.journey__marker-glass')
    const hourHand = marker?.querySelector<HTMLElement>('.journey__marker-hand--hour')
    const minuteHand = marker?.querySelector<HTMLElement>('.journey__marker-hand--minute')
    const markerTime = marker?.querySelector<HTMLElement>('.journey__marker-time')

    /*
     * 경로 기하. card의 실제 크기를 재서, 경로 쪽 변 안쪽의 점(anchorOf)을 Catmull-Rom 곡선으로 잇는다.
     * length는 화면 px이다 — non-scaling-stroke에서는 dash가 화면 px로 적용되기 때문이다.
     *   marks[i]  빛이 i번째 card 테두리에 닿는 journey-master 진행률. 경로 길이에 비례한다 —
     *             그래서 빛은 한 속도로 흐르고, card는 빛이 자기 자리를 지날 때 켜진다.
     *   camera    진행률 -> world의 y. marks[i]에서 i번째 card가 화면 가운데(Header 아래)에 오고,
     *             그 사이는 멈추지 않고 이어진다(monotoneCubic).
     * refresh(초기 mount, 폰트 로드, resize)마다 다시 재고, scroll 중에는 다시 재지 않는다.
     */
    /** 머묾 자리. s는 경로 위 길이(viewBox 단위), arrive / depart는 journey-master 진행률. */
    type ClockStop = { s: number; arrive: number; depart: number; minutes: number }
    const geom = {
      length: 0,
      /** 경로 전체 길이(viewBox 단위). */
      total: 0,
      scale: 1,
      /** marker가 지나는 길. rail[k]는 경로 위 길이 k x RAIL_STEP에 해당하는 점이다(card 밖으로 밀어낸 뒤). */
      rail: [] as Point[],
      marks: [LINE_FROM] as number[],
      camera: (() => 0) as (p: number) => number,
      /** marker의 머묾 자리들. */
      stops: [] as ClockStop[],
    }
    /** 화면에 그리는 진행률(display)과 scroll 진행률(target). */
    const journey = { p: 0, target: 0 }
    const written = new Map<HTMLElement, string>()
    let lastY = ''
    let lastOffset = ''
    let lastAmbient = ''
    let lastMarker = ''
    let lastTime = ''

    /** 진행률 p에서 line 끝(지금까지 그려진 곳)의 경로 위 길이. */
    const headAt = (p: number) => clamp01((p - LINE_FROM) / (LINE_TO - LINE_FROM)) * geom.total

    /**
     * 진행률 p에서 marker의 자리(경로 위 길이), 시간(분), 머묾 정도(0 -> 1).
     *   머묾   a.arrive ~ a.depart   a.s에 머문다
     *   이동   a.depart ~ b.arrive   a.s -> b.s, sine in-out. line 끝을 앞지르지 않는다. 시간도 같은 비율로 흐른다
     */
    const markerAt = (p: number) => {
      const st = geom.stops
      for (let k = 0; k < st.length - 1; k++) {
        const a = st[k], b = st[k + 1]
        if (p <= a.depart) return { s: a.s, minutes: a.minutes, dock: 1 }
        if (p >= b.arrive) continue
        const t = (p - a.depart) / (b.arrive - a.depart)
        const f = easeInOut(t)
        const s = Math.max(a.s, Math.min(a.s + (b.s - a.s) * f, headAt(p)))
        // 머묾 정도: 출발 직후 / 도착 직전 15% 동안만 0 <-> 1로 바뀐다(테 / 반사의 선명도에만 쓴다).
        const dock = Math.max(clamp01(1 - t / 0.15), clamp01((t - 0.85) / 0.15))
        return { s, minutes: a.minutes + (b.minutes - a.minutes) * f, dock }
      }
      const last = st[st.length - 1]
      return { s: last.s, minutes: last.minutes, dock: 1 }
    }

    /** rail 위 경로 길이 s의 점(viewBox 단위). */
    const railPoint = (s: number): Point => {
      const r = geom.rail
      const k = Math.max(0, Math.min(r.length - 1, s / RAIL_STEP))
      const i = Math.floor(k), j = Math.min(r.length - 1, i + 1), u = k - i
      return { x: r[i].x + (r[j].x - r[i].x) * u, y: r[i].y + (r[j].y - r[i].y) * u }
    }

    const formatTime = (minutes: number) => {
      const total = Math.round(minutes)
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }

    const renderMarker = (p: number) => {
      if (!marker || !geom.stops.length || !geom.rail.length) return
      const c = markerAt(p)
      const pt = railPoint(c.s)
      const dock = c.dock.toFixed(3)
      const key = `${pt.x.toFixed(1)} ${pt.y.toFixed(1)} ${c.minutes.toFixed(2)} ${dock}`
      if (key === lastMarker) return
      lastMarker = key
      marker.style.transform = `translate3d(${(pt.x * geom.scale).toFixed(2)}px, ${(pt.y * geom.scale).toFixed(2)}px, 0)`
      // 옅은 바늘. 시침은 12시간에 한 바퀴, 분침은 60분에 한 바퀴. 이동하는 동안 이어서 돈다.
      if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${((c.minutes / 60) * 30).toFixed(2)}deg)`
      if (minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${((c.minutes % 60) * 6).toFixed(2)}deg)`
      marker.style.setProperty('--dock', dock)
      const time = formatTime(c.minutes)
      if (time !== lastTime && markerTime) {
        markerTime.textContent = time
        lastTime = time
      }
    }

    /**
     * 진행률 하나로 빛 / camera / card를 모두 그린다. 되감아도 같은 진행률이면 같은 화면이다.
     *   빛     처음부터 지금 위치까지 하나로 이어진 한 줄. 진행률에 1:1(ease 없음)
     *   camera card마다 서지 않고 흐른다. 빛이 i번째 card에 닿는 순간 그 card가 화면 가운데에 있다
     *   card   빛이 자기 anchor에 닿을 때 켜지고, 빛이 다음 card로 반쯤 갔을 때 물러난다 — 빛의 길이는 건드리지 않는다
     */
    const render = () => {
      const p = journey.p
      const m = geom.marks
      if (!geom.length || m.length !== nodes.length) return

      const line = clamp01((p - LINE_FROM) / (LINE_TO - LINE_FROM)) * geom.length
      const offset = `${(geom.length - line).toFixed(2)}px`
      if (offset !== lastOffset) {
        active.style.strokeDashoffset = offset
        lastOffset = offset
      }

      // Contact 쪽 빛. 화면에 그리는 진행률을 그대로 따라가므로 빛 / camera와 같은 frame에 움직인다.
      const ambient = piecewise(CONTACT_AMBIENT, p).toFixed(3)
      if (ambient !== lastAmbient) {
        stage.style.setProperty('--contact-ambient', ambient)
        lastAmbient = ambient
      }

      const y = geom.camera(p).toFixed(2)
      if (y !== lastY) {
        gsap.set(world, { y: +y })
        lastY = y
      }

      // Journey의 시계 하나. 새 scroll listener 없이 같은 진행률(p)과 card mark로만 정한다.
      renderMarker(p)

      nodes.forEach((node, i) => {
        const nodeIn = i === 0 ? 1 : clamp01((p - (m[i] - NODE_RAMP)) / NODE_RAMP)
        const leave = i + 1 < m.length ? m[i] + (m[i + 1] - m[i]) * NODE_LEAVE : Infinity
        const nodeOut = clamp01((p - leave) / NODE_RAMP)
        const key = `${nodeIn.toFixed(3)} ${nodeOut.toFixed(3)}`
        if (written.get(node) === key) return
        written.set(node, key)
        node.style.setProperty('--node-in', nodeIn.toFixed(3))
        node.style.setProperty('--node-out', nodeOut.toFixed(3))
      })
    }

    /** scroll 진행률을 SMOOTHING만큼 늦게 따라간다. 다 따라잡으면 ticker에서 빠진다. */
    let following = false
    const follow = (_time: number, deltaTime: number) => {
      const frames = Math.min(4, deltaTime / (1000 / 60))
      journey.p += (journey.target - journey.p) * (1 - (1 - SMOOTHING) ** frames)
      if (Math.abs(journey.target - journey.p) < 1e-5) {
        journey.p = journey.target
        gsap.ticker.remove(follow)
        following = false
      }
      render()
    }
    const setTarget = (p: number) => {
      journey.target = p
      if (!following) {
        following = true
        gsap.ticker.add(follow)
      }
    }

    /** card의 world 좌표 상자(viewBox 단위). card 크기는 CSS가 정한 실제 크기(scale 전)를 world 배율로 나눈 값이다. */
    const measureBoxes = (scale: number) =>
      nodes.map((node, i) => {
        const cs = getComputedStyle(node.querySelector<HTMLElement>('.journey__card')!)
        const { position, anchor } = JOURNEY_NODES[i]
        return { ...position, hw: parseFloat(cs.width) / 2 / scale, hh: parseFloat(cs.height) / 2 / scale, side: anchor }
      })
    type Box = ReturnType<typeof measureBoxes>[number]

    /** 경로가 지나는 card 안의 점. 경로 쪽 변(data-anchor)에서 card 크기의 ANCHOR_INSET만큼 안쪽, 그 변의 가운데 높이 / 폭. */
    const anchorOf = (b: Box): Point => {
      switch (b.side) {
        case 'left': return { x: b.x - b.hw * (1 - 2 * ANCHOR_INSET), y: b.y }
        case 'right': return { x: b.x + b.hw * (1 - 2 * ANCHOR_INSET), y: b.y }
        case 'top': return { x: b.x, y: b.y - b.hh * (1 - 2 * ANCHOR_INSET) }
        default: return { x: b.x, y: b.y + b.hh * (1 - 2 * ANCHOR_INSET) }
      }
    }

    /**
     * 경로 위에서 빛이 i번째 card 테두리에 처음 닿는 길이(viewBox 단위). 경로를 촘촘히 따라가며
     * card 상자에 처음 들어가는 자리를 찾는다(이전 card를 지난 뒤부터). 첫 card는 경로의 시작(0)이다.
     */
    const borderHits = (boxes: Box[], total: number) => {
      const step = 2
      const hits = [0]
      let s = 0
      for (let i = 1; i < boxes.length; i++) {
        const b = boxes[i]
        while (s < total) {
          const pt = active.getPointAtLength(s)
          if (Math.abs(pt.x - b.x) <= b.hw && Math.abs(pt.y - b.y) <= b.hh) break
          s += step
        }
        hits.push(Math.min(s, total))
      }
      return hits
    }

    /**
     * marker의 rail과 머묾 자리. rail은 경로를 RAIL_STEP마다 짚은 점들인데, card(+ marker 반지름 + RAIL_GAP) 안에 든 점은
     * 가장 가까운 가장자리 바깥으로 밀어내고, 한 번 부드럽게 다듬은 뒤 다시 밀어낸다. 머묾 자리는 첫 card에서 line이
     * 나오는 자리와, 각 card에 line이 닿는 자리다(둘 다 rail 위라 card 가장자리 바깥). refresh마다 다시 잰다.
     */
    const placeMarker = (boxes: Box[], hits: number[], total: number, scale: number) => {
      if (!marker || !markerGlass) return
      const pad = (markerGlass.offsetWidth / 2 + RAIL_GAP) / scale
      /*
       * 두 겹의 경계. outer = card + marker 반지름 + RAIL_GAP(marker가 card 완전히 밖), inner = card 안쪽 여백보다 얕게만
       * 걸치는 경계(marker가 card 테두리에 조금 겹쳐도 글자에는 닿지 않는다). card가 붙어 있는 좁은 화면(1024 등)에서
       * 가까운 곳에 outer 밖 자리가 없을 때만 inner를 쓴다.
       */
      const radius = markerGlass.offsetWidth / 2
      const cardPadding = parseFloat(getComputedStyle(nodes[0].querySelector<HTMLElement>('.journey__card')!).paddingLeft) || 0
      const inner = Math.max(0, radius - cardPadding + 10) / scale
      const inAny = (pt: Point, margin: number, slack = 0) => boxes.some(b =>
        Math.abs(pt.x - b.x) < b.hw + margin - slack && Math.abs(pt.y - b.y) < b.hh + margin - slack)
      /** margin 경계 안의 점을, 모든 card의 그 경계 밖에 있는 가장 가까운 가장자리 점(best)과 가장 가까운 가장자리 점(nearest)으로. */
      const candidates = (pt: Point, margin: number) => {
        let best: Point | null = null, bestD = Infinity, nearest = pt, nearestD = Infinity
        for (const b of boxes) {
          const hx = b.hw + margin, hy = b.hh + margin
          const cx = Math.max(b.x - hx, Math.min(pt.x, b.x + hx)), cy = Math.max(b.y - hy, Math.min(pt.y, b.y + hy))
          for (const c of [{ x: b.x - hx, y: cy }, { x: b.x + hx, y: cy }, { x: cx, y: b.y - hy }, { x: cx, y: b.y + hy }]) {
            const d = Math.hypot(c.x - pt.x, c.y - pt.y)
            if (d < nearestD) { nearest = c; nearestD = d }
            if (d < bestD && !inAny(c, margin, 0.5)) { best = c; bestD = d }
          }
        }
        return { best, bestD, nearest, nearestD }
      }
      /**
       * card 가까이의 점을 card 밖으로 옮긴다. outer 밖의 가까운 자리(가장 가까운 가장자리보다 pad의 3배 이내)가 있으면 그곳,
       * 없으면 inner 밖의 가장 가까운 자리 — 멀리 돌아가며 튀지 않고, 글자도 가리지 않는다.
       */
      const push = (pt: Point): Point => {
        if (!inAny(pt, pad)) return pt
        const o = candidates(pt, pad)
        if (o.best && o.bestD <= o.nearestD + pad * 3) return o.best
        if (!inAny(pt, inner)) return pt
        const i = candidates(pt, inner)
        return i.best ?? i.nearest
      }
      const raw: Point[] = []
      for (let s = 0; s <= total; s += RAIL_STEP) {
        const q = active.getPointAtLength(s)
        raw.push(push({ x: q.x, y: q.y }))
      }
      // 가장자리에 붙은 구간의 꺾임을 부드럽게(이동 평균) 다듬고, 다듬다 card 쪽으로 들어간 점은 다시 밀어낸다.
      const W = 12
      geom.rail = raw.map((_, i) => {
        let x = 0, y = 0, n = 0
        for (let j = Math.max(0, i - W); j <= Math.min(raw.length - 1, i + W); j++) { x += raw[j].x; y += raw[j].y; n++ }
        return push({ x: x / n, y: y / n })
      })
      let exit0 = 0
      const inCard0 = (s: number) => {
        const q = active.getPointAtLength(s)
        return Math.abs(q.x - boxes[0].x) <= boxes[0].hw && Math.abs(q.y - boxes[0].y) <= boxes[0].hh
      }
      while (exit0 < total && inCard0(exit0)) exit0 += 2
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const margin = DOCK_MARGIN + markerGlass.offsetWidth / 2
      const m = geom.marks
      geom.stops = JOURNEY_CLOCK.map(stop => {
        const i = stop.node
        const s = Math.min(total, i === 0 ? exit0 : hits[i])
        const pt = railPoint(s)
        let depart = i + 1 < m.length ? m[i] + (m[i + 1] - m[i]) * DOCK_HOLD : Infinity
        // camera가 먼저 떠나 머무는 marker가 화면 가장자리에 닿기 전에 출발한다. 마지막 자리(depart = Infinity)는 재지 않는다.
        for (let q = m[i]; Number.isFinite(depart) && q < depart; q += 0.002) {
          const y = pt.y * scale + geom.camera(q)
          if (y < header + margin || y > stage.clientHeight - margin) {
            depart = q
            break
          }
        }
        return { s, arrive: m[i], depart, minutes: toMinutes(stop.time) }
      })
    }

    const rebuildPath = () => {
      const scale = world.getBoundingClientRect().width / 1920
      if (!scale) return
      const boxes = measureBoxes(scale)
      const d = buildSmoothPath(boxes.map(anchorOf))
      paths.forEach(p => p.setAttribute('d', d))
      const total = active.getTotalLength()
      const L = total * scale
      geom.length = L
      // card가 켜지는 자리 = 빛이 그 card 테두리에 닿는 순간(경로 길이에 비례).
      geom.scale = scale
      geom.total = total
      const hits = borderHits(boxes, total)
      geom.marks = hits.map((at, i) =>
        i === 0 ? LINE_FROM : LINE_FROM + (at / total) * (LINE_TO - LINE_FROM))
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const unit = stage.clientWidth / 1920
      const cameraAt = JOURNEY_NODES.map(n => header + (stage.clientHeight - header) / 2 - n.position.y * unit)
      geom.camera = monotoneCubic(
        [0, ...geom.marks, 1],
        [cameraAt[0], ...cameraAt, cameraAt[cameraAt.length - 1]],
      )
      /*
       * dasharray = 길이 L 한 줄. 간격만 L보다 4px 길게 둔다 — 간격이 정확히 L이면 아무것도 그려지지 않았을 때
       * 경로 끝에 길이 0짜리 dash(round cap 점)가 남는다. dashoffset = L x (1 - 진행률).
       */
      active.style.strokeDasharray = `${L}px ${L + 4}px`
      written.clear()
      lastMarker = ''
      lastTime = ''
      lastY = ''
      lastOffset = ''
      lastAmbient = ''
      placeMarker(boxes, hits, total, scale)
      if (import.meta.env.DEV) {
        stage.dataset.line = JSON.stringify({ length: +L.toFixed(1), marks: geom.marks.map(v => +v.toFixed(4)) })
      }
      render()
    }

    rebuildPath()
    /*
     * 'revert'는 refresh 도중 pin이 풀린 직후, 각 trigger가 다시 계산되기 전에 온다.
     * ('refreshInit'은 pin이 이전 폭을 붙들고 있을 때라 resize 뒤의 좌표를 잴 수 없다.)
     */
    ScrollTrigger.addEventListener('revert', rebuildPath)

    /** FACES 장면이 뒤로 물러나며 아주 조금 흐려진다(canvas에만). 0이면 filter를 지운다. */
    const facesBlur = { px: 0 }
    const writeBlur = () => {
      if (!facesCanvas) return
      if (facesBlur.px > 0.01) facesCanvas.style.filter = `blur(${facesBlur.px.toFixed(2)}px)`
      else facesCanvas.style.removeProperty('filter')
    }

    const ctx = gsap.context(() => {
      /*
       * FACES -> JOURNEY. 110vh 동안 FACES 장면 전체가 조금 작아지고 옅어지며 뒤로 물러나고(Watch만 따로 날아가지 않는다),
       * 실제 Journey DOM이 아래에서 천천히 올라와 자리를 잡는다. scroll 연결은 ease none이고, scrub 1.15초가
       * scroll을 부드럽게 늦게 따라간다. Journey의 도착만 마지막 25%에서 속도를 0까지 줄인다(softLanding) —
       * 특정 지점을 넘자마자 딱 붙지 않는다.
       *   FACES 장면   15 ~ 90%  scale 1 -> 0.95, opacity 1 -> 0.35, blur 0 -> 1.5px
       *   Journey      8 ~ 88%   yPercent 100 -> 0
       *   첫 card      62 ~ 100% opacity 0 -> 1, y 28 -> 0 (경로도 같은 구간에 opacity 0 -> 1)
       * FACES와 Journey는 같은 pin 하나 안에 있다(nested pin 없음). 이 구간에서 pin이 풀리지 않으므로
       * 풀리는 순간의 1 frame jump가 생길 자리가 없다. pin은 Journey가 끝난 뒤 Contact에서만 풀린다.
       */
      /*
       * FACES의 Crown 시간(13 : 30)은 FACES 동안만이다. Journey가 올라오기 시작하면 걷히고(Journey는 line 위의
       * Time Marker 하나가 10 : 20 -> 18 : 10의 흐름을 이어받는다), 되감아 FACES로 돌아가면 다시 보인다. 두 시계가 동시에 다른 시간을 말하지 않는다.
       */
      const crownEl = document.querySelector<HTMLElement>('.watch--stage .watch__crown')
      const syncCrownTime = (progress: number) => crownEl?.classList.toggle('watch__crown--time-hidden', progress > 0.3)
      const handoff = gsap.timeline({ scrollTrigger: {
        id: 'faces-journey-handoff', trigger: section, start: handoffStart, end: journeyStart,
        scrub: 1.15, invalidateOnRefresh: true, refreshPriority: -2,
        onUpdate: self => { panelTiming.handoff = self.progress; syncCrownTime(self.progress) },
        onRefresh: self => { panelTiming.handoff = self.progress; syncCrownTime(self.progress) },
      } })
      handoff.fromTo(section, { yPercent: 100, y: 0 }, { yPercent: 0, ease: softLanding, duration: 0.80 }, 0.08)
      if (facesScene) handoff.fromTo(facesScene, { scale: 1, opacity: 1 }, { scale: 0.95, opacity: 0.35, ease: 'none', duration: 0.75 }, 0.15)
      handoff.fromTo(facesBlur, { px: 0 }, { px: 1.5, ease: 'none', duration: 0.75, onUpdate: writeBlur, immediateRender: false }, 0.15)
      handoff.to('.faces__meta', { opacity: 0, duration: 0.15, ease: 'none' }, 0)
      handoff.fromTo('.journey__intro-entry', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.38, ease: 'none' }, 0.62)
      // 경로도 첫 card와 함께 들어온다 — card가 아직 옅고 28px 아래에 있을 때 그 surface 너머로 선 끝이 비치지 않는다.
      handoff.fromTo([world.querySelector('.journey__path'), marker], { opacity: 0 }, { opacity: 1, duration: 0.38, ease: 'none' }, 0.62)
      handoff.fromTo(stage, { '--leading-light': 1 }, { '--leading-light': 0, duration: 0.5, ease: 'none' }, 0.5)
      handoff.set({}, {}, 1)

      /*
       * Journey 전체가 진행률 하나다. card마다 tween을 나누지 않는다 —
       * 나누면 구간마다 가속 / 감속이 생겨 빛이 anchor에서 멈췄다 다시 끌려가는 것처럼 보인다.
       * scroll 진행률은 그대로 받고(scrub 없음), 화면은 SMOOTHING만큼만 늦게 따라간다.
       */
      ScrollTrigger.create({
        id: 'journey-master', trigger: section, start: journeyStart,
        end: () => journeyStart() + innerHeight * JOURNEY_VIEWPORTS,
        invalidateOnRefresh: true, refreshPriority: -3,
        onUpdate: self => setTarget(self.progress),
        onRefresh: self => {
          journey.target = journey.p = self.progress
          render()
        },
      })
    })
    render()

    let live = true
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts.ready.then(() => { if (live) ScrollTrigger.refresh() })
    return () => {
      live = false
      cancelAnimationFrame(refreshId)
      gsap.ticker.remove(follow)
      ScrollTrigger.removeEventListener('revert', rebuildPath)
      ctx.revert()
      facesCanvas?.style.removeProperty('filter')
      stage.style.removeProperty('--contact-ambient')
      active.style.removeProperty('stroke-dasharray')
      active.style.removeProperty('stroke-dashoffset')
      marker?.style.removeProperty('transform')
      marker?.style.removeProperty('--dock')
      hourHand?.style.removeProperty('transform')
      minuteHand?.style.removeProperty('transform')
      for (const node of nodes) {
        node.style.removeProperty('--node-in')
        node.style.removeProperty('--node-out')
      }
      gsap.set(world, { clearProps: 'transform' })
      if (import.meta.env.DEV) delete stage.dataset.line
      panelTiming.handoff = 0
      document.querySelector('.watch--stage .watch__crown')?.classList.remove('watch__crown--time-hidden')
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
