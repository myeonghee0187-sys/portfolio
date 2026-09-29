import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './RotatingWords.css'

/**
 * React Bits "Rotating Text"(splitBy words / staggerFrom center / loop false)의 motion language만 가져온 글자.
 * 문구는 바뀌지 않는다 — 문장 전체가 한 번 짧게 기울었다가(rotateX) 제자리에 정착한다.
 *
 *   split     단어 단위. 단 단어마다 따로 노는 것처럼 보이지 않도록 문장 하나의 동작으로 묶는다
 *   stagger   가운데 단어부터 32ms씩. 3단어면 첫 / 마지막 단어의 끝나는 시간 차이가 32ms다
 *   motion    rotateX 40deg -> 0, opacity .45 -> 1. 단어 하나 418ms, 문장 전체 450ms
 *   trigger   가장 가까운 button / a에 mouse(또는 pen)가 들어오거나 keyboard focus가 올 때 한 번. touch는 hover를 흉내 내지 않는다
 *   leave     재생 중에 pointer가 나가면 남은 부분만 빠르게(3배) 끝내고 정착한다 — 거꾸로 되돌리지 않는다
 *   layout    transform / opacity만 움직여 button 폭 / 높이가 바뀌지 않는다
 * 보조기술은 원래 문장 한 번만 읽는다. reduced motion에서는 기울지 않고 opacity만 아주 짧게 바뀐다.
 */
const STAGGER = 0.032
const TOTAL = 0.45

export default function RotatingWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  useEffect(() => {
    const root = ref.current
    const trigger = root?.closest<HTMLElement>('button, a')
    if (!root || !trigger) return
    const items = root.querySelectorAll<HTMLElement>('.rotating-words__word')
    let tl: gsap.core.Timeline | null = null

    const play = () => {
      if (tl?.isActive()) return
      tl?.kill()
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const perWord = TOTAL - STAGGER * Math.ceil((items.length - 1) / 2)
      tl = gsap.timeline({ onComplete: () => void gsap.set(items, { clearProps: 'transform,opacity' }) })
      if (reduced) {
        tl.fromTo(items, { opacity: 0.6 }, { opacity: 1, duration: 0.3, ease: 'power1.out' })
      } else {
        tl.fromTo(
          items,
          { rotateX: 40, opacity: 0.45 },
          { rotateX: 0, opacity: 1, duration: perWord, ease: 'power3.out', stagger: { each: STAGGER, from: 'center' } },
        )
      }
    }
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') play()
    }
    const onLeave = () => {
      if (tl?.isActive()) tl.timeScale(3)
    }
    const onFocus = () => {
      if (trigger.matches(':focus-visible')) play()
    }

    trigger.addEventListener('pointerenter', onEnter)
    trigger.addEventListener('pointerleave', onLeave)
    trigger.addEventListener('focus', onFocus)
    return () => {
      trigger.removeEventListener('pointerenter', onEnter)
      trigger.removeEventListener('pointerleave', onLeave)
      trigger.removeEventListener('focus', onFocus)
      tl?.kill()
      gsap.set(items, { clearProps: 'transform,opacity' })
    }
  }, [text])

  return (
    <span ref={ref} className="rotating-words">
      <span className="rotating-words__sr">{text}</span>
      <span className="rotating-words__visual" aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="rotating-words__word">
            {word}
          </span>
        ))}
      </span>
    </span>
  )
}
