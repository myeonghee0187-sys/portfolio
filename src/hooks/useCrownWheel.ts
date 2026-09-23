import { useEffect, type RefObject } from 'react'

/**
 * page scroll 1px당 wheel 표면이 지나가는 거리(Watch 디자인 px, Hero 1:1 기준).
 * 0.06이면 100px scroll(마우스 휠 한 칸)에 표면이 6px, 홈 약 2개가 굴러간다.
 *
 * 홈 간격이 약 2.9px로 촘촘해서, 한 프레임에 홈 반 개 이상 움직이면 눈이 방향을 놓친다(wagon-wheel).
 * 0.08에서는 휠 한 칸의 첫 프레임이 홈 0.8개라 방향이 흔들렸고, 0.06은 일반 scroll을 반 개 아래로 둔다.
 */
export const CROWN_WHEEL_FACTOR = 0.06

/**
 * 60fps 한 프레임당 목표값을 따라잡는 비율.
 * wheel event의 계단감만 없애는 정도다. scroll을 멈추면 100ms 안에 약 90%, 170ms 안에 97%가 따라붙고,
 * 목표에 닿으면 그 자리에서 멈춘다(관성 / overshoot 없음).
 */
const SMOOTHING = 0.3

/** 이보다 가까우면 목표에 도착한 것으로 보고 rAF를 멈춘다(px). */
const SETTLE_EPSILON = 0.001

/*
 * 페이지 안의 Crown은 전부 같은 page scroll을 따른다(scroll scene이 꺼지면 Hero / About에 하나씩 있다).
 * 그래서 listener와 rAF는 Crown 개수와 상관없이 하나만 돌고, 등록된 Crown이 없으면 아무것도 돌지 않는다.
 */
const surfaces = new Set<{ targets: HTMLElement[]; pitch: number }>()
let target = 0
let current = 0
let rafId = 0
let lastTime = 0

/** 홈 하나 안에서의 위치(0 이상 1 미만). 표면은 주기적이라 이 값만으로 이음매 없이 계속 굴러간다. */
const turnOf = (phase: number, pitch: number) => {
  const t = (phase / pitch) % 1
  return t < 0 ? t + 1 : t
}

const write = (targets: HTMLElement[], value: string | null) => {
  for (const el of targets) {
    if (value === null) el.style.removeProperty('--crown-wheel-phase')
    else el.style.setProperty('--crown-wheel-phase', value)
  }
}

const paint = () => {
  for (const s of surfaces) write(s.targets, turnOf(current, s.pitch).toFixed(4))
}

const tick = (now: number) => {
  // 프레임 간격이 달라도(120Hz, 느린 프레임) 같은 시간에 같은 만큼 따라붙게 한다.
  const frames = lastTime ? Math.min(4, (now - lastTime) / (1000 / 60)) : 1
  lastTime = now
  current += (target - current) * (1 - (1 - SMOOTHING) ** frames)
  if (Math.abs(target - current) < SETTLE_EPSILON) current = target
  paint()

  if (current === target) {
    rafId = 0
    lastTime = 0
  } else {
    rafId = requestAnimationFrame(tick)
  }
}

const onScroll = () => {
  target = window.scrollY * CROWN_WHEEL_FACTOR
  if (!rafId) rafId = requestAnimationFrame(tick)
}

/**
 * page scroll을 Digital Crown wheel의 위상으로 바꿔 `--crown-wheel-phase`(0~1)에 쓴다.
 *
 * React state를 거치지 않는다. scroll listener가 목표값만 바꾸고, rAF가 CSS 변수만 쓴다.
 * 위상은 scrollY에서 바로 나오므로 결정적이다 — 맨 위(scrollY 0)로 돌아오면 표면도 처음 상태가 된다.
 *
 * 변수는 ref 안에서 `data-crown-wheel`이 붙은 element에만 쓴다. 부모에 한 번 쓰면 상속 때문에
 * 그 아래 모든 element의 style이 매 프레임 다시 계산되므로, 실제로 움직이는 표면에만 직접 쓴다.
 *
 * @param ref    wheel 표면들을 담고 있는 element.
 * @param pitch  홈 하나의 간격(Watch 디자인 px). 위상 1이 곧 홈 하나다.
 * @param enabled false면(reduced motion) 등록하지 않고 표면을 처음 상태에 둔다.
 */
export default function useCrownWheel(
  ref: RefObject<HTMLElement | null>,
  pitch: number,
  enabled: boolean,
) {
  useEffect(() => {
    const root = ref.current
    if (!enabled || !root) return

    const surface = { targets: [...root.querySelectorAll<HTMLElement>('[data-crown-wheel]')], pitch }
    if (surfaces.size === 0) {
      // 중간에서 새로고침해도 0에서부터 굴러오지 않고 현재 scroll 위치의 표면으로 바로 시작한다.
      target = current = window.scrollY * CROWN_WHEEL_FACTOR
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    surfaces.add(surface)
    write(surface.targets, turnOf(current, pitch).toFixed(4))

    return () => {
      surfaces.delete(surface)
      write(surface.targets, null)
      if (surfaces.size === 0) {
        window.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(rafId)
        rafId = 0
        lastTime = 0
      }
    }
  }, [ref, pitch, enabled])
}
