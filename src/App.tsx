import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import TchaikimCaseStudy from './components/Projects/TchaikimCaseStudy'
import JaduyaCaseStudy from './components/Projects/JaduyaCaseStudy'
import F45CaseStudy from './components/Projects/F45CaseStudy'
import BrandExperienceVideo from './components/Projects/BrandExperienceVideo'
import type { NextFaceProject } from './components/Projects/NextFace'
import { FACE_PROJECTS } from './components/Faces/facesData'
import { routeForHistory, routeFromUrl, type PortfolioRoute } from './navigation/projectRouting'
import './navigation/PageTransition.css'

type TransitionStyle = 'dissolve' | 'reverse' | 'editorial'
const newKey = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
// Direct case-study visits do not download the homepage's Three/OGL scene bundle.
const HomePage = lazy(() => import('./HomePage'))
const nextFaceFor = (id: string): NextFaceProject => {
  const next = FACE_PROJECTS[(FACE_PROJECTS.findIndex((project) => project.id === id) + 1) % FACE_PROJECTS.length]
  return {
    title: next.title,
    href: next.detailPath ?? `/?face=${encodeURIComponent(next.id)}#faces`,
    label: next.detailPath ? undefined : 'VIEW IN FACES',
    transition: next.detailPath ? 'editorial' : 'reverse',
  }
}

function snapshot(route: PortfolioRoute): PortfolioRoute {
  let destination = route.destination
  if (route.page === 'home') {
    const stage = document.querySelector('.faces__stage')?.getBoundingClientRect()
    const display = document.querySelector<HTMLElement>('.faces__display-cta')
    const slide = [...document.querySelectorAll<HTMLElement>('.faces__slide')].find((node) => {
      const rect = node.getBoundingClientRect()
      return rect.top >= 0 && rect.top < innerHeight && rect.left >= -2 && rect.right <= innerWidth + 2
    })
    const faceId = display?.dataset.projectId ?? slide?.dataset.projectId
    const journey = document.querySelector('.journey')?.getBoundingClientRect()
    const inFaces = display
      ? Boolean(stage && Math.abs(stage.top) <= 1 && (journey?.top ?? innerHeight) >= innerHeight - 1)
      : Boolean(slide && stage && stage.top < innerHeight && stage.bottom > 0)
    destination = faceId && inFaces
      ? { section: 'faces', faceId }
      : { section: 'saved', scrollY: window.scrollY }
  }
  return { ...route, destination, scrollY: window.scrollY }
}

export default function App() {
  const [route, setRoute] = useState<PortfolioRoute>(() =>
    routeForHistory(new URL(location.href), history.state?.portfolio, newKey()) ??
    { page: 'home', key: newKey(), destination: { section: 'hero' }, scrollY: 0 },
  )
  const [busy, setBusy] = useState(false)
  const routeRef = useRef(route)
  const busyRef = useRef(false)
  const introDone = useRef(route.page !== 'home' || Boolean(route.destination))
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const entranceTween = useRef<gsap.core.Tween | null>(null)
  const transitionToken = useRef(0)
  const pendingReady = useRef<{ key: string; resolve: () => void } | null>(null)
  const visitedEntries = useRef(new Map<string, PortfolioRoute>())

  useLayoutEffect(() => { routeRef.current = route }, [route])
  const handleIntroDone = useCallback(() => { introDone.current = true }, [])
  const handleReady = useCallback(() => {
    if (pendingReady.current?.key === route.key) {
      pendingReady.current.resolve()
      pendingReady.current = null
    }
  }, [route.key])

  const transition = useCallback(async (next: PortfolioRoute, href: string | null, style: TransitionStyle) => {
    const token = ++transitionToken.current
    tweenRef.current?.kill()
    entranceTween.current?.kill()
    pendingReady.current?.resolve()
    pendingReady.current = null
    busyRef.current = true
    setBusy(true)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = (opacity: number, duration: number) => new Promise<void>((resolve) => {
      tweenRef.current = gsap.to(overlayRef.current, {
        opacity, duration, ease: 'power2.inOut', onComplete: resolve, onInterrupt: resolve,
      })
    })
    if (href) {
      const saved = snapshot(routeRef.current)
      visitedEntries.current.set(saved.key, saved)
      history.replaceState({ ...history.state, portfolio: saved }, '', location.href)
    }
    if (routeRef.current.page === 'home' && next.page !== 'home') {
      window.dispatchEvent(new CustomEvent('portfolio-project-exit', { detail: { projectId: next.page } }))
    }
    await animate(1, reduced ? 0.08 : style === 'dissolve' ? 0.32 : 0.27)
    if (token !== transitionToken.current) return
    introDone.current = true
    if (href) history.pushState({ portfolio: next }, '', href)
    const destinationReady = new Promise<void>((resolve) => { pendingReady.current = { key: next.key, resolve } })
    window.scrollTo(0, 0)
    setRoute(next)
    let timeout = 0
    await Promise.race([destinationReady, new Promise<void>((resolve) => { timeout = window.setTimeout(resolve, 8000) })])
    clearTimeout(timeout)
    if (token !== transitionToken.current) return
    pendingReady.current = null
    if (next.page !== 'home' && style !== 'editorial' && !reduced) {
      const copy = contentRef.current?.querySelector('.tchai-hero__copy, .jaduya-hero__copy, .f45-hero__copy')
      if (copy) entranceTween.current = gsap.fromTo(copy,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: .3, delay: .04, clearProps: 'opacity,transform', ease: 'power2.out' },
      )
    }
    if (style === 'editorial' && !reduced) {
      const hero = contentRef.current?.querySelector('[data-case-hero]')
      if (hero) entranceTween.current = gsap.fromTo(hero, { y: 16 }, { y: 0, duration: .34, clearProps: 'transform', ease: 'power2.out' })
    }
    await animate(0, reduced ? 0.08 : style === 'dissolve' ? .38 : .3)
    if (token !== transitionToken.current) return
    busyRef.current = false
    setBusy(false)
    requestAnimationFrame(() => {
      if (token !== transitionToken.current) return
      const selector = next.page !== 'home' ? 'h1' : next.destination?.section === 'faces'
        ? '[data-face-heading="' + (next.destination.faceId ?? 'tchaikim') + '"]'
        : next.destination?.section === 'contact' ? '#contact h2' : '#hero h1'
      contentRef.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true })
    })
  }, [])

  const navigate = useCallback((href: string, style: TransitionStyle = 'reverse') => {
    if (busyRef.current) return
    const url = new URL(href, location.href)
    if (url.origin !== location.origin) return
    const next = routeFromUrl(url, newKey())
    if (next) void transition(next, url.pathname + url.search + url.hash, style)
  }, [transition])

  const openProject = useCallback((projectId: string) => {
    const project = FACE_PROJECTS.find((candidate) => candidate.id === projectId)
    if (project?.detailPath) navigate(project.detailPath, 'dissolve')
  }, [navigate])

  useEffect(() => {
    const restoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    history.replaceState({ ...history.state, portfolio: routeRef.current }, '', location.href)
    const onPop = () => {
      // An interrupted mount still owns its intended destination, not the
      // temporary scroll=0 beneath the opaque transition.
      if (!busyRef.current) {
        const departed = snapshot(routeRef.current)
        visitedEntries.current.set(departed.key, departed)
      }
      const parsed = routeForHistory(new URL(location.href), history.state?.portfolio, newKey())
      if (parsed) {
        const next = visitedEntries.current.get(parsed.key) ?? parsed
        void transition(next, null, 'reverse')
      }
    }
    const save = () => {
      if (busyRef.current && history.state?.portfolio?.key !== routeRef.current.key) return
      history.replaceState({
        ...history.state, portfolio: busyRef.current ? routeRef.current : snapshot(routeRef.current),
      }, '', location.href)
    }
    window.addEventListener('popstate', onPop)
    // A reload captures history state before pagehide in Chromium. Save the
    // current reading position before that capture; pagehide remains the fallback.
    window.addEventListener('beforeunload', save)
    window.addEventListener('pagehide', save)
    return () => {
      history.scrollRestoration = restoration
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', save)
      window.removeEventListener('pagehide', save)
      transitionToken.current += 1
      tweenRef.current?.kill()
      entranceTween.current?.kill()
      pendingReady.current?.resolve()
    }
  }, [transition])

  useEffect(() => {
    document.documentElement.dataset.projectPage = String(route.page !== 'home')
    document.documentElement.dataset.projectId = route.page
    document.title = route.page === 'home' ? 'Song Myeonghee' : `${route.page === 'tchaikim' ? 'TCHAI KIM' : route.page === 'jaduya' ? 'JADUYA' : 'F45 KOREA'} — Song Myeonghee`
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = 'https://portfolio-two-virid-30.vercel.app/' + (route.page !== 'home' ? `projects/${route.page}` : '')
    if (route.page === 'home') return
    let cancelled = false
    const prepare = async () => {
      const images = [...(contentRef.current?.querySelectorAll<HTMLImageElement>('[data-case-hero] img') ?? [])]
      await Promise.race([
        Promise.allSettled([document.fonts.ready, ...images.map((image) => image.decode())]),
        new Promise<void>((resolve) => window.setTimeout(resolve, 3000)),
      ])
      if (!cancelled) {
        window.scrollTo(0, route.scrollY)
        handleReady()
      }
    }
    void prepare()
    return () => { cancelled = true }
  }, [route, handleReady])

  useEffect(() => {
    if (!busy) return
    const block = (event: Event) => event.preventDefault()
    const blockKeys = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.preventDefault()
    }
    window.addEventListener('wheel', block, { passive: false })
    window.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('keydown', blockKeys)
    return () => {
      window.removeEventListener('wheel', block)
      window.removeEventListener('touchmove', block)
      window.removeEventListener('keydown', blockKeys)
    }
  }, [busy])

  return (
    <>
      <div ref={contentRef} className="portfolio-route" inert={busy || undefined} aria-busy={busy}>
        <Suspense fallback={<div className="portfolio-route-loading" aria-label="페이지 준비 중" />}>
        {route.page === 'home' ? (
          <HomePage key={route.key} skipIntro={introDone.current} destination={route.destination}
            onIntroDone={handleIntroDone} onReady={handleReady} onOpenProject={openProject} />
        ) : route.page === 'jaduya' ? (
          <JaduyaCaseStudy key={route.key} onNavigate={navigate} nextProject={nextFaceFor('jaduya')} />
        ) : route.page === 'f45' ? (
          <F45CaseStudy key={route.key} onNavigate={navigate} nextProject={nextFaceFor('f45')} />
        ) : (
          <TchaikimCaseStudy key={route.key} onNavigate={navigate}
            nextProject={nextFaceFor('tchaikim')}
            brandExperience={<BrandExperienceVideo
              src="/projects/tchaikim/tchaikim_brand_scroll_1080p60_v2.mp4"
              poster="/projects/tchaikim/brand-poster.jpg" />} />
        )}
        </Suspense>
      </div>
      <div ref={overlayRef} className="page-transition" data-active={busy} aria-hidden="true" />
    </>
  )
}
