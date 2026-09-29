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
/**
 * 빛은 card / camera의 scrub(0.5초)을 따르지 않는다. scroll 진행률을 직접 읽고, wheel의 계단만 없애는
 * 아주 짧은 smoothing(시간 상수 100ms)만 둔다. card가 켜지는 시점과 빛의 길이는 서로 독립이다.
 */
const LINE_SMOOTHING_MS = 100
/** 두 card 사이 구간 중 camera가 다음 card로 옮겨 가는 비율(나머지는 지금 card에 머문다). 빛과는 무관하다. */
const TRAVEL = 0.65
/** card가 켜지고 / 물러나는 데 걸리는 진행률. */
const NODE_RAMP = 0.04

type Options = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
}

type Point = { x: number; y: number }

/** anchor가 놓인 변의 바깥 방향. */
const OUTWARD: Record<JourneyAnchor, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/**
 * 좌우 card의 옆 변에서 경로가 지나가는 거리(world 단위, 1920 기준). card 밑으로 들어가지 않고 이만큼 바깥을 스쳐 지나간다.
 * 처음 / 마지막 card(아래 / 위 변)는 경로가 그 변에서 시작하고 끝난다.
 */
const SIDE_CLEARANCE = 14

/** anchor(card 변 위의 한 점)를 경로가 실제로 지나는 점으로 옮긴다. */
const pathPoint = (p: Point, anchor: JourneyAnchor): Point =>
  anchor === 'left' || anchor === 'right'
    ? { x: p.x + OUTWARD[anchor].x * SIDE_CLEARANCE, y: p.y }
    : p

/**
 * 점들을 하나의 부드러운 경로로 잇는다(M 1개 + C 여러 개, 가지 없음).
 * 두 점 사이는 세로 중간 높이(midY)에 두 제어점을 둔 Cubic Bézier다.
 *   C p0.x midY, p1.x midY, p1.x p1.y
 * 경로는 처음부터 끝까지 아래로만 흐른다(접선이 세로). 좌우 card는 옆 변 바깥을 스치며 지나가고,
 * 방향을 되돌리거나(V자) card 밑으로 숨었다 나오는 구간이 없다 — 전에는 경로가 옆 변 1px 안쪽을 지나
 * card 밑에서 한참 보이지 않다가 나와서, 빛이 중간중간 끊겨 보였다.
 */
function buildSmoothPath(points: Point[], anchors: JourneyAnchor[]): string {
  if (points.length < 2) return ''
  const q = points.map((p, i) => pathPoint(p, anchors[i]))
  let d = `M ${q[0].x} ${q[0].y}`
  for (let i = 1; i < q.length; i += 1) {
    const p0 = q[i - 1]
    const p1 = q[i]
    const midY = (p0.y + p1.y) / 2
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`
  }
  return d
}

const clamp01 = gsap.utils.clamp(0, 1)
const travelEase = gsap.parseEase('power1.inOut')

export default function useJourneyInteraction({ enabled, sectionRef, stageRef, worldRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, world = worldRef.current
    if (!enabled || !section || !stage || !world) return
    const facesScene = document.querySelector<HTMLElement>('.faces__scene')
    const panels = () => ScrollTrigger.getById(PANEL_TRIGGER_ID)
    const handoffStart = () => (panels()?.start ?? 0) + panelTiming.facesDistance
    const journeyStart = () => handoffStart() + innerHeight * HANDOFF_VIEWPORTS
    const nodes = JOURNEY_NODES.map(n => world.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!)
    const active = world.querySelector<SVGPathElement>('.journey__path-active')!
    const paths = world.querySelectorAll<SVGPathElement>('.journey__path path')
    const anchors = JOURNEY_NODES.map(n => n.anchor)
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    /*
     * 경로 기하. card 안의 anchor element를 실제로 재서 만든다.
     * length는 화면 px이다 — non-scaling-stroke에서는 dash가 화면 px로 적용되기 때문이다.
     *   marks[i]  빛이 i번째 card anchor에 닿는 journey-master 진행률. 경로 길이에 비례한다 —
     *             그래서 빛은 한 속도로 흐르고, card는 빛이 자기 자리를 지날 때 켜진다.
     *   camera[i] i번째 card를 화면 가운데(Header 아래)에 두는 world의 y
     * refresh(초기 mount, 폰트 로드, resize)마다 다시 재고, scroll 중에는 다시 재지 않는다.
     */
    const geom = { length: 0, marks: [LINE_FROM] as number[], camera: [0] as number[] }
    /** journey-master 진행률(scrub 0.5). camera와 card만 이 값을 따른다. */
    const journey = { p: 0 }
    /** 빛의 진행률. scroll 진행률(target)을 LINE_SMOOTHING_MS로만 따라간다(current). */
    const line = { target: 0, current: 0 }
    const written = new Map<HTMLElement, string>()

    /**
     * 빛. 처음부터 지금 위치까지 이어진 한 줄이다. 진행률에 1:1(ease 없음), stroke-dashoffset만 바뀐다.
     * 조각이 움직이거나, card에서 멈추거나, 다시 그려지지 않는다.
     */
    let lastDash = ''
    const renderLine = () => {
      if (!geom.length) return
      const drawn = clamp01((line.current - LINE_FROM) / (LINE_TO - LINE_FROM)) * geom.length
      const dash = `${(geom.length - drawn).toFixed(2)}px`
      if (dash !== lastDash) {
        active.style.strokeDashoffset = dash
        lastDash = dash
      }
    }

    let lineRaf = 0
    let lineTime = 0
    const lineTick = (now: number) => {
      const dt = lineTime ? Math.min(100, now - lineTime) : 16.7
      lineTime = now
      line.current += (line.target - line.current) * (1 - Math.exp(-dt / LINE_SMOOTHING_MS))
      if (Math.abs(line.target - line.current) < 1e-5) line.current = line.target
      renderLine()
      if (line.current !== line.target) lineRaf = requestAnimationFrame(lineTick)
      else { lineRaf = 0; lineTime = 0 }
    }
    const setLine = (progress: number, immediate = false) => {
      line.target = progress
      if (immediate) {
        line.current = progress
        cancelAnimationFrame(lineRaf)
        lineRaf = 0
        lineTime = 0
        renderLine()
      } else if (!lineRaf) lineRaf = requestAnimationFrame(lineTick)
    }

    /**
     * camera / card. journey-master 진행률 하나로 그린다. 되감아도 같은 진행률이면 같은 화면이다.
     *   camera 빛이 다음 card에 닿기 전 TRAVEL 구간 동안 그 card로 옮겨 간다
     *   card   진행률이 자기 anchor 자리(marks)에 닿을 때 켜지고, camera가 다음 card로 떠날 때 물러난다
     */
    const render = () => {
      const p = journey.p
      const m = geom.marks
      if (!geom.length || m.length !== nodes.length) return

      let y = geom.camera[0]
      for (let i = 1; i < m.length; i++) {
        const start = m[i] - (m[i] - m[i - 1]) * TRAVEL
        if (p < start) break
        const t = Math.min(1, (p - start) / (m[i] - start))
        y = geom.camera[i - 1] + (geom.camera[i] - geom.camera[i - 1]) * travelEase(t)
      }
      gsap.set(world, { y })

      nodes.forEach((node, i) => {
        const nodeIn = i === 0 ? 1 : clamp01((p - (m[i] - NODE_RAMP)) / NODE_RAMP)
        const leave = i + 1 < m.length ? m[i + 1] - (m[i + 1] - m[i]) * TRAVEL : Infinity
        const nodeOut = clamp01((p - leave) / NODE_RAMP)
        const key = `${nodeIn.toFixed(3)} ${nodeOut.toFixed(3)}`
        if (written.get(node) === key) return
        written.set(node, key)
        node.style.setProperty('--node-in', nodeIn.toFixed(3))
        node.style.setProperty('--node-out', nodeOut.toFixed(3))
      })
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
      const d = buildSmoothPath(points, anchors)
      paths.forEach(p => p.setAttribute('d', d))
      geom.length = active.getTotalLength() * scale
      geom.marks = points.map((_, i) => {
        if (i === 0) return LINE_FROM
        probe.setAttribute('d', buildSmoothPath(points.slice(0, i + 1), anchors))
        return LINE_FROM + ((probe.getTotalLength() * scale) / geom.length) * (LINE_TO - LINE_FROM)
      })
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const unit = stage.clientWidth / 1920
      geom.camera = JOURNEY_NODES.map(n => header + (stage.clientHeight - header) / 2 - n.position.y * unit)
      // 간격을 길이보다 조금 길게 둬서, 아무것도 그려지지 않았을 때 경로 끝에 길이 0짜리 dash(round cap 점)가 남지 않게 한다.
      active.style.strokeDasharray = `${geom.length}px ${geom.length + 4}px`
      written.clear()
      lastDash = ''
      render()
      renderLine()
    }

    rebuildPath()
    /*
     * 'revert'는 refresh 도중 pin이 풀린 직후, 각 trigger가 다시 계산되기 전에 온다.
     * ('refreshInit'은 pin이 이전 폭을 붙들고 있을 때라 resize 뒤의 좌표를 잴 수 없다.)
     */
    ScrollTrigger.addEventListener('revert', rebuildPath)

    const ctx = gsap.context(() => {
      /*
       * FACES -> JOURNEY handoff (HANDOFF_VIEWPORTS = 1.1화면).
       * 같은 pin 안에서 실제 Journey stage가 아래에서 올라와 FACES scene 전체를 덮는다. Watch만 따로 날아가지 않는다 —
       * WebGL Watch까지 그리는 .faces__scene 전체가 한 덩어리로 뒤로 물러난다(scale / opacity).
       * scrub 1.15: scroll을 약간 늦게 따라와 멈춤 / 역방향에서도 튀지 않는다. 모든 tween이 양끝 속도 0인 sine ease라
       * 시작과 끝에 snap처럼 걸리는 지점이 없다. panelTiming.handoff는 scroll 진행률 그대로다(링크 / drag 잠금용).
       */
      const handoff = gsap.timeline({ scrollTrigger: {
        id: 'faces-journey-handoff', trigger: section, start: handoffStart, end: journeyStart,
        scrub: 1.15, invalidateOnRefresh: true, refreshPriority: -2,
        onUpdate: self => { panelTiming.handoff = self.progress },
        onRefresh: self => { panelTiming.handoff = self.progress },
      } })
      handoff.fromTo(section, { yPercent: 100, y: 0 }, { yPercent: 0, ease: 'sine.inOut', duration: 0.86 }, 0.06)
      if (facesScene) handoff.fromTo(facesScene, { scale: 1, opacity: 1 }, { scale: 0.93, opacity: 0.3, ease: 'sine.inOut', duration: 0.84 }, 0.08)
      handoff.to('.faces__meta', { opacity: 0, duration: 0.16, ease: 'sine.in' }, 0)
      handoff.fromTo('.journey__intro-entry', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.36, ease: 'sine.out' }, 0.6)
      handoff.fromTo(stage, { '--leading-light': 1 }, { '--leading-light': 0, duration: 0.5, ease: 'sine.inOut' }, 0.5)
      handoff.set({}, {}, 1)

      /*
       * Journey 전체가 진행률 하나다. card마다 tween을 나누지 않는다 —
       * 나누면 구간마다 가속 / 감속이 생겨 빛이 anchor에서 멈췄다 다시 끌려가는 것처럼 보인다.
       * scrub 0.5는 camera가 scroll을 부드럽게 따라가게 하는 기존 값이다(빛도 같은 값으로 함께 움직인다).
       */
      gsap.timeline({ scrollTrigger: {
        id: 'journey-master', trigger: section, start: journeyStart,
        end: () => journeyStart() + innerHeight * JOURNEY_VIEWPORTS,
        scrub: 0.5, invalidateOnRefresh: true, refreshPriority: -3,
        // 빛은 scrub을 거치지 않은 scroll 진행률을 직접 받는다.
        onUpdate: self => setLine(self.progress),
        onRefresh: self => { setLine(self.progress, true); render() },
      } }).fromTo(journey, { p: 0 }, { p: 1, duration: 1, ease: 'none', onUpdate: render, immediateRender: false }, 0)
    })
    render()

    let live = true
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts.ready.then(() => { if (live) ScrollTrigger.refresh() })
    return () => {
      live = false
      cancelAnimationFrame(refreshId)
      cancelAnimationFrame(lineRaf)
      ScrollTrigger.removeEventListener('revert', rebuildPath)
      ctx.revert()
      active.style.removeProperty('stroke-dasharray')
      active.style.removeProperty('stroke-dashoffset')
      for (const node of nodes) {
        node.style.removeProperty('--node-in')
        node.style.removeProperty('--node-out')
      }
      gsap.set(world, { clearProps: 'transform' })
      panelTiming.handoff = 0
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
