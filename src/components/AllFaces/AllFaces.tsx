import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { FACE_PROJECTS, type FaceProject } from '../Faces/facesData'
import './AllFaces.css'

/*
 * ALL FACES — Digital Crown을 누르면 열리는 전체 project 화면.
 *
 * React Bits Dome Gallery / Infinite Menu에서 "공간을 끌어 탐색하는 감각"(drag, 관성, 자유로운 배치, 공간감)만 가져오고
 * 구 / dome 곡률 / 무한 복제는 버렸다. 둥글게 말린 gallery를 평평하게 펼친 FLAT PROJECT WORLD 하나 —
 * 화면보다 넓지만 끝이 있는 평면 위에 project 3개(실제 개수 그대로)가 비대칭으로 놓여 아주 느리게 떠 있다.
 * Grid / carousel / 구형 배치가 아니다. Watch는 이 화면에 없다.
 *
 * project는 영상 card가 아니라 원형 object다(가운데 logo + 이름). 이 화면은 영상을 하나도 쓰지 않는다 —
 * FACES section의 project 영상은 그대로다.
 *
 *   overlay  언제나 정확히 한 화면(100vh / 100dvh). 문서 scroll은 생기지 않고, 열려 있는 동안 뒤 page는 scroll되지 않는다
 *   world    데스크톱 180vw x 150vh, 모바일 160vw x 150vh(끝이 있다. 가장자리에서 멈추고 되감기지 않는다)
 *   처음     세 원이 모두 첫 화면 안에 온전히 보이는 자리에서 시작한다(page를 내려 찾지 않는다)
 *   drag     빈 곳이든 project 위든 7px 넘게 끌면 world가 따라온다. 그 안에서 떼면 project click이다
 *   inertia  놓은 속도를 이어받아 frame마다 FRICTION만큼 줄어든다(최대 속도 제한)
 *   floating project마다 다른 주기 / 방향 / 시작점으로 x ±6~10px, y ±8~14px. 회전은 없다(logo가 기울어 보이지 않게)
 */

/** 60fps 한 frame마다 남기는 관성 속도의 비율. */
const FRICTION = 0.93
/** 관성 속도의 한계(px / 60fps frame). */
const MAX_VELOCITY = 42
/** 이만큼(px) 움직이기 전까지는 drag로 보지 않는다. */
const DRAG_THRESHOLD = 7
/** 키보드 화살표 한 번에 world가 움직이는 거리(px). */
const KEY_STEP = 160

/**
 * 첫 화면에서 원이 놓이는 자리(화면 비율 0~1). 원의 bounding box 기준 —
 * left / right 중 하나로 가로를, top / bottom 중 하나로 세로를 정한다.
 */
type ScreenSpot = { left?: number; right?: number; top?: number; bottom?: number }

type Placement = {
  /** 데스크톱(1920 x 1080 기준). */
  desktop: ScreenSpot
  /** 모바일(390 x 844 기준). */
  mobile: ScreenSpot
  /** 열릴 때 출발하는 방향(px). */
  from: { x: number; y: number }
  /** floating: 진폭(px), 주기(s), 위상(rad). project마다 다르다. 회전은 없다. */
  float: { ax: number; ay: number; tx: number; ty: number; px: number; py: number }
}

/*
 * 첫 화면 배치. 세 원이 한 줄 / 한 열 / grid로 보이지 않도록 높이를 엇갈린 비대칭 삼각형이다.
 *   F45       왼쪽 위        1920에서 left 12% / top 22%
 *   TCHAIKIM  오른쪽, 조금 아래  right 12% / top 31%
 *   JADUYA    가운데 아래     left 43% / bottom 13%
 * 모바일(390 x 844)도 세 원이 모두 온전히 보인다 — 왼쪽 위 / 오른쪽 가운데 / 왼쪽 아래로 지그재그.
 */
const PLACEMENTS: Record<string, Placement> = {
  f45: {
    desktop: { left: 0.12, top: 0.22 },
    mobile: { left: 0.1, top: 0.2 },
    from: { x: -44, y: 32 },
    float: { ax: 8, ay: 12, tx: 6.4, ty: 5.2, px: 0.3, py: 1.9 },
  },
  tchaikim: {
    desktop: { right: 0.12, top: 0.31 },
    mobile: { right: 0.08, top: 0.42 },
    from: { x: 52, y: -30 },
    float: { ax: 7, ay: 10, tx: 7.8, ty: 6.1, px: 2.6, py: 0.4 },
  },
  jaduya: {
    desktop: { left: 0.43, bottom: 0.13 },
    mobile: { left: 0.16, bottom: 0.12 },
    from: { x: 10, y: 56 },
    float: { ax: 9, ay: 13, tx: 5.6, ty: 7.2, px: 4.4, py: 3.1 },
  },
}

const MOBILE_QUERY = '(max-width: 760px)'

const clampNum = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value))

/** 원 지름(px). 데스크톱 clamp(240px, 20vw, 360px), 모바일 clamp(128px, 38vw, 170px). CSS가 아니라 배치가 정한다. */
const circleSize = (vw: number, mobile: boolean) => (mobile ? clampNum(128, vw * 0.38, 170) : clampNum(240, vw * 0.2, 360))

type Layout = {
  worldW: number
  worldH: number
  rects: { x: number; y: number; w: number; h: number }[]
  /** 처음 camera(world 안에서 화면 왼쪽 위가 놓이는 자리). */
  start: { x: number; y: number }
}

/** 지금 화면 크기의 배치. */
const measureLayout = (projects: FaceProject[]) =>
  layoutFor(projects, document.documentElement.clientWidth, window.innerHeight, window.matchMedia(MOBILE_QUERY).matches)

function layoutFor(projects: FaceProject[], vw: number, vh: number, mobile: boolean): Layout {
  const worldW = vw * (mobile ? 1.6 : 1.8)
  const worldH = vh * 1.5
  // 처음 camera는 world 가운데다. 원은 그 첫 화면 안의 자리(ScreenSpot)에 놓인다 — 세 원이 모두 처음부터 보인다.
  const start = { x: (worldW - vw) / 2, y: (worldH - vh) / 2 }
  const size = circleSize(vw, mobile)
  const rects = projects.map((p) => {
    const spot = PLACEMENTS[p.id][mobile ? 'mobile' : 'desktop']
    const x = spot.left !== undefined ? spot.left * vw : vw - (spot.right ?? 0) * vw - size
    const y = spot.top !== undefined ? spot.top * vh : vh - (spot.bottom ?? 0) * vh - size
    return { x: start.x + x, y: start.y + y, w: size, h: size }
  })
  return { worldW, worldH, rects, start }
}

type AllFacesProps = {
  /** false가 되면 닫힘 motion을 재생하고 onClosed를 부른다. */
  open: boolean
  /** 닫기(CLOSE / ESC)를 요청한다. 부모가 open을 false로 바꾼다. */
  onRequestClose: () => void
  /** 닫힘 motion이 끝났다. 부모가 이때 unmount한다. */
  onClosed: () => void
  /**
   * project를 골랐을 때(짧게 누름 / Enter). Case Study 화면이 아직 없어서 지금은 연결하지 않는다 —
   * 없으면 project는 눌리는 것처럼 보이지 않는다(pointer cursor 없음).
   */
  onProjectSelect?: (projectId: string) => void
}

export default function AllFaces({ open, onRequestClose, onClosed, onProjectSelect }: AllFacesProps) {
  const projects = FACE_PROJECTS
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const floatRefs = useRef<(HTMLElement | null)[]>([])
  // 연 button(Crown). effect가 아니라 첫 render 때 잡는다 — effect는 두 번 돌 수 있고, 그때는 이미 CLOSE에 focus가 있다.
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  const [hovered, setHovered] = useState(-1)
  // 첫 render부터 배치가 있어야 여는 motion이 project를 잡을 수 있다.
  const [layout, setLayout] = useState<Layout>(() => measureLayout(projects))
  /** camera = world 안에서 화면 왼쪽 위가 놓이는 자리. 처음에는 배치가 정한 시작 자리다. */
  const cameraRef = useRef({ x: layout.start.x, y: layout.start.y })
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---------- 배치: 화면 크기가 바뀌면 다시 잰다. camera는 새 world 안으로만 다시 넣는다. ---------- */
  useEffect(() => {
    const onResize = () => setLayout(measureLayout(projects))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [projects])

  /* ---------- 열기 ---------- */
  useLayoutEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const items = itemRefs.current.filter(Boolean) as HTMLElement[]
    const tl = gsap.timeline()
    tl.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.3 : 0.45, ease: 'power2.out' }, 0)
    tl.fromTo(barRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, reduced ? 0 : 0.15)
    if (reduced) {
      tl.fromTo(items, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0.05)
    } else {
      tl.fromTo(
        items,
        {
          opacity: 0,
          scale: 0.96,
          x: (i: number) => PLACEMENTS[projects[i].id].from.x,
          y: (i: number) => PLACEMENTS[projects[i].id].from.y,
        },
        { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07 },
        0.08,
      )
    }
    // 다 들어온 뒤에는 inline 값을 지운다 — hover의 크기 / 옅어짐은 CSS가 다른 layer에서 맡는다.
    tl.set(items, { clearProps: 'opacity,transform' })
    return () => {
      tl.kill()
    }
  }, [projects, reduced])

  /* ---------- 닫기: open이 false가 되면 ---------- */
  const onClosedRef = useRef(onClosed)
  useEffect(() => {
    onClosedRef.current = onClosed
  })
  const closingStarted = useRef(false)
  useEffect(() => {
    const items = itemRefs.current.filter(Boolean) as HTMLElement[]
    if (open) {
      // 닫히는 도중에 다시 열렸다. 지금 자리에서 그대로 되돌아온다.
      if (closingStarted.current) {
        const back = gsap.timeline()
        back.to(rootRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        back.to(items, { scale: 1, duration: 0.3, ease: 'power2.out' }, 0)
        return () => {
          back.kill()
        }
      }
      return
    }
    closingStarted.current = true
    const tl = gsap.timeline({
      onComplete: () => {
        const target = returnFocus.current
        if (target && target.isConnected) target.focus({ preventScroll: true })
        onClosedRef.current()
      },
    })
    tl.to(items, { scale: reduced ? 1 : 0.97, duration: 0.45, ease: 'power2.in' }, 0)
    tl.to(rootRef.current, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0)
    return () => {
      tl.kill()
    }
  }, [open, reduced])

  /* ---------- world 이동(drag / 관성 / wheel / 키보드) + floating ---------- */
  const requestCloseRef = useRef(onRequestClose)
  const selectRef = useRef(onProjectSelect)
  useEffect(() => {
    requestCloseRef.current = onRequestClose
    selectRef.current = onProjectSelect
  })

  useEffect(() => {
    const stage = stageRef.current
    const world = worldRef.current
    if (!stage || !world) return
    const cam = cameraRef.current
    const vw = () => document.documentElement.clientWidth
    const vh = () => window.innerHeight
    const bound = () => {
      const maxX = Math.max(0, layout.worldW - vw())
      const maxY = Math.max(0, layout.worldH - vh())
      let hitX = false
      let hitY = false
      if (cam.x < 0) { cam.x = 0; hitX = true }
      if (cam.x > maxX) { cam.x = maxX; hitX = true }
      if (cam.y < 0) { cam.y = 0; hitY = true }
      if (cam.y > maxY) { cam.y = maxY; hitY = true }
      return { hitX, hitY }
    }
    const writeCamera = () => {
      world.style.transform = `translate3d(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px, 0)`
    }
    bound()
    writeCamera()

    const velocity = { x: 0, y: 0 }
    let inertia = false
    let raf = 0
    let last = 0
    const floating = !reduced

    const frame = (now: number) => {
      const frames = last ? Math.min(4, (now - last) / (1000 / 60)) : 1
      last = now
      if (inertia) {
        cam.x += velocity.x * frames
        cam.y += velocity.y * frames
        const decay = FRICTION ** frames
        velocity.x *= decay
        velocity.y *= decay
        const { hitX, hitY } = bound()
        if (hitX) velocity.x = 0
        if (hitY) velocity.y = 0
        if (Math.hypot(velocity.x, velocity.y) < 0.05) inertia = false
        writeCamera()
      }
      if (floating) {
        const t = now / 1000
        projects.forEach((p, i) => {
          const el = floatRefs.current[i]
          if (!el) return
          const f = PLACEMENTS[p.id].float
          const x = f.ax * Math.sin((2 * Math.PI * t) / f.tx + f.px)
          const y = f.ay * Math.sin((2 * Math.PI * t) / f.ty + f.py)
          el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
        })
      }
      if (floating || inertia) raf = requestAnimationFrame(frame)
      else raf = 0
    }
    const ensureLoop = () => {
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }
    if (floating) ensureLoop()

    /* drag */
    let pointerId = -1
    let downX = 0
    let downY = 0
    let lastX = 0
    let lastY = 0
    let dragging = false
    let samples: { t: number; x: number; y: number }[] = []
    let pressedItem = -1

    const itemIndexOf = (target: EventTarget | null) =>
      itemRefs.current.findIndex((el) => el && target instanceof Node && el.contains(target))

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
      pointerId = event.pointerId
      downX = lastX = event.clientX
      downY = lastY = event.clientY
      dragging = false
      samples = [{ t: performance.now(), x: event.clientX, y: event.clientY }]
      pressedItem = itemIndexOf(event.target)
      // 잡는 순간 관성은 멈춘다.
      inertia = false
      velocity.x = velocity.y = 0
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (!dragging) {
        if (Math.hypot(event.clientX - downX, event.clientY - downY) <= DRAG_THRESHOLD) return
        dragging = true
        stage.setPointerCapture(pointerId)
        stage.classList.add('is-dragging')
      }
      cam.x -= event.clientX - lastX
      cam.y -= event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      bound()
      writeCamera()
      const now = performance.now()
      samples.push({ t: now, x: event.clientX, y: event.clientY })
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift()
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = -1
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
      stage.classList.remove('is-dragging')
      if (!dragging) {
        // 7px 안에서 뗐다 = click. Case Study가 연결돼 있을 때만 그 project를 연다.
        if (event.type === 'pointerup' && pressedItem >= 0) selectRef.current?.(projects[pressedItem].id)
        // hover가 없는 터치에서는 짧게 누른 project의 이름 / 종류를 보여 준다(빈 곳을 누르면 거둔다).
        if (event.type === 'pointerup' && event.pointerType !== 'mouse') setHovered(pressedItem)
        return
      }
      dragging = false
      if (reduced) return
      // 마지막 90ms의 평균 속도를 이어받는다(px / 60fps frame).
      const first = samples[0]
      const lastSample = samples[samples.length - 1]
      const dt = Math.max(1, lastSample.t - first.t)
      if (performance.now() - lastSample.t > 80) return // 멈췄다가 놓았다
      let vx = (-(lastSample.x - first.x) / dt) * (1000 / 60)
      let vy = (-(lastSample.y - first.y) / dt) * (1000 / 60)
      const speed = Math.hypot(vx, vy)
      if (speed > MAX_VELOCITY) {
        vx *= MAX_VELOCITY / speed
        vy *= MAX_VELOCITY / speed
      }
      velocity.x = vx
      velocity.y = vy
      inertia = speed > 0.3
      if (inertia) ensureLoop()
    }

    /* wheel(trackpad 두 손가락 / 마우스 휠)도 평면을 민다. 뒤 page는 scroll되지 않는다. */
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? vh() : 1
      inertia = false
      cam.x += (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit
      cam.y += (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit
      bound()
      writeCamera()
    }

    /* 키보드: ESC 닫기, 화살표로 평면 이동, Tab은 이 화면 안에서만 돈다. 뒤 page scroll 키는 막는다. */
    const pan = { x: 0, y: 0 }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-KEY_STEP, 0],
        ArrowRight: [KEY_STEP, 0],
        ArrowUp: [0, -KEY_STEP],
        ArrowDown: [0, KEY_STEP],
      }
      const move = arrows[event.key]
      if (move) {
        event.preventDefault()
        inertia = false
        pan.x = cam.x
        pan.y = cam.y
        gsap.to(pan, {
          x: cam.x + move[0],
          y: cam.y + move[1],
          duration: reduced ? 0 : 0.45,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => {
            cam.x = pan.x
            cam.y = pan.y
            bound()
            writeCamera()
          },
        })
        return
      }
      if (['PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        return
      }
      if (event.key === ' ' && !(event.target as HTMLElement).matches('button')) {
        event.preventDefault()
        return
      }
      if (event.key === 'Enter') {
        const i = itemIndexOf(event.target)
        if (i >= 0) selectRef.current?.(projects[i].id)
        return
      }
      if (event.key !== 'Tab' || !rootRef.current) return
      const focusable = [...rootRef.current.querySelectorAll<HTMLElement>('button, [tabindex="0"]')]
      if (!focusable.length) return
      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    // 뒤 page는 어떤 경로로도 scroll되지 않는다(overflow는 건드리지 않는다 — 스크롤바가 사라지며 page가 밀리지 않게).
    const blockTouch = (event: TouchEvent) => event.preventDefault()
    const blockWheel = (event: WheelEvent) => {
      if (!stage.contains(event.target as Node)) event.preventDefault()
    }

    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', onPointerUp)
    stage.addEventListener('pointercancel', onPointerUp)
    stage.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('wheel', blockWheel, { passive: false, capture: true })
    document.addEventListener('touchmove', blockTouch, { passive: false, capture: true })
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      gsap.killTweensOf(pan)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      stage.removeEventListener('wheel', onWheel)
      document.removeEventListener('wheel', blockWheel, { capture: true })
      document.removeEventListener('touchmove', blockTouch, { capture: true })
      document.removeEventListener('keydown', onKeyDown)
      stage.classList.remove('is-dragging')
    }
  }, [layout, projects, reduced])

  // 개발 중 QA용 읽기 전용 상태(배포 build에서는 빠진다).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const debug = window as unknown as { __allFaces?: () => Record<string, unknown> }
    debug.__allFaces = () => ({ camera: { ...cameraRef.current }, layout, hovered })
    return () => {
      delete debug.__allFaces
    }
  }, [layout, hovered])

  const count = `${String(projects.length).padStart(2, '0')} PROJECTS`

  return createPortal(
    <div
      ref={rootRef}
      className="all-faces"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-faces-title"
      data-selectable={onProjectSelect ? 'true' : undefined}
    >
      <div ref={stageRef} className="all-faces__stage">
        <div
          ref={worldRef}
          className="all-faces__world"
          data-hovered={hovered >= 0 ? 'true' : undefined}
          style={{ width: layout.worldW, height: layout.worldH }}
        >
          {projects.map((project, i) => {
              const r = layout.rects[i]
              return (
                <figure
                  key={project.id}
                  ref={(el) => {
                    itemRefs.current[i] = el
                  }}
                  className={`all-faces__project${hovered === i ? ' is-hovered' : ''}`}
                  style={{ left: r.x, top: r.y, width: r.w, height: r.h } as CSSProperties}
                  tabIndex={0}
                  aria-label={`${project.title}, ${project.category}`}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(i)}
                  onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered((h) => (h === i ? -1 : h))}
                >
                  <div
                    ref={(el) => {
                      floatRefs.current[i] = el
                    }}
                    className="all-faces__float"
                  >
                    {/*
                      원형 object. 가운데 logo, 그 아래 이름. logo asset이 없는 project는 이름만 가운데에 둔다
                      (임시 fallback — 글자로 가짜 logo를 만들지 않는다).
                    */}
                    <div className="all-faces__circle" data-logo={project.logo ? undefined : 'missing'}>
                      {project.logo && (
                        <img className="all-faces__logo" src={project.logo} alt={`${project.title} 로고`} draggable={false} />
                      )}
                      <span className="all-faces__name" aria-hidden="true">
                        {project.title}
                      </span>
                    </div>
                  </div>
                </figure>
              )
          })}
        </div>
      </div>

      <div ref={barRef} className="all-faces__bar">
        <p className="all-faces__label">
          <span id="all-faces-title">ALL FACES</span>
          <span className="all-faces__count">{count}</span>
        </p>
        <button ref={closeRef} type="button" className="all-faces__close" onClick={onRequestClose}>
          CLOSE <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
