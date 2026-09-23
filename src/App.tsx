import { useCallback, useState } from 'react'
import IntroVideo from './components/IntroVideo'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import WatchStage from './components/Watch/WatchStage'
import SplashCursor from './components/SplashCursor/SplashCursor'
import useMediaQuery from './hooks/useMediaQuery'
import useScrollScene from './hooks/useScrollScene'

export default function App() {
  const [isIntroDone, setIsIntroDone] = useState(false)
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWideEnough = useMediaQuery('(min-width: 901px)')

  const handleIntroFinish = useCallback(() => setIsIntroDone(true), [])

  /*
   * Splash Cursor는 커서가 있는 데스크톱 전용이고, 순수 장식이라 reduced motion에서는 끈다.
   * CSS로 숨기는 대신 컴포넌트 자체를 마운트하지 않는다 — 조건이 false면
   * WebGL 컨텍스트도, rAF 루프도, mousemove 리스너도 생기지 않는다.
   * Intro가 끝났는지는 기존 isIntroDone을 그대로 쓴다(상태를 새로 만들지 않는다).
   */
  const showSplashCursor = isIntroDone && isFinePointer && !prefersReducedMotion

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
  useScrollScene(scrollSceneEnabled && isIntroDone)

  return (
    <>
      {/*
        Header/Hero는 Intro 아래에 항상 마운트되어 있다.
        Intro가 불투명한 fixed overlay라 재생 중에는 가려져 보이지 않고,
        fade-out이 진행되면서 그대로 드러난다.
      */}
      {!isIntroDone && <IntroVideo onFinish={handleIntroFinish} />}

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

      <div className="site">
        <Header />
        <main>
          <Hero inlineWatch={!scrollSceneEnabled} />
          <About inlineWatch={!scrollSceneEnabled} />
        </main>

        {/*
          Hero와 About이 공유하는 Watch. 연출이 켜져 있을 때만 이 레이어가 들고 있고,
          Hero/About은 각자 앵커만 남겨둔다. 그래서 화면의 Watch는 언제나 하나다.
        */}
        {scrollSceneEnabled && <WatchStage />}
      </div>
    </>
  )
}
