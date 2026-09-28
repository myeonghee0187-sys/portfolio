import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { crownLink } from './crownLink'

gsap.registerPlugin(ScrollTrigger)

/*
 * Contact progress: section 윗변이 화면 아래 끝에 닿을 때(= Journey pin이 끝나는 순간) 0,
 * section이 page 끝까지 올라와 화면을 다 채울 때 1. Contact는 pin하지 않는다 — 마지막 장면이라
 * 끝까지 scroll한 자리가 곧 정지 화면이고, Header의 CONTACT도 그 근처(약 0.9)에 도착한다.
 */

/** Journey 내용이 Contact 아래로 물러나며 옅어지는 구간과 도착 opacity. 바탕색은 둘 다 Carbon Black이다. */
const JOURNEY_DIM = { end: 0.5, opacity: 0.5 }

/** Watch 등장. 아래·오른쪽 가까이에서 올라오며 선명해진다. 큰 회전 / 먼 거리 없음. */
const WATCH_ENTER = { start: 0.18, end: 0.62, y: 140, x: 32, scale: 0.96, rotate: 1.5 }

/**
 * Crown이 socket 자리로 맞춰 가는 구간. 끝나면 socket 바로 옆(SNAP.gap)에 선다.
 * 시작은 고정값이 아니라 "올라오는 Watch의 socket이 Crown 높이에 닿는 지점"이다 — Crown은 그때까지
 * controller 자리에서 기다리고, Watch가 와서 받아 간다. 그 지점은 화면 크기마다 달라서(1920에서 약 0.51,
 * 1440 / 1024에서 약 0.58 ~ 0.60) earliest ~ latest 사이로만 제한한다.
 */
const ALIGN = { earliest: 0.4, latest: 0.66, end: 0.8 }

/**
 * socket이 Crown에 닿은 뒤 Crown이 세로로 Watch를 따라 올라가기 시작하는 데 걸리는 progress.
 * 짧게 가속해서 Watch에 실려 가고(속도가 한 번에 튀지 않게), 가로 위치 / 크기 / 방향은 ALIGN.end까지 천천히 맞춰진다.
 */
const CARRY = 0.06

/** 결합. 남은 몇 px만 짧게 들어가며 한 번 눌렸다 제자리. 튕김 / spring 없음. 초 단위. */
const SNAP = { gap: 12, duration: 0.32, release: 0.24, dip: 0.015 }

/** 결합 순간 steel 테두리를 한 번 지나가는 Ice 반사. */
const GLINT = { peak: 0.22, duration: 0.6 }

/** 문장 등장. 글자 단위 분해 없이 묶음 단위로 짧게 올라온다. */
const REVEAL = { start: 'top 70%', duration: 0.7, stagger: 0.08 }

type Options = {
  /** scroll 연출이 켜져 있는지(= global Crown이 있는지). */
  interactive: boolean
  /** Intro가 끝났는지. */
  ready: boolean
  sectionRef: RefObject<HTMLElement | null>
}

/**
 * Contact 마지막 장면.
 *
 * 연출이 켜져 있으면 FACES부터 화면 오른쪽 아래에 있던 global Crown(같은 DOM)이 Contact Watch의 socket으로 돌아간다.
 *   - Watch가 section과 함께 아래에서 올라오며 Crown 가까이로 온다(Watch가 Crown을 받으러 온다).
 *   - ALIGN 구간에서 Crown이 socket 바로 옆으로 맞춰 가며 정면 -> 옆모습으로 돌아서고 Watch 크기에 맞춰진다.
 *   - 다 맞춰지면 남은 12px을 0.32초 동안 들어가며 결합하고, 테두리에 Ice 반사가 한 번 지나간다.
 * 위치 / 크기는 .watch__crown-attach 하나에만 쓰고(GSAP이 다루지 않는 layer), 방향은 crownLink로 useScrollScene과 함께 그린다.
 * 전부 scroll 진행률의 함수라 되감으면 결합이 풀리고 Crown은 원래 controller 자리로 돌아간다.
 *
 * 연출이 꺼져 있으면(모바일 / 터치 / reduced motion) Contact Watch가 자기 Crown을 갖고, 등장만 짧게 한다.
 */
export default function useContactScene({ interactive, ready, sectionRef }: Options) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    const watchBox = section?.querySelector<HTMLElement>('.contact__watch')
    if (!section || !watchBox || !ready) return
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
          watchBox,
          { autoAlpha: 0, y: reduced ? 0 : 60 },
          { autoAlpha: 1, y: 0, duration: reduced ? 0.5 : 1, ease: reduced ? 'none' : 'power3.out' },
        )
        if (ownCrown && !reduced) {
          enter.fromTo(ownCrown, { x: 8 }, { x: 0, duration: SNAP.duration, ease: 'power2.out' }, 0.55)
          enter.to(ownCrown, { scale: 1 - SNAP.dip, duration: SNAP.duration / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55)
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

      const alignEase = gsap.parseEase('power2.inOut')
      const carryEase = gsap.parseEase('power1.inOut')
      const snap = { v: 0 }
      let attach = 0 // 가로 위치 / 크기 / 방향이 socket에 맞춰진 정도
      let carry = 0 // 세로로 Watch에 실려 가는 정도
      let snapped = false
      let snapTween: gsap.core.Tween | null = null
      let glintTl: gsap.core.Timeline | null = null

      /*
       * Crown 위치 / 크기. 매번 Crown 박스(controller 자리)와 socket의 화면 좌표를 다시 읽는다 —
       * socket은 section과 함께 scroll되고 등장 tween으로도 움직이기 때문이다. 읽기를 먼저, 쓰기를 나중에 한다.
       * .watch__crown 박스 자체는 이 transform의 영향을 받지 않으므로 controller 자리는 언제 읽어도 같다.
       */
      const measure = () => ({ cr: crown.getBoundingClientRect(), sr: socket.getBoundingClientRect() })

      const pose = (rects = measure()) => {
        if (attach <= 0 && carry <= 0 && snap.v <= 0) {
          attachLayer.style.removeProperty('transform')
        } else {
          const { cr, sr } = rects
          // Crown이 놓인 layer의 배율(화면 px / Crown 좌표). offsetWidth는 정수로 반올림돼 몇 px씩 어긋나므로 소수 폭을 쓴다.
          const k = cr.width / parseFloat(getComputedStyle(crown).width)
          if (k > 0 && cr.height > 0) {
            const gap = SNAP.gap * (1 - snap.v)
            const tx = (attach * (sr.left + sr.width / 2 + gap - (cr.left + cr.width / 2))) / k
            const ty = (carry * (sr.top + sr.height / 2 - (cr.top + cr.height / 2))) / k
            const size = 1 + (sr.height / cr.height - 1) * attach
            const dip = 1 - SNAP.dip * Math.sin(Math.PI * snap.v)
            attachLayer.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${(size * dip).toFixed(4)})`
          }
        }
        crownLink.attach = attach
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
        attach = alignEase(gsap.utils.clamp(0, 1, (progress - reach) / (ALIGN.end - reach)))
        carry = carryEase(gsap.utils.clamp(0, 1, (progress - reach) / CARRY))
        if (attach >= 1 && !snapped) {
          snapped = true
          snapTween?.kill()
          snapTween = gsap.to(snap, { v: 1, duration: SNAP.duration, ease: 'power2.out', onUpdate: pose })
          playGlint()
        } else if (attach < 1 && snapped) {
          // 되감기: 먼저 결합이 풀리고(몇 px), 그 뒤로 scroll을 따라 controller 자리로 돌아간다.
          snapped = false
          snapTween?.kill()
          snapTween = gsap.to(snap, { v: 0, duration: SNAP.release, ease: 'power2.out', onUpdate: pose })
          glintTl?.kill()
          if (glint) gsap.set(glint, { opacity: 0 })
        }
        pose(rects)
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
          onRefresh: (self) => update(self.progress, self.end - self.start),
        },
      })
      if (journeyWorld) {
        tl.fromTo(journeyWorld, { opacity: 1 }, { opacity: JOURNEY_DIM.opacity, ease: 'none', duration: JOURNEY_DIM.end }, 0)
      }
      tl.fromTo(
        watchBox,
        { autoAlpha: 0, y: WATCH_ENTER.y, x: WATCH_ENTER.x, scale: WATCH_ENTER.scale, rotate: WATCH_ENTER.rotate },
        { autoAlpha: 1, y: 0, x: 0, scale: 1, rotate: 0, ease: 'power3.out', duration: WATCH_ENTER.end - WATCH_ENTER.start },
        WATCH_ENTER.start,
      )
      tl.set({}, {}, 1)

      cleanups.push(() => {
        snapTween?.kill()
        glintTl?.kill()
        if (glint) gsap.set(glint, { clearProps: 'opacity,--reflection-x' })
        attachLayer.style.removeProperty('transform')
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
