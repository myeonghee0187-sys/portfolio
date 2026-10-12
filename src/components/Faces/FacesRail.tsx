import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { FACE_PROJECTS, type FaceProject } from './facesData'
import LoopVideo from './LoopVideo'
import { useAllFacesOpen } from '../AllFaces/allFacesStore'
import { faceIndexById, type FacesNavigationController } from './facesNavigation'

/** Mobile, touch, and reduced-motion Faces use measured native document/rail geometry. */
const FacesRail = forwardRef<FacesNavigationController>(function FacesRail(_props, ref) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const allFacesOpen = useAllFacesOpen()
  const railRef = useRef<HTMLOListElement>(null)
  const slideRefs = useRef<(HTMLLIElement | null)[]>([])
  const navigationToken = useRef(0)

  useEffect(() => () => {
    navigationToken.current += 1
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
      if (pauseAfterPreparation && !activeVideo.paused) activeVideo.pause()
      resolve(prepared && token === navigationToken.current)
    }
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
    if (activeVideo.paused) activeVideo.play().catch(() => {})
  }), [])

  useImperativeHandle(ref, () => ({
    navigateToFace: async (projectId) => {
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

  return (
    <ol ref={railRef} className="faces__rail">
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
        <LoopVideo className="faces__visual" src={`${project.media}#t=0.001`} playing={canPlay && inView} />
        <div className="faces__slide-meta">
          <p className="faces__meta-index">{project.index}</p>
          <h3 className="faces__meta-title" data-face-heading={project.id} tabIndex={-1}>{project.title}</h3>
          <p className="faces__meta-category">{project.category}</p>
          <button
            type="button"
            className="faces__cta faces__cta--explore"
            aria-label={`Explore ${project.title} project`}
            title={`Explore ${project.title} project`}
            aria-disabled="true"
          >
            <span>EXPLORE PROJECT</span>
            <span className="faces__cta-arrow" aria-hidden="true">&#8599;</span>
          </button>
        </div>
      </li>
    )
  },
)

export default FacesRail
