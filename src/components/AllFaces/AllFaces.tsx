import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { FACE_PROJECTS } from '../Faces/facesData'
import { MOBILE_QUERY, randomFloat, randomLayout } from './allFacesLayout'
import './AllFaces.css'

/*
 * ALL FACES — Digital Crown을 누르면 열리는 전체 project 화면.
 *
 * 화면(overlay)은 고정된 한 장(100vh / 100dvh)이다 — world / drag / 관성 / wheel 이동 / camera pan이 없다.
 * 대신 세 원형 object가 "공중에 떠 있는 전시 object"처럼 보이도록
 *   1. 열 때(mount)마다 안전 영역 안에서 새 base 자리를 한 번 뽑는다(allFacesLayout.ts). 열려 있는 동안은 다시 뽑지 않는다.
 *      닫으면 unmount되므로 다시 열거나 새로고침하면 배치가 바뀐다.
 *   2. 각 원은 그 base 자리 근처에서만 아주 작게 떠 있다(CSS animation, project마다 다른 진폭 / 주기 / 위상).
 *
 * project는 영상 card가 아니라 원형 object다(원을 꽉 채운 배경 이미지 + 가운데 logo). 이 화면은 영상을 쓰지 않는다 —
 * FACES section은 같은 FACE_PROJECTS의 media를 그대로 쓴다(데이터는 공용, 그리는 쪽만 다르다).
 *
 *   hover  원이 1.03배, 테두리가 조금 선명해지고 나머지 원은 옅어진다(floating과 다른 layer라 서로 덮어쓰지 않는다)
 *   click  onProjectSelect(click / Enter). Case Study가 아직 없어서 지금은 연결돼 있지 않다
 */

/**
 * 원 지름 대비 logo 폭. Figma node 안의 logo 비율을 원에 맞게 옮겼다(F45는 작은 심볼, TCHAIKIM은 두 줄 wordmark,
 * JADUYA는 캐릭터 + 글자). 원을 답답하게 채우지 않도록 60%를 넘지 않는다.
 */
const LOGO_WIDTH: Record<string, number> = { f45: 38, tchaikim: 58, jaduya: 54 }

/** 열릴 때 출발하는 방향(px). 들어온 뒤에는 0이다. */
const ENTER_FROM: Record<string, { x: number; y: number }> = {
  f45: { x: -44, y: 32 },
  tchaikim: { x: 52, y: -30 },
  jaduya: { x: 10, y: 56 },
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
  /*
   * 이번에 열린 동안의 배치와 floating 값. 첫 render에서 한 번만 뽑는다(state 초기값) — 열려 있는 동안 창 크기가 바뀌거나
   * 다시 render되어도 바뀌지 않는다. 닫으면 이 component가 unmount되므로 다음에 열 때 새로 뽑는다.
   */
  const [scene] = useState(() => {
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    return {
      places: randomLayout(projects.map((p) => p.id), vw, vh, mobile),
      floats: projects.map(() => randomFloat(mobile)),
    }
  })
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
          x: (i: number) => ENTER_FROM[projects[i].id]?.x ?? 0,
          y: (i: number) => ENTER_FROM[projects[i].id]?.y ?? 40,
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
        {projects.map((project, i) => {
          const place = scene.places[i]
          const float = scene.floats[i]
          const style = {
            '--cx': place.cx,
            '--cy': place.cy,
            '--ax': `${float.ax.toFixed(1)}px`,
            '--ay': `${float.ay.toFixed(1)}px`,
            '--rot': `${float.rot.toFixed(2)}deg`,
            '--breath': float.scale.toFixed(3),
            '--dx': `${float.dx.toFixed(2)}s`,
            '--dy': `${float.dy.toFixed(2)}s`,
            '--px': `${float.px.toFixed(2)}s`,
            '--py': `${float.py.toFixed(2)}s`,
            '--logo-w': `${LOGO_WIDTH[project.id] ?? 50}%`,
          } as CSSProperties
          return (
            <figure
              key={project.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              className={`all-faces__project${hovered === i ? ' is-hovered' : ''}`}
              style={style}
              tabIndex={0}
              aria-label={`${project.title}, ${project.category}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((h) => (h === i ? -1 : h))}
              onClick={() => onProjectSelect?.(project.id)}
            >
              {/* floating: 가로(drift-x)와 세로 + 회전 + 숨쉬기(drift-y)를 다른 주기로 겹친다. hover 크기는 안쪽 __circle. */}
              <div className="all-faces__drift-x">
                <div className="all-faces__drift-y">
                  {/*
                    원형 object. 원을 꽉 채운 배경 이미지 위 정중앙에 logo.
                    asset이 없는 project는 이름만 가운데에 둔다(임시 fallback — 글자로 가짜 logo를 만들지 않는다).
                  */}
                  <div className="all-faces__circle" data-visual={project.orbImage ? 'image' : 'text'}>
                    {project.orbImage && <img className="all-faces__bg" src={project.orbImage} alt="" draggable={false} />}
                    {project.logo ? (
                      <img className="all-faces__logo" src={project.logo} alt={`${project.title} 로고`} draggable={false} />
                    ) : (
                      <span className="all-faces__name" aria-hidden="true">
                        {project.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </figure>
          )
        })}
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
