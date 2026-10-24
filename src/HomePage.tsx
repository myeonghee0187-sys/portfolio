import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { HomeDestination } from './navigation/projectRouting'
import WatchIntro from './components/WatchIntro'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import Faces from './components/Faces/Faces'
import Journey from './components/Journey/Journey'
import WatchStage from './components/Watch/WatchStage'
import SplashCursor from './components/SplashCursor/SplashCursor'
import useMediaQuery from './hooks/useMediaQuery'
import useScrollScene from './hooks/useScrollScene'
import { FACE_PROJECTS } from './components/Faces/facesData'
import Contact from './components/Contact'
import AllFaces from './components/AllFaces/AllFaces'
import { closeAllFaces, openAllFaces, useAllFacesOpen } from './components/AllFaces/allFacesStore'
import { navigateToFaceWithRetries, type FacesNavigationController } from './components/Faces/facesNavigation'

type HomePageProps = {
  skipIntro: boolean
  destination: HomeDestination | null
  onIntroDone: () => void
  onReady: () => void
  onOpenProject: (projectId: string) => void
}

export default function HomePage({ skipIntro, destination, onIntroDone, onReady, onOpenProject }: HomePageProps) {
  const [isIntroDone, setIsIntroDone] = useState(skipIntro)
  const [sceneReady, setSceneReady] = useState(skipIntro)
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWideEnough = useMediaQuery('(min-width: 901px)')

  /*
   * ALL FACES. 열림 상태는 allFacesStore 하나에 있다(Crown / Contact 빛 / FACES WebGL이 같은 값을 읽는다).
   * 닫기를 누르면 곧바로 store가 닫히고(가려져 멈춰 있던 page가 다시 그려진다), overlay는 닫힘 motion이
   * 끝난 뒤에 unmount된다.
   */
  const allFacesOpen = useAllFacesOpen()
  const [allFacesMounted, setAllFacesMounted] = useState(false)
  const facesRef = useRef<FacesNavigationController>(null)
  const selectionFocusRef = useRef<HTMLElement | null>(null)
  if (allFacesOpen && !allFacesMounted) setAllFacesMounted(true)
  const handleAllFacesClosed = useCallback((returnFocus: HTMLElement | null) => {
    setAllFacesMounted(false)
    const focusTarget = selectionFocusRef.current ?? returnFocus
    selectionFocusRef.current = null
    if (focusTarget) requestAnimationFrame(() => {
      if (focusTarget.isConnected) focusTarget.focus({ preventScroll: true })
    })
  }, [])

  const handleIntroFinish = useCallback((restoreFocus = false) => {
    setIsIntroDone(true)
    onIntroDone()
    if (restoreFocus) requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.hero__headline')?.focus({ preventScroll: true })
    })
  }, [onIntroDone])

  // Paint the matched Hero Watch before starting the existing WebGL/pin setup.
  // Otherwise synchronous GPU setup delays the final intro frame. Return visits
  // keep their immediate scene setup and restoration path through skipIntro.
  useEffect(() => {
    if (!isIntroDone || skipIntro) return
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setSceneReady(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [isIntroDone, skipIntro])

  /** FACES 이후 고정되는 정면 Digital Crown의 click handler. */
  const handleOpenAllFaces = useCallback(() => openAllFaces(), [])

  const handleProjectSelect = useCallback(async (projectId: string) => {
    const result = await navigateToFaceWithRetries(
      projectId,
      () => facesRef.current,
      3,
      // A responsive/reduced-motion switch can replace the controller while
      // the previous one is preparing media. Retry against the controller
      // mounted by the next committed frame.
      () => new Promise<void>((resolve) => window.setTimeout(resolve, 80)),
    )
    const success = result.status !== 'unavailable'
    if (success) {
      selectionFocusRef.current = result.focusTarget
      closeAllFaces()
    }
    return success
  }, [])

  /*
   * Splash Cursor는 커서가 있는 데스크톱 전용이고, 순수 장식이라 reduced motion에서는 끈다.
   * CSS로 숨기는 대신 컴포넌트 자체를 마운트하지 않는다 — 조건이 false면
   * WebGL 컨텍스트도, rAF 루프도, mousemove 리스너도 생기지 않는다.
   * GPU setup begins after the intro's final Hero frame has painted.
   */
  const showSplashCursor = sceneReady && isFinePointer && !prefersReducedMotion

  /*
   * Hero -> About scroll 연출을 켤지.
   * 터치 기기, reduced motion, 좁은 화면에서는 pin/scrub을 아예 만들지 않는다.
   * 그 경우 Watch는 WatchStage(fixed) 대신 Hero와 About이 각각 정적으로 들고 있고,
   * About은 Figma 배치가 그대로 보이는 정적 화면이 된다.
   */
  const scrollSceneEnabled = isFinePointer && !prefersReducedMotion && isWideEnough

  /*
   * 측정은 Intro가 끝난 뒤에 한다.
   * Intro는 <html>에 overflow: hidden을 걸어 스크롤을 잠그는데, 그동안에는
   * 세로 스크롤바가 없어서 뷰포트가 15px 더 넓게 잡힌다. 그 상태로 pin을 계산하면
   * ScrollTrigger가 만든 pin-spacer 폭이 실제보다 넓게 굳어 가로 overflow가 생긴다.
   */
  useScrollScene(scrollSceneEnabled && sceneReady)

  useEffect(() => {
    if (!sceneReady) return
    let cancelled = false
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const restore = async () => {
      await frame()
      await frame()
      if (cancelled) return
      ScrollTrigger.refresh()
      if (destination?.section === 'faces') {
        const result = await navigateToFaceWithRetries(
          destination.faceId ?? 'tchaikim', () => cancelled ? null : facesRef.current,
          5, () => new Promise<void>((resolve) => window.setTimeout(resolve, 100)),
        )
        if (cancelled) return
        if (result.status === 'unavailable') {
          // A decode failure must never keep the route hidden or return to Hero.
          const trigger = ScrollTrigger.getById('faces-journey-panels')
          const faces = document.getElementById('faces')
          window.scrollTo(0, trigger?.start ?? (faces ? window.scrollY + faces.getBoundingClientRect().top : 0))
        }
      } else if (destination?.section === 'contact') {
        const contact = document.getElementById('contact')
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
        if (contact) window.scrollTo(0, window.scrollY + contact.getBoundingClientRect().top - header)
      } else if (destination?.section === 'saved') {
        window.scrollTo(0, destination.scrollY ?? 0)
      } else if (destination?.section === 'hero') {
        window.scrollTo(0, 0)
      }
      ScrollTrigger.update()
      await frame()
      if (!cancelled) onReady()
    }
    void restore()
    return () => { cancelled = true }
  }, [sceneReady, destination, onReady])

  useEffect(() => () => closeAllFaces(), [])

  return (
    <>
      {/*
        Hero stays laid out beneath the intro. Its measured Watch anchor is the
        handoff destination; only that Watch is hidden until the intro finishes.
      */}
      {!isIntroDone && <WatchIntro onFinish={handleIntroFinish} />}

      {/*
        페이지 전체에서 단 하나만 존재하는 global cursor effect.
        특정 섹션이 아니라 이 shell에 두어야 Header/Hero/About까지
        같은 인스턴스가 따라간다.
      */}
      {showSplashCursor && (
        <SplashCursor
          DENSITY_DISSIPATION={9.5}
          VELOCITY_DISSIPATION={1.5}
          PRESSURE={0.5}
          CURL={0}
          SPLAT_RADIUS={0.21}
          SPLAT_FORCE={5000}
          COLOR_UPDATE_SPEED={18}
          SHADING
          RAINBOW_MODE={false}
          COLOR="#3B657E"
          /*
           * 원본의 mousedown burst는 끈다. 실제 화면에서 이동 trail의 최대치보다
           * 밝은 빛이 클릭 지점에 즉시 터져(alpha 58 -> 90) Watch와 타이포에서
           * 시선을 빼앗았다. 이번 작업에서 필요한 건 이동 trail뿐이다.
           */
          CLICK_SPLAT={false}
        />
      )}

      <div
        className="site"
        data-all-faces-open={allFacesOpen}
        data-all-faces-count={FACE_PROJECTS.length}
        data-intro-active={!isIntroDone}
        inert={!isIntroDone || allFacesMounted ? true : undefined}
      >
        <Header />
        <main>
          <Hero inlineWatch={!scrollSceneEnabled} />
          <About inlineWatch={!scrollSceneEnabled} />
          {/* 가로 트랙 연출도 About과 같은 조건에서만 켠다. 아니면 native 가로 scroll 목록이다. */}
          <div className={scrollSceneEnabled ? 'panels panels--interactive' : 'panels'}>
            <div className="panels__viewport">
              <Faces ref={facesRef} interactive={scrollSceneEnabled} ready={sceneReady} onOpenProject={onOpenProject} />
              <Journey interactive={scrollSceneEnabled} ready={sceneReady} />
            </div>
          </div>
          <Contact interactive={scrollSceneEnabled} ready={sceneReady} />
        </main>

        {/*
          Hero와 About이 공유하는 Watch. 연출이 켜져 있을 때만 이 레이어가 들고 있고,
          Hero/About은 각자 앵커만 남겨둔다. 그래서 화면의 Watch는 언제나 하나다.
        */}
        {scrollSceneEnabled && <WatchStage onOpenAllFaces={handleOpenAllFaces} />}
      </div>

      {allFacesMounted && (
        <AllFaces
          open={allFacesOpen}
          onRequestClose={closeAllFaces}
          onClosed={handleAllFacesClosed}
          onProjectSelect={handleProjectSelect}
        />
      )}
    </>
  )
}
