import { useId, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import WatchAssembly from './Watch/WatchAssembly'
import './WatchIntro.css'

type Phase = 'idle' | 'wake' | 'hello' | 'handoff'
type WatchIntroProps = { onFinish: (restoreFocus?: boolean) => void }

/** Same case, crown, face and 600 × 760 coordinate system as the Hero Watch. */
export default function WatchIntro({ onFinish }: WatchIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<(() => void) | null>(null)
  const onFinishRef = useRef(onFinish)
  const [phase, setPhase] = useState<Phase>('idle')
  const promptId = useId()

  useLayoutEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  useLayoutEffect(() => {
    const intro = rootRef.current
    const background = backgroundRef.current
    if (!intro || !background) return
    const composition = intro.querySelector<HTMLElement>('.intro__composition')!
    const motion = intro.querySelector<HTMLElement>('.intro__watch-motion')!
    const button = intro.querySelector<HTMLButtonElement>('.intro__wake-button')!
    const prompt = intro.querySelector<HTMLElement>('.intro__prompt')!
    const display = intro.querySelector<HTMLElement>('.watch__intro-display')!
    const light = intro.querySelector<HTMLElement>('.watch__intro-light')!
    const hello = intro.querySelector<HTMLElement>('.watch__intro-hello')!
    const face = intro.querySelector<HTMLElement>('.watch__face')!
    const ambient = intro.querySelector<HTMLElement>('.intro__ambient')!
    const spaceLight = background.querySelector<HTMLElement>('.intro__space-light')!
    const wave = intro.querySelector<HTMLElement>('.intro__wave')!
    const rim = intro.querySelector<HTMLElement>('.intro__rim')!
    const rimLight = intro.querySelector<HTMLElement>('.intro__rim-light')!
    const reflection = intro.querySelector<HTMLElement>('.watch__intro-reflection')!
    const root = document.documentElement
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let timeline: gsap.core.Timeline | null = null
    let started = false
    let disposed = false
    let handingOff = false
    let keyboardInput = false
    let source: DOMRect | null = null
    let target: DOMRect | null = null
    const travel = { progress: 0 }

    root.classList.add('intro-scroll-lock')
    button.focus({ preventScroll: true })

    // Measure after unlocking, before revealing the page. Native scrollbar width
    // is then identical to the layout ScrollTrigger will use after onFinish.
    const measure = () => {
      source = composition.getBoundingClientRect()
      target = document.querySelector('.hero__watch-anchor')?.getBoundingClientRect() ?? source
    }
    const render = () => {
      if (!source || !target) return
      const p = travel.progress
      gsap.set(motion, {
        x: (target.left - source.left) * p,
        y: (target.top - source.top) * p,
        scale: 1 + (target.width / source.width - 1) * p,
        transformOrigin: '0 0',
      })
    }
    const unlock = () => {
      root.classList.add('intro-scrollbar-hidden')
      root.classList.remove('intro-scroll-lock')
    }
    const beginHandoff = () => {
      handingOff = true
      setPhase('handoff')
      unlock()
      measure()
    }
    const finish = () => {
      if (disposed) return
      // The last intro frame matches the actual Hero frame exactly. React swaps
      // visibility in one commit; there is no interval with two visible Watches.
      measure()
      travel.progress = 1
      render()
      root.classList.remove('intro-scroll-lock', 'intro-scrollbar-hidden')
      onFinishRef.current(keyboardInput)
    }
    const start = () => {
      if (started || disposed) return
      started = true
      setPhase('wake')
      const reduced = media.matches
      const touch = matchMedia('(hover: none) and (pointer: coarse)').matches
      const wake = reduced ? 0.12 : 0.42
      const helloAt = reduced ? 0.08 : 0.46
      const handoffAt = reduced ? 0.38 : 1.05
      const handoffDuration = reduced ? 0.16 : 1.15
      const end = handoffAt + handoffDuration

      // Immediate input feedback, before the next timeline tick. All lights are
      // CSS layers on the existing assembly; no extra renderer or event loop.
      gsap.set(light, { opacity: reduced ? 0.3 : 0.24, scale: reduced ? 1 : 0.38 })
      timeline = gsap.timeline({ onComplete: finish })
        .to(prompt, { opacity: 0, duration: reduced ? 0.08 : 0.2 }, 0)
        .to(reflection, { opacity: 0, duration: reduced ? 0.08 : 0.16 }, 0)
        .to(light, { opacity: touch ? 1 : 0.88, scale: 1, duration: wake, ease: 'power2.out' }, 0)
        .call(() => setPhase('hello'), [], helloAt)
        .to(hello, { opacity: 1, filter: 'blur(0px)', duration: reduced ? 0.08 : 0.28 }, helloAt)
        .call(beginHandoff, [], handoffAt)
        .to(background, { opacity: 0, duration: handoffDuration, ease: 'power1.inOut' }, handoffAt)
        .to(display, { opacity: 0, duration: reduced ? 0.12 : 0.26 }, end - (reduced ? 0.12 : 0.26))
        .to(face, { opacity: 1, duration: reduced ? 0.12 : 0.26 }, end - (reduced ? 0.12 : 0.26))
        .to(ambient, { opacity: 0, duration: reduced ? 0.12 : 0.4 }, end - (reduced ? 0.12 : 0.4))

      if (!reduced) {
        timeline
          .to(rim, { opacity: 0.85, duration: 0.1 }, 0)
          .to(rimLight, { rotation: 250, duration: 0.78, ease: 'power1.inOut' }, 0)
          .to(rim, { opacity: 0, duration: 0.3 }, 0.48)
          .to(wave, { opacity: touch ? 0.85 : 0.65, duration: 0.16 }, 0)
          .to(wave, { scale: 1.5, duration: 1, ease: 'power2.out' }, 0)
          .to(wave, { opacity: 0, duration: 0.65 }, 0.16)
          .to(spaceLight, { opacity: touch ? 0.65 : 0.5, scale: 1, duration: 0.24 }, 0)
          .to(spaceLight, { opacity: 0.22, duration: 0.55 }, 0.24)
          .to(spaceLight, { opacity: 0.5, scale: 1.25, duration: 0.75, ease: 'sine.inOut' }, 0.95)
          .to(ambient, { scale: 1.18, duration: 0.9, ease: 'sine.inOut' }, 0.9)
          .to(travel, {
            progress: 1, duration: handoffDuration, ease: 'power2.inOut', onUpdate: render,
          }, handoffAt)
      }
      // Reduced motion keeps the Watch still during HELLO and uses a brief
      // dissolve to the Hero, with no travelling/scaling animation.
    }
    startRef.current = start

    const blockScroll = (event: Event) => event.preventDefault()
    const blockKeys = (event: KeyboardEvent) => {
      if (['Tab', 'Enter', ' '].includes(event.key)) {
        keyboardInput = true
        intro.dataset.keyboard = 'true'
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        button.focus({ preventScroll: true })
      } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key) ||
        (event.key === ' ' && event.target !== button)) {
        event.preventDefault()
      }
    }
    const pointer = () => {
      keyboardInput = false
      delete intro.dataset.keyboard
    }
    const resize = () => {
      if (handingOff) { measure(); render() }
    }
    const reduceMotion = () => {
      if (media.matches && timeline) timeline.progress(1)
    }
    window.addEventListener('wheel', blockScroll, { passive: false })
    window.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('keydown', blockKeys)
    button.addEventListener('pointerdown', pointer)
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    media.addEventListener('change', reduceMotion)

    return () => {
      disposed = true
      startRef.current = null
      timeline?.kill()
      root.classList.remove('intro-scroll-lock', 'intro-scrollbar-hidden')
      window.removeEventListener('wheel', blockScroll)
      window.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('keydown', blockKeys)
      button.removeEventListener('pointerdown', pointer)
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
      media.removeEventListener('change', reduceMotion)
      gsap.set([motion, background, prompt, display, light, hello, face, ambient, spaceLight, wave, rim, rimLight, reflection], { clearProps: 'all' })
    }
  }, [])

  return (
    <>
      {/* A separate backdrop leaves the one shared cursor below the Watch. */}
      <div ref={backgroundRef} className="intro__background" aria-hidden="true">
        <div className="intro__space-light" />
      </div>
      <div ref={rootRef} className="intro" data-phase={phase} role="dialog" aria-modal="true" aria-label="포트폴리오 시작">
        <div className="intro__composition">
          <div className="intro__watch-motion">
            <div className="intro__ambient" aria-hidden="true" />
            <div className="intro__wave" aria-hidden="true" />
            <div className="intro__watch-art" aria-hidden="true" inert>
              <WatchAssembly variant="intro" />
            </div>
            <div className="intro__rim" aria-hidden="true"><div className="intro__rim-light" /></div>
            <button type="button" className="intro__wake-button" aria-label="시계 켜기" aria-describedby={promptId}
              aria-disabled={phase !== 'idle'} onClick={() => startRef.current?.()} />
          </div>
          <p className="intro__prompt" id={promptId}>시계를 클릭해주세요</p>
        </div>
        <span className="intro__status" role="status">{phase === 'hello' ? 'HELLO' : ''}</span>
      </div>
    </>
  )
}
