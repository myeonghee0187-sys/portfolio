import { useEffect, useRef, type CSSProperties } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { FACE_PROJECTS } from './facesData'

/**
 * 모바일 / 터치 / reduced motion용 FACES. pin·WebGL 없이 같은 프로젝트 영상을
 * 손가락으로 넘겨 보는 native 가로 strip이다(최종 모바일 디자인은 추후).
 *
 * 영상은 원본 비율 그대로, 화면에 걸린 것만 재생한다. reduced motion에서는 자동 재생하지 않고 첫 화면만 둔다.
 */
export default function FacesRail() {
  const listRef = useRef<HTMLOListElement>(null)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const list = listRef.current
    if (!list || prefersReducedMotion) return
    const videos = Array.from(list.querySelectorAll('video'))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) video.play().catch(() => {})
          else video.pause()
        }
      },
      { threshold: 0.25 },
    )
    videos.forEach((video) => observer.observe(video))
    return () => {
      observer.disconnect()
      videos.forEach((video) => video.pause())
    }
  }, [prefersReducedMotion])

  return (
    <ol ref={listRef} className="faces__rail">
      {FACE_PROJECTS.map((project) => (
        <li key={project.id} className="faces__slide" style={{ '--aspect': project.aspect } as CSSProperties}>
          <video
            className="faces__visual"
            // #t: 재생 전에도 첫 화면이 보이게 한다(Safari는 preload만으로는 첫 프레임을 그리지 않는다).
            src={`${project.video}#t=0.001`}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            draggable={false}
          />
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
