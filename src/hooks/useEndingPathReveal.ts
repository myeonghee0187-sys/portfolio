import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** Reveal the separate road image in its original coordinates; never move the artwork. */
export default function useEndingPathReveal(
  sectionRef: RefObject<HTMLElement | null>,
  roadRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const road = roadRef.current
    if (!section || !road) return

    // A local media listener avoids a global ScrollTrigger matchMedia refresh/reset.
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stop: (() => void) | undefined
    const start = () => {
      stop?.()
      stop = undefined
      if (motion.matches) return

      const context = gsap.context(() => {
        const reveal = gsap.fromTo(road,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: {
              id: 'jaduya-ending-path',
              trigger: section,
              // Use the live viewport height during our scoped resize refresh.
              start: () => `top ${window.innerHeight * 0.85}px`,
              end: () => `bottom ${window.innerHeight * 0.85}px`,
              scrub: true,
            },
          },
        )

        let live = true
        let frame = 0
        const refresh = () => {
          if (!live || frame) return
          frame = requestAnimationFrame(() => {
            frame = 0
            if (live) {
              // Resize may adjust the native scroll position before a scroll event fires.
              ScrollTrigger.update()
              reveal.scrollTrigger?.refresh()
              ScrollTrigger.update()
            }
          })
        }
        const observer = new ResizeObserver(refresh)
        const content = section.closest('main') ?? section
        observer.observe(content)
        observer.observe(section)
        content.addEventListener('load', refresh, true)
        void document.fonts.ready.then(refresh)

        return () => {
          live = false
          cancelAnimationFrame(frame)
          observer.disconnect()
          content.removeEventListener('load', refresh, true)
        }
      }, section)
      stop = () => context.revert()
    }
    start()
    motion.addEventListener('change', start)

    // Reverts clip-path to the complete original artwork on reduce or unmount.
    return () => {
      motion.removeEventListener('change', start)
      stop?.()
    }
  }, [sectionRef, roadRef])
}
