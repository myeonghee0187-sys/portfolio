import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_NODES } from './journeyData'
import { HANDOFF_VIEWPORTS, JOURNEY_VIEWPORTS, PANEL_TRIGGER_ID, panelTiming } from '../../hooks/panelTiming'

gsap.registerPlugin(ScrollTrigger)
const LABELS = [0, 0.15, 0.29, 0.43, 0.57, 0.71, 0.88]
const TRAVEL = 0.65
/** 지금 그려지는 끝(Electric Ice)의 길이. 화면 px. */
const ACCENT_LENGTH = 160

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

export default function useJourneyInteraction({ enabled, sectionRef, stageRef, worldRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, world = worldRef.current
    if (!enabled || !section || !stage || !world) return
    const facesScene = document.querySelector<HTMLElement>('.faces__scene')
    const panels = () => ScrollTrigger.getById(PANEL_TRIGGER_ID)
    const handoffStart = () => (panels()?.start ?? 0) + panelTiming.facesDistance
    const journeyStart = () => handoffStart() + innerHeight * HANDOFF_VIEWPORTS
    const nodes = JOURNEY_NODES.map(n => world.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!)
    const drawn = world.querySelector<SVGPathElement>('.journey__path-drawn')!
    const accent = world.querySelector<SVGPathElement>('.journey__path-accent')!
    const paths = world.querySelectorAll<SVGPathElement>('.journey__path path')
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    /*
     * 경로 기하. card 안의 anchor element를 실제로 재서 만든다.
     * length / stops는 화면 px이다 — non-scaling-stroke에서는 dash가 화면 px로 적용되기 때문이다.
     *   stops[i] = 경로 시작부터 i번째 card anchor까지의 거리
     * refresh(초기 mount, 폰트 로드, resize)마다 다시 재고, scroll 중에는 다시 재지 않는다.
     */
    const geom = { length: 0, stops: [0] as number[] }
    /*
     * 길이 어디까지 왔는지를 px가 아니라 anchor 순번(소수)으로 둔다. 예: 2.5 = 2번째와 3번째 anchor 사이 절반.
     * timeline은 이 값만 움직이고, 화면 px는 그때그때 현재 geom으로 바꾼다 —
     * resize 뒤 refresh가 이전 상태를 되돌려 놓아도 이전 경로 길이가 남지 않는다.
     */
    const pathState = { reached: 0 }
    const applyPath = () => {
      const last = geom.stops.length - 1
      const i = Math.min(Math.floor(pathState.reached), last)
      const px = i >= last ? geom.stops[last] : geom.stops[i] + (geom.stops[i + 1] - geom.stops[i]) * (pathState.reached - i)
      drawn.style.strokeDashoffset = `${geom.length - px}px`
      accent.style.strokeDashoffset = `${ACCENT_LENGTH - px}px`
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
      geom.length = drawn.getTotalLength() * scale
      geom.stops = points.map((_, i) => {
        if (i === 0) return 0
        probe.setAttribute('d', buildSmoothPath(points.slice(0, i + 1)))
        return probe.getTotalLength() * scale
      })
      // 간격을 길이보다 조금 길게 둬서, 아무것도 그려지지 않았을 때 경로 끝에 길이 0짜리 dash(round cap 점)가 남지 않게 한다.
      drawn.style.strokeDasharray = `${geom.length}px ${geom.length + 4}px`
      accent.style.strokeDasharray = `${ACCENT_LENGTH}px ${geom.length + ACCENT_LENGTH}px`
      applyPath()
    }

    rebuildPath()
    /*
     * 'revert'는 refresh 도중 pin이 풀린 직후, 각 trigger가 다시 계산되기 전에 온다.
     * ('refreshInit'은 pin이 이전 폭을 붙들고 있을 때라 resize 뒤의 좌표를 잴 수 없다.)
     */
    ScrollTrigger.addEventListener('revert', rebuildPath)

    const ctx = gsap.context(() => {
      const unit = () => stage.clientWidth / 1920
      const cameraY = (i: number) => {
        const h = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
        return h + (stage.clientHeight - h) / 2 - JOURNEY_NODES[i].position.y * unit()
      }
      gsap.set(world, { y: () => cameraY(0) })
      gsap.set(nodes, { '--node-in': 0, '--node-out': 0 })
      gsap.set(nodes[0], { '--node-in': 1 })

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

      const tl = gsap.timeline({ scrollTrigger: {
        id: 'journey-master', trigger: section, start: journeyStart,
        end: () => journeyStart() + innerHeight * JOURNEY_VIEWPORTS,
        scrub: 0.5, invalidateOnRefresh: true, refreshPriority: -3,
      } })
      tl.set({}, {}, 1)
      JOURNEY_NODES.forEach((n, i) => tl.addLabel(n.label, LABELS[i]))
      for (let i = 1; i < nodes.length; i++) {
        const at = LABELS[i], prev = LABELS[i - 1]
        const duration = (at - prev) * TRAVEL, start = at - duration
        tl.to(world, { y: () => cameraY(i), ease: 'power1.inOut', duration }, start)
        // 지나온 길과 끝 조각은 card와 정확히 같은 timeline 위치에 i번째 anchor에 닿는다.
        tl.to(pathState, { reached: i, ease: 'power1.inOut', duration, onUpdate: applyPath }, start)
        tl.to(nodes[i], { '--node-in': 1, duration: 0.04, ease: 'none' }, at - 0.04)
        tl.to(nodes[i - 1], { '--node-out': 1, duration: 0.04, ease: 'none' }, start)
      }
    })
    let live = true
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts.ready.then(() => { if (live) ScrollTrigger.refresh() })
    return () => {
      live = false
      cancelAnimationFrame(refreshId)
      ScrollTrigger.removeEventListener('revert', rebuildPath)
      ctx.revert()
      for (const p of [drawn, accent]) {
        p.style.removeProperty('stroke-dasharray')
        p.style.removeProperty('stroke-dashoffset')
      }
      panelTiming.handoff = 0
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
