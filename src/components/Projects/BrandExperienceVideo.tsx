import { useCallback, useEffect, useRef, useState } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import './BrandExperienceVideo.css'

type Props = { src?: string; poster: string }

/** One media element: scrolling pauses it without resetting its playback position. */
export default function BrandExperienceVideo({ src, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const intentRef = useRef<'auto' | 'play' | 'pause'>('auto')
  const centeredRef = useRef(false)
  const manualOutsideCenter = useRef(false)
  const blockedRef = useRef(false)
  const reconcileRef = useRef<(() => void) | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const video = videoRef.current
    const section = video?.closest('#brand-experience')
    if (!video || !section || !src || failed) return
    let disposed = false
    let frame = 0
    let playAttempt = 0
    let playPending = false
    video.muted = true
    const wanted = () => !disposed && !document.hidden && (centeredRef.current || manualOutsideCenter.current) &&
      intentRef.current !== 'pause' && (!reducedMotion || intentRef.current === 'play')
    const reconcile = () => {
      if (!wanted()) {
        playAttempt += 1
        playPending = false
        video.pause()
        return
      }
      if (!video.paused || playPending || blockedRef.current) return
      const token = ++playAttempt
      playPending = true
      void video.play().then(() => {
        if (token === playAttempt && !wanted()) video.pause()
      }).catch(() => {
        if (disposed || token !== playAttempt) return
        blockedRef.current = true
        setBlocked(true)
        setPlaying(false)
      }).finally(() => {
        if (token === playAttempt) playPending = false
      })
    }
    reconcileRef.current = reconcile
    const measure = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const delta = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2)
      // The actual section CENTER enters the middle 20%; a wider exit band prevents jitter.
      const limit = window.innerHeight * (centeredRef.current ? 0.14 : 0.10)
      const wasCentered = centeredRef.current
      centeredRef.current = delta <= limit
      if (centeredRef.current || wasCentered || rect.bottom <= 0 || rect.top >= innerHeight) {
        manualOutsideCenter.current = false
      }
      section.setAttribute('data-video-centered', String(centeredRef.current))
      reconcile()
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(section)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    document.addEventListener('visibilitychange', reconcile)
    measure()
    return () => {
      disposed = true
      playAttempt += 1
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', reconcile)
      if (reconcileRef.current === reconcile) reconcileRef.current = null
      video.pause()
    }
  }, [src, reducedMotion, failed])

  const toggle = useCallback(() => {
    const video = videoRef.current
    if (!video || !src || failed) return
    intentRef.current = video.paused ? 'play' : 'pause'
    manualOutsideCenter.current = intentRef.current === 'play' && !centeredRef.current
    blockedRef.current = false
    setBlocked(false)
    reconcileRef.current?.()
  }, [failed, src])

  return (
    <div className="brand-video">
      <img className="brand-video__poster" src={poster} alt="차이킴 브랜드 페이지" />
      {src && !failed && (
        <video ref={videoRef} src={src} poster={poster} muted loop playsInline preload="metadata"
          aria-label="차이킴 Brand Page 스크롤 영상"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onError={() => { setFailed(true); setPlaying(false) }} />
      )}
      {src && !failed && (
        <button type="button" className="brand-video__control" onClick={toggle}
          aria-label={playing ? '브랜드 영상 일시정지' : '브랜드 영상 재생'}
          aria-pressed={playing}>
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
        </button>
      )}
      {(failed || blocked) && (
        <p className="brand-video__status" role="status">
          {failed ? '영상 대신 브랜드 화면을 표시합니다.' : '재생 버튼을 눌러 영상을 감상하세요.'}
        </p>
      )}
    </div>
  )
}
