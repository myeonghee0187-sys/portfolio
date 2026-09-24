import type { Ref } from 'react'
import { FACE_PROJECTS, type FaceProject } from './facesData'

/**
 * 프로젝트 화면 자리의 임시 placeholder. 카드가 아니라 segment를 꽉 채우는 "화면"이다.
 * index / 제목 / category 같은 metadata는 넣지 않는다(Watch 아래 metadata 한 곳에만 있다).
 * 실제 이미지가 들어오면 이 안만 <img>로 바뀌고 rail 구조는 그대로다.
 */
function FaceScreen({ project }: { project: FaceProject }) {
  return (
    <div className={`faces__screen faces__screen--${project.id}`} aria-hidden="true">
      <div className="faces__screen-bar">
        <span className="faces__screen-logo">{project.title.split(' ')[0]}</span>
        <span className="faces__screen-nav" />
      </div>
      <div className="faces__screen-art">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

type FacesRailProps = {
  /**
   * outer - FACES stage 위의 실제 목록(ol). 스크린리더가 읽는 쪽이다.
   * inner - Watch 화면 안의 복제. 같은 DOM·같은 크기·같은 --track-x를 쓴다.
   */
  variant: 'outer' | 'inner'
  railRef?: Ref<HTMLOListElement & HTMLDivElement>
}

/**
 * 하나로 이어진 project rail. segment 사이에 gap도 테두리도 없다.
 * 바깥 / 안쪽 두 벌이 이 컴포넌트 하나에서 나와서 구조가 어긋날 수 없다.
 */
export default function FacesRail({ variant, railRef }: FacesRailProps) {
  const Rail = variant === 'outer' ? 'ol' : 'div'
  const Segment = variant === 'outer' ? 'li' : 'div'

  return (
    <Rail ref={railRef} className={`faces__rail faces__rail--${variant}`}>
      {FACE_PROJECTS.map((project) => (
        <Segment key={project.id} className={`faces__segment faces__segment--${project.id}`}>
          <FaceScreen project={project} />
          {variant === 'outer' && (
            <div className="faces__sr">
              <h3>
                {project.index} {project.title}
              </h3>
              <p>{project.category}</p>
            </div>
          )}
        </Segment>
      ))}
    </Rail>
  )
}
