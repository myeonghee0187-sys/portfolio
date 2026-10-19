import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { FACE_PROJECTS, type FaceProject } from './facesData'
import LoopVideo from './LoopVideo'
import { useAllFacesOpen } from '../AllFaces/allFacesStore'
import { faceIndexById, type FacesNavigationController } from './facesNavigation'

/** Mobile, touch, and reduced-motion Faces use measured native document/rail geometry. */
type FacesRailProps = { onOpenProject?: (projectId: string) => void }

const FacesRail = forwardRef<FacesNavigationController, FacesRailProps>(function FacesRail({ onOpenProject }, ref) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const allFacesOpen = useAllFacesOpen()
  const railRef = useRef<HTMLOListElement>(null)
  const slideRefs = useRef<(HTMLLIElement | null)[]>([])
  const navigationToken = useRef(0)
  const pendingPreparations = useRef(new Set<() => void>())
  const exiting = useRef(false)
  const gesture = useRef({ pointerId: -1, x: 0, y: 0, scrollLeft: 0, projectId: '', cancelled: false })

  useEffect(() => {
    const pending = pendingPreparations.current
    const onProjectExit = (event: Event) => {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId
      if (!FACE_PROJECTS.some((project) => project.id === projectId && project.detailPath)) return
      exiting.current = true
      if (railRef.current) railRef.current.dataset.exitingProject = projectId
    }
    window.addEventListener('portfolio-project-exit', onProjectExit)
    return () => {
      navigationToken.current += 1
      pending.forEach((cancel) => cancel())
      window.removeEventListener('portfolio-project-exit', onProjectExit)
    }
  }, [])

  const prepareSlideFrame = useCallback((slide: HTMLLIElement, token: number) => new Promise<boolean>((resolve) => {
    const videos = [...slide.querySelectorAll<HTMLVideoElement>('video')]
    if (!videos.length) {
      resolve(false)
      return
    }
    const activeVideo = videos.find(
      (video) => video.style.opacity === '1' && video.style.zIndex === '0',
    )
    if (!activeVideo) {
      resolve(false)
      return
    }
    videos.forEach((video) => { video.preload = 'auto' })
    if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve(token === navigationToken.current)
      return
    }
    // LoopVideo is paused while ALL FACES covers the page. Asking its visible
    // buffer to play is the most reliable way to make mobile/Safari decode a
    // current frame; preload alone is allowed to stop at metadata. The frame
    // remains hidden by the opaque overlay and is paused again on settlement.
    const pauseAfterPreparation = activeVideo.paused
    let settled = false
    const cleanup = () => {
      activeVideo.removeEventListener('loadeddata', onReady)
      activeVideo.removeEventListener('canplay', onReady)
      activeVideo.removeEventListener('error', onError)
    }
    const finish = (prepared: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      cleanup()
      pendingPreparations.current.delete(cancel)
      if (pauseAfterPreparation && !activeVideo.paused) activeVideo.pause()
      resolve(prepared && token === navigationToken.current)
    }
    const cancel = () => finish(false)
    const onReady = () => {
      if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(true)
    }
    const onError = () => finish(false)
    const timeout = window.setTimeout(
      () => finish(activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      700,
    )
    activeVideo.addEventListener('loadeddata', onReady, { once: true })
    activeVideo.addEventListener('canplay', onReady, { once: true })
    activeVideo.addEventListener('error', onError, { once: true })
    pendingPreparations.current.add(cancel)
    if (activeVideo.paused) activeVideo.play().catch(() => {})
  }), [])

  useImperativeHandle(ref, () => ({
    navigateToFace: async (projectId) => {
      pendingPreparations.current.forEach((cancel) => cancel())
      exiting.current = false
      if (railRef.current) delete railRef.current.dataset.exitingProject
      const index = faceIndexById(projectId)
      const rail = railRef.current
      const slide = slideRefs.current[index]
      const heading = slide?.querySelector<HTMLElement>('[data-face-heading]') ?? null
      const token = ++navigationToken.current
      if (index < 0 || !rail || !slide || !heading) return { status: 'unavailable', focusTarget: null }

      const deadline = performance.now() + 900
      while (performance.now() < deadline) {
        if (token !== navigationToken.current) return { status: 'unavailable', focusTarget: null }
        const overlay = document.querySelector<HTMLElement>('.all-faces')
        if (!overlay || Number.parseFloat(getComputedStyle(overlay).opacity) >= 0.99) break
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }

      if (!(await prepareSlideFrame(slide, token)) || token !== navigationToken.current) {
        return { status: 'unavailable', focusTarget: token === navigationToken.current ? heading : null }
      }

      const header = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().height ?? 0
      // "Unchanged" belongs to the requested content, not the section. A
      // visible tail of the horizontal rail must still bring its video and
      // metadata block fully into the usable viewport.
      const requestedContentVisible = () => {
        const content = [
          slide.querySelector<HTMLElement>('.faces__visual'),
          slide.querySelector<HTMLElement>('.faces__slide-meta'),
        ]
        return content.every((element) => {
          if (!element) return false
          const rect = element.getBoundingClientRect()
          return rect.top >= header - 1 && rect.bottom <= innerHeight + 1
        })
      }
      const selectedRailLeft = () => {
        const railRect = rail.getBoundingClientRect()
        const slideRect = slide.getBoundingClientRect()
        return Math.max(0, Math.min(
          rail.scrollWidth - rail.clientWidth,
          rail.scrollLeft + slideRect.left + slideRect.width / 2 - (railRect.left + railRect.width / 2),
        ))
      }
      const atSelectedRailPosition = () => Math.abs(rail.scrollLeft - selectedRailLeft()) <= 2

      if (atSelectedRailPosition() && requestedContentVisible()) {
        return { status: 'unchanged', focusTarget: heading }
      }

      const left = selectedRailLeft()
      rail.scrollTo({ left: Math.round(left), behavior: 'auto' })

      const nextRect = slide.getBoundingClientRect()
      const available = Math.max(1, innerHeight - header)
      const top = Math.max(0, Math.min(
        document.documentElement.scrollHeight - innerHeight,
        scrollY + nextRect.top - header - Math.max(0, (available - nextRect.height) / 2),
      ))
      window.scrollTo({ top: Math.round(top), behavior: 'auto' })
      const settleDeadline = performance.now() + 350
      while (token === navigationToken.current && performance.now() < settleDeadline) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        if (atSelectedRailPosition() && requestedContentVisible()) {
          return { status: 'ready', focusTarget: heading }
        }
      }
      return { status: 'unavailable', focusTarget: token === navigationToken.current ? heading : null }
    },
  }), [prepareSlideFrame])

  const onPointerDown = (event: PointerEvent<HTMLOListElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-project-id]') : null
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      projectId: link?.dataset.projectId ?? '',
      cancelled: false,
    }
  }
  const trackGesture = (event: PointerEvent<HTMLOListElement>) => {
    const down = gesture.current
    if (event.pointerId !== down.pointerId) return
    down.cancelled ||= event.type === 'pointercancel' ||
      Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 7 ||
      Math.abs(event.currentTarget.scrollLeft - down.scrollLeft) >= 7
  }
  const onClick = (event: MouseEvent<HTMLOListElement>) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-project-id]') : null
    if (!link || !event.currentTarget.contains(link)) return
    const project = FACE_PROJECTS.find((candidate) => candidate.id === link.dataset.projectId)
    const down = gesture.current
    const invalidGesture = event.detail !== 0 && (down.cancelled || down.projectId !== project?.id ||
      Math.abs(event.currentTarget.scrollLeft - down.scrollLeft) >= 7)
    if (!project?.detailPath || exiting.current || allFacesOpen || invalidGesture) {
      event.preventDefault()
      return
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (onOpenProject) {
      event.preventDefault()
      onOpenProject(project.id)
    }
  }

  return (
    <ol
      ref={railRef}
      className="faces__rail"
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={trackGesture}
      onPointerUpCapture={trackGesture}
      onPointerCancelCapture={trackGesture}
      onClick={onClick}
      onDragStart={(event) => event.preventDefault()}
    >
      {FACE_PROJECTS.map((project, index) => (
        <RailSlide
          key={project.id}
          project={project}
          canPlay={!prefersReducedMotion && !allFacesOpen}
          ref={(element) => { slideRefs.current[index] = element }}
        />
      ))}
    </ol>
  )
})

const RailSlide = forwardRef<HTMLLIElement, { project: FaceProject; canPlay: boolean }>(
  function RailSlide({ project, canPlay }, ref) {
    const localRef = useRef<HTMLLIElement | null>(null)
    const [inView, setInView] = useState(false)

    const setRefs = (element: HTMLLIElement | null) => {
      localRef.current = element
      if (typeof ref === 'function') ref(element)
      else if (ref) ref.current = element
    }

    useEffect(() => {
      const element = localRef.current
      if (!element) return
      const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
      observer.observe(element)
      return () => observer.disconnect()
    }, [])

    return (
      <li ref={setRefs} className="faces__slide" style={{ '--aspect': project.aspect } as CSSProperties} data-project-id={project.id}>
        {/* #t keeps Safari's first frame visible before playback begins. */}
        <div className="faces__visual-stack">
          {project.detailPath ? (
            <a className="faces__visual-link" href={project.detailPath} data-project-id={project.id} aria-label={`Explore ${project.title} project`} draggable={false}>
              <LoopVideo className="faces__visual" src={`${project.media}#t=0.001`} playing={canPlay && inView} />
            </a>
          ) : (
            <LoopVideo className="faces__visual" src={`${project.media}#t=0.001`} playing={canPlay && inView} />
          )}
          <div className="faces__rail-cta">
            <a
              href={project.detailPath}
              data-project-id={project.id}
              className="faces__cta faces__cta--explore"
              aria-label={`Explore ${project.title} project`}
              title={`Explore ${project.title} project`}
              aria-disabled={project.detailPath ? undefined : true}
              tabIndex={project.detailPath ? undefined : -1}
              draggable={false}
            >
              <span>EXPLORE PROJECT</span>
              <span className="faces__cta-arrow" aria-hidden="true">&#8599;</span>
            </a>
          </div>
        </div>
        <div className="faces__slide-meta">
          <p className="faces__meta-index">{project.index}</p>
          <h3 className="faces__meta-title" data-face-heading={project.id} tabIndex={-1}>{project.title}</h3>
          <p className="faces__meta-category">{project.category}</p>
        </div>
      </li>
    )
  },
)

export default FacesRail
