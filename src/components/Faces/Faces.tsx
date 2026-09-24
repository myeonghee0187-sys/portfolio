import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'
import FacesRail from './FacesRail'
import useFacesInteraction from './useFacesInteraction'
import './Faces.css'

type FacesProps = {
  /** WebGL slider / pin / drag를 켤지. 터치 기기, reduced motion, 좁은 화면에서는 끈다. */
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
    // 스크린리더는 아래 목록을 읽는다. 이 block은 시각용이다.
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
 * FACES — 끝이 없는 project slider와, 그것을 선명하게 잘라 보여주는 Watch.
 *
 * Watch는 이 섹션이 만들지 않는다. Hero / About에서 오던 WatchStage의 Watch가 그대로 남아 있고,
 * Watch case의 display 자리에 구멍이 있어서 이 섹션의 WebGL canvas를 그대로 들여다본다.
 *
 *   세로 scroll = page 진행. pin 동안 project 4개를 한 바퀴 돌고 다음으로 넘어간다.
 *   drag        = 자유 탐색. 몇 바퀴든 돈다.
 */
export default function Faces({ interactive, ready }: FacesProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState(0)

  useFacesInteraction({
    enabled: interactive && ready,
    sectionRef,
    stageRef,
    canvasRef,
    onActiveChange: setActive,
  })

  /*
   * section / stage는 두 모드에서 같은 element로 남긴다.
   * stage는 pin 중에 ScrollTrigger의 pin-spacer 안으로 옮겨져 있어서, React가 이것을 지우려 하면
   * (pin이 풀리기 전이라) removeChild가 실패한다. 모드가 바뀔 때는 stage 안쪽만 바뀐다.
   */
  return (
    <section
      ref={sectionRef}
      className={`faces ${interactive ? 'faces--interactive' : 'faces--static'}`}
      id="faces"
      aria-label="Projects"
    >
      <div ref={stageRef} className="faces__stage">
        {interactive ? (
          <>
            <canvas ref={canvasRef} className="faces__canvas" aria-hidden="true" />

            {/* 화면에는 WebGL plane만 보인다. 프로젝트 목록 자체는 DOM에 그대로 있다. */}
            <ol className="faces__sr">
              {FACE_PROJECTS.map((project) => (
                <li key={project.id}>
                  <h3>
                    {project.index} {project.title}
                  </h3>
                  <p>{project.category}</p>
                </li>
              ))}
            </ol>

            {/*
              Watch 아래의 한 줄(footer band). 가운데는 active project 정보, 오른쪽 끝은 Crown 자리다.
              Crown 자체는 About에서 오던 Watch의 Crown이 그대로 이 자리로 옮겨 온다(useScrollScene).
              여기에는 그 크기만큼의 빈 자리만 있다.
            */}
            <div className="faces__footer">
              <FacesMeta active={active} />
              <div className="faces__crown-slot" aria-hidden="true" />
            </div>
          </>
        ) : (
          <FacesRail />
        )}
      </div>
    </section>
  )
}
