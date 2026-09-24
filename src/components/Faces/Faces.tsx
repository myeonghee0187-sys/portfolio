import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'
import FacesRail from './FacesRail'
import useFacesInteraction from './useFacesInteraction'
import './Faces.css'

type FacesProps = {
  /** 가로 rail pin / drag 연출을 켤지. 터치 기기, reduced motion, 좁은 화면에서는 끈다. */
  interactive: boolean
  /** Intro가 끝났는지. About과 같은 이유로 측정은 스크롤바가 생긴 뒤에 한다. */
  ready: boolean
}

/**
 * active project 정보. text block은 하나뿐이다.
 * 바뀔 때는 이전 글자가 먼저 빠지고(opacity 0, -8px) 그 다음에 새 글자가 들어온다(+8px -> 0).
 * 두 제목이 한 자리에서 겹쳐 읽히는 순간이 없다.
 */
function FacesMeta({ active }: { active: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(active)

  // 새 글자가 자리에 들어온다. 첫 렌더에서는 그냥 보인다.
  const isFirst = useRef(true)
  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const tween = gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [shown])

  // active가 바뀌면 지금 글자를 먼저 빼고, 다 빠진 뒤에 가장 최근 active로 바꾼다.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tween =
      active === shown
        ? // 빠지는 도중에 원래 project로 돌아온 경우. 그대로 다시 보이게만 한다.
          gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.16, ease: 'power1.out' })
        : gsap.to(el, {
            autoAlpha: 0,
            y: -8,
            duration: 0.14,
            ease: 'power1.in',
            onComplete: () => setShown(active),
          })
    return () => {
      tween.kill()
    }
  }, [active, shown])

  const project = FACE_PROJECTS[shown]

  return (
    // 스크린리더는 rail의 segment마다 붙은 이름을 읽는다. 이 block은 시각용이다.
    <div className="faces__meta" aria-hidden="true">
      <div ref={ref} className="faces__meta-block">
        <p className="faces__meta-index">{project.index}</p>
        <p className="faces__meta-title">{project.title}</p>
        <p className="faces__meta-category">{project.category}</p>
      </div>
    </div>
  )
}

/**
 * FACES — 하나로 이어진 project rail과, 그것을 잘라 보여주는 Watch.
 *
 * Watch는 이 섹션이 따로 만들지 않는다. Hero / About에서 오던 WatchStage의 Watch가 그대로 남아 있고,
 * 그 display 안에 같은 rail의 복제(FacesRail inner)가 들어 있다.
 *
 *   faces__stage       pin 되는 한 화면
 *     faces__rail--outer   이 섹션의 rail. Watch 뒤를 지나가며 조금 muted하게 보인다.
 *   (WatchStage) watch__screen > watch__stream > faces__rail--inner
 *                        Watch display 안에서만 보이는 같은 rail. 같은 --track-x를 쓰고 선명하다.
 */
export default function Faces({ interactive, ready }: FacesProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLOListElement & HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useFacesInteraction({
    enabled: interactive && ready,
    sectionRef,
    stageRef,
    railRef,
    onActiveChange: setActive,
  })

  return (
    <section
      ref={sectionRef}
      className={`faces faces-metrics ${interactive ? 'faces--interactive' : 'faces--static'}`}
      id="faces"
      aria-labelledby="faces-title"
    >
      <div ref={stageRef} className="faces__stage">
        <header className="faces__label">
          <h2 id="faces-title" className="faces__label-title">
            FACES
          </h2>
          <p className="faces__label-count">
            {String(FACE_PROJECTS.length).padStart(2, '0')} PROJECTS
          </p>
        </header>

        <div className="faces__outer-layer">
          <FacesRail variant="outer" railRef={railRef} />
        </div>

        {/* 위치·모양은 임시다(Figma 전). Watch 바로 아래 한 곳에만 있다. */}
        {interactive && <FacesMeta active={active} />}
      </div>
    </section>
  )
}
