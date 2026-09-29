import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './RotatingWords.css'

/**
 * React Bits "Rotating Text"(splitBy words / staggerFrom center / loop false)의 motion language만 가져온 글자.
 * 문구는 바뀌지 않는다 — 각 단어가 자기 칸 안에서 같은 단어로 한 번 굴러 올라온다.
 *
 *   split     단어 단위. 단어마다 overflow hidden 칸 하나, 그 안에 같은 단어 두 줄
 *   stagger   가운데 단어부터 바깥으로
 *   loop      없음. 가장 가까운 button에 pointer가 들어오거나 keyboard focus가 올 때 한 번만 재생한다
 *   layout    칸의 폭 / 높이는 단어 그대로라 재생 중에도 button 폭이 바뀌지 않는다
 * 보조기술은 원래 문장 한 번만 읽는다. reduced motion에서는 움직이지 않는다.
 */
export default function RotatingWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  useEffect(() => {
    const root = ref.current
    const trigger = root?.closest<HTMLElement>('button, a')
    if (!root || !trigger) return
    const tracks = root.querySelectorAll<HTMLElement>('.rotating-words__track')
    let tl: gsap.core.Timeline | null = null

    const play = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (tl?.isActive()) return
      tl?.kill()
      tl = gsap
        .timeline({ onComplete: () => void gsap.set(tracks, { yPercent: 0 }) })
        .fromTo(
          tracks,
          { yPercent: 0 },
          { yPercent: -50, duration: 0.5, ease: 'power3.out', stagger: { each: 0.06, from: 'center' } },
        )
    }
    const onFocus = () => {
      if (trigger.matches(':focus-visible')) play()
    }

    trigger.addEventListener('pointerenter', play)
    trigger.addEventListener('focus', onFocus)
    return () => {
      trigger.removeEventListener('pointerenter', play)
      trigger.removeEventListener('focus', onFocus)
      tl?.kill()
      gsap.set(tracks, { clearProps: 'transform' })
    }
  }, [text])

  return (
    <span ref={ref} className="rotating-words">
      <span className="rotating-words__sr">{text}</span>
      <span className="rotating-words__visual" aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="rotating-words__word">
            <span className="rotating-words__track">
              <span>{word}</span>
              <span>{word}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
