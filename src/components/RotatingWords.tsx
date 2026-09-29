import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './RotatingWords.css'

/**
 * React Bits "Rotating Text"(splitBy words / staggerFrom center / loop false)의 motion language만 가져온 글자.
 * 문구는 바뀌지 않는다 — 각 단어가 자기 칸 안에서 같은 단어로 한 번 뒤집히며 굴러 올라와(rotate reveal) 정착한다.
 *
 *   split     단어 단위. 단어마다 overflow hidden 칸 하나, 그 안에 같은 단어 두 줄(나가는 줄 / 들어오는 줄)
 *   motion    두 줄이 함께 한 칸 올라가고(yPercent 0 -> -50), 들어오는 줄은 rotateX 40deg -> 0, 나가는 줄은 0 -> -40deg
 *   stagger   가운데 단어부터 30ms. 3단어면 첫 / 마지막 단어의 끝나는 시간 차이가 30ms다 — 문장 하나가 한 번에 뒤집힌다
 *   timing    단어 하나 420ms, 문장 전체 450ms
 *   trigger   가장 가까운 button / a에 mouse(또는 pen)가 들어오거나 keyboard focus가 올 때 한 번. 같은 hover 동안 반복 없음.
 *             나갔다가 다시 들어오면 다시 한 번. touch는 hover를 흉내 내지 않는다
 *   leave     재생 중에 pointer가 나가면 남은 부분만 빠르게(3배) 끝내고 정착한다 — 거꾸로 되돌리지 않는다
 *   layout    칸의 폭 / 높이는 단어 그대로이고 transform만 움직여 button 폭 / 높이가 바뀌지 않는다
 * 보조기술은 원래 문장 한 번만 읽는다. reduced motion에서는 기울거나 구르지 않고 opacity만 아주 짧게 바뀐다.
 */
const STAGGER = 0.03
const TOTAL = 0.45
const TILT = 40

export default function RotatingWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  useEffect(() => {
    const root = ref.current
    const trigger = root?.closest<HTMLElement>('button, a')
    if (!root || !trigger) return
    const visual = root.querySelector<HTMLElement>('.rotating-words__visual')
    const tracks = root.querySelectorAll<HTMLElement>('.rotating-words__track')
    const outgoing = root.querySelectorAll<HTMLElement>('.rotating-words__line--out')
    const incoming = root.querySelectorAll<HTMLElement>('.rotating-words__line--in')
    let tl: gsap.core.Timeline | null = null

    const reset = () => {
      gsap.set([...tracks, ...outgoing, ...incoming], { clearProps: 'transform' })
      if (visual) gsap.set(visual, { clearProps: 'opacity' })
    }

    const play = () => {
      if (tl?.isActive()) return
      tl?.kill()
      reset()
      tl = gsap.timeline({ onComplete: reset })
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        tl.fromTo(visual, { opacity: 0.6 }, { opacity: 1, duration: 0.3, ease: 'power1.out' })
        return
      }
      // 가장 늦게 출발하는 단어도 TOTAL 안에 끝난다(가운데에서 가장 먼 단어의 출발 = STAGGER x 거리).
      const duration = TOTAL - STAGGER * Math.ceil((words.length - 1) / 2)
      const stagger = { each: STAGGER, from: 'center' } as const
      const ease = 'power3.out'
      tl.fromTo(tracks, { yPercent: 0 }, { yPercent: -50, duration, ease, stagger }, 0)
        .fromTo(outgoing, { rotateX: 0 }, { rotateX: -TILT, duration, ease, stagger }, 0)
        .fromTo(incoming, { rotateX: TILT }, { rotateX: 0, duration, ease, stagger }, 0)
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
      reset()
    }
  }, [words.length])

  return (
    <span ref={ref} className="rotating-words">
      <span className="rotating-words__sr">{text}</span>
      <span className="rotating-words__visual" aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="rotating-words__word">
            <span className="rotating-words__track">
              <span className="rotating-words__line rotating-words__line--out">{word}</span>
              <span className="rotating-words__line rotating-words__line--in">{word}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
