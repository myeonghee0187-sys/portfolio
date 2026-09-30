import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './RotatingWords.css'

/**
 * React Bits "Rotating Text"(loop false)의 motion language만 가져온 글자. 문구는 바뀌지 않는다 —
 * 문장 전체(단어들 + 뒤따르는 기호, 예: ↗)가 하나의 텍스트 유닛으로 한 번 뒤집히며 굴러 올라와 정착한다.
 *
 *   unit      문장 한 줄이 하나의 칸(overflow hidden)과 하나의 원근을 쓴다. 단어마다 따로 잘리거나 따로 기울지 않는다 —
 *             START / A / CONVERSATION / ↗가 같은 면에서 같은 시간에 같은 값으로 움직인다
 *   motion    같은 문장 두 줄(나가는 줄 / 들어오는 줄)이 함께 한 칸 올라가고(yPercent 0 -> -50),
 *             들어오는 줄은 rotateX 40deg -> 0, 나가는 줄은 0 -> -40deg. 450ms, power3.out
 *   trigger   가장 가까운 button / a에 mouse(또는 pen)가 들어오거나 keyboard focus가 올 때 한 번. 같은 hover 동안 반복 없음.
 *             나갔다가 다시 들어오면 다시 한 번. touch는 hover를 흉내 내지 않는다
 *   leave     재생 중에 pointer가 나가면 남은 부분만 빠르게(3배) 끝내고 정착한다 — 거꾸로 되돌리지 않는다
 *   settle    끝나면(또는 중간에 멈추면) transform / opacity를 모두 지워 언제나 원래 문장이 선명하게 남는다
 *   layout    칸의 폭 / 높이는 문장 그대로이고 transform만 움직여 button 폭 / 높이가 바뀌지 않는다. button 자체는 돌지 않는다
 * 보조기술은 원래 문장 한 번만 읽는다. reduced motion에서는 기울거나 구르지 않고 opacity만 아주 짧게 바뀐다.
 */
const DURATION = 0.45
const TILT = 40

type Props = {
  text: string
  /** 문장 뒤에 붙어 함께 도는 기호(예: ↗). 보조기술에는 읽히지 않는다. */
  trailing?: string
}

export default function RotatingWords({ text, trailing }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  useEffect(() => {
    const root = ref.current
    const trigger = root?.closest<HTMLElement>('button, a')
    if (!root || !trigger) return
    const visual = root.querySelector<HTMLElement>('.rotating-words__visual')
    const track = root.querySelector<HTMLElement>('.rotating-words__track')
    const outgoing = root.querySelector<HTMLElement>('.rotating-words__line--out')
    const incoming = root.querySelector<HTMLElement>('.rotating-words__line--in')
    if (!visual || !track || !outgoing || !incoming) return
    let tl: gsap.core.Timeline | null = null

    const reset = () => {
      gsap.set([track, outgoing, incoming], { clearProps: 'transform' })
      gsap.set(visual, { clearProps: 'opacity' })
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
      const ease = 'power3.out'
      tl.fromTo(track, { yPercent: 0 }, { yPercent: -50, duration: DURATION, ease }, 0)
        .fromTo(outgoing, { rotateX: 0 }, { rotateX: -TILT, duration: DURATION, ease }, 0)
        .fromTo(incoming, { rotateX: TILT }, { rotateX: 0, duration: DURATION, ease }, 0)
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
  }, [])

  // 한 줄의 문장. 단어와 기호는 token span이지만 한 줄 안에서 함께 움직인다(간격만 token 사이에 둔다).
  const line = (kind: 'out' | 'in') => (
    <span className={`rotating-words__line rotating-words__line--${kind}`}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="rotating-words__token">
          {word}
        </span>
      ))}
      {trailing && <span className="rotating-words__token rotating-words__token--trailing">{trailing}</span>}
    </span>
  )

  return (
    <span ref={ref} className="rotating-words">
      <span className="rotating-words__sr">{text}</span>
      <span className="rotating-words__visual" aria-hidden="true">
        <span className="rotating-words__track">
          {line('out')}
          {line('in')}
        </span>
      </span>
    </span>
  )
}
