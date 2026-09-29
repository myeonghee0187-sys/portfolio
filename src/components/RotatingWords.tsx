import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './RotatingWords.css'

/**
 * React Bits "Rotating Text"(splitBy words / staggerFrom center / loop false)의 motion language만 가져온 글자.
 * 문구는 바뀌지 않는다 — 문장 전체(단어들 + 뒤따르는 기호, 예: ↗)가 거의 동시에 한 번 뒤집히며 굴러 올라와 정착한다.
 *
 *   token     단어마다 하나 + trailing(↗ 같은 기호) 하나. 모두 같은 timeline, 같은 값으로 움직인다
 *   split     token마다 overflow hidden 칸 하나, 그 안에 같은 글자 두 줄(나가는 줄 / 들어오는 줄)
 *   motion    두 줄이 함께 한 칸 올라가고(yPercent 0 -> -50), 들어오는 줄은 rotateX 40deg -> 0, 나가는 줄은 0 -> -40deg.
 *             모든 token이 같은 방향 / 같은 값이다
 *   stagger   왼쪽부터 15ms씩(START 0 / A 15 / CONVERSATION 30 / ↗ 45ms). 가운데부터 퍼지지 않는다 —
 *             첫 / 마지막 token의 시작과 끝 차이가 모두 45ms라 눈에는 한 문장이 한 번에 도는 것으로 보인다
 *   timing    token 하나 405ms, 문장 전체 450ms
 *   trigger   가장 가까운 button / a에 mouse(또는 pen)가 들어오거나 keyboard focus가 올 때 한 번. 같은 hover 동안 반복 없음.
 *             나갔다가 다시 들어오면 다시 한 번. touch는 hover를 흉내 내지 않는다
 *   leave     재생 중에 pointer가 나가면 남은 부분만 빠르게(3배) 끝내고 정착한다 — 거꾸로 되돌리지 않는다
 *   layout    칸의 폭 / 높이는 단어 그대로이고 transform만 움직여 button 폭 / 높이가 바뀌지 않는다
 * 보조기술은 원래 문장 한 번만 읽는다. reduced motion에서는 기울거나 구르지 않고 opacity만 아주 짧게 바뀐다.
 */
const STAGGER = 0.015
const TOTAL = 0.45
const TILT = 40

type Props = {
  text: string
  /** 문장 뒤에 붙어 함께 도는 기호(예: ↗). 보조기술에는 읽히지 않는다. */
  trailing?: string
}

export default function RotatingWords({ text, trailing }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')
  const tokens = trailing ? [...words, trailing] : words

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
      // 가장 늦게 출발하는 token(마지막)도 TOTAL 안에 끝난다.
      const duration = TOTAL - STAGGER * (tokens.length - 1)
      const stagger = { each: STAGGER, from: 'start' } as const
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
  }, [tokens.length])

  return (
    <span ref={ref} className="rotating-words">
      <span className="rotating-words__sr">{text}</span>
      <span className="rotating-words__visual" aria-hidden="true">
        {tokens.map((token, i) => (
          <span
            key={`${token}-${i}`}
            className={`rotating-words__word${trailing && i === tokens.length - 1 ? ' rotating-words__word--trailing' : ''}`}
          >
            <span className="rotating-words__track">
              <span className="rotating-words__line rotating-words__line--out">{token}</span>
              <span className="rotating-words__line rotating-words__line--in">{token}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
