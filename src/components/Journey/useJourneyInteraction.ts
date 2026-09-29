import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_NODES, type JourneyAnchor } from './journeyData'
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

/** 경로가 지나는 점. role in = card로 들어오는 점, out = card에서 나가는 점. */
type Point = { x: number; y: number; side: JourneyAnchor; role: 'in' | 'out' }

/** card 바깥을 향하는 단위 방향(경로가 닿는 변의 법선). */
const OUTWARD: Record<JourneyAnchor, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/**
 * 점들을 하나의 부드러운 경로로 잇는다(가지 없음, M 하나에 C만 이어진다). 두 점 사이는 Cubic Bézier 하나다.
 * 각 점에서 경로는 그 card 변에 수직이다 — 제어점을 anchor에서 변의 법선(OUTWARD) 방향으로 둔다.
 *   out -> in   card 사이의 보이는 선. 나갈 때도 들어올 때도 제어점이 card 바깥에 있다
 *   in -> out   card 바탕 아래로 지나는 선(보이지 않는다). 제어점이 card 안쪽에 있다
 * 그래서 옆 변(left / right)에 닿는 선도 변을 따라 미끄러지지 않고 정면으로 들어와 테두리에서 끊김 없이 이어진다
 * (세로 접선이면 선이 card 옆면에 비스듬히 스치며 테두리 직전에서 잘려 보였다).
 * k(제어점 거리)는 reach()가 정한다.
 */
/** 선이 card 바깥선을 지나 card 안쪽으로 더 들어가는 거리(화면 px). 선 끝이 card 바탕 아래에 숨는다. */
const LINE_OVERLAP = 8
/** 옆 변에서 in / out이 변 가운데에서 떨어진 거리(card 높이 비율). in이 위, out이 아래다(경로는 위에서 아래로 흐른다). */
const ANCHOR_SPREAD = 0.22
/** 기존 옆 변 조합을 그대로 쓰는 최소 트인 거리(화면 px). 이보다 좁으면 선이 card 아래에 묻히거나 변을 스친다. */
const MIN_SIDE_CLEARANCE = 48

/** 법선 방향으로 뒤돌아 가야 할 때 제어점 거리의 최소값(world px). 테두리에서 수직으로 잠깐 나온 뒤 바로 방향을 튼다. */
const MIN_REACH = 36

/**
 * 제어점 거리. card 사이의 선(outside)에서 상대 점이 법선 앞쪽에 있으면 거리의 0.3배와 법선 방향 거리의 절반 중 큰 값 —
 * 가까운 card 사이에서도 꺾이지 않는다. 상대 점이 법선 뒤쪽(작은 화면에서 card가 커져 옆 card의 변이 서로 엇갈릴 때)이면
 * 길게 뻗으면 선이 되돌아가며 고리를 만든다 — 그때는 MIN_REACH만큼만 수직으로 나온다.
 * card 아래의 선(inside)은 거리의 0.3배다(보이지 않는다).
 */
function reach(dist: number, ahead: number, outside: boolean) {
  if (!outside) return dist * 0.3
  if (ahead <= 0) return MIN_REACH
  return Math.max(Math.min(dist * 0.3, ahead * 1.5), ahead / 2, MIN_REACH)
}

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const dist = Math.hypot(dx, dy)
    const n0 = OUTWARD[p0.side]
    const n1 = OUTWARD[p1.side]
    const k0 = reach(dist, dx * n0.x + dy * n0.y, p0.role === 'out') * (p0.role === 'out' ? 1 : -1)
    const k1 = reach(dist, -(dx * n1.x + dy * n1.y), p1.role === 'in') * (p1.role === 'in' ? 1 : -1)
    const c0 = { x: p0.x + n0.x * k0, y: p0.y + n0.y * k0 }
    const c1 = { x: p1.x + n1.x * k1, y: p1.y + n1.y * k1 }
    d += ` C ${c0.x.toFixed(2)} ${c0.y.toFixed(2)}, ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
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
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    /*
     * 경로 기하. card 안의 anchor element를 실제로 재서 만든다.
     * length는 화면 px이다 — non-scaling-stroke에서는 dash가 화면 px로 적용되기 때문이다.
     *   marks[i]  빛이 i번째 card의 in anchor에 닿는 journey-master 진행률. 경로 길이에 비례한다 —
     *             그래서 빛은 한 속도로 흐르고, card는 빛이 자기 자리를 지날 때 켜진다.
     *   camera    진행률 -> world의 y. marks[i]에서 i번째 card가 화면 가운데(Header 아래)에 오고,
     *             그 사이는 멈추지 않고 이어진다(monotoneCubic).
     * refresh(초기 mount, 폰트 로드, resize)마다 다시 재고, scroll 중에는 다시 재지 않는다.
     */
    const geom = {
      length: 0,
      marks: [LINE_FROM] as number[],
      camera: (() => 0) as (p: number) => number,
    }
    /** 화면에 그리는 진행률(display)과 scroll 진행률(target). */
    const journey = { p: 0, target: 0 }
    const written = new Map<HTMLElement, string>()
    let lastY = ''
    let lastOffset = ''
    let lastAmbient = ''

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

    /**
     * 경로가 지나는 점(world 좌표, viewBox 단위). card마다 in / out 순서로 이어 붙인다.
     * card의 실제 크기(CSS width / height)를 재서, 선이 닿는 변 위의 점을 계산한다.
     * 점은 그 변의 바깥선보다 LINE_OVERLAP(화면 8px)만큼 card 안쪽이다 — 선이 테두리를 지나 surface 아래에 숨는다.
     *
     * 변 고르기: card 사이 한 구간마다 먼저 card의 변(data-anchor)끼리 잇는다(기존 경로).
     * 두 변 앞이 MIN_SIDE_CLEARANCE보다 좁게 막혀 있을 때만(두 card가 위아래로 겹쳐 놓였거나, 작은 화면에서
     * card가 최소 폭 460px에 걸려 서로 엇갈릴 때) {옆 변, 아래 / 위 변} 조합 중 가장 넓게 트인 조합으로 바꾼다 —
     * 선이 card 아래에 묻히거나 변을 스치지 않는다.
     * entry[i] = i번째 card에 빛이 들어오는 점의 index(첫 card는 경로의 시작점).
     */
    const measureAnchors = (scale: number) => {
      const boxes = nodes.map((node, i) => {
        const cs = getComputedStyle(node.querySelector<HTMLElement>('.journey__card')!)
        const { position, anchor } = JOURNEY_NODES[i]
        return { ...position, hw: parseFloat(cs.width) / 2 / scale, hh: parseFloat(cs.height) / 2 / scale, side: anchor }
      })
      const inset = LINE_OVERLAP / scale
      /** 변 위의 점. 옆 변은 in이 위, out이 아래(ANCHOR_SPREAD). 위 / 아래 변은 가운데. */
      const at = (b: (typeof boxes)[number], side: JourneyAnchor, role: Point['role']): Point => {
        const n = OUTWARD[side]
        if (n.x !== 0) {
          const dy = b.hh * 2 * ANCHOR_SPREAD * (role === 'in' ? -1 : 1)
          return { x: b.x + n.x * (b.hw - inset), y: b.y + dy, side, role }
        }
        return { x: b.x, y: b.y + n.y * (b.hh - inset), side, role }
      }
      /** 두 점이 서로 변 앞쪽으로 떨어진 거리 중 작은 쪽(클수록 선이 card 밖으로 넓게 보인다). */
      const clearance = (a: Point, b: Point) => {
        const na = OUTWARD[a.side], nb = OUTWARD[b.side]
        return Math.min((b.x - a.x) * na.x + (b.y - a.y) * na.y, (a.x - b.x) * nb.x + (a.y - b.y) * nb.y)
      }
      const outSide: JourneyAnchor[] = []
      const inSide: JourneyAnchor[] = []
      for (let i = 0; i + 1 < boxes.length; i++) {
        const a = boxes[i], b = boxes[i + 1]
        const outs: JourneyAnchor[] = i === 0 ? [a.side] : [a.side, 'bottom']
        const ins: JourneyAnchor[] = i + 1 === boxes.length - 1 ? [b.side] : [b.side, 'top']
        let best = { score: clearance(at(a, outs[0], 'out'), at(b, ins[0], 'in')), o: outs[0], n: ins[0] }
        if (best.score < MIN_SIDE_CLEARANCE / scale) {
          for (const o of outs) for (const n of ins) {
            const score = clearance(at(a, o, 'out'), at(b, n, 'in'))
            if (score > best.score) best = { score, o, n }
          }
        }
        outSide[i] = best.o
        inSide[i + 1] = best.n
      }
      const points: Point[] = []
      const entry: number[] = []
      boxes.forEach((b, i) => {
        entry.push(points.length)
        if (i > 0) points.push(at(b, inSide[i], 'in'))
        if (i < boxes.length - 1) points.push(at(b, outSide[i], 'out'))
      })
      return { points, entry }
    }

    const rebuildPath = () => {
      const scale = world.getBoundingClientRect().width / 1920
      if (!scale) return
      const { points, entry } = measureAnchors(scale)
      const d = buildSmoothPath(points)
      paths.forEach(p => p.setAttribute('d', d))
      const L = active.getTotalLength() * scale
      geom.length = L
      geom.marks = entry.map((at, i) => {
        if (i === 0) return LINE_FROM
        probe.setAttribute('d', buildSmoothPath(points.slice(0, at + 1)))
        return LINE_FROM + ((probe.getTotalLength() * scale) / L) * (LINE_TO - LINE_FROM)
      })
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
      lastY = ''
      lastOffset = ''
      lastAmbient = ''
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
      const handoff = gsap.timeline({ scrollTrigger: {
        id: 'faces-journey-handoff', trigger: section, start: handoffStart, end: journeyStart,
        scrub: 1.15, invalidateOnRefresh: true, refreshPriority: -2,
        onUpdate: self => { panelTiming.handoff = self.progress },
        onRefresh: self => { panelTiming.handoff = self.progress },
      } })
      handoff.fromTo(section, { yPercent: 100, y: 0 }, { yPercent: 0, ease: softLanding, duration: 0.80 }, 0.08)
      if (facesScene) handoff.fromTo(facesScene, { scale: 1, opacity: 1 }, { scale: 0.95, opacity: 0.35, ease: 'none', duration: 0.75 }, 0.15)
      handoff.fromTo(facesBlur, { px: 0 }, { px: 1.5, ease: 'none', duration: 0.75, onUpdate: writeBlur, immediateRender: false }, 0.15)
      handoff.to('.faces__meta', { opacity: 0, duration: 0.15, ease: 'none' }, 0)
      handoff.fromTo('.journey__intro-entry', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.38, ease: 'none' }, 0.62)
      // 경로도 첫 card와 함께 들어온다 — card가 아직 옅고 28px 아래에 있을 때 그 surface 너머로 선 끝이 비치지 않는다.
      handoff.fromTo(world.querySelector('.journey__path'), { opacity: 0 }, { opacity: 1, duration: 0.38, ease: 'none' }, 0.62)
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
      for (const node of nodes) {
        node.style.removeProperty('--node-in')
        node.style.removeProperty('--node-out')
      }
      gsap.set(world, { clearProps: 'transform' })
      if (import.meta.env.DEV) delete stage.dataset.line
      panelTiming.handoff = 0
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
