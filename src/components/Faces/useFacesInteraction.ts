import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** pin 동안의 세로 scroll 길이. 최소 2.6화면, rail이 길면 가로 이동 거리의 1.05배. */
const MIN_PIN_VIEWPORTS = 2.6
const TRAVEL_TO_SCROLL = 1.05

/**
 * scroll로 움직일 때 목표 progress를 따라잡는 비율(60fps 한 프레임 기준).
 * wheel 한 칸의 계단감만 없앤다. drag는 이 값을 거치지 않고 손을 그대로 따라간다.
 */
const SMOOTHING = 0.24

/** active가 바뀌려면 새 후보가 지금 active보다 segment 폭의 이 비율만큼 더 가까워야 한다. */
const ACTIVE_HYSTERESIS = 0.04

/** 이만큼(px) 움직이기 전까지는 drag로 보지 않는다. 나중에 project 링크 클릭을 살려 두기 위해서다. */
const DRAG_THRESHOLD = 4

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type FacesInteractionOptions = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
  railRef: RefObject<HTMLElement | null>
  /** active project가 실제로 바뀔 때만 불린다(metadata 전용). scroll 프레임마다 부르지 않는다. */
  onActiveChange: (index: number) => void
}

/**
 * FACES의 가로 rail.
 *
 * source of truth는 facesProgress(0~1) 하나다.
 *   세로 scroll  -> ScrollTrigger progress -> facesProgress
 *   pointer drag -> 가로 이동량            -> facesProgress (+ document scroll도 같은 자리로)
 * 둘 다 같은 render(progress)를 거쳐 바깥 rail과 Watch 화면 안 rail에 같은 --track-x를 쓴다.
 *
 * Watch 화면 안의 rail은 WatchStage(fixed, GSAP scale)에 들어 있어 좌표계가 다르다.
 * 그래서 화면(.watch__screen)과 FACES stage의 실제 rect, Watch의 scale로 좌표계를 맞춘다
 * (alignInner). 그러면 Watch 화면은 같은 rail을 그 자리에서 잘라 보여주는 창이 된다.
 *
 * activeIndex는 metadata에만 쓴다. rail의 그림은 항상 연속된 위치로만 움직인다.
 */
export default function useFacesInteraction({
  enabled,
  sectionRef,
  stageRef,
  railRef,
  onActiveChange,
}: FacesInteractionOptions) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const rail = railRef.current
    if (!enabled || !section || !stage || !rail) return

    const segments = [...rail.children] as HTMLElement[]
    const count = segments.length
    if (count === 0) return

    // Hero / About에서 오는 같은 Watch. 그 display 안에 rail의 복제가 있다.
    const watch = document.querySelector<HTMLElement>('.watch--stage')
    const screen = watch?.querySelector<HTMLElement>('.watch__screen') ?? null
    const stream = screen?.querySelector<HTMLElement>('.watch__stream') ?? null
    const innerRail = stream?.querySelector<HTMLElement>('.faces__rail') ?? null

    /* ---------- 측정 (refresh 때만) ---------- */

    // 전부 stage 좌표계(rail 이동 0 기준). 소수 폭이 반올림되지 않도록 rect로 잰다.
    let displayCenterX = 0
    let centers: number[] = []
    let startX = 0
    let endX = 0
    let pitch = 1

    const measure = () => {
      const stageRect = stage.getBoundingClientRect()
      // Watch(와 그 display)는 화면 가로 정중앙에 고정되어 있다.
      displayCenterX = stageRect.width / 2
      const railLeft = rail.getBoundingClientRect().left
      centers = segments.map((el) => {
        const r = el.getBoundingClientRect()
        return r.left + r.width / 2 - railLeft
      })
      // 첫 segment 중심 = display 중심에서 시작해 마지막 segment 중심 = display 중심에서 끝난다.
      startX = displayCenterX - centers[0]
      endX = displayCenterX - centers[count - 1]
      pitch = count > 1 ? centers[1] - centers[0] : stageRect.width

      // Watch 화면 안의 좌표계를 stage와 같은 크기로 만든다(cqh·cqw가 같은 값이 되도록).
      if (stream) {
        stream.style.width = `${stageRect.width}px`
        stream.style.height = `${stageRect.height}px`
      }
    }
    const travel = () => Math.max(1, startX - endX)

    /* ---------- Watch 화면 안 좌표계 맞추기 ---------- */

    /*
     * stream(화면 안 좌표계)의 원점을 FACES stage의 원점에 겹친다.
     *   Watch의 scale s만큼 커져 있으므로 1/s로 되돌리고,
     *   (stage 원점 - 화면 원점) / s 만큼 옮긴다.
     * 그러면 stream 안의 한 점 p가 화면 밖의 stage 위 같은 점 p에 정확히 겹친다.
     * Watch가 고정된 동안에는 값이 변하지 않고, FACES가 아래에서 올라오는 동안에는 매 scroll 따라간다.
     */
    const alignInner = () => {
      if (!watch || !screen || !stream) return
      const s = Number(gsap.getProperty(watch, 'scaleX')) || 1
      const screenRect = screen.getBoundingClientRect()
      const stageRect = stage.getBoundingClientRect()
      const a = (stageRect.left - screenRect.left) / s
      const b = (stageRect.top - screenRect.top) / s
      stream.style.transform = `translate3d(${a}px, ${b}px, 0) scale(${1 / s})`
      stream.style.visibility = 'visible'
    }

    /* ---------- 그리기 ---------- */

    let active = -1

    const render = (progress: number) => {
      const x = startX + (endX - startX) * progress
      const trackX = `${x.toFixed(2)}px`
      // 바깥과 안쪽이 정확히 같은 값을 쓴다. 따로 움직이는 animation은 없다.
      rail.style.setProperty('--track-x', trackX)
      innerRail?.style.setProperty('--track-x', trackX)
      alignInner()

      // display 중심에 가장 가까운 segment가 active. metadata만 바꾼다.
      let nearest = 0
      const distances = centers.map((c) => Math.abs(c + x - displayCenterX))
      for (let i = 1; i < count; i++) if (distances[i] < distances[nearest]) nearest = i
      // 경계에서 2-3-2-3으로 깜빡이지 않도록, 새 후보가 확실히 더 가까워졌을 때만 바꾼다.
      if (
        active < 0 ||
        (nearest !== active && distances[nearest] + pitch * ACTIVE_HYSTERESIS < distances[active])
      ) {
        if (nearest !== active) onActiveChange(nearest)
        active = nearest
      }
    }

    /* ---------- facesProgress ---------- */

    let target = 0
    let current = 0
    let rafId = 0
    let lastTime = 0
    let dragging = false

    const tick = (now: number) => {
      const frames = lastTime ? Math.min(4, (now - lastTime) / (1000 / 60)) : 1
      lastTime = now
      current += (target - current) * (1 - (1 - SMOOTHING) ** frames)
      if (Math.abs(target - current) < 1e-5) current = target
      render(current)
      if (current === target) {
        rafId = 0
        lastTime = 0
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }

    const setProgress = (progress: number, immediate = false) => {
      target = clamp01(progress)
      if (immediate) {
        cancelAnimationFrame(rafId)
        rafId = 0
        lastTime = 0
        current = target
        render(current)
        return
      }
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    /* ---------- 세로 scroll -> progress ---------- */

    let trigger: ScrollTrigger | undefined

    const ctx = gsap.context(() => {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => {
          measure()
          return `+=${Math.max(window.innerHeight * MIN_PIN_VIEWPORTS, travel() * TRAVEL_TO_SCROLL)}`
        },
        pin: stage,
        pinSpacing: true, // pin-spacer는 높이만 담당한다. 따로 스타일링하지 않는다.
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // About의 pin spacer가 먼저 자리를 잡은 뒤에 계산되어야 한다.
        refreshPriority: -1,
        onUpdate: (self) => {
          // drag 중에는 scroll을 이쪽에서 맞추고 있으므로 되돌려 받지 않는다.
          if (!dragging) setProgress(self.progress)
        },
        onRefresh: (self) => {
          measure()
          setProgress(self.progress, true)
        },
      })

      /*
       * FACES가 화면 아래에서 올라오는 동안(About pin 끝 -> FACES pin 시작)에도
       * Watch 화면 안 rail이 바깥 rail과 같이 올라와야 한다. pin 전에는 stage가 native scroll로
       * 움직이므로 scroll마다 좌표계를 다시 맞춘다.
       */
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom bottom',
        refreshPriority: -1,
        onUpdate: alignInner,
        onLeaveBack: alignInner,
      })
    })

    measure()
    setProgress(0, true)

    // 모든 trigger가 다시 잰 뒤(= Watch의 transform도 제자리로 돌아온 뒤) 좌표계를 한 번 더 맞춘다.
    ScrollTrigger.addEventListener('refresh', alignInner)

    /* ---------- pointer drag -> progress ---------- */

    let pointerId = -1
    let dragStartX = 0
    let dragStartProgress = 0

    /** progress를 그대로 document scroll 위치로 옮긴다. drag 뒤에 scroll해도 rail이 튀지 않는다. */
    const syncScroll = (progress: number) => {
      if (!trigger) return
      window.scrollTo({ top: trigger.start + progress * (trigger.end - trigger.start), behavior: 'instant' })
    }

    const onPointerDown = (event: PointerEvent) => {
      // pin 구간 밖에서 drag를 시작하면 scroll 위치를 맞추는 순간 페이지가 튄다.
      if (!event.isPrimary || event.button !== 0 || !trigger?.isActive) return
      pointerId = event.pointerId
      dragStartX = event.clientX
      dragStartProgress = current
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const dx = event.clientX - dragStartX
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return
        dragging = true
        stage.setPointerCapture(pointerId)
        stage.classList.add('is-dragging')
      }
      // 손을 오른쪽으로 끌면 rail도 오른쪽으로 = 앞 project 쪽으로. 관성은 없다.
      const progress = clamp01(dragStartProgress - dx / travel())
      setProgress(progress, true)
      syncScroll(progress)
    }

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = -1
      if (!dragging) return
      dragging = false
      stage.classList.remove('is-dragging')
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
      // scroll 위치는 정수로 반올림되므로 그 값으로 마지막 미세 차이만 맞춘다.
      if (trigger) setProgress(trigger.progress)
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
     * 폰트가 늦게 뜨면 segment 폭이 달라질 수 있어 한 번 더.
     */
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(refreshId)
      cancelAnimationFrame(rafId)
      ScrollTrigger.removeEventListener('refresh', alignInner)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endDrag)
      stage.removeEventListener('pointercancel', endDrag)
      stage.removeEventListener('dragstart', onDragStart)
      stage.classList.remove('is-dragging')
      ctx.revert()
      rail.style.removeProperty('--track-x')
      innerRail?.style.removeProperty('--track-x')
      for (const prop of ['transform', 'width', 'height', 'visibility']) stream?.style.removeProperty(prop)
    }
  }, [enabled, sectionRef, stageRef, railRef, onActiveChange])
}
