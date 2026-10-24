import type { RefObject } from 'react'
import gsap from 'gsap'
import useProjectScrollEffect from './useProjectScrollEffect'

function moveSheet(section: HTMLElement) {
  const phone = section.querySelector<HTMLElement>('.jaduya-main__phone--two')!
  const layers = section.querySelectorAll<HTMLElement>('[data-sheet-layer]')
  const tween = gsap.fromTo(layers,
    { y: () => Math.min(phone.clientHeight * 0.14, window.innerHeight * 0.18) },
    {
      y: 0,
      ease: 'none',
      scrollTrigger: {
        id: 'jaduya-bottom-sheet',
        trigger: phone,
        start: () => `top ${window.innerHeight * 0.85}px`,
        end: () => `top ${window.innerHeight * 0.35}px`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: self => phone.toggleAttribute('data-sheet-moving', self.progress < 1),
      },
    },
  )
  phone.toggleAttribute('data-sheet-moving', tween.scrollTrigger!.progress < 1)
  return {
    refresh: () => tween.scrollTrigger?.refresh(),
    dispose: () => phone.removeAttribute('data-sheet-moving'),
  }
}

export default function useBottomSheetScroll(sectionRef: RefObject<HTMLElement | null>) {
  useProjectScrollEffect(sectionRef, moveSheet)
}
