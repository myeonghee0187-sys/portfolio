import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import introVideoSrc from '../../assets/vid/opening_video1.mp4'
import './IntroVideo.css'

gsap.registerPlugin(CustomEase)

/** Intro 재생 중 <html>에 붙는 스크롤 잠금 클래스 (index.css에 정의). */
const SCROLL_LOCK_CLASS = 'intro-scroll-lock'
/** 잠금을 푼 뒤 Intro가 사라질 때까지 스크롤바를 투명하게 두는 클래스 (index.css에 정의). */
const SCROLLBAR_HIDDEN_CLASS = 'intro-scrollbar-hidden'

/* ------------------------------------------------------------------ *
 * 좌측 상단 문구 타이밍 (영상 길이 8.04s, 24fps)
 * ------------------------------------------------------------------ */

/**
 * 첫 문구가 사라지기 시작하는 지점(초).
 * 여러 개의 구체가 등장하는 장면 전환 지점으로, ffmpeg 장면 검출값 3.9167s를 반올림했다.
 * 문구를 더 빨리/늦게 바꾸고 싶으면 이 값만 조절하면 된다.
 */
const INTRO_TEXT_CHANGE_TIME = 3.9

/** 문구 하나가 fade in / fade out 하는 데 걸리는 시간(ms). */
const TEXT_FADE_MS = 500

/** 첫 문구가 사라진 뒤 두 번째 문구가 뜨기까지의 짧은 텀(ms). */
const TEXT_SWAP_GAP_MS = 120

/** 교체 시작 시점부터 두 번째 문구가 뜨기까지 걸리는 시간(초). */
const TEXT_SWAP_DELAY_SEC = (TEXT_FADE_MS + TEXT_SWAP_GAP_MS) / 1000

/* ------------------------------------------------------------------ *
 * Ending transition: 초점 쪽으로 다가가며 Carbon Black에 흡수된다.
 * 모든 시점은 setTimeout이 아니라 video.currentTime 기준이다.
 * ------------------------------------------------------------------ */

/** 전환 시작 / 끝(영상 시간, 초). 영상은 이 구간에도 멈추지 않고 원래 속도로 재생된다. */
const TRANSITION_START = 3.5
const TRANSITION_END = 4.45
const TRANSITION_DURATION = TRANSITION_END - TRANSITION_START

/** 확대에 쓰는 시간(초)과 배율. 끝까지 가지 않고 약간 먼저 멈춰, 마지막은 색만 수렴한다. */
const ZOOM_DURATION = 0.85
/**
 * 확대 ease = CSS 'ease' 곡선. 짧게 가속한 뒤 길게 감속한다.
 * 순수 ease-out(cubic-bezier(0.33, 1, 0.68, 1))은 첫 0.1초에 5.6%를 한 번에 당겨 화면이 튀어 보였다.
 */
const ZOOM_EASE = CustomEase.create('introZoom', '0.25, 0.1, 0.25, 1')
const ZOOM_SCALE = 1.18
/** 좁은 화면은 cover crop 때문에 초점이 이미 화면을 크게 차지한다. 확대를 약하게 한다. */
const ZOOM_SCALE_NARROW = 1.1

/**
 * 확대 초점. 영상 원본 frame 기준 비율(0~1)이다 — 3.5s 전후 가운데 구체의 중심.
 * 화면 좌표(transform-origin)는 object-fit: cover crop을 계산해 viewport마다 따로 구한다.
 */
const ZOOM_FOCUS = { x: 0.5, y: 0.43 }

/** Carbon Black overlay의 opacity keyframe(전환 진행률 → opacity). 뒤로 갈수록 빨리 짙어진다. */
const OVERLAY_KEYS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.25, 0.1],
  [0.55, 0.33],
  [0.8, 0.7],
  [1, 1],
]

/** Intro 전체가 사라지기 시작하는 진행률. 여기서부터 아래의 Hero가 그대로 드러난다. */
const REVEAL_AT = 0.76

/** 문구는 전환 시작보다 이만큼(초) 먼저, 이 길이(ms)로 사라진다. */
const CAPTION_LEAD_SEC = 0.3
const CAPTION_OUT_MS = 300
const CAPTION_OUT_TIME = TRANSITION_START - CAPTION_LEAD_SEC

/** SKIP / 재생 실패 / 이른 종료: 긴 확대 없이 짧게 Carbon Black으로 닫는다(초). */
const QUICK_CLOSE_SEC = 0.22

/**
 * first   : SONG MYEONG HEE / WEB DESIGNER
 * swapping: 둘 다 숨긴 짧은 텀
 * second  : ONE DESIGNER / MANY FACES
 * out     : ending 전환 직전 모두 사라진 상태
 *
 * 전환이 3.9s보다 먼저 시작되므로 지금은 swapping / second까지 가지 않는다(문구 구조는 그대로 둔다).
 */
type CaptionStep = 'first' | 'swapping' | 'second' | 'out'

type IntroVideoProps = {
  /** Intro가 완전히 사라진 뒤 호출된다. 부모가 이 시점에 Intro를 unmount 한다. */
  onFinish: () => void
}

/** OVERLAY_KEYS 사이를 직선으로 잇는다. */
function overlayAt(progress: number) {
  for (let i = 1; i < OVERLAY_KEYS.length; i++) {
    const [p1, o1] = OVERLAY_KEYS[i]
    if (progress <= p1) {
      const [p0, o0] = OVERLAY_KEYS[i - 1]
      return o0 + ((o1 - o0) * (progress - p0)) / (p1 - p0)
    }
  }
  return 1
}

export default function IntroVideo({ onFinish }: IntroVideoProps) {
  const [captionStep, setCaptionStep] = useState<CaptionStep>('first')
  const introRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const endingRef = useRef<HTMLDivElement>(null)
  /** SKIP 버튼과 autoplay 실패가 부르는 짧은 종료. 아래 effect가 채운다. */
  const quickCloseRef = useRef<(() => void) | null>(null)
  const onFinishRef = useRef(onFinish)

  useLayoutEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  // Intro가 처음 그려지기 전에 스크롤을 잠그고, unmount 시 되돌린다.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add(SCROLL_LOCK_CLASS)
    return () => root.classList.remove(SCROLL_LOCK_CLASS)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // iOS Safari는 muted가 속성이 아니라 DOM 프로퍼티로 잡혀 있어야 autoplay를 허용한다.
    video.muted = true

    const playback = video.play()
    // 저전력 모드 등으로 autoplay가 거부되면 검은 화면에 갇히지 않도록 바로 넘어간다.
    if (playback) playback.catch(() => quickCloseRef.current?.())
  }, [])

  /*
   * 영상 시간에 맞춘 문구 전환 + ending 전환.
   * 매 프레임 video.currentTime을 읽으므로 버퍼링이나 늦은 재생 시작에도 장면과 어긋나지 않는다.
   *
   * 움직이는 것은 Intro layer(영상 확대, overlay, Intro 전체 opacity)뿐이다.
   * Hero는 처음부터 최종 layout으로 아래에 있고, Intro가 사라지면서 그대로 드러난다.
   */
  useEffect(() => {
    const intro = introRef.current, video = videoRef.current, ending = endingRef.current
    if (!intro || !video || !ending) return
    const root = document.documentElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const narrow = window.matchMedia('(max-width: 640px)').matches
    const zoomScale = reducedMotion ? 1 : narrow ? ZOOM_SCALE_NARROW : ZOOM_SCALE

    /** 'playing' → 'ending'(영상 시간에 묶인 전환) / 'closing'(짧은 종료) → 'done' */
    let phase: 'playing' | 'ending' | 'closing' | 'done' = 'playing'
    let frameId = 0
    let quickClose: gsap.core.Timeline | null = null

    /** ZOOM_FOCUS를 cover crop이 적용된 화면 좌표로 바꾼다. */
    const focusOrigin = () => {
      const w = video.clientWidth, h = video.clientHeight
      const vw = video.videoWidth || 1916, vh = video.videoHeight || 1080
      const s = Math.max(w / vw, h / vh)
      const x = (w - vw * s) / 2 + ZOOM_FOCUS.x * vw * s
      const y = (h - vh * s) / 2 + ZOOM_FOCUS.y * vh * s
      return `${x.toFixed(1)}px ${y.toFixed(1)}px`
    }

    /*
     * 스크롤 잠금은 Hero가 드러나기 직전에 푼다. 잠금 중에는 스크롤바가 없어 page가 스크롤바 폭만큼 넓은데,
     * Intro가 완전히 덮고 있을 때 풀어야 Hero가 보이는 동안 좌우로 밀리지 않는다.
     * 스크롤바 자체는 Intro가 사라질 때까지 투명하다.
     */
    const unlockScroll = () => {
      if (!root.classList.contains(SCROLL_LOCK_CLASS)) return
      root.classList.add(SCROLLBAR_HIDDEN_CLASS)
      root.classList.remove(SCROLL_LOCK_CLASS)
    }

    const finish = () => {
      if (phase === 'done') return
      phase = 'done'
      cancelAnimationFrame(frameId)
      unlockScroll()
      root.classList.remove(SCROLLBAR_HIDDEN_CLASS)
      onFinishRef.current()
    }

    // 확대는 전환 앞쪽 ZOOM_DURATION 동안만. 진행률을 직접 넣어 영상 시간과 같이 간다.
    const zoom = gsap.fromTo(video, { scale: 1 }, {
      scale: zoomScale, duration: ZOOM_DURATION, ease: ZOOM_EASE, paused: true, immediateRender: false,
    })
    const revealEase = gsap.parseEase('power1.inOut')

    const renderEnding = (progress: number) => {
      zoom.progress(Math.min(1, (progress * TRANSITION_DURATION) / ZOOM_DURATION))
      ending.style.opacity = overlayAt(progress).toFixed(4)
      const reveal = Math.min(1, Math.max(0, (progress - REVEAL_AT) / (1 - REVEAL_AT)))
      intro.style.opacity = (1 - revealEase(reveal)).toFixed(4)
      if (progress >= REVEAL_AT) unlockScroll()
    }

    const updateCaption = (time: number) => {
      const nextStep: CaptionStep =
        time >= CAPTION_OUT_TIME
          ? 'out'
          : time >= INTRO_TEXT_CHANGE_TIME + TEXT_SWAP_DELAY_SEC
            ? 'second'
            : time >= INTRO_TEXT_CHANGE_TIME
              ? 'swapping'
              : 'first'
      // 값이 같으면 React가 리렌더를 건너뛰므로 매 프레임 호출해도 부담이 없다.
      setCaptionStep((prev) => (prev === nextStep ? prev : nextStep))
    }

    const sync = () => {
      if (phase === 'done' || phase === 'closing') return
      const time = video.currentTime
      updateCaption(time)
      const progress = (time - TRANSITION_START) / TRANSITION_DURATION
      if (progress <= 0) return
      if (phase === 'playing') {
        phase = 'ending'
        gsap.set(video, { transformOrigin: focusOrigin() })
      }
      renderEnding(Math.min(1, progress))
      if (progress >= 1) finish()
    }

    const tick = () => {
      sync()
      if (phase !== 'done') frameId = requestAnimationFrame(tick)
    }

    /** SKIP / autoplay 실패 / 전환 전에 영상이 끝난 경우. 지금 상태에서 짧게 Carbon Black으로 닫는다. */
    const close = () => {
      if (phase === 'done' || phase === 'closing') return
      phase = 'closing'
      setCaptionStep('out')
      quickClose = gsap.timeline({ onComplete: finish })
        .to(ending, { opacity: 1, duration: QUICK_CLOSE_SEC * 0.6, ease: 'power1.out' }, 0)
        .to(intro, { opacity: 0, duration: QUICK_CLOSE_SEC * 0.6, ease: 'power1.in', onStart: unlockScroll }, QUICK_CLOSE_SEC * 0.4)
    }
    quickCloseRef.current = close

    // 전환이 끝나기 전에 영상이 먼저 끝나면(느린 기기 / 재생 속도 차이) 남은 전환을 짧게 마무리한다.
    const onEnded = () => close()

    // 창이 가려져 RAF가 제한되어도 영상 재생 위치와 문구 / 전환을 동기화한다.
    video.addEventListener('timeupdate', sync)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', close)
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      video.removeEventListener('timeupdate', sync)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', close)
      zoom.kill()
      quickClose?.kill()
      root.classList.remove(SCROLLBAR_HIDDEN_CLASS)
      if (quickCloseRef.current === close) quickCloseRef.current = null
      gsap.set([video, ending, intro], { clearProps: 'transform,transformOrigin,opacity' })
    }
  }, [])

  useEffect(() => {
    const intro = introRef.current
    if (!intro) return

    // React는 touchmove / wheel을 passive로 등록하므로 네이티브 리스너로 붙여야
    // iOS의 rubber-band 스크롤까지 막을 수 있다. 전환 끝에 잠금을 먼저 풀어도 Intro 위에서는 스크롤되지 않는다.
    const blockScroll = (event: Event) => event.preventDefault()
    intro.addEventListener('touchmove', blockScroll, { passive: false })
    intro.addEventListener('wheel', blockScroll, { passive: false })
    return () => {
      intro.removeEventListener('touchmove', blockScroll)
      intro.removeEventListener('wheel', blockScroll)
    }
  }, [])

  return (
    <div ref={introRef} className="intro">
      <video
        ref={videoRef}
        className="intro__video"
        src={introVideoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
      />

      {/*
        두 문구는 같은 grid 칸에 겹쳐 두어 위치와 typography가 완전히 동일하다.
        opacity만 교차하므로 텍스트가 움직이지 않고 내용만 바뀌어 보인다.
      */}
      <div
        className="intro__caption"
        style={{ '--intro-text-fade': `${captionStep === 'out' ? CAPTION_OUT_MS : TEXT_FADE_MS}ms` } as CSSProperties}
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

      <button type="button" className="intro__skip" onClick={() => quickCloseRef.current?.()}>
        SKIP INTRO <span aria-hidden="true">&rarr;</span>
      </button>

      {/* ending 전환의 Carbon Black. 문구와 SKIP까지 같이 덮는다(클릭은 통과). */}
      <div ref={endingRef} className="intro__ending-overlay" aria-hidden="true" />
    </div>
  )
}
