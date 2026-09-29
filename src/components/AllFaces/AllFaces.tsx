import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { FACE_PROJECTS } from '../Faces/facesData'
import { DESKTOP_PRESETS, MOBILE_PRESETS, MOBILE_QUERY, orbitOffset } from './allFacesPresets'
import { getAllFacesPreset } from './allFacesStore'
import './AllFaces.css'

/*
 * ALL FACES — Digital Crown을 누르면 열리는 전체 project 화면. 세 project를 고르는 "Watch face / dial" 선택 화면이다.
 *
 * 화면(overlay)은 고정된 한 장(100vh / 100dvh)이다 — world / drag / 관성 / floating이 없다.
 *   그룹      세 dial은 흩어진 원 세 개가 아니라 하나의 face selector다. 화면 가운데의 shared orbit(얇은 원 하나)
 *             위에 세 dial이 놓이고, 그 바깥을 눈금 arc ring이 한 번 더 두른다. 가운데의 ALL FACES가 title이다(위쪽 bar에는 CLOSE만).
 *   구도      orbit 위의 자리만 다른 A / B / C(allFacesPresets.ts). 여는 동작에서 한 번 고르고(allFacesStore),
 *             열려 있는 동안은 바뀌지 않는다. 직전 구도는 다시 고르지 않는다.
 *   dial      이미지 / logo 없이 글자(FACE 01 · project 이름 · 설명 두 줄)와 옅은 눈금 rim(돌지 않는다)뿐이다.
 *   motion    dial 위치 / 글자 / rim은 움직이지 않는다. 그룹의 바깥 arc ring만 60초에 한 바퀴 돈다(reduced motion에서는 멈춘다).
 *   hover     dial이 1.04배, rim이 Electric Ice로 선명해지고 나머지 dial은 옅어진다. 이동(translate)은 없다.
 *   click     onProjectSelect(click / Enter). Case Study가 아직 없어서 지금은 연결돼 있지 않다(가짜 링크 없음).
 * 이 화면은 영상 / 이미지를 쓰지 않는다 — FACES section은 같은 FACE_PROJECTS의 media를 그대로 쓴다.
 */

/** dial 안의 설명 두 줄(FACES metadata의 category를 dial 폭에 맞게 나눈 것). */
const DIAL_LINES: Record<string, [string, string]> = {
  tchaikim: ['FASHION BRAND', 'WEB REDESIGN'],
  jaduya: ['MOBILE UX/UI', 'PLATFORM'],
  f45: ['RESPONSIVE WEB', 'REDESIGN'],
}

/** 열릴 때 dial이 출발하는 거리(px, 30~50). 그룹 중심에서 바깥쪽으로 조금 밀린 자리에서 제자리로 온다. */
const ENTER_DISTANCE = 40

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

/** 그룹 중심에서 dial 쪽(orbit 바깥쪽)을 향한 ENTER_DISTANCE 길이의 출발 offset. */
function enterOffset(angle?: number) {
  if (angle === undefined) return { x: 0, y: ENTER_DISTANCE }
  const a = (angle * Math.PI) / 180
  return { x: Math.cos(a) * ENTER_DISTANCE, y: Math.sin(a) * ENTER_DISTANCE }
}

export default function AllFaces({ open, onRequestClose, onClosed, onProjectSelect }: AllFacesProps) {
  const projects = FACE_PROJECTS
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  // 연 button(Crown). effect가 아니라 첫 render 때 잡는다 — effect는 두 번 돌 수 있고, 그때는 이미 CLOSE에 focus가 있다.
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  const [hovered, setHovered] = useState(-1)
  /*
   * 이번에 열린 동안의 구도. 구도(A / B / C)는 여는 동작에서 이미 정해졌고(allFacesStore), 여기서는 읽기만 한다.
   * 데스크톱 / 모바일 좌표는 열 때 한 번 고른다 — 열려 있는 동안 창 크기가 바뀌어도 dial이 다른 자리로 뛰지 않는다.
   */
  const [scene] = useState(() => {
    const key = getAllFacesPreset()
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    return { key, angles: (mobile ? MOBILE_PRESETS : DESKTOP_PRESETS)[key] }
  })
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---------- 열기 ---------- */
  useLayoutEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const items = itemRefs.current.filter(Boolean) as HTMLElement[]
    const tl = gsap.timeline()
    tl.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.3 : 0.45, ease: 'power2.out' }, 0)
    tl.fromTo(barRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, reduced ? 0 : 0.15)
    tl.fromTo(orbitRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.3 : 0.9, ease: 'power2.out' }, 0.05)
    if (reduced) {
      tl.fromTo(items, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0.05)
    } else {
      tl.fromTo(
        items,
        {
          opacity: 0,
          scale: 0.96,
          // 그룹 중심에서 바깥쪽으로 ENTER_DISTANCE만큼 밀린 자리에서 출발해 orbit 위의 자리에 정착한다.
          x: (i: number) => enterOffset(scene.angles[projects[i].id]).x,
          y: (i: number) => enterOffset(scene.angles[projects[i].id]).y,
        },
        { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.78, ease: 'power3.out', stagger: 0.07 },
        0.08,
      )
    }
    // 다 들어온 뒤에는 inline 값을 지운다 — 이후 좌표는 CSS 자리 그대로 고정이고, hover는 CSS가 맡는다.
    tl.set(items, { clearProps: 'opacity,transform' })
    return () => {
      tl.kill()
    }
  }, [projects, reduced, scene])

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

  return createPortal(
    <div
      ref={rootRef}
      className="all-faces"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-faces-title"
      data-selectable={onProjectSelect ? 'true' : undefined}
      data-preset={scene.key}
    >
      <div className="all-faces__stage" data-hovered={hovered >= 0 ? 'true' : undefined}>
        {/*
          shared orbit. 세 dial을 하나로 묶는 층 — dial 중심을 지나는 얇은 원(고정)과, 그 바깥의 눈금 arc ring(64초에 한 바퀴).
          선과 눈금뿐이고 점(dot / marker)은 없다. 가운데의 ALL FACES가 그룹의 title이자 기준점이다(dialog 이름도 이 글자다).
        */}
        <div ref={orbitRef} className="all-faces__orbit" aria-hidden="true">
          <span className="all-faces__orbit-path" />
          <span className="all-faces__orbit-ring">
            <span className="all-faces__orbit-ticks" />
          </span>
          <span id="all-faces-title" className="all-faces__group-label">
            ALL FACES
          </span>
        </div>
        {projects.map((project, i) => {
          const offset = orbitOffset(scene.angles[project.id] ?? 90 + i * 120)
          const [line1, line2] = DIAL_LINES[project.id] ?? [project.category, '']
          const style = { '--ox': offset.x, '--oy': offset.y } as CSSProperties
          return (
            <figure
              key={project.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              className={`all-faces__project${hovered === i ? ' is-hovered' : ''}`}
              style={style}
              tabIndex={0}
              aria-label={`FACE ${project.index}, ${project.title}, ${project.category}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((h) => (h === i ? -1 : h))}
              onClick={() => onProjectSelect?.(project.id)}
            >
              {/*
                project dial. 층: 몸체(Carbon / Titanium dark) -> 고정 외곽선 -> 옅은 눈금 rim -> 글자. 모두 돌지 않는다.
              */}
              <div className="all-faces__dial" aria-hidden="true">
                <span className="all-faces__rim" />
                <div className="all-faces__dial-content">
                  <span className="all-faces__face">FACE {project.index}</span>
                  <span className="all-faces__name">{project.title}</span>
                  <span className="all-faces__desc">
                    <span>{line1}</span>
                    {line2 && <span>{line2}</span>}
                  </span>
                </div>
              </div>
            </figure>
          )
        })}
      </div>

      {/* 위쪽 bar에는 CLOSE만 있다 — title은 cluster 가운데의 ALL FACES 하나다. */}
      <div ref={barRef} className="all-faces__bar">
        <button ref={closeRef} type="button" className="all-faces__close" onClick={onRequestClose}>
          CLOSE <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
