import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_CLOCK, JOURNEY_NODES } from './journeyData'
import { createJourneyFlow, journeyFlowVisibility, pathEntryDistance, pathExitDistance } from './journeyFlow'
import { journeySCurve, pathDistanceAtY } from './journeyPath'
import { HANDOFF_VIEWPORTS, JOURNEY_VIEWPORTS, PANEL_TRIGGER_ID, panelTiming } from '../../hooks/panelTiming'
import { journeyAmbientAt } from '../../hooks/journeyLighting'

gsap.registerPlugin(ScrollTrigger)

/** Keep the existing scroll extent. Flow easing is applied to line + clock together. */
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
    const flow = createJourneyFlow(world, active)
    const geom = {
      length: 0,
      marks: [LINE_FROM] as number[],
      camera: (() => 0) as (p: number) => number,
    }
    /** 화면에 그리는 진행률(display)과 scroll 진행률(target). */
    const journey = { p: 0, target: 0 }
    let handoffComplete = false
    const written = new Map<HTMLElement, string>()
    let lastY = ''
    let lastAmbient = ''
    // Camera and Contact keep the original master timeline. Cards follow the line arrival.
    const render = () => {
      const p = journey.p
      const m = geom.marks
      if (!geom.length || m.length !== nodes.length) return

      const reveal = journeyFlowVisibility(p, journey.target, handoffComplete)
      const journeyFlowProgress = flow.render(clamp01((p - LINE_FROM) / (LINE_TO - LINE_FROM)), false, reveal) ?? 0
      const flowP = LINE_FROM + journeyFlowProgress * (LINE_TO - LINE_FROM)

      // Contact 쪽 빛. 화면에 그리는 진행률을 그대로 따라가므로 빛 / camera와 같은 frame에 움직인다.
      const ambient = journeyAmbientAt(p).toFixed(4)
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
        const nodeIn = i === 0 ? 1 : clamp01((flowP - (m[i] - NODE_RAMP)) / NODE_RAMP)
        const leave = i + 1 < m.length ? m[i] + (m[i + 1] - m[i]) * NODE_LEAVE : Infinity
        const nodeOut = clamp01((flowP - leave) / NODE_RAMP)
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

    const rebuildPath = () => {
      const scale = world.getBoundingClientRect().width / 1920
      if (!scale) return
      const boxes = measureBoxes(scale)
      const d = buildSmoothPath(boxes.map(anchorOf))
      paths.forEach(p => p.setAttribute('d', d))
      const originalTotal = active.getTotalLength()
      // card가 켜지는 자리 = 빛이 그 card 테두리에 닿는 순간(경로 길이에 비례).
      const originalHits = borderHits(boxes, originalTotal)
      const originalMarks = originalHits.map((at, i) =>
        i === 0 ? LINE_FROM : LINE_FROM + (at / originalTotal) * (LINE_TO - LINE_FROM))
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
      const unit = stage.clientWidth / 1920
      const cameraAt = JOURNEY_NODES.map(n => header + (stage.clientHeight - header) / 2 - n.position.y * unit)
      geom.camera = monotoneCubic(
        [0, ...originalMarks, 1],
        [cameraAt[0], ...cameraAt, cameraAt[cameraAt.length - 1]],
      )
      // Include the intro's existing 28px entry travel so its surface cannot cross
      // the initial clock while the shared scene fades in. No new clock/layer.
      const radius = parseFloat(getComputedStyle(marker!).getPropertyValue('--marker-size')) / 2
      const clearance = (radius + 4) / scale
      const route = journeySCurve(boxes, clearance)
      nodes.forEach((node, i) => node.style.setProperty('--node-shift-x', `${route.offsets[i] * scale}px`))
      paths.forEach(path => path.setAttribute('d', route.d))
      const total = active.getTotalLength()
      const L = total * scale
      geom.length = L
      const intro = { ...boxes[0], y: boxes[0].y + 14 / scale, hh: boxes[0].hh + 14 / scale }
      const from = pathExitDistance(active, intro, clearance) / total
      const to = pathEntryDistance(active, boxes[boxes.length - 1], clearance) / total
      const hits = boxes.map((box, i) => i === 0 ? from * total
        : i === boxes.length - 1 ? to * total : pathDistanceAtY(active, box.y))
      geom.marks = hits.map(at => LINE_FROM + at / total * (LINE_TO - LINE_FROM))
      const milestones = JOURNEY_CLOCK.map(stop => ({
        progress: stop.node === 0 ? from : hits[stop.node] / total,
        minutes: stop.minutes,
      }))
      flow.measure(milestones, { from, to })
      written.clear()
      lastY = ''
      lastAmbient = ''
      if (import.meta.env.DEV) {
        stage.dataset.line = JSON.stringify({ length: +L.toFixed(1), marks: geom.marks.map(v => +v.toFixed(4)), milestones, range: { from, to }, offsets: route.offsets.map(x => x * scale) })
      }
      render()
    }

    rebuildPath()
    /*
     * 'revert'는 refresh 도중 pin이 풀린 직후, 각 trigger가 다시 계산되기 전에 온다.
     * ('refreshInit'은 pin이 이전 폭을 붙들고 있을 때라 resize 뒤의 좌표를 잴 수 없다.)
     */
    ScrollTrigger.addEventListener('revert', rebuildPath)
    // Pin restoration can round the SVG viewport differently from its unpinned width.
    // Cache the final CTM after refresh, while keeping card/path measurement on revert.
    const refreshFlow = () => { flow.measure(); render() }
    ScrollTrigger.addEventListener('refresh', refreshFlow)
    // Container units can settle one layout after the pin is applied. Observe the SVG
    // viewport itself; this never runs from the scroll renderer or measures card boxes.
    const viewportObserver = new ResizeObserver(refreshFlow)
    viewportObserver.observe(active.ownerSVGElement!)

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
       *   경로 / 시계  handoff 전체에서 숨김. 실제 도착 + master 시작 후에만 함께 드러난다.
       * FACES와 Journey는 같은 pin 하나 안에 있다(nested pin 없음). 이 구간에서 pin이 풀리지 않으므로
       * 풀리는 순간의 1 frame jump가 생길 자리가 없다. pin은 Journey가 끝난 뒤 Contact에서만 풀린다.
       */
      /*
       * FACES의 Crown 시간(13 : 30)은 FACES 동안만이다. Journey가 올라오기 시작하면 걷히고(Journey는 line 위의
       * Analog Clock 하나가 13:40 -> 17:00의 흐름을 이어받는다), 되감아 FACES로 돌아가면 다시 보인다. 두 시계가 동시에 다른 시간을 말하지 않는다.
       */
      const crownEl = document.querySelector<HTMLElement>('.watch--stage .watch__crown')
      const syncCrownTime = (progress: number) => crownEl?.classList.toggle('watch__crown--time-hidden', progress > 0.3)
      let syncHandoff = () => {}
      const handoff = gsap.timeline({ scrollTrigger: {
        id: 'faces-journey-handoff', trigger: section, start: handoffStart, end: journeyStart,
        scrub: 1.15, invalidateOnRefresh: true, refreshPriority: -2,
        onUpdate: self => { panelTiming.handoff = self.progress; syncCrownTime(self.progress) },
        onRefresh: self => { panelTiming.handoff = self.progress; syncCrownTime(self.progress); syncHandoff() },
      } })
      handoff.fromTo(section, { yPercent: 100, y: 0 }, { yPercent: 0, ease: softLanding, duration: 0.80 }, 0.08)
      if (facesScene) handoff.fromTo(facesScene, { scale: 1, opacity: 1 }, { scale: 0.95, opacity: 0.35, ease: 'none', duration: 0.75 }, 0.15)
      handoff.fromTo(facesBlur, { px: 0 }, { px: 1.5, ease: 'none', duration: 0.75, onUpdate: writeBlur, immediateRender: false }, 0.15)
      handoff.to('.faces__meta', { opacity: 0, duration: 0.15, ease: 'none' }, 0)
      handoff.fromTo('.journey__intro-entry', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.38, ease: 'none' }, 0.62)
      handoff.set({}, {}, 1)
      // Raw scroll can cross the master start before the 1.15s scrub has settled.
      // Listen to the actual animation too, so a stationary scroll can reveal it.
      syncHandoff = () => {
        handoffComplete = handoff.progress() >= 1 - 1e-6
        render()
      }
      handoff.eventCallback('onUpdate', syncHandoff)
      syncHandoff()

      /*
       * Journey 전체가 진행률 하나다. card마다 tween을 나누지 않는다 —
       * 나누면 구간마다 가속 / 감속이 생겨 빛이 anchor에서 멈췄다 다시 끌려가는 것처럼 보인다.
       * scroll 진행률은 그대로 받고(scrub 없음), 화면은 SMOOTHING만큼만 늦게 따라간다.
       */
      ScrollTrigger.create({
        id: 'journey-master', trigger: section, start: journeyStart,
        end: () => journeyStart() + innerHeight * JOURNEY_VIEWPORTS,
        invalidateOnRefresh: true, refreshPriority: -3,
        onUpdate: self => {
          setTarget(self.progress)
          // Close the visibility gate on the exact reverse boundary, before smoothing.
          if (self.progress === 0) render()
        },
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
      ScrollTrigger.removeEventListener('refresh', refreshFlow)
      viewportObserver.disconnect()
      ctx.revert()
      facesCanvas?.style.removeProperty('filter')
      stage.style.removeProperty('--contact-ambient')
      flow.clear()
      for (const node of nodes) {
        node.style.removeProperty('--node-in')
        node.style.removeProperty('--node-out')
        node.style.removeProperty('--node-shift-x')
      }
      gsap.set(world, { clearProps: 'transform' })
      if (import.meta.env.DEV) delete stage.dataset.line
      panelTiming.handoff = 0
      document.querySelector('.watch--stage .watch__crown')?.classList.remove('watch__crown--time-hidden')
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
