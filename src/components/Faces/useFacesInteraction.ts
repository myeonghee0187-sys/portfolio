import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FACE_PROJECTS } from './facesData'
import FacesScene, { type FacesBox, type FacesWatchGeometry } from './facesScene'

gsap.registerPlugin(ScrollTrigger)

/** project 영상의 공통 높이 = stage 높이의 62%. 폭은 영상마다 원본 비율로 정해진다. */
const PLANE_HEIGHT_RATIO = 0.62

/** project 사이 간격 = stage 폭의 8%. 한 장의 긴 웹페이지도, 떨어진 카드 갤러리도 아닌 정도. */
const GAP_RATIO = 0.08

/** 한 바퀴를 도는 세로 scroll 길이. 최소 2.8화면, 가로 한 바퀴 거리의 0.9배. */
const MIN_PIN_VIEWPORTS = 2.8
const LOOP_TO_SCROLL = 0.9

/**
 * current가 target을 따라잡는 비율(60fps 한 프레임). 1:1로 붙지 않고 살짝 늦게 따라오는 물성.
 * 멈추면 약 0.6초 안에 95%가 따라붙고 그 뒤로 길게 미끄러지지 않는다.
 */
const EASE = 0.075

/** drag 1px당 rail 이동(px). 손보다 조금 빠르게 넘어간다. */
const DRAG_SPEED = 1.8

/**
 * 속도(target - current, stage 폭 기준)에 곱하는 plane bend(px)와 그 한계.
 * 천천히 scroll하면 1px 안팎(평평), wheel 한 칸이면 10px 정도, 빠르게 drag할 때만 한계까지 휜다.
 */
const BEND_STRENGTH = 120
const BEND_MAX = 32

/** 속도(stage 폭 기준)를 0~1 세기로. wheel 한 칸이 약 0.35, 빠른 drag가 1이다. */
const SPEED_GAIN = 4

/** 성능을 위해 pixel ratio는 1.5를 넘기지 않는다(Retina 2~3배로 그리지 않는다). */
const MAX_PIXEL_RATIO = 1.5

/** 화면 밖으로 이만큼(px) 더 멀어진 영상은 재생을 멈춘다. */
const PLAY_MARGIN = 240

/*
 * WebGL로 그리는 Watch의 모양. Watch 좌표계(600 x 760).
 *   CASE     case 외곽 실루엣(watch_face.png의 투명하지 않은 영역). 모서리는 원으로 맞춘 근사.
 *   DISPLAY  display. rim 두께는 PNG(좌 56 / 우 54 / 위 62 / 아래 46)에서 두 번 얇게 해
 *            좌 40.5 / 우 39.3 / 위 44.6 / 아래 33.5다. 같은 Watch 크기에서 project 화면이 frame보다 크게 읽힌다.
 *            DOM case의 구멍(WatchAssembly.css)보다 넓어서, About -> FACES에서 steel case가 녹는 동안
 *            rim이 PNG 두께에서 이 두께로 얇아진다.
 */
const CASE = { x0: 2.3, y0: 2.3, x1: 596.1, y1: 756.1, r: 152 }
const DISPLAY = { x0: 42.8, y0: 46.9, x1: 556.8, y1: 722.6, r: 112 }

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
 *   plane x      = wrap(center_i - current)            (rail은 항상 끝이 없다)
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

    /* ---------- 상태 ---------- */

    let scrollOffset = 0
    let dragOffset = 0
    let current = 0
    const target = () => scrollOffset + dragOffset

    let stageWidth = 1
    let loopWidth = 1
    let trigger: ScrollTrigger | undefined

    /* ---------- 측정 (refresh 때만) ---------- */

    const measure = () => {
      const rect = stage.getBoundingClientRect()
      const oldLoop = loopWidth
      stageWidth = rect.width
      scene.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
      scene.layout(rect.height * PLANE_HEIGHT_RATIO, rect.width * GAP_RATIO)
      loopWidth = scene.loopWidth
      lastKey = ''
      // 화면 크기(또는 영상 비율)가 바뀌어도 drag로 옮겨 둔 위상은 그대로 둔다.
      if (oldLoop > 1 && oldLoop !== loopWidth) {
        const ratio = loopWidth / oldLoop
        dragOffset *= ratio
        current *= ratio
      }
    }

    // 영상의 실제 비율이 미리 둔 값과 다르면 다시 재고, 한 바퀴 거리가 바뀌었으니 pin 길이도 다시 계산한다.
    const scene = new FacesScene(canvas, () => ScrollTrigger.refresh())

    /*
     * WebGL Watch의 자리. DOM Watch(.watch--stage)의 실제 rect에서 매 프레임 잰다 —
     * FACES pin 중에는 고정이지만, 그 전에는 stage가 아래에서 올라오므로 canvas 기준 위치가 바뀐다.
     */
    const watchEl = document.querySelector<HTMLElement>('.watch--stage')
    const frontWheel = watchEl?.querySelector<HTMLElement>('.watch__crown-front-wheel') ?? null
    const watchGeometry = (): FacesWatchGeometry | null => {
      if (!watchEl) return null
      const w = watchEl.getBoundingClientRect()
      if (w.width === 0) return null
      const c = canvas.getBoundingClientRect()
      const unit = w.width / 600
      const box = (b: typeof CASE): FacesBox => ({
        cx: w.left - c.left + ((b.x0 + b.x1) / 2) * unit,
        cy: w.top - c.top + ((b.y0 + b.y1) / 2) * unit,
        hx: ((b.x1 - b.x0) / 2) * unit,
        hy: ((b.y1 - b.y0) / 2) * unit,
        r: b.r * unit,
      })
      return { outer: box(CASE), display: box(DISPLAY), unit }
    }

    let active = -1
    const detectActive = (position: number) => {
      const distances = FACE_PROJECTS.map((_, i) => Math.abs(scene.planeX(i, position)))
      let nearest = 0
      for (let i = 1; i < distances.length; i++) if (distances[i] < distances[nearest]) nearest = i
      // 경계에서 깜빡이지 않도록, 새 후보가 확실히 더 가까워졌을 때만 바꾼다. 두 번째 instance여도 project는 같다.
      const margin = (scene.planeHeight + scene.gap) * ACTIVE_HYSTERESIS
      if (active < 0 || (nearest !== active && distances[nearest] + margin < distances[active])) {
        if (nearest !== active) onActiveChange(nearest)
        active = nearest
      }
    }

    /* ---------- 영상 재생: 화면 근처에 있는 것만 ---------- */

    let running = false
    const updatePlayback = () => {
      scene.videos.forEach((video, i) => {
        const shouldPlay = running && scene.isNearView(i, current, PLAY_MARGIN)
        if (shouldPlay && video.paused) {
          if (video.preload !== 'auto') video.preload = 'auto'
          video.play().catch(() => {})
        } else if (!shouldPlay && !video.paused) {
          video.pause()
        }
      })
    }

    /* ---------- 그리기 루프 ---------- */

    /*
     * 다시 그릴 이유가 있을 때만 그린다: rail이 움직였거나, Watch 자리가 바뀌었거나,
     * 재생 중인 영상에 새 프레임이 나왔을 때. 영상은 24~30fps라 60Hz 화면에서 그리는 횟수가 약 절반이 된다.
     * requestVideoFrameCallback이 없는 브라우저에서는 매 프레임 그린다.
     */
    const canWatchFrames = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
    let videoDirty = true
    const frameHandles: number[] = []
    if (canWatchFrames) {
      scene.videos.forEach((video, i) => {
        const onFrame = () => {
          videoDirty = true
          frameHandles[i] = video.requestVideoFrameCallback(onFrame)
        }
        frameHandles[i] = video.requestVideoFrameCallback(onFrame)
      })
    }

    // FACES가 화면 근처에 있을 때만 돈다.
    let rafId = 0
    let lastTime = 0
    let lastWheel = ''
    let lastKey = ''
    let frameCount = 0

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame)
      const frames = lastTime ? Math.min(4, (now - lastTime) / (1000 / 60)) : 1
      lastTime = now

      const t = target()
      current += (t - current) * (1 - (1 - EASE) ** frames)
      if (Math.abs(t - current) < 0.05) current = t

      // 속도 = 아직 따라잡지 못한 거리. 멈추면 0이 되어 plane은 평평해지고 Watch 굴절도 기본값으로 돌아온다.
      const velocity = (t - current) / stageWidth
      const speed = clamp(Math.abs(velocity) * SPEED_GAIN, 0, 1)
      const bend = clamp(velocity * BEND_STRENGTH, -BEND_MAX, BEND_MAX)
      const watch = watchGeometry()

      const key = watch
        ? `${current.toFixed(2)} ${watch.outer.cx.toFixed(1)} ${watch.outer.cy.toFixed(1)} ${watch.unit.toFixed(4)}`
        : `${current.toFixed(2)}`
      if (key !== lastKey || videoDirty || !canWatchFrames) {
        scene.render({ position: current, bend, velocity, speed, watch })
        lastKey = key
        videoDirty = false
      }
      detectActive(current)

      // FACES Crown(정면)의 wheel은 slider 위치를 따라 돈다. 한 바퀴(project 4개) = 360°.
      const wheel = `${((current / loopWidth) * 360).toFixed(2)}deg`
      if (frontWheel && wheel !== lastWheel) {
        frontWheel.style.rotate = wheel
        lastWheel = wheel
      }

      // 재생 대상은 몇 프레임마다 한 번만 다시 본다.
      if (++frameCount % 10 === 0) updatePlayback()
    }

    const start = () => {
      if (running) return
      running = true
      lastTime = 0
      rafId = requestAnimationFrame(frame)
      updatePlayback()
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(rafId)
      rafId = 0
      updatePlayback()
    }

    /* ---------- 세로 scroll = page 진행(정확히 한 바퀴) ---------- */

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
        },
      })

      // FACES가 화면에 들어오기 직전부터 나갈 때까지만 그리고, 영상도 그 동안만 재생한다.
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

    // 영상 / 텍스트의 기본 drag가 pointer drag를 가로채지 않게 한다.
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
    const debug = window as unknown as { __faces?: () => Record<string, unknown> }
    if (import.meta.env.DEV) {
      debug.__faces = () => {
        const watch = watchGeometry()
        return {
          scrollOffset,
          dragOffset,
          current,
          target: target(),
          loopWidth,
          planeHeight: scene.planeHeight,
          gap: scene.gap,
          widths: scene.widths,
          centers: scene.centers,
          aspects: scene.aspects,
          displaySlot: scene.displaySlot,
          focus: FACE_PROJECTS.map((_, i) => +scene.focus(i, current).toFixed(3)),
          display: watch ? { w: watch.display.hx * 2, h: watch.display.hy * 2 } : null,
          playing: scene.videos.map((v) => !v.paused),
          pinStart: trigger?.start ?? 0,
          pinEnd: trigger?.end ?? 0,
          progress: trigger?.progress ?? 0,
          active,
        }
      }
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
      frontWheel?.style.removeProperty('rotate')
      if (canWatchFrames) scene.videos.forEach((video, i) => video.cancelVideoFrameCallback(frameHandles[i]))
      scene.dispose()
    }
  }, [enabled, sectionRef, stageRef, canvasRef, onActiveChange])
}
