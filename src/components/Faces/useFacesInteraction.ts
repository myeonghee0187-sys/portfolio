import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FACE_PROJECTS } from './facesData'
import { FACE_ASPECT } from './facePainter'
import FacesScene, { type FacesDisplayRect } from './facesScene'

gsap.registerPlugin(ScrollTrigger)

/** plane 폭 = stage 폭의 55%. 1920에서 약 1056px. */
const SLIDE_WIDTH_RATIO = 0.55
const SLIDE_MIN = 620
const SLIDE_MAX = 1060

/** plane 중심 간격 = plane 폭의 1.2배(plane 사이에 폭의 20%만큼 숨 쉴 공간). */
const SLIDE_STEP_RATIO = 1.2

/** 한 바퀴를 도는 세로 scroll 길이. 최소 2.8화면, 가로 한 바퀴 거리의 0.9배. */
const MIN_PIN_VIEWPORTS = 2.8
const LOOP_TO_SCROLL = 0.9

/**
 * current가 target을 따라잡는 비율(60fps 한 프레임). 1:1로 붙지 않고 살짝 늦게 따라오는 물성.
 * 멈추면 약 0.5초 안에 95%가 따라붙고 그 뒤로 길게 미끄러지지 않는다.
 */
const EASE = 0.09

/** drag 1px당 rail 이동(px). 손보다 조금 빠르게 넘어간다. */
const DRAG_SPEED = 1.8

/**
 * 속도(target - current, stage 폭 기준)에 곱하는 plane bend(px)와 그 한계.
 * 천천히 scroll하면 1px 안팎(평평), wheel 한 칸이면 10px 정도, 빠르게 drag할 때만 한계까지 휜다.
 */
const BEND_STRENGTH = 120
const BEND_MAX = 32

/** 빠르게 움직일 때만 생기는 RGB 분리(px). 한계 1px. glitch처럼 보이지 않게 아주 작게 둔다. */
const RGB_STRENGTH = 4
const RGB_MAX = 1

/** display 모양(shader)이 Watch case 구멍보다 이만큼(px) 넓다. 구멍 가장자리까지 원본 그대로 보이게. */
const DISPLAY_BLEED = 6

/** active가 바뀌려면 새 후보가 지금 active보다 plane 간격의 이 비율만큼 더 가까워야 한다. */
const ACTIVE_HYSTERESIS = 0.04

/** 이만큼(px) 움직이기 전까지는 drag로 보지 않는다. 나중에 project 링크 클릭을 살려 두기 위해서다. */
const DRAG_THRESHOLD = 4

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

type FacesInteractionOptions = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** active project가 실제로 바뀔 때만 불린다(metadata 전용). scroll 프레임마다 부르지 않는다. */
  onActiveChange: (index: number) => void
}

/**
 * FACES slider.
 *
 * 세로 scroll과 drag의 역할이 다르다.
 *   세로 scroll  = page 진행. pin 동안 project 4개를 정확히 한 바퀴(LOOP_WIDTH) 돈 뒤 pin이 풀린다.
 *   drag         = 자유 탐색. 제한 없이 몇 바퀴든 돈다. document scroll은 건드리지 않는다.
 *
 *   scrollOffset = scrollProgress * LOOP_WIDTH        (0 -> LOOP_WIDTH, 한 번만)
 *   dragOffset   = drag로 더한 거리                     (+/- 무한)
 *   target       = scrollOffset + dragOffset
 *   current     += (target - current) * EASE          (살짝 늦게 따라오는 물성)
 *   plane x      = wrap(i * step - current)             (rail은 항상 끝이 없다)
 *
 * dragOffset이 따로 남아 있으므로 drag 뒤에 scroll해도 rail이 원래 자리로 튀지 않고,
 * scroll 쪽의 변화량만 더해진다. drag는 ScrollTrigger의 start / end를 바꾸지 않는다.
 */
export default function useFacesInteraction({
  enabled,
  sectionRef,
  stageRef,
  canvasRef,
  onActiveChange,
}: FacesInteractionOptions) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!enabled || !section || !stage || !canvas) return

    const scene = new FacesScene(canvas)

    // Hero / About에서 오는 같은 Watch. 그 display가 이 canvas를 들여다보는 창이다.
    const screen = document.querySelector<HTMLElement>('.watch--stage .watch__screen')

    /* ---------- 상태 ---------- */

    let scrollOffset = 0
    let dragOffset = 0
    let current = 0
    const target = () => scrollOffset + dragOffset

    /* ---------- 측정 (refresh 때만) ---------- */

    let stageWidth = 1
    let loopWidth = 1

    const measure = () => {
      const rect = stage.getBoundingClientRect()
      const oldLoop = loopWidth
      stageWidth = rect.width
      const slideWidth = clamp(rect.width * SLIDE_WIDTH_RATIO, SLIDE_MIN, SLIDE_MAX)
      const step = slideWidth * SLIDE_STEP_RATIO
      scene.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2), slideWidth, slideWidth / FACE_ASPECT, step)
      loopWidth = scene.loopWidth
      // 화면 크기가 바뀌어도 drag로 옮겨 둔 위상은 그대로 둔다.
      if (oldLoop > 1 && oldLoop !== loopWidth) {
        const ratio = loopWidth / oldLoop
        dragOffset *= ratio
        current *= ratio
      }
    }

    /** Watch display(구멍)의 자리. canvas 좌표(CSS px). pin 전에는 stage가 움직이므로 매 프레임 잰다. */
    const displayRect = (): FacesDisplayRect | null => {
      if (!screen) return null
      const s = screen.getBoundingClientRect()
      const c = canvas.getBoundingClientRect()
      if (s.width === 0) return null
      return {
        cx: s.left + s.width / 2 - c.left,
        cy: s.top + s.height / 2 - c.top,
        hw: s.width / 2 + DISPLAY_BLEED,
        hh: s.height / 2 + DISPLAY_BLEED,
        // .watch__screen의 모서리(Watch 좌표계 98 / 폭 488)를 실제 크기로.
        radius: (s.width * 98) / 488 + DISPLAY_BLEED,
      }
    }

    let active = -1
    const detectActive = (position: number) => {
      const step = scene.step
      const distances = FACE_PROJECTS.map((_, i) => Math.abs(scene.planeX(i, position)))
      let nearest = 0
      for (let i = 1; i < distances.length; i++) if (distances[i] < distances[nearest]) nearest = i
      // 경계에서 깜빡이지 않도록, 새 후보가 확실히 더 가까워졌을 때만 바꾼다. clone이어도 project id는 같다.
      if (active < 0 || (nearest !== active && distances[nearest] + step * ACTIVE_HYSTERESIS < distances[active])) {
        if (nearest !== active) onActiveChange(nearest)
        active = nearest
      }
    }

    /* ---------- 그리기 루프 ---------- */

    // FACES가 화면 근처에 있을 때만 돈다. 값이 그대로면 GPU에 다시 그리지 않는다.
    let rafId = 0
    let lastTime = 0
    let lastKey = ''

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame)
      const frames = lastTime ? Math.min(4, (now - lastTime) / (1000 / 60)) : 1
      lastTime = now

      const t = target()
      current += (t - current) * (1 - (1 - EASE) ** frames)
      if (Math.abs(t - current) < 0.05) current = t

      // 속도 = 아직 따라잡지 못한 거리. 멈추면 0이 되어 plane이 평평해진다.
      const velocity = (t - current) / stageWidth
      const bend = clamp(velocity * BEND_STRENGTH, -BEND_MAX, BEND_MAX)
      const rgb = clamp(velocity * RGB_STRENGTH, -RGB_MAX, RGB_MAX)
      const display = displayRect()

      const key = `${current.toFixed(2)}|${bend.toFixed(2)}|${display ? `${display.cx.toFixed(1)},${display.cy.toFixed(1)},${display.hw.toFixed(1)}` : '-'}`
      if (key === lastKey) return
      lastKey = key
      scene.render({ position: current, bend, rgb, display })
      detectActive(current)
    }

    const start = () => {
      if (!rafId) {
        lastTime = 0
        rafId = requestAnimationFrame(frame)
      }
    }
    const stop = () => {
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    /* ---------- 세로 scroll = page 진행(정확히 한 바퀴) ---------- */

    let trigger: ScrollTrigger | undefined

    const ctx = gsap.context(() => {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => {
          measure()
          return `+=${Math.max(window.innerHeight * MIN_PIN_VIEWPORTS, loopWidth * LOOP_TO_SCROLL)}`
        },
        pin: stage,
        pinSpacing: true, // pin-spacer는 높이만 담당한다. 따로 스타일링하지 않는다.
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // About의 pin spacer가 먼저 자리를 잡은 뒤에 계산되어야 한다.
        refreshPriority: -1,
        // progress 0 -> 1이 정확히 0 -> LOOP_WIDTH. drag와 상관없이 page scroll에는 시작과 끝이 있다.
        onUpdate: (self) => {
          scrollOffset = self.progress * loopWidth
        },
        onRefresh: (self) => {
          scrollOffset = self.progress * loopWidth
          current = target()
          lastKey = ''
        },
      })

      // FACES가 화면에 들어오기 직전부터 나갈 때까지만 그린다(About 이전에는 GPU를 쓰지 않는다).
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        refreshPriority: -1,
        onToggle: (self) => (self.isActive ? start() : stop()),
        onRefresh: (self) => (self.isActive ? start() : stop()),
      })
    })

    measure()
    current = target()

    // 웹폰트가 뜬 뒤 placeholder 글자를 다시 그린다.
    document.fonts?.load('40px Anton').then(() => {
      scene.repaint()
      lastKey = ''
    })

    /* ---------- drag = 자유 탐색(무한) ---------- */

    let pointerId = -1
    let lastX = 0
    let downX = 0
    let dragging = false

    const onPointerDown = (event: PointerEvent) => {
      // pin 중에만. 한 바퀴를 몇 번 돌아도 document scroll은 그대로다.
      if (!event.isPrimary || event.button !== 0 || !trigger?.isActive) return
      pointerId = event.pointerId
      downX = lastX = event.clientX
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (!dragging) {
        if (Math.abs(event.clientX - downX) < DRAG_THRESHOLD) return
        dragging = true
        stage.setPointerCapture(pointerId)
        stage.classList.add('is-dragging')
      }
      // 손을 왼쪽으로 끌면 rail도 왼쪽으로(= 다음 project). target만 바꾸고 current는 루프가 따라간다.
      dragOffset -= (event.clientX - lastX) * DRAG_SPEED
      lastX = event.clientX
    }

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = -1
      if (!dragging) return
      // 놓으면 target은 그 자리에 머물고, current가 짧게 따라잡으며 선다. 관성은 없다.
      dragging = false
      stage.classList.remove('is-dragging')
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    }

    // 이미지 / 텍스트의 기본 drag가 pointer drag를 가로채지 않게 한다.
    const onDragStart = (event: DragEvent) => event.preventDefault()

    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', endDrag)
    stage.addEventListener('pointercancel', endDrag)
    stage.addEventListener('dragstart', onDragStart)

    /*
     * About의 pin이 먼저 계산된 뒤 한 번 더 잰다(About 쪽 effect는 이 effect보다 늦게 돈다).
     */
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())

    // 개발 중 QA용 읽기 전용 상태(배포 build에서는 빠진다).
    const debug = window as unknown as { __faces?: () => Record<string, number> }
    if (import.meta.env.DEV) {
      debug.__faces = () => ({
        scrollOffset,
        dragOffset,
        current,
        target: target(),
        loopWidth,
        step: scene.step,
        slideWidth: scene.slideWidth,
        slideHeight: scene.slideHeight,
        pinStart: trigger?.start ?? 0,
        pinEnd: trigger?.end ?? 0,
        progress: trigger?.progress ?? 0,
        active,
      })
    }

    return () => {
      if (import.meta.env.DEV) delete debug.__faces
      cancelAnimationFrame(refreshId)
      stop()
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endDrag)
      stage.removeEventListener('pointercancel', endDrag)
      stage.removeEventListener('dragstart', onDragStart)
      stage.classList.remove('is-dragging')
      ctx.revert()
      scene.dispose()
    }
  }, [enabled, sectionRef, stageRef, canvasRef, onActiveChange])
}
