import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent } from 'react'
import gsap from 'gsap'
import type { FaceProject } from '../Faces/facesData'
import './AllFaces.css'

/*
 * ALL FACES — FLAT PROJECT WORLD.
 *
 * Crown을 누르면 화면 전체에 열리는, 화면보다 큰 평면 공간이다. 그 위에 project가 비대칭으로 떠 있고
 * 손으로 끌어 둘러본다(drag + 관성). Dome / Sphere / 곡률 / 무한 반복(복제) 없이, 끝이 있는 평면이다.
 * Watch는 이 안에 두지 않는다.
 *
 * layer (project 하나)
 *   all-faces__project   world 위의 자리(absolute, px). 비활성 project의 opacity
 *   all-faces__enter     열림 / 닫힘 motion (GSAP)
 *   all-faces__float     idle 부유 x / y / rotate (rAF, 한 루프)
 *   all-faces__card      실제 button. hover scale(CSS)
 */

type AllFacesProps = {
  projects: FaceProject[]
  /** 닫힘 motion이 끝난 뒤 불린다. 부모가 이때 unmount한다. */
  onClose: () => void
  /**
   * project를 골랐을 때. Case Study 화면은 아직 없어서 부모가 id만 받는다 —
   * 가짜 URL / 가짜 상세 화면 / modal을 여기서 만들지 않는다.
   */
  onProjectSelect: (projectId: string) => void
}

/** world 크기(뷰포트 배수)와 최소 여유(px). 화면보다 커서 끌어서 둘러볼 거리가 있다. */
const WORLD = { landscape: { w: 1.6, h: 1.6 }, portrait: { w: 1.5, h: 2.1 }, minExtra: 360 }

/**
 * project 자리(world 비율 좌표의 중심)와 높이(뷰포트 높이 비율), idle 부유 폭.
 * 세 자리가 서로 다른 높이 / 크기라 격자처럼 읽히지 않는다. 부유 폭은 x ±6~10px, y ±8~14px, 회전 ±0.4~0.7deg.
 */
type Slot = { x: number; y: number; h: number; ax: number; ay: number; ar: number; px: number; py: number; pr: number; phase: number }
const SLOTS: { landscape: Slot[]; portrait: Slot[] } = {
  landscape: [
    { x: 0.31, y: 0.44, h: 0.5, ax: 8, ay: 12, ar: 0.55, px: 7.2, py: 6.1, pr: 8.4, phase: 0.2 },
    { x: 0.66, y: 0.52, h: 0.58, ax: 10, ay: 9, ar: 0.45, px: 8.1, py: 6.8, pr: 9.6, phase: 1.9 },
    { x: 0.47, y: 0.76, h: 0.58, ax: 6, ay: 14, ar: 0.7, px: 6.4, py: 7.7, pr: 7.3, phase: 3.4 },
  ],
  portrait: [
    { x: 0.36, y: 0.2, h: 0.34, ax: 7, ay: 10, ar: 0.5, px: 7.2, py: 6.1, pr: 8.4, phase: 0.2 },
    { x: 0.64, y: 0.49, h: 0.38, ax: 9, ay: 8, ar: 0.45, px: 8.1, py: 6.8, pr: 9.6, phase: 1.9 },
    { x: 0.4, y: 0.79, h: 0.4, ax: 6, ay: 12, ar: 0.65, px: 6.4, py: 7.7, pr: 7.3, phase: 3.4 },
  ],
}

/** 가로 영상이 화면을 너무 많이 차지하지 않도록 폭 상한(뷰포트 폭 비율). */
const MAX_CARD_W = 0.42

/** 이만큼(px) 움직이기 전까지는 drag가 아니다. 그 안에서 떼면 project 선택이다. */
const DRAG_THRESHOLD = 7

/** 놓은 뒤 관성. 60fps 한 frame마다 속도에 곱한다(0.92~0.95). */
const FRICTION = 0.935

/** world 경계 밖으로 끌 때의 저항(끈 거리 중 실제로 따라가는 비율)과, 놓은 뒤 경계로 돌아오는 비율(frame당). */
const RUBBER = 0.35
const SPRING = 0.16

/** 열림 / 닫힘. 열림은 약 0.84초(카드 0.72초 + 0.06초 간격). */
const OPEN = { overlay: 0.5, card: 0.72, stagger: 0.06, scale: 0.96, offset: 22 }
const CLOSE = { duration: 0.36 }

/** 뒤 page를 움직이는 키. 열려 있는 동안 막는다(button의 Space / Enter는 그대로 둔다). */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '])

type Layout = {
  vw: number
  vh: number
  world: { w: number; h: number }
  cards: { left: number; top: number; w: number; h: number; slot: Slot }[]
}

function computeLayout(projects: FaceProject[], vw: number, vh: number): Layout {
  const portrait = vw < vh * 0.9
  const size = portrait ? WORLD.portrait : WORLD.landscape
  const slots = portrait ? SLOTS.portrait : SLOTS.landscape
  const world = { w: Math.max(vw * size.w, vw + WORLD.minExtra), h: Math.max(vh * size.h, vh + WORLD.minExtra) }
  const cards = projects.map((project, i) => {
    const slot = slots[i % slots.length]
    let h = vh * slot.h
    let w = h * project.aspect
    const maxW = vw * (portrait ? 0.62 : MAX_CARD_W)
    if (w > maxW) {
      w = maxW
      h = w / project.aspect
    }
    return { left: world.w * slot.x - w / 2, top: world.h * slot.y - h / 2, w, h, slot }
  })
  return { vw, vh, world, cards }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function AllFaces({ projects, onClose, onProjectSelect }: AllFacesProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const [layout, setLayout] = useState(() => computeLayout(projects, window.innerWidth, window.innerHeight))
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** camera = world의 translate(px). 경계는 [뷰포트 - world, 0]. */
  const camera = useRef({ x: 0, y: 0, vx: 0, vy: 0, tx: NaN, ty: NaN })
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const bounds = () => {
    const l = layoutRef.current
    return { minX: Math.min(0, l.vw - l.world.w), minY: Math.min(0, l.vh - l.world.h), maxX: 0, maxY: 0 }
  }

  // 처음에는 world 가운데를 본다. 두 project는 위쪽 줄(ALL FACES / CLOSE)과 겹치지 않게 다 보이고, 하나는 끌어야 다 보인다.
  useLayoutEffect(() => {
    const l = layoutRef.current
    camera.current.x = (l.vw - l.world.w) / 2
    camera.current.y = (l.vh - l.world.h) / 2
  }, [])

  /* ---------- 크기 변화 ---------- */
  useEffect(() => {
    const onResize = () => {
      const next = computeLayout(projects, window.innerWidth, window.innerHeight)
      const prev = layoutRef.current
      // 보고 있던 world 위치(비율)를 그대로 유지한다.
      const cx = (-camera.current.x + prev.vw / 2) / prev.world.w
      const cy = (-camera.current.y + prev.vh / 2) / prev.world.h
      layoutRef.current = next
      const b = bounds()
      camera.current.x = clamp(next.vw / 2 - cx * next.world.w, b.minX, b.maxX)
      camera.current.y = clamp(next.vh / 2 - cy * next.world.h, b.minY, b.maxY)
      setLayout(next)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [projects])

  /* ---------- 한 루프: camera(drag 관성 / 경계 복귀 / focus 이동) + idle 부유 ---------- */
  const draggingRef = useRef(false)
  useEffect(() => {
    const world = worldRef.current
    const root = rootRef.current
    if (!world || !root) return
    const floats = [...root.querySelectorAll<HTMLElement>('.all-faces__float')]
    let raf = 0
    let last = 0
    let lastTransform = ''

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = last ? Math.min(64, now - last) : 16.7
      last = now
      const k = dt / 16.667
      const c = camera.current
      const b = bounds()

      if (!draggingRef.current) {
        if (Number.isFinite(c.tx)) {
          // keyboard focus로 project를 화면 안으로 부드럽게 데려온다.
          const e = 1 - 0.86 ** k
          c.x += (c.tx - c.x) * e
          c.y += (c.ty - c.y) * e
          if (Math.abs(c.tx - c.x) < 0.3 && Math.abs(c.ty - c.y) < 0.3) c.tx = c.ty = NaN
        } else {
          // 관성. 경계 밖이면 속도를 빨리 줄이고 경계로 돌아온다(튕기지 않는다).
          c.x += c.vx * dt
          c.y += c.vy * dt
          const f = FRICTION ** k
          c.vx *= f
          c.vy *= f
          const s = 1 - (1 - SPRING) ** k
          if (c.x > b.maxX || c.x < b.minX) {
            c.vx *= 0.5 ** k
            c.x += (clamp(c.x, b.minX, b.maxX) - c.x) * s
          }
          if (c.y > b.maxY || c.y < b.minY) {
            c.vy *= 0.5 ** k
            c.y += (clamp(c.y, b.minY, b.maxY) - c.y) * s
          }
          if (Math.abs(c.vx) < 0.002) c.vx = 0
          if (Math.abs(c.vy) < 0.002) c.vy = 0
        }
      }

      const transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)`
      if (transform !== lastTransform) {
        world.style.transform = transform
        lastTransform = transform
      }

      if (!reduced) {
        const t = now / 1000
        const cards = layoutRef.current.cards
        floats.forEach((el, i) => {
          const s = cards[i]?.slot
          if (!s) return
          const x = s.ax * Math.sin((t / s.px) * Math.PI * 2 + s.phase)
          const y = s.ay * Math.sin((t / s.py) * Math.PI * 2 + s.phase * 1.3)
          const r = s.ar * Math.sin((t / s.pr) * Math.PI * 2 + s.phase * 0.7)
          el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`
        })
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // layout이 바뀌면 float element 목록은 그대로다(같은 project 수).
  }, [reduced])

  /* ---------- drag: 7px 뒤부터 world를 끈다. 놓으면 관성 ---------- */
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    let pointerId = -1
    let downX = 0
    let downY = 0
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let lastT = 0
    let moved = false

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || closingRef.current) return
      pointerId = event.pointerId
      downX = lastX = event.clientX
      downY = lastY = event.clientY
      lastT = event.timeStamp
      startX = camera.current.x
      startY = camera.current.y
      moved = false
      suppressClickRef.current = false
      // 잡는 순간 관성과 focus 이동을 멈춘다.
      camera.current.vx = camera.current.vy = 0
      camera.current.tx = camera.current.ty = NaN
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const dx = event.clientX - downX
      const dy = event.clientY - downY
      if (!moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        moved = true
        suppressClickRef.current = true
        draggingRef.current = true
        setDragging(true)
        viewport.setPointerCapture(pointerId)
      }
      const b = bounds()
      const rubber = (v: number, min: number, max: number) => (v > max ? max + (v - max) * RUBBER : v < min ? min + (v - min) * RUBBER : v)
      camera.current.x = rubber(startX + dx, b.minX, b.maxX)
      camera.current.y = rubber(startY + dy, b.minY, b.maxY)
      // 속도(px/ms). 최근 움직임에 더 무게를 둔다. 시간은 event가 생긴 시각이라 처리 지연과 무관하다.
      const now = event.timeStamp
      const dt = Math.max(1, now - lastT)
      camera.current.vx = camera.current.vx * 0.6 + ((event.clientX - lastX) / dt) * 0.4
      camera.current.vy = camera.current.vy * 0.6 + ((event.clientY - lastY) / dt) * 0.4
      lastX = event.clientX
      lastY = event.clientY
      lastT = now
    }

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = -1
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
      if (!moved) return
      // 손을 멈춘 뒤 놓았으면 관성이 없다.
      if (event.timeStamp - lastT > 90) camera.current.vx = camera.current.vy = 0
      if (reduced) camera.current.vx = camera.current.vy = 0
      draggingRef.current = false
      setDragging(false)
    }

    // trackpad / wheel도 world를 움직인다(page는 움직이지 않는다).
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const b = bounds()
      const c = camera.current
      c.tx = c.ty = NaN
      c.vx = c.vy = 0
      c.x = clamp(c.x - event.deltaX, b.minX, b.maxX)
      c.y = clamp(c.y - event.deltaY, b.minY, b.maxY)
    }

    viewport.addEventListener('pointerdown', onDown)
    viewport.addEventListener('pointermove', onMove)
    viewport.addEventListener('pointerup', onUp)
    viewport.addEventListener('pointercancel', onUp)
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      viewport.removeEventListener('wheel', onWheel)
      draggingRef.current = false
    }
  }, [reduced])

  /* ---------- 열림 ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const backdrop = root.querySelector('.all-faces__backdrop')
    const chrome = root.querySelectorAll('.all-faces__bar > *')
    const enters = root.querySelectorAll<HTMLElement>('.all-faces__enter')
    const tl = gsap.timeline()
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: OPEN.overlay, ease: 'sine.out' }, 0)
    tl.fromTo(chrome, { opacity: 0, y: reduced ? 0 : -6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05 }, 0.12)
    tl.fromTo(
      enters,
      reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            scale: OPEN.scale,
            // 자리마다 조금씩 다른 방향에서 제자리로 온다.
            x: (i: number) => [-1, 1, -0.5][i % 3] * OPEN.offset,
            y: (i: number) => [1, 0.6, 1.2][i % 3] * OPEN.offset,
          },
      reduced
        ? { opacity: 1, duration: 0.4, ease: 'none', stagger: 0.04 }
        : { opacity: 1, scale: 1, x: 0, y: 0, duration: OPEN.card, ease: 'power3.out', stagger: OPEN.stagger },
      0.06,
    )
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      tl.kill()
    }
  }, [reduced])

  /* ---------- 닫힘 ---------- */
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const root = rootRef.current
    if (!root) {
      onClose()
      return
    }
    gsap
      .timeline({ onComplete: onClose })
      .to(root.querySelectorAll('.all-faces__enter'), reduced ? { opacity: 0, duration: 0.2 } : { opacity: 0, scale: 0.98, duration: CLOSE.duration * 0.8, ease: 'power2.in' }, 0)
      .to(root.querySelectorAll('.all-faces__bar > *'), { opacity: 0, duration: CLOSE.duration * 0.6, ease: 'power1.in' }, 0)
      .to(root.querySelector('.all-faces__backdrop'), { opacity: 0, duration: CLOSE.duration, ease: 'sine.in' }, 0.04)
  }, [onClose, reduced])

  /* ---------- 열려 있는 동안: 뒤 page scroll 잠금(위치 유지), ESC, Tab 가두기 ---------- */
  useEffect(() => {
    // overflow: hidden은 쓰지 않는다. 스크롤바가 사라지며 pin / fixed layer가 좌우로 밀린다. 입력만 막는다.
    const block = (event: Event) => {
      if (!viewportRef.current?.contains(event.target as Node)) event.preventDefault()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (SCROLL_KEYS.has(event.key)) {
        const pressing = (event.target as HTMLElement).matches?.('button') && event.key === ' '
        if (!pressing) event.preventDefault()
        return
      }
      if (event.key !== 'Tab' || !rootRef.current) return
      const focusable = [...rootRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!rootRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('wheel', block, { passive: false, capture: true })
    document.addEventListener('touchmove', block, { passive: false, capture: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('wheel', block, { capture: true })
      document.removeEventListener('touchmove', block, { capture: true })
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [requestClose])

  /* ---------- project ---------- */

  // keyboard로 project에 focus가 오면 그 project가 화면 가운데 쪽으로 오도록 camera를 옮긴다.
  const focusProject = (i: number, event: FocusEvent<HTMLButtonElement>) => {
    setHovered(projects[i].id)
    if (!event.currentTarget.matches(':focus-visible')) return
    const l = layoutRef.current
    const card = l.cards[i]
    const b = bounds()
    camera.current.vx = camera.current.vy = 0
    camera.current.tx = clamp(l.vw / 2 - (card.left + card.w / 2), b.minX, b.maxX)
    camera.current.ty = clamp(l.vh / 2 - (card.top + card.h / 2), b.minY, b.maxY)
  }

  const selectProject = (id: string) => {
    // 끌다가 놓은 것은 선택이 아니다.
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onProjectSelect(id)
  }

  const count = String(projects.length).padStart(2, '0')

  return (
    <div
      ref={rootRef}
      className={`all-faces${dragging ? ' is-dragging' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-faces-title"
    >
      <div className="all-faces__backdrop" aria-hidden="true" />

      <div ref={viewportRef} className="all-faces__viewport">
        <div
          ref={worldRef}
          className="all-faces__world"
          data-hovered={hovered && !dragging ? '' : undefined}
          style={{ width: layout.world.w, height: layout.world.h }}
        >
          {projects.map((project, i) => {
            const card = layout.cards[i]
            const active = hovered === project.id && !dragging
            return (
              <div
                key={project.id}
                className={`all-faces__project${active ? ' is-active' : ''}`}
                style={{ left: card.left, top: card.top, width: card.w } as CSSProperties}
              >
                <div className="all-faces__enter">
                  <div className="all-faces__float">
                    <button
                      type="button"
                      className="all-faces__card"
                      aria-label={`${project.index} ${project.title} — ${project.category}`}
                      onClick={() => selectProject(project.id)}
                      onPointerEnter={() => setHovered(project.id)}
                      onPointerLeave={() => setHovered((h) => (h === project.id ? null : h))}
                      onFocus={(event) => focusProject(i, event)}
                      onBlur={() => setHovered((h) => (h === project.id ? null : h))}
                    >
                      <span className="all-faces__media" style={{ height: card.h }}>
                        <video
                          src={reduced ? `${project.media}#t=0.001` : project.media}
                          muted
                          loop
                          playsInline
                          autoPlay={!reduced}
                          preload="auto"
                          aria-hidden="true"
                          draggable={false}
                        />
                      </span>
                      <span className="all-faces__meta" aria-hidden="true">
                        <span className="all-faces__index">{project.index}</span>
                        <span className="all-faces__name">{project.title}</span>
                        <span className="all-faces__category">{project.category}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="all-faces__bar">
        <h2 id="all-faces-title" className="all-faces__title">
          <span className="all-faces__title-main">ALL FACES</span>
          <span className="all-faces__title-count">{count} PROJECTS</span>
        </h2>
        <button ref={closeRef} type="button" className="all-faces__close" onClick={requestClose}>
          CLOSE <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  )
}
