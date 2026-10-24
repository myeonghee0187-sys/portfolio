import { useEffect, useRef, useState } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import './F45ResponsiveExperience.css'

const ASSETS = '/projects/f45'

/** The original PNG already has a transparent PC display and opaque foreground devices. */
export default function F45ResponsiveExperience() {
  const screenRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const intentRef = useRef<'auto' | 'play' | 'pause'>('auto')
  const blockedRef = useRef(false)
  const resumeTimeRef = useRef(0)
  const reconcileRef = useRef<(() => void) | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const screen = screenRef.current
    if (!screen || reducedMotion) return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      setLoaded(true)
      observer.disconnect()
    }, { rootMargin: '600px 0px' })
    observer.observe(screen)
    return () => observer.disconnect()
  }, [reducedMotion])

  useEffect(() => {
    const screen = screenRef.current
    const video = videoRef.current
    if (!screen || !video || !loaded || failed) return
    let disposed = false
    let visible = false
    let pending = false
    let attempt = 0
    const wanted = () => !disposed && visible && !document.hidden &&
      intentRef.current !== 'pause' && (!reducedMotion || intentRef.current === 'play')
    const reconcile = () => {
      if (!wanted()) {
        attempt += 1
        pending = false
        if (video.currentTime > 0) resumeTimeRef.current = video.currentTime
        video.pause()
        return
      }
      if (!video.paused || pending || blockedRef.current) return
      const token = ++attempt
      pending = true
      // WebKit can suspend an offscreen video while still reporting its previous
      // position. Restore that position explicitly before resuming the same element.
      if (resumeTimeRef.current > 0 && video.readyState >= 1) video.currentTime = resumeTimeRef.current
      void video.play().then(() => {
        if (token === attempt && !wanted()) video.pause()
      }).catch(() => {
        if (disposed || token !== attempt) return
        blockedRef.current = true
        setBlocked(true)
      }).finally(() => {
        if (token === attempt) pending = false
      })
    }
    reconcileRef.current = reconcile
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .25
      reconcile()
    }, { threshold: [0, .25] })
    observer.observe(screen)
    document.addEventListener('visibilitychange', reconcile)
    return () => {
      disposed = true
      attempt += 1
      observer.disconnect()
      document.removeEventListener('visibilitychange', reconcile)
      if (reconcileRef.current === reconcile) reconcileRef.current = null
      video.pause()
    }
  }, [loaded, reducedMotion, failed])

  const toggle = () => {
    intentRef.current = playing ? 'pause' : 'play'
    blockedRef.current = false
    setBlocked(false)
    if (!loaded) setLoaded(true)
    else reconcileRef.current?.()
  }

  return (
    <section className="f45-responsive" data-figma-node="2147:640" aria-labelledby="f45-responsive-title">
      <svg className="f45-responsive__wave" viewBox="0 0 2352 284" aria-hidden="true"><image href={ASSETS + '/figma-responsive-wave.svg'} width="2352" height="284" /></svg>
      <svg className="f45-responsive__circle" viewBox="0 0 1252 1248" aria-hidden="true"><image href={ASSETS + '/figma-responsive-circle.svg'} width="1252" height="1248" /></svg>
      <div className="f45-responsive__content">
        <header><p lang="en">Responsive Experience</p><h2 id="f45-responsive-title">어떤 화면에서도, <span lang="en">F45</span>의 에너지는 그대로</h2></header>
        <div className="f45-responsive__devices" data-figma-node="2150:650">
          <div ref={screenRef} className="f45-responsive__screen" data-playing={playing} data-failed={failed} data-figma-node="2150:652">
            <img src={ASSETS + '/figma-responsive-poster.jpg'} width="1920" height="1080" alt="" className="f45-responsive__poster" loading="lazy" />
            <video ref={videoRef} src={loaded && !failed ? ASSETS + '/f45_korea_scroll_1080p60_v2.mp4' : undefined}
              poster={ASSETS + '/figma-responsive-poster.jpg'} muted loop playsInline preload="metadata"
              aria-label="F45 KOREA 웹사이트 스크롤 영상"
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onTimeUpdate={event => {
                if (!event.currentTarget.paused) resumeTimeRef.current = event.currentTarget.currentTime
              }}
              onError={() => { setFailed(true); setPlaying(false) }} />
            {!failed && <button type="button" className="f45-responsive__control" onClick={toggle}
              aria-label={playing ? 'F45 영상 일시정지' : 'F45 영상 재생'} aria-pressed={playing}>
              <svg aria-hidden="true" viewBox="0 0 24 24">{playing
                ? <path d="M8 6v12m8-12v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                : <path d="m9 5 11 7-11 7Z" fill="currentColor" />}</svg>
            </button>}
          </div>
          <img className="f45-responsive__frame" src={ASSETS + '/figma-responsive-devices.png'} width="4000" height="2400"
            alt="F45 웹사이트의 PC 모니터, 태블릿, 아이폰 화면" loading="lazy" decoding="async" />
        </div>
        {(blocked || failed) && <p className="f45-responsive__status" role="status">{failed ? '영상을 불러오지 못해 정지 화면을 표시합니다.' : '재생 버튼을 눌러 영상을 감상하세요.'}</p>}
      </div>
    </section>
  )
}
