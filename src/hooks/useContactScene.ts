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

/**
 * Watch 등장. 아래·오른쪽 가까이에서 오른쪽 가운데 제자리로 천천히 온다(큰 회전 / 먼 거리 없음).
 * Crown이 도착하는 ATTACH.end 직전까지 조금씩 계속 다가와, Crown만 혼자 Watch로 날아가지 않는다.
 */
const WATCH_ENTER = { start: 0.15, end: 0.88, y: 140, x: 32, scale: 0.96, rotate: 1.5, ease: 'power2.out' }

/**
 * Crown 결합. 진행률 0.40 ~ 0.90에 걸쳐 global Crown(controller 자리)이 Contact Watch의 socket으로 천천히 간다.
 *   t = clamp((progress - 0.40) / 0.50),  s = t²(3 - 2t)   (smoothstep)
 *   위치 = lerp(controller 중심, socket 중심, s)   크기 = lerp(1, socket 크기, s)   방향 = 정면 -> 옆모습(s)
 * 두 중심은 매번 실제 DOM(.watch__crown / .watch__crown-socket)의 getBoundingClientRect로 잰다.
 * socket은 Watch와 함께 움직이므로(section scroll + 등장) Crown과 Watch가 서로 다가가고,
 * smoothstep의 끝 기울기가 0이라 마지막 순간 두 속도가 같아진 채로 맞물린다 — 마지막 frame에 좌표를 맞추지 않는다.
 * 시간 기반 tween이 없는 scroll의 순수 함수라, 되감으면 같은 계산으로 떨어져 controller 자리로 돌아간다.
 */
const ATTACH = { from: 0.4, span: 0.5 }

/** 결합 순간 steel 테두리를 한 번 지나가는 Ice 반사(scroll에 묶인다). */
const GLINT = { from: 0.84, to: 0.96, peak: 0.22 }

/**
 * Crown의 scroll 회전 영향(진행률 -> 1이면 page scroll 그대로 돈다). 가까워질수록 서서히 줄고 결합하면 0 —
 * 회전은 그때의 각도 그대로 멈춘다(0°로 돌아가지 않는다). 되감으면 같은 각도를 거꾸로 지나간다.
 */
const SPIN_INFLUENCE: ReadonlyArray<readonly [number, number]> = [
  [0.4, 1],
  [0.57, 0.7],
  [0.73, 0.35],
  [0.9, 0],
]

/** 문장 / 링크 등장. 글자 단위 분해 없이 묶음 단위로 짧게 올라온다. */
const REVEAL = { start: 'top 70%', duration: 0.7, stagger: 0.08 }

/** Light Rays 진입. section이 화면에 들어오면 1.4초 동안 0 -> 0.5. 되감아 나가면 조용히 꺼진다. */
const RAYS = { start: 'top 80%', opacity: 0.5, duration: 1.4, outDuration: 0.6 }

type Options = {
  /** scroll 연출이 켜져 있는지(= global Crown이 있는지). */
  interactive: boolean
  /** Intro가 끝났는지. */
  ready: boolean
  sectionRef: RefObject<HTMLElement | null>
}

const smoothstep = (t: number) => t * t * (3 - 2 * t)

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
 *   - Watch가 section과 함께 아래에서 올라오며 오른쪽 가운데 제자리로 다가온다.
 *   - 0.40부터 Crown이 실제 socket 좌표를 향해 천천히 움직이고(smoothstep), 정면 -> 옆모습으로 돌아서며 크기가 맞춰진다.
 *   - 0.90에 두 속도가 같아진 채로 맞물린다. 가까워질수록 scroll 회전이 줄고, 결합하면 그 각도에 멈춘다.
 * Crown 위치 / 크기는 .watch__crown-attach 하나에만 쓰고(GSAP이 다루지 않는 layer), 방향은 crownLink로
 * useScrollScene과 함께 그린다.
 *
 * 연출이 꺼져 있으면(모바일 / 터치 / reduced motion) Contact Watch가 자기 Crown을 갖고, 등장만 짧게 한다.
 */
export default function useContactScene({ interactive, ready, sectionRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const watchBox = section?.querySelector<HTMLElement>('.contact__watch')
    const watchEnter = section?.querySelector<HTMLElement>('.contact__watch-enter')
    const rays = section?.querySelector<HTMLElement>('.contact-light-rays')
    if (!section || !watchBox || !watchEnter || !ready) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reveal = gsap.utils.toArray<HTMLElement>(section.querySelectorAll('[data-contact-reveal]'))
    const cleanups: Array<() => void> = []

    const ctx = gsap.context(() => {
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

      /* ---------- Light Rays 진입(시간 기반). 빛 자체에는 이동 animation을 더하지 않는다. ---------- */
      if (rays) {
        gsap.set(rays, { opacity: 0 })
        ScrollTrigger.create({
          trigger: section,
          start: RAYS.start,
          refreshPriority: -4,
          onEnter: () => gsap.to(rays, { opacity: RAYS.opacity, duration: RAYS.duration, ease: 'power2.out', overwrite: true }),
          onLeaveBack: () => gsap.to(rays, { opacity: 0, duration: RAYS.outDuration, ease: 'power1.out', overwrite: true }),
          onRefresh: (self) => {
            if (self.progress > 0 && !gsap.isTweening(rays)) gsap.set(rays, { opacity: RAYS.opacity })
          },
        })
      }

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

      /** 마지막으로 계산한 결합 정도와 두 중심(QA용). */
      const state = { s: 0, dx: 0, dy: 0 }

      /*
       * 매번 Crown 박스(controller 자리)와 socket의 실제 화면 좌표를 다시 읽는다 — socket은 section과 함께 scroll되고
       * 등장 tween으로도 움직이기 때문이다. 읽기를 먼저, 쓰기를 나중에 한다.
       * .watch__crown 박스 자체는 attach layer의 transform 영향을 받지 않으므로 controller 자리는 언제 읽어도 같다.
       */
      const pose = (progress: number) => {
        const s = smoothstep(gsap.utils.clamp(0, 1, (progress - ATTACH.from) / ATTACH.span))
        const cr = crown.getBoundingClientRect()
        const sr = socket.getBoundingClientRect()
        const dx = sr.left + sr.width / 2 - (cr.left + cr.width / 2)
        const dy = sr.top + sr.height / 2 - (cr.top + cr.height / 2)
        state.s = s
        state.dx = dx
        state.dy = dy
        if (s <= 0) {
          attachLayer.style.removeProperty('transform')
        } else {
          // Crown이 놓인 layer의 배율(화면 px / Crown 좌표). offsetWidth는 정수로 반올림돼 몇 px씩 어긋나므로 소수 폭을 쓴다.
          const k = cr.width / parseFloat(getComputedStyle(crown).width)
          if (k > 0 && cr.height > 0) {
            const size = 1 + (sr.height / cr.height - 1) * s
            attachLayer.style.transform = `translate(${((dx * s) / k).toFixed(2)}px, ${((dy * s) / k).toFixed(2)}px) scale(${size.toFixed(4)})`
          }
        }
        if (glint) {
          const g = gsap.utils.clamp(0, 1, (progress - GLINT.from) / (GLINT.to - GLINT.from))
          const strength = GLINT.peak * Math.sin(Math.PI * g)
          glint.style.opacity = strength.toFixed(3)
          glint.style.setProperty('--reflection-x', `${(120 - 140 * g).toFixed(1)}%`)
        }
        crownLink.attach = s
        crownLink.refresh()
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
          onUpdate: (self) => pose(self.progress),
          onRefresh: (self) => {
            setCrownScrollRemap(spinRemap(self.start, self.end))
            pose(self.progress)
          },
        },
      })
      if (journeyWorld) {
        tl.fromTo(journeyWorld, { opacity: 1 }, { opacity: JOURNEY_DIM.opacity, ease: 'none', duration: JOURNEY_DIM.end }, 0)
      }
      tl.fromTo(
        watchEnter,
        { autoAlpha: 0, y: WATCH_ENTER.y, x: WATCH_ENTER.x, scale: WATCH_ENTER.scale, rotate: WATCH_ENTER.rotate },
        {
          autoAlpha: 1,
          y: 0,
          x: 0,
          scale: 1,
          rotate: 0,
          ease: WATCH_ENTER.ease,
          duration: WATCH_ENTER.end - WATCH_ENTER.start,
        },
        WATCH_ENTER.start,
      )
      tl.set({}, {}, 1)

      // 개발 중 QA용 읽기 전용 상태(배포 build에서는 빠진다).
      const debug = window as unknown as { __contact?: () => Record<string, number> }
      if (import.meta.env.DEV) debug.__contact = () => ({ ...state })

      cleanups.push(() => {
        if (import.meta.env.DEV) delete debug.__contact
        setCrownScrollRemap(null)
        if (glint) gsap.set(glint, { clearProps: 'opacity,--reflection-x' })
        attachLayer.style.removeProperty('transform')
        crownLink.attach = 0
        crownLink.refresh()
      })
    })

    return () => {
      ctx.revert()
      cleanups.forEach((fn) => fn())
      rays?.style.removeProperty('opacity')
    }
  }, [interactive, ready, sectionRef])
}
