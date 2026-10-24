import type { MouseEvent } from 'react'
import type { ProjectNavigateHandler, ProjectTransitionVariant } from './ProjectHeader'
import './NextFace.css'

export type NextFaceProject = {
  title: string
  href?: string
  label?: string
  transition?: ProjectTransitionVariant
}

type NextFaceProps = {
  project: NextFaceProject
  onNavigate?: ProjectNavigateHandler
}

function NextFaceContent({ project }: Pick<NextFaceProps, 'project'>) {
  return (
    <span className="next-face__content">
      <span className="next-face__eyebrow">CONTINUE EXPLORING</span>
      <span className="next-face__label">{project.label ?? 'NEXT FACE'}</span>
      <span className="next-face__row">
        <span className="next-face__title">{project.title}</span>
        <span className="next-face__arrow" aria-hidden="true">↗</span>
      </span>
      <span className="next-face__rule" aria-hidden="true" />
    </span>
  )
}

export default function NextFace({ project, onNavigate }: NextFaceProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(project.href!, project.transition ?? 'editorial')
  }

  if (!project.href) {
    return (
      <section className="next-face next-face--disabled" aria-label={`Next project: ${project.title}`}>
        <div className="next-face__inner" aria-disabled="true">
          <NextFaceContent project={project} />
        </div>
      </section>
    )
  }

  return (
    <section className="next-face" aria-label={`Next project: ${project.title}`}>
      <a className="next-face__inner" href={project.href} onClick={handleClick}>
        <NextFaceContent project={project} />
      </a>
    </section>
  )
}
