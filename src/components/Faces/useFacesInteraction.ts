import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** pin 동안의 세로 scroll 길이. 최소 2.6화면, 트랙이 길면 가로 이동 거리의 1.05배. */
const MIN_PIN_VIEWPORTS = 2.6
const TRAVEL_TO_SCROLL = 1.05

/**
 * scroll로 움직일 때 목표 progress를 따라잡는 비율(60fps 한 프레임 기준).
 * wheel 한 칸의 계단감만 없앤다. drag는 이 값을 거치지 않고 손을 그대로 따라간다.
 */
const SMOOTHING = 0.24

/** active가 바뀌려면 새 후보가 지금 active보다 project 간격의 이 비율만큼 더 가까워야 한다. */
const ACTIVE_HYSTERESIS = 0.04

/** 이만큼(px) 움직이기 전까지는 drag로 보지 않는다. 나중에 project 링크 클릭을 살려 두기 위해서다. */
const DRAG_THRESHOLD = 4

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (t: number) => t * t * (3 - 2 * t)

type FacesInteractionOptions = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
  outerTrackRef: RefObject<HTMLElement | null>
  innerTrackRef: RefObject<HTMLElement | null>
  innerLayerRef: RefObject<HTMLElement | null>
  /** active project가 실제로 바뀔 때만 불린다. scroll 프레임마다 부르지 않는다. */
  onActiveChange: (index: number) => void
}

/**
 * FACES의 가로 트랙.
 *
 * source of truth는 facesProgress(0~1) 하나다.
 *   세로 scroll -> ScrollTrigger progress -> facesProgress
 *   pointer drag -> 가로 이동량            -> facesProgress (+ document scroll도 같은 자리로)
 * 둘 다 같은 render(progress)를 거쳐 바깥 / 안쪽 트랙에 같은 --track-x를 쓴다.
 *
 * React state는 active index가 바뀔 때만 건드린다. 트랙 이동은 전부 CSS 변수다.
 */
export default function useFacesInteraction({
  enabled,
  sectionRef,
  stageRef,
  outerTrackRef,
  innerTrackRef,
  innerLayerRef,
  onActiveChange,
}: FacesInteractionOptions) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const outer = outerTrackRef.current
    const inner = innerTrackRef.current
    const innerLayer = innerLayerRef.current
    if (!enabled || !section || !stage || !outer || !inner || !innerLayer) return

    const outerItems = [...outer.children] as HTMLElement[]
    const innerItems = [...inner.children] as HTMLElement[]
    const count = outerItems.length
    if (count === 0) return

    /* ---------- 측정 (refresh 때만) ---------- */

    /*
     * 전부 stage 좌표계(트랙 이동 0 기준)다.
     * offsetLeft는 정수로 반올림되어 gap이 172.8px 같은 소수일 때 project마다 오차가 쌓이므로 rect로 잰다.
     * 트랙의 이동과 project의 scale(중심 기준)은 중심 위치를 바꾸지 않도록 트랙 rect 기준으로 뺀다.
     */
    let lensCenterX = 0
    let centers: number[] = []
    let startX = 0
    let endX = 0
    let pitch = 1

    const measure = () => {
      const stageRect = stage.getBoundingClientRect()
      const lensRect = stage.querySelector('.faces__lens')?.getBoundingClientRect()
      // lens는 CSS에서 stage 폭의 정중앙(50cqw)에 놓인다.
      lensCenterX = lensRect ? lensRect.left + lensRect.width / 2 - stageRect.left : stageRect.width / 2
      // 트랙은 stage의 left: 0에서 시작한다.
      const trackLeft = outer.getBoundingClientRect().left
      centers = outerItems.map((el) => {
        const r = el.getBoundingClientRect()
        return r.left + r.width / 2 - trackLeft
      })
      // 첫 project 중심 = lens 중심에서 시작해 마지막 project 중심 = lens 중심에서 끝난다.
      startX = lensCenterX - centers[0]
      endX = lensCenterX - centers[count - 1]
      pitch = count > 1 ? centers[1] - centers[0] : outerItems[0].offsetWidth
    }
    const travel = () => Math.max(1, startX - endX)

    /* ---------- 그리기 ---------- */

    let active = -1
    const influenceWritten: string[] = []

    const render = (progress: number) => {
      const x = startX + (endX - startX) * progress
      const trackX = `${x.toFixed(2)}px`
      // 바깥과 안쪽이 정확히 같은 값을 쓴다. 따로 움직이는 animation은 없다.
      outer.style.setProperty('--track-x', trackX)
      inner.style.setProperty('--track-x', trackX)

      let nearest = 0
      const distances: number[] = []
      for (let i = 0; i < count; i++) {
        const distance = Math.abs(centers[i] + x - lensCenterX)
        distances[i] = distance
        if (distance < distances[nearest]) nearest = i

        // 가운데로 다가올수록 0 -> 1. 이웃 project가 가운데 올 때 0이 된다.
        const influence = smoothstep(1 - clamp01(distance / pitch)).toFixed(3)
        if (influenceWritten[i] !== influence) {
          outerItems[i].style.setProperty('--influence', influence)
          innerItems[i]?.style.setProperty('--influence', influence)
          influenceWritten[i] = influence
        }
      }

      // 경계에서 2-3-2-3으로 깜빡이지 않도록, 새 후보가 확실히 더 가까워졌을 때만 바꾼다.
      const shouldSwitch =
        active < 0 ||
        (nearest !== active && distances[nearest] + pitch * ACTIVE_HYSTERESIS < distances[active])
      if (shouldSwitch && nearest !== active) {
        active = nearest
        onActiveChange(nearest)
      }
    }

    /*
     * 안쪽 트랙은 CSS에서 stage와 같은 좌표계를 만들도록 놓여 있다.
     * 그래도 반올림으로 생길 수 있는 차이를 실제 boundingRect로 재서 없앤다.
     */
    let alignment = { dx: 0, dy: 0 }
    const alignInner = () => {
      innerLayer.style.removeProperty('translate')
      const a = outerItems[0].getBoundingClientRect()
      const b = innerItems[0]?.getBoundingClientRect()
      if (!b) return
      alignment = { dx: a.left - b.left, dy: a.top - b.top }
      if (Math.abs(alignment.dx) > 0.01 || Math.abs(alignment.dy) > 0.01) {
        innerLayer.style.translate = `${alignment.dx}px ${alignment.dy}px`
      }
      innerLayer.dataset.alignDx = alignment.dx.toFixed(3)
      innerLayer.dataset.alignDy = alignment.dy.toFixed(3)
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
          alignInner()
        },
      })
    })

    measure()
    setProgress(0, true)

    /* ---------- pointer drag -> progress ---------- */

    let pointerId = -1
    let dragStartX = 0
    let dragStartProgress = 0

    /** progress를 그대로 document scroll 위치로 옮긴다. drag 뒤에 scroll해도 트랙이 튀지 않는다. */
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
      // 손을 오른쪽으로 끌면 트랙도 오른쪽으로 = 앞 project 쪽으로. 관성은 없다.
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
     * 폰트가 늦게 뜨면 project 폭이 달라질 수 있어 한 번 더.
     */
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(refreshId)
      cancelAnimationFrame(rafId)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endDrag)
      stage.removeEventListener('pointercancel', endDrag)
      stage.removeEventListener('dragstart', onDragStart)
      stage.classList.remove('is-dragging')
      ctx.revert()
      outer.style.removeProperty('--track-x')
      inner.style.removeProperty('--track-x')
      for (const el of [...outerItems, ...innerItems]) el.style.removeProperty('--influence')
      innerLayer.style.removeProperty('translate')
    }
  }, [enabled, sectionRef, stageRef, outerTrackRef, innerTrackRef, innerLayerRef, onActiveChange])
}
