import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_NODES } from './journeyData'
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

type Options = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
}

type Point = { x: number; y: number }

/**
 * 점들을 하나의 부드러운 경로로 잇는다(가지 없음).
 * 두 점 사이는 세로 중간 높이(midY)에 두 제어점을 둔 Cubic Bézier다.
 *   C p0.x midY, p1.x midY, p1.x p1.y
 * 양 끝의 접선이 세로라서 좌우 card 사이를 오가도 꺾이는 곳 없이 S curve로 흐른다.
 */
function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const midY = (p0.y + p1.y) / 2
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`
  }
  return d
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
     *   marks[i]  빛이 i번째 card anchor에 닿는 journey-master 진행률. 경로 길이에 비례한다 —
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
     * anchor 중심의 world 좌표(viewBox 단위).
     * card 안에서의 위치는 화면 rect 차이를 card의 현재 scale로 나눠 구한다(소수점까지, camera / 등장 motion과 무관).
     * card 자체는 node 점에서 자기 크기의 절반만큼 translate(-50%, -50%)되어 있다.
     */
    const measureAnchors = (scale: number): Point[] =>
      nodes.map((node, i) => {
        const card = node.querySelector<HTMLElement>('.journey__card')!
        const anchor = card.querySelector<HTMLElement>('.journey-card__anchor')!
        const cs = getComputedStyle(card)
        const w = parseFloat(cs.width), h = parseFloat(cs.height)
        const c = card.getBoundingClientRect(), a = anchor.getBoundingClientRect()
        const k = c.width / w
        const lx = (a.left + a.width / 2 - c.left) / k
        const ly = (a.top + a.height / 2 - c.top) / k
        const { x, y } = JOURNEY_NODES[i].position
        return { x: x + (lx - w / 2) / scale, y: y + (ly - h / 2) / scale }
      })

    const rebuildPath = () => {
      const scale = world.getBoundingClientRect().width / 1920
      if (!scale) return
      const points = measureAnchors(scale)
      const d = buildSmoothPath(points)
      paths.forEach(p => p.setAttribute('d', d))
      const L = active.getTotalLength() * scale
      geom.length = L
      geom.marks = points.map((_, i) => {
        if (i === 0) return LINE_FROM
        probe.setAttribute('d', buildSmoothPath(points.slice(0, i + 1)))
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
       *   첫 card      62 ~ 100% opacity 0 -> 1, y 28 -> 0
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
