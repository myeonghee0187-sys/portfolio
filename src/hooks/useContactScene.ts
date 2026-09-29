import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { crownLink } from './crownLink'
import { setCrownScrollRemap } from './useCrownWheel'

gsap.registerPlugin(ScrollTrigger)

/*
 * Contact progress: section 윗변이 화면 아래 끝에 닿을 때(= Journey pin이 끝나는 순간) 0,
 * section이 page 끝까지 올라와 화면을 다 채울 때 1. Contact는 pin하지 않는다 — 마지막 장면이라
 * 끝까지 scroll한 자리가 곧 정지 화면이고, Header의 CONTACT도 그 근처(약 0.9)에 도착한다.
 */

/** Journey 내용이 Contact 아래로 물러나며 옅어지는 구간과 도착 opacity. 바탕색은 둘 다 Carbon Black이다. */
const JOURNEY_DIM = { end: 0.5, opacity: 0.5 }

/** Watch 등장. 아래·오른쪽 가까이에서 천천히 제자리로 온다. 큰 회전 / 먼 거리 없음. */
const WATCH_ENTER = { start: 0.15, end: 0.55, y: 140, x: 32, scale: 0.96, rotate: 1.5 }

/**
 * Crown이 Watch에 결합하는 구간(Contact progress). 전부 scroll 진행률의 순수 함수다 — 시간 기반 tween도,
 * 마지막 frame에 좌표를 강제로 맞추는 snap도 없다. 되감으면 같은 기하로 그대로 풀린다.
 *   APPROACH.start ~ end  Crown이 controller 자리에서 socket 쪽으로 다가간다. 매 frame 두 중심을
 *                         getBoundingClientRect()로 다시 재서 deltaX / deltaY에 approach(0 -> 1)를 곱한다.
 *                         sine.inOut이라 end에서 속도 0으로 socket에 닿는다(= 결합).
 *   ORIENT                같은 approach 위에서 정면 -> 옆모습으로 돌아선다(crownLink.attach).
 * 영향 없는 자리(시작 전 / 결합 후)에서는 값이 변하지 않는다.
 */
const APPROACH = { start: 0.4, end: 0.92 }
const ORIENT = { from: 0.35, to: 0.95 }

/**
 * Watch도 Crown 쪽으로 조금 다가간다(가로 최대 WATCH_REACH px). 결합이 가까워질 때 가장 크고(approach 2/3),
 * 결합하는 순간 원래 자리(0)로 돌아와 있다. Crown은 매 frame 그 순간의 socket을 따라가므로 두 쪽이 서로 접근한다.
 */
const WATCH_REACH = 10

/** 결합 순간 steel 테두리를 한 번 지나가는 Ice 반사. 빛만 시간 기반이고 위치와는 무관하다. */
const GLINT = { peak: 0.22, duration: 0.6 }

/**
 * Crown의 scroll 회전 영향(진행률 -> 1이면 page scroll 그대로 돈다). 가까워질수록 1 -> .7 -> .35 -> 0으로 줄고
 * 결합하면 0 — 회전은 그때의 각도 그대로 멈춘다(0°로 돌아가지 않는다). 되감으면 같은 각도를 거꾸로 지나간다.
 */
const SPIN_INFLUENCE: ReadonlyArray<readonly [number, number]> = [
  [APPROACH.start, 1],
  [0.6, 0.7],
  [0.76, 0.35],
  [APPROACH.end, 0],
]

/** Light Rays. Journey -> Contact 진입 때 opacity 0 -> 0.5가 1.4초 동안 오른다(시간 기반). 되감으면 다시 가라앉는다. */
const RAYS = { start: 'top 75%', opacity: 0.5, duration: 1.4 }

/** 문장 / 링크 등장. 글자 단위 분해 없이 묶음 단위로 짧게 올라온다. */
const REVEAL = { start: 'top 70%', duration: 0.7, stagger: 0.08 }

type Options = {
  /** scroll 연출이 켜져 있는지(= global Crown이 있는지). */
  interactive: boolean
  /** Intro가 끝났는지. */
  ready: boolean
  sectionRef: RefObject<HTMLElement | null>
}

/** SPIN_INFLUENCE를 0부터 progress까지 적분한 값(진행률 단위). 구간마다 사다리꼴 넓이를 더한다. */
function spinIntegral(progress: number) {
  const [first] = SPIN_INFLUENCE
  if (progress <= first[0]) return progress
  let area = first[0]
  for (let i = 1; i < SPIN_INFLUENCE.length; i++) {
    const [p0, v0] = SPIN_INFLUENCE[i - 1]
    const [p1, v1] = SPIN_INFLUENCE[i]
    const x = Math.min(progress, p1)
    const vx = v0 + ((v1 - v0) * (x - p0)) / (p1 - p0)
    area += ((x - p0) * (v0 + vx)) / 2
    if (progress <= p1) return area
  }
  return area // 마지막 지점 이후는 영향 0
}

/**
 * Contact 마지막 장면.
 *
 * 연출이 켜져 있으면 FACES부터 화면 오른쪽 아래에 있던 global Crown(같은 DOM)이 Contact Watch의 socket으로 돌아간다.
 *   - Watch가 section과 함께 아래에서 올라오며 Crown 가까이로 온다(Watch가 Crown을 받으러 온다).
 *   - progress 0.4부터 Crown이 socket 쪽으로 서서히 다가간다. 매 frame 두 중심을 실제로 재서(deltaX / deltaY)
 *     그 비율만큼만 옮기고, 정면 -> 옆모습으로 돌아서며 크기가 맞춰진다. Watch도 Crown 쪽으로 조금 다가갔다 제자리로 온다.
 *   - 0.92에서 속도 0으로 socket에 닿는다. 자석처럼 붙는 시간 기반 tween이나 마지막 frame의 좌표 보정은 없다.
 *   - 가까워질수록 Crown의 scroll 회전이 1 -> .7 -> .35 -> 0으로 줄고, 결합하면 그 각도에 멈춘다.
 * Crown 위치 / 크기는 .watch__crown-attach 하나에만 쓰고(GSAP이 다루지 않는 layer), 방향은 crownLink로
 * useScrollScene과 함께 그린다. scroll 진행률의 함수라 되감으면 결합이 풀리고 Crown은 원래 controller 자리로 돌아간다.
 *
 * 연출이 꺼져 있으면(모바일 / 터치 / reduced motion) Contact Watch가 자기 Crown을 갖고, 등장만 짧게 한다.
 */
export default function useContactScene({ interactive, ready, sectionRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const watchBox = section?.querySelector<HTMLElement>('.contact__watch')
    const watchEnter = section?.querySelector<HTMLElement>('.contact__watch-enter')
    const watchTilt = section?.querySelector<HTMLElement>('.contact__watch-tilt')
    if (!section || !watchBox || !watchEnter || !watchTilt || !ready) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reveal = gsap.utils.toArray<HTMLElement>(section.querySelectorAll('[data-contact-reveal]'))
    const cleanups: Array<() => void> = []

    const ctx = gsap.context(() => {
      /* ---------- Light Rays (OGL). 그리기는 LightRays가, 세기(opacity)는 여기서 ---------- */
      const rays = section.querySelector<HTMLElement>('.contact__rays')
      if (rays) {
        let raysTween: gsap.core.Tween | null = null
        const fadeRays = (opacity: number, duration: number) => {
          raysTween?.kill()
          raysTween = gsap.to(rays, { opacity, duration, ease: 'sine.inOut', overwrite: true })
        }
        ScrollTrigger.create({
          trigger: section,
          start: RAYS.start,
          refreshPriority: -4,
          onEnter: () => fadeRays(RAYS.opacity, RAYS.duration),
          onLeaveBack: () => fadeRays(0, RAYS.duration * 0.7),
        })
        cleanups.push(() => {
          raysTween?.kill()
          rays.style.removeProperty('opacity')
        })
      }

      /* ---------- 문장 / 링크 등장 (시간 기반, 들어오면 재생 / 되감으면 역재생) ---------- */
      const revealTl = gsap.timeline({ paused: true })
      if (reduced) {
        revealTl.fromTo(reveal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none', stagger: 0.06 })
      } else {
        revealTl.fromTo(
          reveal,
          { autoAlpha: 0, y: (_: number, el: HTMLElement) => Number(el.dataset.contactReveal) || 0 },
          { autoAlpha: 1, y: 0, duration: REVEAL.duration, ease: 'power3.out', stagger: REVEAL.stagger },
        )
      }
      ScrollTrigger.create({
        trigger: section,
        start: REVEAL.start,
        refreshPriority: -4,
        onEnter: () => revealTl.play(),
        onLeaveBack: () => revealTl.reverse(),
      })

      if (!interactive) {
        /* ---------- 연출이 꺼진 환경: Watch가 짧게 올라오고, 자기 Crown이 몇 px 들어가며 자리를 잡는다 ---------- */
        const ownCrown = watchBox.querySelector<HTMLElement>('.watch__crown-attach')
        const enter = gsap.timeline({ paused: true })
        enter.fromTo(
          watchEnter,
          { autoAlpha: 0, y: reduced ? 0 : 60 },
          { autoAlpha: 1, y: 0, duration: reduced ? 0.5 : 1, ease: reduced ? 'none' : 'power2.out' },
        )
        if (ownCrown && !reduced) {
          enter.fromTo(ownCrown, { x: 6 }, { x: 0, duration: 0.42, ease: 'power2.inOut' }, 0.55)
        }
        ScrollTrigger.create({
          trigger: watchBox,
          start: 'top 88%',
          refreshPriority: -4,
          onEnter: () => enter.play(),
          onLeaveBack: () => enter.reverse(),
        })
        return
      }

      /* ---------- 연출이 켜진 환경: 같은 Crown이 다시 Watch에 결합한다 ---------- */
      const socket = watchBox.querySelector<HTMLElement>('.watch__crown-socket')
      const glint = watchBox.querySelector<HTMLElement>('.watch__reflection')
      const crown = document.querySelector<HTMLElement>('.watch--stage .watch__crown')
      const attachLayer = crown?.querySelector<HTMLElement>('.watch__crown-attach')
      const journeyWorld = document.querySelector<HTMLElement>('.journey__world')
      if (!socket || !crown || !attachLayer) return

      const approachEase = gsap.parseEase('sine.inOut')
      const orientEase = gsap.parseEase('sine.inOut')
      const segment = (p: number, from: number, to: number) => gsap.utils.clamp(0, 1, (p - from) / (to - from))
      let watchShift = 0 // 지금 .contact__watch-tilt에 쓴 가로 이동(px). socket rect에 이미 들어 있다
      let attached = false
      let glintTl: gsap.core.Timeline | null = null

      const playGlint = () => {
        if (!glint) return
        glintTl?.kill()
        glintTl = gsap
          .timeline()
          .fromTo(glint, { '--reflection-x': '120%' }, { '--reflection-x': '-20%', duration: GLINT.duration, ease: 'sine.inOut' }, 0)
          .fromTo(glint, { opacity: 0 }, { opacity: GLINT.peak, duration: GLINT.duration * 0.4, ease: 'sine.out' }, 0)
          .to(glint, { opacity: 0, duration: GLINT.duration * 0.6, ease: 'sine.in' }, GLINT.duration * 0.4)
      }

      /**
       * progress 하나로 Crown / Watch를 그린다. 읽기(rect)를 먼저, 쓰기를 나중에 한다.
       *   .watch__crown 박스는 attach layer의 transform 영향을 받지 않으므로 controller 자리의 중심은 언제 읽어도 같다.
       *   socket은 section과 함께 scroll되고 Watch 등장 / 접근 이동으로도 움직인다. 잰 rect에는 지난 frame의
       *   Watch 이동이 들어 있어, 이번 frame에 쓸 이동과의 차이만큼 바로잡는다.
       */
      const update = (progress: number) => {
        const cr = crown.getBoundingClientRect()
        const sr = socket.getBoundingClientRect()
        const approach = approachEase(segment(progress, APPROACH.start, APPROACH.end))
        const nextShift = WATCH_REACH * 6.75 * approach * approach * (1 - approach)

        if (approach <= 0) {
          attachLayer.style.removeProperty('transform')
        } else {
          // Crown이 놓인 layer의 배율(화면 px / Crown 좌표). offsetWidth는 정수로 반올림돼 몇 px씩 어긋나므로 소수 폭을 쓴다.
          const k = cr.width / parseFloat(getComputedStyle(crown).width)
          if (k > 0 && cr.height > 0) {
            const socketX = sr.left + sr.width / 2 + (nextShift - watchShift)
            const socketY = sr.top + sr.height / 2
            const deltaX = socketX - (cr.left + cr.width / 2)
            const deltaY = socketY - (cr.top + cr.height / 2)
            const size = 1 + (sr.height / cr.height - 1) * approach
            attachLayer.style.transform = `translate(${((deltaX * approach) / k).toFixed(2)}px, ${((deltaY * approach) / k).toFixed(2)}px) scale(${size.toFixed(4)})`
          }
        }

        watchShift = nextShift
        if (watchShift > 0.01) watchTilt.style.translate = `${watchShift.toFixed(2)}px 0`
        else watchTilt.style.removeProperty('translate')

        crownLink.attach = orientEase(segment(approach, ORIENT.from, ORIENT.to))
        crownLink.refresh()

        // 결합한 순간에만 테두리에 빛이 한 번 지나간다. 되감아 떨어지면 빛도 지운다.
        const isAttached = approach >= 1
        if (isAttached !== attached) {
          attached = isAttached
          if (isAttached) playGlint()
          else {
            glintTl?.kill()
            if (glint) gsap.set(glint, { opacity: 0 })
          }
        }
      }

      /** Crown 회전이 따라가는 scroll. Contact 구간에서만 SPIN_INFLUENCE만큼 줄어든다. */
      const spinRemap = (start: number, end: number) => (scrollY: number) => {
        if (scrollY <= start) return scrollY
        const d = end - start
        return start + d * spinIntegral(Math.min(1, (scrollY - start) / d))
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'contact-scene',
          trigger: section,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true, // Watch와 Crown이 같은 frame에 움직여야 해서 지연을 두지 않는다.
          invalidateOnRefresh: true,
          refreshPriority: -4, // Faces / Journey pin 길이가 정해진 뒤에 잰다.
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => {
            setCrownScrollRemap(spinRemap(self.start, self.end))
            update(self.progress)
          },
        },
      })
      if (journeyWorld) {
        tl.fromTo(journeyWorld, { opacity: 1 }, { opacity: JOURNEY_DIM.opacity, ease: 'none', duration: JOURNEY_DIM.end }, 0)
      }
      tl.fromTo(
        watchEnter,
        { autoAlpha: 0, y: WATCH_ENTER.y, x: WATCH_ENTER.x, scale: WATCH_ENTER.scale, rotate: WATCH_ENTER.rotate },
        { autoAlpha: 1, y: 0, x: 0, scale: 1, rotate: 0, ease: 'power2.out', duration: WATCH_ENTER.end - WATCH_ENTER.start },
        WATCH_ENTER.start,
      )
      tl.set({}, {}, 1)

      cleanups.push(() => {
        glintTl?.kill()
        setCrownScrollRemap(null)
        if (glint) gsap.set(glint, { clearProps: 'opacity,--reflection-x' })
        attachLayer.style.removeProperty('transform')
        watchTilt.style.removeProperty('translate')
        crownLink.attach = 0
        crownLink.refresh()
      })
    })

    return () => {
      ctx.revert()
      cleanups.forEach((fn) => fn())
    }
  }, [interactive, ready, sectionRef])
}
