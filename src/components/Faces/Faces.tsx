import { useRef, useState } from 'react'
import { FACE_PROJECTS, type FaceProject } from './facesData'
import useFacesInteraction from './useFacesInteraction'
import './Faces.css'

type FacesProps = {
  /** 가로 트랙 pin / drag 연출을 켤지. 터치 기기, reduced motion, 좁은 화면에서는 끈다. */
  interactive: boolean
  /** Intro가 끝났는지. About과 같은 이유로 측정은 스크롤바가 생긴 뒤에 한다. */
  ready: boolean
}

/**
 * 프로젝트 이미지 자리의 임시 placeholder. mechanic(간격·mask·active·drag) 검수용이다.
 * 실제 이미지가 들어오면 이 안만 바뀌고 트랙 구조는 그대로다.
 */
function FaceVisual({ project }: { project: FaceProject }) {
  return (
    <div className="faces__visual">
      <span className="faces__visual-index">{project.index}</span>
      <div className="faces__visual-text">
        <h3 className="faces__visual-title">{project.title}</h3>
        <p className="faces__visual-category">{project.category}</p>
      </div>
    </div>
  )
}

/**
 * FACES — PHASE 1 interaction prototype.
 *
 * 프로젝트 4개가 하나의 가로 트랙 위에 있고, 화면 중앙의 rounded-square(lens)는 움직이지 않는다.
 * 트랙이 lens 뒤로 지나가며, lens 안에서는 같은 트랙이 선명하게 보인다.
 *
 *   faces__outer-layer  트랙 전체. 조금 어둡고 muted.
 *   faces__lens         고정된 viewing window. 별도의 카드가 아니라 트랙을 잘라 보여주는 mask다.
 *     faces__inner-layer  lens 안에서 stage와 같은 좌표계를 다시 만든다.
 *       faces__track--inner 바깥 트랙과 같은 --track-x를 쓰는 복제. 선명하게 보인다.
 *
 * 바깥 트랙이 실제 목록(스크린리더가 읽는 쪽)이고, lens 안의 복제는 aria-hidden이다.
 */
export default function Faces({ interactive, ready }: FacesProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const outerTrackRef = useRef<HTMLOListElement>(null)
  const innerTrackRef = useRef<HTMLDivElement>(null)
  const innerLayerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useFacesInteraction({
    enabled: interactive && ready,
    sectionRef,
    stageRef,
    outerTrackRef,
    innerTrackRef,
    innerLayerRef,
    onActiveChange: setActive,
  })

  return (
    <section
      ref={sectionRef}
      className={`faces ${interactive ? 'faces--interactive' : 'faces--static'}`}
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
          <ol ref={outerTrackRef} className="faces__track">
            {FACE_PROJECTS.map((project) => (
              <li key={project.id} className="faces__project">
                <FaceVisual project={project} />
              </li>
            ))}
          </ol>
        </div>

        {interactive && (
          <div className="faces__lens" aria-hidden="true">
            <div ref={innerLayerRef} className="faces__inner-layer">
              <div ref={innerTrackRef} className="faces__track faces__track--inner">
                {FACE_PROJECTS.map((project) => (
                  <div key={project.id} className="faces__project">
                    <FaceVisual project={project} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* active project 정보. 위치·모양은 임시다(Figma 전). */}
        {interactive && (
          <div className="faces__meta">
            {FACE_PROJECTS.map((project, i) => (
              <div
                key={project.id}
                className={`faces__meta-item ${
                  i === active ? 'is-active' : i < active ? 'is-before' : 'is-after'
                }`}
                aria-hidden={i !== active}
              >
                <p className="faces__meta-index">{project.index}</p>
                <p className="faces__meta-title">{project.title}</p>
                <p className="faces__meta-category">{project.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
