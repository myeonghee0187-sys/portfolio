import { useEffect, useRef } from 'react'
import { FACE_ASPECT, paintFaceVisual } from './facePainter'
import { FACE_PROJECTS, type FaceProject } from './facesData'

/** WebGL slider와 같은 painter로 그린 프로젝트 화면. 실제 이미지가 오면 <img>로 바뀐다. */
function FaceVisual({ project }: { project: FaceProject }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const width = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2))
      if (width === 0) return
      canvas.width = width
      canvas.height = Math.round(width / FACE_ASPECT)
      paintFaceVisual(canvas, project)
    }
    draw()
    // 웹폰트가 뜬 뒤 placeholder 글자를 다시 그린다.
    document.fonts?.load('40px Anton').then(draw)
  }, [project])

  return <canvas ref={ref} className="faces__visual" aria-hidden="true" />
}

/**
 * 모바일 / 터치 / reduced motion용 FACES. pin·WebGL 없이 같은 프로젝트 화면을
 * 손가락으로 넘겨 보는 native 가로 strip이다(최종 모바일 디자인은 추후).
 */
export default function FacesRail() {
  return (
    <ol className="faces__rail">
      {FACE_PROJECTS.map((project) => (
        <li key={project.id} className="faces__slide">
          <FaceVisual project={project} />
          <div className="faces__slide-meta">
            <p className="faces__meta-index">{project.index}</p>
            <h3 className="faces__meta-title">{project.title}</h3>
            <p className="faces__meta-category">{project.category}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
