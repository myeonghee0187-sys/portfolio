import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_NODES } from './journeyData'
import { HANDOFF_VIEWPORTS, JOURNEY_VIEWPORTS, PANEL_TRIGGER_ID, panelTiming } from '../../hooks/panelTiming'

gsap.registerPlugin(ScrollTrigger)
const LABELS = [0, 0.15, 0.29, 0.43, 0.57, 0.71, 0.88]
const TRAVEL = 0.65

type Options = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
}

/** One continuous geometry, routed along the outside edges of the preserved cards. */
function makePath() {
  const anchors = JOURNEY_NODES.map((n, i) => {
    const side = n.position.x < 960 ? 1 : -1
    if (i === 0) return { x: n.position.x, y: n.height / 2 - 1, side: 0 }
    if (i === JOURNEY_NODES.length - 1) return { x: n.position.x, y: n.position.y - n.height / 2 + 1, side: 0 }
    return { x: n.position.x + side * (n.width * 0.45 - 1), y: n.position.y, side }
  })
  let d = `M ${anchors[0].x} ${anchors[0].y}`
  const segments: string[] = []
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i]
    const bend = (b.y - a.y) * 0.42
    const curve = `C ${a.x + a.side * 180} ${a.y + bend}, ${b.x + b.side * 180} ${b.y - bend}, ${b.x} ${b.y}`
    d += ' ' + curve
    segments.push(`M ${a.x} ${a.y} ${curve}`)
  }
  return { d, segments }
}

export default function useJourneyInteraction({ enabled, sectionRef, stageRef, worldRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, world = worldRef.current
    if (!enabled || !section || !stage || !world) return
    const facesScene = document.querySelector<HTMLElement>('.faces__scene')
    const panels = () => ScrollTrigger.getById(PANEL_TRIGGER_ID)
    const handoffStart = () => (panels()?.start ?? 0) + panelTiming.facesDistance
    const journeyStart = () => handoffStart() + innerHeight * HANDOFF_VIEWPORTS
    const ctx = gsap.context(() => {
      const unit = () => stage.clientWidth / 1920
      const cameraY = (i: number) => {
        const h = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
        return h + (stage.clientHeight - h) / 2 - JOURNEY_NODES[i].position.y * unit()
      }
      const drawn = world.querySelector<SVGPathElement>('.journey__path-drawn')!
      const accent = world.querySelector<SVGPathElement>('.journey__path-accent')!
      const paths = world.querySelectorAll<SVGPathElement>('.journey__path path')
      const { d, segments } = makePath()
      paths.forEach(p => p.setAttribute('d', d))
      const length = drawn.getTotalLength()
      // Measure the cumulative distance to each anchor, not evenly spaced fractions.
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const stops = [0]
      for (const segment of segments) {
        probe.setAttribute('d', segment)
        stops.push(stops[stops.length - 1] + probe.getTotalLength())
      }
      gsap.set(world, { y: () => cameraY(0) })
      const nodes = JOURNEY_NODES.map(n => world.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!)
      gsap.set(nodes, { '--node-in': 0, '--node-out': 0 })
      gsap.set(nodes[0], { '--node-in': 1 })
      gsap.set(drawn, { strokeDasharray: length, strokeDashoffset: length })
      const accentLength = 160
      gsap.set(accent, { strokeDasharray: `${accentLength} ${length + accentLength}`, strokeDashoffset: accentLength })

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
        // The active stroke and card arrive at the exact same timeline position.
        tl.to(drawn, { strokeDashoffset: length - stops[i], ease: 'power1.inOut', duration }, start)
        tl.to(accent, { strokeDashoffset: accentLength - stops[i], ease: 'power1.inOut', duration }, start)
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
      ctx.revert()
      panelTiming.handoff = 0
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
