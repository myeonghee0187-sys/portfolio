import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react'
import './ProjectHeader.css'
import './ProjectFonts.css'
import './ProjectViewport.css'

export type ProjectTransitionVariant = 'dissolve' | 'reverse' | 'editorial'

export type ProjectNavigateHandler = (
  href: string,
  variant?: ProjectTransitionVariant,
) => void

type ProjectHeaderProps = {
  onNavigate?: ProjectNavigateHandler
  faceId?: string
  tone?: 'dark' | 'light'
}

const DIRECTION_THRESHOLD = 28

function isUnmodifiedPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
}

export default function ProjectHeader({ onNavigate, faceId = 'tchaikim', tone = 'dark' }: ProjectHeaderProps) {
  const [hidden, setHidden] = useState(false)
  const focusedWithin = useRef(false)
  const lastY = useRef(0)
  const accumulatedDelta = useRef(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    lastY.current = window.scrollY

    const update = () => {
      frame.current = null
      const nextY = Math.max(0, window.scrollY)
      const delta = nextY - lastY.current

      if (nextY <= 16 || focusedWithin.current) {
        accumulatedDelta.current = 0
        setHidden(false)
      } else if (delta !== 0) {
        const previousDirection = Math.sign(accumulatedDelta.current)
        const nextDirection = Math.sign(delta)
        accumulatedDelta.current = previousDirection && previousDirection !== nextDirection
          ? delta
          : accumulatedDelta.current + delta

        if (Math.abs(accumulatedDelta.current) >= DIRECTION_THRESHOLD) {
          setHidden(accumulatedDelta.current > 0)
          accumulatedDelta.current = 0
        }
      }

      lastY.current = nextY
    }

    const handleScroll = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [])

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || !isUnmodifiedPrimaryClick(event)) return
    event.preventDefault()
    onNavigate(event.currentTarget.getAttribute('href') ?? '/', 'reverse')
  }

  const handleFocus = () => {
    focusedWithin.current = true
    setHidden(false)
  }

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    focusedWithin.current = false
  }

  return (
    <header
      className="project-header"
      data-tone={tone}
      data-hidden={hidden || undefined}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
    >
      <nav className="project-header__inner" aria-label="Project navigation">
        <a className="project-header__item project-header__item--faces" href={`/?face=${encodeURIComponent(faceId)}#faces`} onClick={handleClick}>
          FACES
        </a>
        <a className="project-header__item project-header__item--name" href="/#hero" onClick={handleClick}>
          SONG MYEONG HEE
        </a>
        <a className="project-header__item project-header__item--contact" href="/#contact" onClick={handleClick}>
          CONTACT
        </a>
      </nav>
    </header>
  )
}
