import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import introVideoSrc from '../../assets/vid/opening_video1.mp4'
import './IntroVideo.css'

/**
 * fade-out 길이(ms).
 * 같은 값을 인라인 transition-duration으로 넘겨 CSS와 타이머가 어긋나지 않게 한다.
 */
const FADE_MS = 600

/** Intro 재생 중 <html>에 붙는 스크롤 잠금 클래스 (index.css에 정의). */
const SCROLL_LOCK_CLASS = 'intro-scroll-lock'

type IntroVideoProps = {
  /** fade-out이 끝난 뒤 호출된다. 부모가 이 시점에 Intro를 unmount 한다. */
  onFinish: () => void
}

export default function IntroVideo({ onFinish }: IntroVideoProps) {
  const [isFading, setIsFading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadeTimerRef = useRef<number | null>(null)

  // Intro가 처음 그려지기 전에 스크롤을 잠그고, unmount 시 되돌린다.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add(SCROLL_LOCK_CLASS)
    return () => root.classList.remove(SCROLL_LOCK_CLASS)
  }, [])

  /** 재생 종료 / SKIP / 재생 실패 시: 600ms fade 후 부모에게 종료를 알린다. */
  const dismiss = useCallback(() => {
    if (fadeTimerRef.current !== null) return // 이미 fade-out 중이면 무시
    setIsFading(true)
    fadeTimerRef.current = window.setTimeout(onFinish, FADE_MS)
  }, [onFinish])

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // iOS Safari는 muted가 속성이 아니라 DOM 프로퍼티로 잡혀 있어야 autoplay를 허용한다.
    video.muted = true

    const playback = video.play()
    // 저전력 모드 등으로 autoplay가 거부되면 검은 화면에 갇히지 않도록 바로 넘어간다.
    if (playback) playback.catch(dismiss)
  }, [dismiss])

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    // React는 touchmove를 passive로 등록하므로 네이티브 리스너로 붙여야
    // iOS의 rubber-band 스크롤까지 막을 수 있다.
    const blockTouchScroll = (event: TouchEvent) => event.preventDefault()
    overlay.addEventListener('touchmove', blockTouchScroll, { passive: false })
    return () => overlay.removeEventListener('touchmove', blockTouchScroll)
  }, [])

  return (
    <div
      ref={overlayRef}
      className={`intro${isFading ? ' intro--fading' : ''}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <video
        ref={videoRef}
        className="intro__video"
        src={introVideoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
      />
      <button type="button" className="intro__skip" onClick={dismiss}>
        SKIP INTRO <span aria-hidden="true">&rarr;</span>
      </button>
    </div>
  )
}
