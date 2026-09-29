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
/** 두 card 사이 구간 중 camera가 다음 card로 옮겨 가는 비율(나머지는 지금 card에 머문다). 빛과는 무관하다. */
const TRAVEL = 0.65
/** card가 켜지고 / 물러나는 데 걸리는 진행률. */
const NODE_RAMP = 0.04
/** 빛의 앞쪽 끝을 조금 더 밝게 보여 주는 길이(전체 길이 비율). 움직이는 조각이 아니라 이어진 빛의 끝부분이다. */
const EDGE_RATIO = 0.04

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
    const edge = world.querySelector<SVGPathElement>('.journey__path-edge')!
    const paths = world.querySelectorAll<SVGPathElement>('.journey__path path')
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    /*
     * 경로 기하. card 안의 anchor element를 실제로 재서 만든다.
     * length / edge는 화면 px이다 — non-scaling-stroke에서는 dash가 화면 px로 적용되기 때문이다.
     *   marks[i]  빛이 i번째 card anchor에 닿는 journey-master 진행률. 경로 길이에 비례한다 —
     *             그래서 빛은 한 속도로 흐르고, card는 빛이 자기 자리를 지날 때 켜진다.
     *   camera[i] i번째 card를 화면 가운데(Header 아래)에 두는 world의 y
     * refresh(초기 mount, 폰트 로드, resize)마다 다시 재고, scroll 중에는 다시 재지 않는다.
     */
    const geom = { length: 0, edge: 0, marks: [LINE_FROM] as number[], camera: [0] as number[] }
    /** journey-master 진행률. timeline은 이 값 하나만 움직이고, 화면은 render가 그린다. */
    const journey = { p: 0 }
    const written = new Map<HTMLElement, string>()

    /**
     * 진행률 하나로 빛 / camera / card를 모두 그린다. 되감아도 같은 진행률이면 같은 화면이다.
     *   빛     처음부터 지금 위치까지. 진행률에 1:1(ease 없음)
     *   camera 빛이 다음 card에 닿기 전 TRAVEL 구간 동안 그 card로 옮겨 간다(빛은 그동안에도 멈추지 않는다)
     *   card   빛이 자기 anchor에 닿을 때 켜지고, camera가 다음 card로 떠날 때 물러난다
     */
    const render = () => {
      const p = journey.p
      const m = geom.marks
      if (!geom.length || m.length !== nodes.length) return

      const line = clamp01((p - LINE_FROM) / (LINE_TO - LINE_FROM)) * geom.length
      active.style.strokeDashoffset = `${(geom.length - line).toFixed(2)}px`
      edge.style.strokeDashoffset = `${(geom.edge - line).toFixed(2)}px`

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
      const d = buildSmoothPath(points)
      paths.forEach(p => p.setAttribute('d', d))
      geom.length = active.getTotalLength() * scale
      geom.edge = geom.length * EDGE_RATIO
      geom.marks = points.map((_, i) => {
        if (i === 0) return LINE_FROM
        probe.setAttribute('d', buildSmoothPath(points.slice(0, i + 1)))
        return LINE_FROM + ((probe.getTotalLength() * scale) / geom.length) * (LINE_TO - LINE_FROM)
      })
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const unit = stage.clientWidth / 1920
      geom.camera = JOURNEY_NODES.map(n => header + (stage.clientHeight - header) / 2 - n.position.y * unit)
      // 간격을 길이보다 조금 길게 둬서, 아무것도 그려지지 않았을 때 경로 끝에 길이 0짜리 dash(round cap 점)가 남지 않게 한다.
      active.style.strokeDasharray = `${geom.length}px ${geom.length + 4}px`
      edge.style.strokeDasharray = `${geom.edge}px ${geom.length + geom.edge}px`
      written.clear()
      render()
    }

    rebuildPath()
    /*
     * 'revert'는 refresh 도중 pin이 풀린 직후, 각 trigger가 다시 계산되기 전에 온다.
     * ('refreshInit'은 pin이 이전 폭을 붙들고 있을 때라 resize 뒤의 좌표를 잴 수 없다.)
     */
    ScrollTrigger.addEventListener('revert', rebuildPath)

    const ctx = gsap.context(() => {
      const handoff = gsap.timeline({ scrollTrigger: {
        id: 'faces-journey-handoff', trigger: section, start: handoffStart, end: journeyStart,
        scrub: true, invalidateOnRefresh: true, refreshPriority: -2,
        onUpdate: self => { panelTiming.handoff = self.progress },
        onRefresh: self => { panelTiming.handoff = self.progress },
      } })
      handoff.fromTo(section, { yPercent: 100, y: 0 }, { yPercent: 0, ease: 'none', duration: 0.80 }, 0.08)
      if (facesScene) handoff.fromTo(facesScene, { scale: 1, opacity: 1 }, { scale: 0.94, opacity: 0.34, ease: 'none', duration: 0.75 }, 0.15)
      handoff.to('.faces__meta', { opacity: 0, duration: 0.15, ease: 'none' }, 0)
      handoff.fromTo('.journey__intro-entry', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.38, ease: 'none' }, 0.62)
      handoff.fromTo(stage, { '--leading-light': 1 }, { '--leading-light': 0, duration: 0.5, ease: 'none' }, 0.5)
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
        onRefresh: render,
      } }).fromTo(journey, { p: 0 }, { p: 1, duration: 1, ease: 'none', onUpdate: render, immediateRender: false }, 0)
    })
    render()

    let live = true
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts.ready.then(() => { if (live) ScrollTrigger.refresh() })
    return () => {
      live = false
      cancelAnimationFrame(refreshId)
      ScrollTrigger.removeEventListener('revert', rebuildPath)
      ctx.revert()
      for (const p of [active, edge]) {
        p.style.removeProperty('stroke-dasharray')
        p.style.removeProperty('stroke-dashoffset')
      }
      for (const node of nodes) {
        node.style.removeProperty('--node-in')
        node.style.removeProperty('--node-out')
      }
      gsap.set(world, { clearProps: 'transform' })
      panelTiming.handoff = 0
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
