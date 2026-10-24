import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type ProjectScrollEffect = (section: HTMLElement) => {
  refresh: () => void
  dispose?: () => void
}

/** Own only this section's animation, measurements and media-query lifecycle. */
export default function useProjectScrollEffect(
  sectionRef: RefObject<HTMLElement | null>,
  effect: ProjectScrollEffect,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stop: (() => void) | undefined
    const mount = () => {
      stop?.()
      stop = undefined
      if (motion.matches) return
      // Keep media changes scoped: GSAP matchMedia would refresh unrelated scenes.
      const context = gsap.context(() => {
        const owned = effect(section)
        let live = true
        let frame = 0
        const schedule = () => {
          if (!live || frame) return
          frame = requestAnimationFrame(() => {
            frame = 0
            if (!live) return
            ScrollTrigger.update()
            owned.refresh()
            ScrollTrigger.update()
          })
        }
        const content = section.closest('main') ?? section
        const observer = new ResizeObserver(schedule)
        observer.observe(content)
        observer.observe(section)
        content.addEventListener('load', schedule, true)
        window.addEventListener('resize', schedule, { passive: true })
        void document.fonts.ready.then(schedule)
        return () => {
          live = false
          cancelAnimationFrame(frame)
          observer.disconnect()
          content.removeEventListener('load', schedule, true)
          window.removeEventListener('resize', schedule)
          owned.dispose?.()
        }
      }, section)
      stop = () => context.revert()
    }
    mount()
    motion.addEventListener('change', mount)
    return () => {
      motion.removeEventListener('change', mount)
      stop?.()
    }
  }, [sectionRef, effect])
}
