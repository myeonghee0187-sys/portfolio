import { useEffect, useRef, useState, type CSSProperties } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { FACE_PROJECTS, type FaceProject } from './facesData'
import LoopVideo from './LoopVideo'
import { useAllFacesOpen } from '../AllFaces/allFacesStore'

/**
 * 모바일 / 터치 / reduced motion용 FACES. pin·WebGL 없이 같은 프로젝트 영상을
 * 손가락으로 넘겨 보는 native 가로 strip이다(최종 모바일 디자인은 추후).
 *
 * 영상은 원본 비율 그대로, 화면에 걸린 것만 재생한다. reduced motion에서는 자동 재생하지 않고 첫 화면만 둔다.
 * loop 경계는 WebGL FACES와 같이 0.2초 동안 섞는다(LoopVideo).
 */
export default function FacesRail() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const allFacesOpen = useAllFacesOpen()

  return (
    <ol className="faces__rail">
      {FACE_PROJECTS.map((project) => (
        <RailSlide key={project.id} project={project} canPlay={!prefersReducedMotion && !allFacesOpen} />
      ))}
    </ol>
  )
}

function RailSlide({ project, canPlay }: { project: FaceProject; canPlay: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <li ref={ref} className="faces__slide" style={{ '--aspect': project.aspect } as CSSProperties}>
      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} 완성 웹사이트 보기`} draggable={false}>
        {/* #t: 재생 전에도 첫 화면이 보이게 한다(Safari는 preload만으로는 첫 프레임을 그리지 않는다). */}
        <LoopVideo className="faces__visual" src={`${project.media}#t=0.001`} playing={canPlay && inView} />
      </a>
      <div className="faces__slide-meta">
        <p className="faces__meta-index">{project.index}</p>
        <h3 className="faces__meta-title">{project.title}</h3>
        <p className="faces__meta-category">{project.category}</p>
      </div>
    </li>
  )
}
