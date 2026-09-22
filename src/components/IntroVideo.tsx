import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import introVideoSrc from '../../assets/vid/opening_video1.mp4'
import './IntroVideo.css'

/**
 * fade-out 길이(ms).
 * 같은 값을 인라인 transition-duration으로 넘겨 CSS와 타이머가 어긋나지 않게 한다.
 */
const FADE_MS = 600

/** Intro 재생 중 <html>에 붙는 스크롤 잠금 클래스 (index.css에 정의). */
const SCROLL_LOCK_CLASS = 'intro-scroll-lock'

/* ------------------------------------------------------------------ *
 * 좌측 상단 문구 타이밍 (영상 길이 8.04s, 24fps)
 * ------------------------------------------------------------------ */

/**
 * 첫 문구가 사라지기 시작하는 지점(초).
 * 여러 개의 구체가 등장하는 장면 전환 지점으로, ffmpeg 장면 검출값 3.9167s를 반올림했다.
 * 문구를 더 빨리/늦게 바꾸고 싶으면 이 값만 조절하면 된다.
 */
const INTRO_TEXT_CHANGE_TIME = 3.9

/** 두 번째 문구가 사라지기 시작하는 지점(초). 영상이 끝나기 직전. */
const INTRO_TEXT_OUT_TIME = 7.5

/** 문구 하나가 fade in / fade out 하는 데 걸리는 시간(ms). */
const TEXT_FADE_MS = 500

/** 첫 문구가 사라진 뒤 두 번째 문구가 뜨기까지의 짧은 텀(ms). */
const TEXT_SWAP_GAP_MS = 120

/** 교체 시작 시점부터 두 번째 문구가 뜨기까지 걸리는 시간(초). */
const TEXT_SWAP_DELAY_SEC = (TEXT_FADE_MS + TEXT_SWAP_GAP_MS) / 1000

/**
 * first   : SONG MYEONG HEE / WEB DESIGNER
 * swapping: 둘 다 숨긴 짧은 텀
 * second  : ONE DESIGNER / MANY FACES
 * out     : 영상 종료 직전 모두 사라진 상태
 */
type CaptionStep = 'first' | 'swapping' | 'second' | 'out'

type IntroVideoProps = {
  /** fade-out이 끝난 뒤 호출된다. 부모가 이 시점에 Intro를 unmount 한다. */
  onFinish: () => void
}

export default function IntroVideo({ onFinish }: IntroVideoProps) {
  const [isFading, setIsFading] = useState(false)
  const [captionStep, setCaptionStep] = useState<CaptionStep>('first')
  const overlayRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadeTimerRef = useRef<number | null>(null)

  // Intro가 처음 그려지기 전에 스크롤을 잠그고, unmount 시 되돌린다.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add(SCROLL_LOCK_CLASS)
    return () => root.classList.remove(SCROLL_LOCK_CLASS)
  }, [])

  /** 재생 종료 / SKIP / 재생 실패: 600ms fade 후 부모에게 종료를 알린다. */
  const dismiss = useCallback(() => {
    if (fadeTimerRef.current !== null) return // 이미 fade-out 중이면 무시
    videoRef.current?.pause()
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

  // 좌측 상단 문구를 video.currentTime에 맞춰 전환한다.
  // setTimeout이 아니라 재생 위치를 매 프레임 읽으므로 버퍼링이나 늦은 재생 시작에도 어긋나지 않는다.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let frameId = 0
    const updateCaption = () => {
      const time = video.currentTime
      const nextStep: CaptionStep =
        time >= INTRO_TEXT_OUT_TIME
          ? 'out'
          : time >= INTRO_TEXT_CHANGE_TIME + TEXT_SWAP_DELAY_SEC
            ? 'second'
            : time >= INTRO_TEXT_CHANGE_TIME
              ? 'swapping'
              : 'first'

      // 값이 같으면 React가 리렌더를 건너뛰므로 매 프레임 호출해도 부담이 없다.
      setCaptionStep((prev) => (prev === nextStep ? prev : nextStep))
    }

    const tick = () => {
      updateCaption()
      frameId = requestAnimationFrame(tick)
    }

    // 창이 가려져 RAF가 제한되어도 영상 재생 위치와 문구를 동기화한다.
    video.addEventListener('timeupdate', updateCaption)
    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
      video.removeEventListener('timeupdate', updateCaption)
    }
  }, [])

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

      {/*
        두 문구는 같은 grid 칸에 겹쳐 두어 위치와 typography가 완전히 동일하다.
        opacity만 교차하므로 텍스트가 움직이지 않고 내용만 바뀌어 보인다.
      */}
      <div
        className="intro__caption"
        style={{ '--intro-text-fade': `${TEXT_FADE_MS}ms` } as CSSProperties}
      >
        <p
          className={`intro__caption-line${captionStep === 'first' ? ' is-visible' : ''}`}
          aria-hidden={captionStep !== 'first'}
        >
          <span>SONG MYEONG HEE</span>
          <span>WEB DESIGNER</span>
        </p>
        <p
          className={`intro__caption-line${captionStep === 'second' ? ' is-visible' : ''}`}
          aria-hidden={captionStep !== 'second'}
        >
          <span>ONE DESIGNER</span>
          <span>MANY FACES</span>
        </p>
      </div>

      <button type="button" className="intro__skip" onClick={dismiss}>
        SKIP INTRO <span aria-hidden="true">&rarr;</span>
      </button>
    </div>
  )
}
