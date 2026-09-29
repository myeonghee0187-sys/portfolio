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
 * Crown이 Watch 쪽으로 가는 방식. 올라오는 Watch의 socket이 Crown 높이에 닿는 지점(reach)이 기준이다.
 * reach는 화면 크기마다 달라서(대략 0.45 ~ 0.5) earliest ~ latest 사이로만 제한한다.
 *   carry  세로. reach 조금 전부터 서서히 따라붙어(Watch와 Crown이 서로 가까워진다) Watch에 실려 올라간다
 *   align  가로 / 크기 / 정면 -> 옆모습. ALIGN.end까지 천천히 맞춰지고, socket 옆 ATTACH 간격만 남긴다
 */
const CARRY = { lead: 0.05, span: 0.17 }
const ALIGN = { earliest: 0.4, latest: 0.66, end: 0.86 }

/**
 * 결합. 남은 14px을 Crown(+6px)과 Watch(-8px)가 동시에 좁힌다. 시간 기반이고 튕김 / 크기 변화가 없다.
 * ATTACH.at을 지나면 붙고, 되감아 그 앞으로 가면 같은 시간 동안 천천히 떨어진다.
 */
const ATTACH = { at: 0.88, crownGap: 6, watchGap: 8, duration: 0.42, ease: 'power2.inOut' }

/** 결합 순간 steel 테두리를 한 번 지나가는 Ice 반사. */
const GLINT = { peak: 0.22, duration: 0.6 }

/**
 * Crown의 scroll 회전 영향(진행률 -> 1이면 page scroll 그대로 돈다). 가까워질수록 서서히 줄고 결합하면 0 —
 * 회전은 그때의 각도 그대로 멈춘다(0°로 돌아가지 않는다). 되감으면 같은 각도를 거꾸로 지나간다.
 */
const SPIN_INFLUENCE: ReadonlyArray<readonly [number, number]> = [
  [0.46, 1],
  [0.62, 0.65],
  [0.76, 0.25],
  [0.88, 0],
]

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
 *   - socket이 Crown 높이에 닿을 즈음 Crown이 서서히 Watch에 실려 올라가고, 정면 -> 옆모습으로 돌아서며 크기가 맞춰진다.
 *   - socket 옆 14px에서 기다렸다가, Crown과 Watch가 함께 0.42초 동안 남은 거리를 좁히며 결합한다.
 *   - 가까워질수록 Crown의 scroll 회전이 서서히 줄고, 결합하면 그 각도에 멈춘다.
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
          enter.fromTo(ownCrown, { x: ATTACH.crownGap }, { x: 0, duration: ATTACH.duration, ease: ATTACH.ease }, 0.55)
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

      const alignEase = gsap.parseEase('power1.inOut')
      const carryEase = gsap.parseEase('sine.inOut')
      const attach = { v: 0 }
      let align = 0 // 가로 위치 / 크기 / 방향이 socket 옆 자리에 맞춰진 정도
      let carry = 0 // 세로로 Watch에 실려 가는 정도
      let attached = false
      let watchShift = 0 // 지금 .contact__watch-tilt에 쓴 가로 이동(px)
      let rectShift = 0 // 마지막으로 socket을 잴 때 Watch에 걸려 있던 가로 이동(px)
      let attachTween: gsap.core.Tween | null = null
      let glintTl: gsap.core.Timeline | null = null

      const measure = () => {
        rectShift = watchShift
        return { cr: crown.getBoundingClientRect(), sr: socket.getBoundingClientRect() }
      }

      /*
       * Crown / Watch 위치. 매번 Crown 박스(controller 자리)와 socket의 화면 좌표를 다시 읽는다 —
       * socket은 section과 함께 scroll되고 등장 tween으로도 움직이기 때문이다. 읽기를 먼저, 쓰기를 나중에 한다.
       * .watch__crown 박스 자체는 이 transform의 영향을 받지 않으므로 controller 자리는 언제 읽어도 같다.
       */
      const pose = (rects = measure()) => {
        watchShift = -ATTACH.watchGap * (1 - attach.v)
        if (align <= 0 && carry <= 0) {
          attachLayer.style.removeProperty('transform')
        } else {
          const { cr, sr } = rects
          // Crown이 놓인 layer의 배율(화면 px / Crown 좌표). offsetWidth는 정수로 반올림돼 몇 px씩 어긋나므로 소수 폭을 쓴다.
          const k = cr.width / parseFloat(getComputedStyle(crown).width)
          if (k > 0 && cr.height > 0) {
            // 잰 socket 위치에는 잴 때의 Watch 이동이 들어 있다. 이번에 쓸 이동으로 바로잡는다.
            const socketX = sr.left + sr.width / 2 + (watchShift - rectShift)
            const gap = (ATTACH.crownGap + ATTACH.watchGap) * (1 - attach.v)
            const tx = (align * (socketX + gap - (cr.left + cr.width / 2))) / k
            const ty = (carry * (sr.top + sr.height / 2 - (cr.top + cr.height / 2))) / k
            const size = 1 + (sr.height / cr.height - 1) * align
            attachLayer.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${size.toFixed(4)})`
          }
        }
        if (watchShift) watchTilt.style.translate = `${watchShift.toFixed(2)}px 0`
        else watchTilt.style.removeProperty('translate')
        crownLink.attach = align
        crownLink.refresh()
      }

      const playGlint = () => {
        if (!glint) return
        glintTl?.kill()
        glintTl = gsap
          .timeline()
          .fromTo(glint, { '--reflection-x': '120%' }, { '--reflection-x': '-20%', duration: GLINT.duration, ease: 'sine.inOut' }, 0)
          .fromTo(glint, { opacity: 0 }, { opacity: GLINT.peak, duration: GLINT.duration * 0.4, ease: 'sine.out' }, 0)
          .to(glint, { opacity: 0, duration: GLINT.duration * 0.6, ease: 'sine.in' }, GLINT.duration * 0.4)
      }

      const update = (progress: number, distance: number) => {
        const rects = measure()
        /*
         * socket이 Crown 높이에 닿는 progress. section은 progress 1당 distance px만큼 일정하게 올라가므로
         * 지금 두 높이의 차이에서 바로 구한다(등장 tween이 거의 끝난 구간이라 오차는 몇 px 이내).
         * 현재 상태만으로 정해지는 값이라 되감아도 같은 자리에서 풀린다.
         */
        const socketY = rects.sr.top + rects.sr.height / 2
        const crownY = rects.cr.top + rects.cr.height / 2
        const reach = gsap.utils.clamp(ALIGN.earliest, ALIGN.latest, progress + (socketY - crownY) / Math.max(1, distance))
        carry = carryEase(gsap.utils.clamp(0, 1, (progress - (reach - CARRY.lead)) / CARRY.span))
        align = alignEase(gsap.utils.clamp(0, 1, (progress - reach) / (ALIGN.end - reach)))

        const shouldAttach = progress >= ATTACH.at && align >= 1
        if (shouldAttach !== attached) {
          attached = shouldAttach
          attachTween?.kill()
          attachTween = gsap.to(attach, {
            v: shouldAttach ? 1 : 0,
            duration: ATTACH.duration,
            ease: ATTACH.ease,
            onUpdate: () => pose(),
          })
          if (shouldAttach) playGlint()
          else {
            glintTl?.kill()
            if (glint) gsap.set(glint, { opacity: 0 })
          }
        }
        pose(rects)
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
          onUpdate: (self) => update(self.progress, self.end - self.start),
          onRefresh: (self) => {
            setCrownScrollRemap(spinRemap(self.start, self.end))
            update(self.progress, self.end - self.start)
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
        attachTween?.kill()
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
