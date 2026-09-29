import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { FACE_PROJECTS } from '../Faces/facesData'
import './AllFaces.css'

/*
 * ALL FACES — Digital Crown을 누르면 열리는 전체 project 화면.
 *
 * project가 3개뿐이라 화면은 완전히 고정된 한 장(100vh / 100dvh)이다. 세 원형 object가 한 화면 안의 정해진 자리에
 * 비대칭으로 놓이고, 열린 뒤에는 스스로 움직이지 않는다 — world / drag / 관성 / wheel 이동 / floating이 없다.
 * Grid / carousel이 아니다. Watch는 이 화면에 없다.
 *
 * project는 영상 card가 아니라 원형 object다(가운데 logo + 이름). 이 화면은 영상을 하나도 쓰지 않는다 —
 * FACES section은 같은 FACE_PROJECTS의 media를 그대로 쓴다(데이터는 공용, 그리는 쪽만 다르다).
 *
 *   overlay   언제나 정확히 한 화면. 문서 scroll은 생기지 않고, 열려 있는 동안 뒤 page는 scroll되지 않는다
 *   자리      CSS가 화면 비율로 정한다(AllFaces.css의 --spot-*). 크기가 바뀌어도 JS로 다시 재지 않는다
 *   motion    여닫을 때만. 열린 뒤 좌표는 고정이다
 *   hover     원이 1.035배, 테두리가 조금 선명해지고 나머지 원은 옅어진다
 *   click     onProjectSelect(짧게 누름 / Enter). Case Study가 아직 없어서 지금은 연결돼 있지 않다
 */

/**
 * 원이 놓이는 자리(화면 비율 %). 원의 bounding box 기준 — left / right 중 하나로 가로를, top / bottom 중 하나로 세로를 정한다.
 * 세 원이 한 줄 / 한 열 / grid로 보이지 않도록 높이를 엇갈린 비대칭 삼각형이다.
 *   데스크톱  F45 왼쪽 위 / TCHAIKIM 오른쪽, 조금 아래 / JADUYA 가운데 아래
 *   모바일    왼쪽 위 / 오른쪽 가운데 / 왼쪽 아래로 지그재그(390 x 844에서 세 원이 모두 온전히 보인다)
 */
type Spot = { left?: number; right?: number; top?: number; bottom?: number }

type Placement = {
  desktop: Spot
  mobile: Spot
  /** 열릴 때 출발하는 방향(px). 들어온 뒤에는 0이다. */
  from: { x: number; y: number }
}

const PLACEMENTS: Record<string, Placement> = {
  f45: { desktop: { left: 12.5, top: 24 }, mobile: { left: 10, top: 20 }, from: { x: -44, y: 32 } },
  tchaikim: { desktop: { right: 12.5, top: 33 }, mobile: { right: 8, top: 42 }, from: { x: 52, y: -30 } },
  jaduya: { desktop: { left: 44, bottom: 14 }, mobile: { left: 16, bottom: 12 }, from: { x: 10, y: 56 } },
}

/** 자리를 CSS 변수로. 쓰지 않는 변(auto)은 비워 둔다. */
function spotStyle({ desktop, mobile }: Placement) {
  const style: Record<string, string> = {}
  for (const [prefix, spot] of [['d', desktop], ['m', mobile]] as const) {
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      style[`--${prefix}-${side}`] = spot[side] === undefined ? 'auto' : `${spot[side]}%`
    }
  }
  return style as CSSProperties
}

/** 뒤 page를 scroll시키는 키. button 위의 Space / Enter는 막지 않는다. */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

type AllFacesProps = {
  /** false가 되면 닫힘 motion을 재생하고 onClosed를 부른다. */
  open: boolean
  /** 닫기(CLOSE / ESC)를 요청한다. 부모가 open을 false로 바꾼다. */
  onRequestClose: () => void
  /** 닫힘 motion이 끝났다. 부모가 이때 unmount한다. */
  onClosed: () => void
  /**
   * project를 골랐을 때(click / Enter). Case Study 화면이 아직 없어서 지금은 연결하지 않는다 —
   * 가짜 상세 화면을 만들지 않는다.
   */
  onProjectSelect?: (projectId: string) => void
}

export default function AllFaces({ open, onRequestClose, onClosed, onProjectSelect }: AllFacesProps) {
  const projects = FACE_PROJECTS
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  // 연 button(Crown). effect가 아니라 첫 render 때 잡는다 — effect는 두 번 돌 수 있고, 그때는 이미 CLOSE에 focus가 있다.
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  const [hovered, setHovered] = useState(-1)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    // 다 들어온 뒤에는 inline 값을 지운다 — 이후 좌표는 CSS 자리 그대로 고정이고, hover는 CSS가 맡는다.
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

  /* ---------- 키보드 / 뒤 page scroll 막기 ---------- */
  const requestCloseRef = useRef(onRequestClose)
  const selectRef = useRef(onProjectSelect)
  useEffect(() => {
    requestCloseRef.current = onRequestClose
    selectRef.current = onProjectSelect
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const itemIndexOf = (target: EventTarget | null) =>
      itemRefs.current.findIndex((el) => el && target instanceof Node && el.contains(target))

    /* ESC 닫기, Enter로 project 고르기, Tab은 이 화면 안에서만 돈다. 뒤 page scroll 키는 막는다. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (SCROLL_KEYS.has(event.key)) {
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
      if (event.key !== 'Tab') return
      const focusable = [...root.querySelectorAll<HTMLElement>('button, [tabindex="0"]')]
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
    const block = (event: Event) => event.preventDefault()
    document.addEventListener('wheel', block, { passive: false, capture: true })
    document.addEventListener('touchmove', block, { passive: false, capture: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('wheel', block, { capture: true })
      document.removeEventListener('touchmove', block, { capture: true })
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [projects])

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
      <div className="all-faces__stage" data-hovered={hovered >= 0 ? 'true' : undefined}>
        {projects.map((project, i) => (
          <figure
            key={project.id}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={`all-faces__project${hovered === i ? ' is-hovered' : ''}`}
            style={spotStyle(PLACEMENTS[project.id])}
            tabIndex={0}
            aria-label={`${project.title}, ${project.category}`}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(i)}
            onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered((h) => (h === i ? -1 : h))}
            onClick={() => onProjectSelect?.(project.id)}
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
          </figure>
        ))}
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
