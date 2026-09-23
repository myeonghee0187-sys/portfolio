import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { ABOUT_CARDS } from '../components/About'

gsap.registerPlugin(ScrollTrigger)

/**
 * Watch 좌표계(600 x 760) 기준 morph 값.
 * WatchAssembly.css의 .watch--about 규칙과 같은 수치를 쓴다 —
 * scroll scene이 꺼진 환경의 정적 About Watch와 결과가 정확히 같아야 한다.
 *
 * time: Hero 중심 148 -> About 중심 100 (Figma 80 x 760/608), 96px -> 30px
 * name: Hero 중심 318 -> About 중심 142.5,                     48px -> 25px
 */
const TIME_MORPH = { y: -48, scale: 0.3125 }
const NAME_MORPH = { y: -175.5, scale: 0.5208333 }

/** About pinned 구간의 길이. 뷰포트 높이의 3배(= 300vh). */
const PIN_VIEWPORTS = 3

/** scroll 1px당 Digital Crown 회전 각도. 양수라서 아래로 scroll하면 시계방향이다. */
const CROWN_DEG_PER_PX = 0.12

/** 카드가 화면 밖에서 출발/퇴장할 때 확보하는 여유 px. */
const OFFSCREEN_GAP = 40

/**
 * 정지 장면에서 Watch와 카드 사이의 간격. About 좌표계(1920 기준) px.
 *
 * 88이면 1920 안에서 88 | 544 | 88 | 480(Watch) | 88 | 544 | 88 로 떨어져
 * 카드-Watch 간격과 바깥 여백이 같은 리듬이 된다.
 */
const CARD_GAP = 88

/** 퇴장하면서 lane 바깥으로 아주 조금만 흘리는 양. 세로 이동이 주가 되도록 작게 둔다. */
const EXIT_DRIFT = 60

/**
 * Pair별 scroll 구간.
 *   enterFrom ~ holdFrom : 아래 바깥에서 곡선을 그리며 Watch 옆자리로 올라온다
 *   holdFrom  ~ exitFrom : 좌표가 그대로 유지되는 구간(= 정지해 보이는 순간)
 *   exitFrom  ~ exitTo   : 같은 방향으로 계속 위로 흘러 화면 밖으로 나간다
 *
 * Pair 1의 퇴장(0.36~0.58)과 Pair 2의 등장(0.42~0.68)이 겹쳐서,
 * 한 짝이 끝나고 다음 짝이 시작하는 슬라이드쇼가 아니라 흐름이 계속 이어진다.
 */
const PAIR_PHASES = [
  { enterFrom: 0, holdFrom: 0.26, exitFrom: 0.36, exitTo: 0.58 },
  { enterFrom: 0.42, holdFrom: 0.68, exitFrom: 0.78, exitTo: 1 },
] as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Hero -> About scroll 연출.
 *
 * ScrollTrigger 두 개가 순서대로 이어진다. 구간이 겹치지 않아 서로의 transform을 건드리지 않는다.
 *
 *   A. Watch transition  About stage가 화면 아래에서 올라오는 동안(= pin 직전까지)
 *                        Watch 하나가 Hero 위치/크기에서 About 위치/크기로 이동한다.
 *   B. Cards pin         stage가 화면에 붙어 있는 300vh 동안 카드 4장만 lane을 따라 지나간다.
 *                        Watch는 A가 끝낸 자리에 그대로 있고 아무도 건드리지 않는다.
 *
 * 그리고 문서 전체에 걸린 Crown 회전이 따로 하나 있다. 이 셋은 서로 다른 element를 만진다.
 */
export default function useScrollScene(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return

    const ctx = gsap.context(() => {
      const watch = document.querySelector<HTMLElement>('.watch--stage')
      const heroAnchor = document.querySelector<HTMLElement>('.hero__watch-anchor')
      const stage = document.querySelector<HTMLElement>('.about__stage')
      const aboutAnchor = document.querySelector<HTMLElement>('.about__watch-anchor')
      const inner = document.querySelector<HTMLElement>('.about__inner')
      if (!watch || !heroAnchor || !stage || !aboutAnchor || !inner) return

      const time = watch.querySelector<HTMLElement>('.watch__time')
      const name = watch.querySelector<HTMLElement>('.watch__name')
      const role = watch.querySelector<HTMLElement>('.watch__role')
      const meta = watch.querySelector<HTMLElement>('.watch__meta')
      const title = watch.querySelector<HTMLElement>('.watch__title')
      const crownSpin = watch.querySelector<HTMLElement>('.watch__crown-spin')
      if (!time || !name || !role || !meta || !title) return

      /* ---------- 측정 ---------- */

      /*
       * 좌표는 전부 refresh 시점에 다시 잰다(invalidateOnRefresh).
       * transform의 영향을 받지 않도록 크기는 offset*을, 위치는 앵커의 rect를 쓴다.
       */

      /** Watch 좌표계 1단위당 실제 px. */
      const watchUnit = () => heroAnchor.offsetWidth / 600
      /** About 좌표계 1단위당 실제 px. */
      const aboutUnit = () => inner.offsetWidth / 1920

      /** Hero 정지 상태의 Watch 중심 y. .watch--stage의 CSS 기본 위치와 같은 값이다. */
      const heroCenterY = () => {
        const r = heroAnchor.getBoundingClientRect()
        return r.top + r.height / 2 + window.scrollY
      }

      /** pin 중 About Watch 중심의 y. pin되면 stage top이 뷰포트 0이 된다. */
      const aboutCenterY = () => {
        const a = aboutAnchor.getBoundingClientRect()
        return a.top + a.height / 2 - stage.getBoundingClientRect().top
      }

      /* ---------- A. Hero -> About : Watch 이동 ---------- */

      // 기본 transform(translate(-50%, -50%))을 GSAP이 이해하는 형태로 넘겨받는다.
      gsap.set(watch, { xPercent: -50, yPercent: -50, x: 0, y: 0, transformOrigin: 'center center' })

      const watchTl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: 'top bottom', // About stage가 화면 아래 끝에 닿는 순간
          end: 'top top', // stage가 화면 위에 붙는 순간 = B의 pin 시작 지점
          scrub: true, // Watch는 scroll과 1:1. 되감으면 Hero 상태로 정확히 복원된다.
          invalidateOnRefresh: true,
          refreshPriority: 1, // 페이지에서 더 앞에 있는 트리거를 먼저 계산한다.
        },
      })

      // 전체 구간(duration 1)에 걸쳐 위치와 크기가 선형으로 변한다.
      watchTl.to(
        watch,
        {
          y: () => aboutCenterY() - heroCenterY(),
          scale: () => aboutAnchor.offsetWidth / heroAnchor.offsetWidth,
          ease: 'none',
          duration: 1,
        },
        0,
      )

      // 40~62%: Hero 전용 정보만 빠진다.
      watchTl.to([role, meta], { opacity: 0, ease: 'none', duration: 0.22 }, 0.4)

      // 38~85%: 살아남는 두 줄이 About 자리/크기/색으로 옮겨간다. 지웠다 다시 만들지 않는다.
      watchTl.to(
        time,
        {
          y: () => TIME_MORPH.y * watchUnit(),
          scale: TIME_MORPH.scale,
          color: '#777d82',
          ease: 'none',
          duration: 0.47,
        },
        0.38,
      )
      watchTl.to(
        name,
        {
          y: () => NAME_MORPH.y * watchUnit(),
          scale: NAME_MORPH.scale,
          color: '#777d82',
          ease: 'none',
          duration: 0.47,
        },
        0.38,
      )

      /*
       * Figma의 About 서체 굵기(IBM Plex Sans 400 / Inter Medium 500)로 한 번에 바꾼다.
       * font-weight는 레이아웃을 다시 계산시키므로 매 프레임 보간하지 않고
       * 이 지점을 지날 때만 전환한다. 되감으면 GSAP이 Hero 값으로 되돌린다.
       */
      watchTl.set(time, { fontWeight: 400 }, 0.62)
      watchTl.set(name, { fontWeight: 500 }, 0.62)

      // 58~82%: About 타이틀이 들어온다.
      watchTl.fromTo(title, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.24 }, 0.58)

      /* ---------- B. About pinned : 카드 이동 ---------- */

      /*
       * 카드는 tween을 이어 붙이는 대신, progress 하나를 좌표로 바꾸는 함수가 직접 그린다.
       * tween을 나눠 붙이면 정지 지점마다 "하나가 끝나고 다음이 시작하는" 이음매가 생긴다.
       * 여기서는 하나의 연속된 곡선 위에 좌표가 변하지 않는 구간(plateau)을 두는 방식이라
       * 멈췄다가 다시 시작하는 느낌 없이 같은 흐름이 이어진다.
       */
      type CardRuntime = {
        phase: (typeof PAIR_PHASES)[number]
        setX: (v: number) => void
        setY: (v: number) => void
        setOpacity: (v: number) => void
        /** CSS가 이미 놓아둔 자리. transform은 여기서부터의 차이로 계산한다. */
        base: { x: number; y: number }
        start: { x: number; y: number }
        pause: { x: number; y: number }
        end: { x: number; y: number }
      }

      const cards: CardRuntime[] = []

      /** 좌표를 다시 잰다. 매 프레임이 아니라 refresh 때만 부른다. */
      const measureCards = () => {
        cards.length = 0
        const innerLeft = (stage.offsetWidth - inner.offsetWidth) / 2
        const innerTop = (stage.offsetHeight - inner.offsetHeight) / 2
        const u = aboutUnit()

        /*
         * About에 안착한 Watch의 박스.
         * 실제 Watch 요소는 GSAP transform이 걸려 있어서 refresh 중에는 Hero 크기일 수 있다.
         * 앵커는 transform이 없어 언제 재도 About 상태의 박스를 준다.
         */
        const watchW = aboutAnchor.offsetWidth
        const watchH = aboutAnchor.offsetHeight
        const watchLeft = innerLeft + inner.offsetWidth / 2 - watchW / 2
        const watchTop = innerTop + inner.offsetHeight / 2 - watchH / 2
        const watchRight = watchLeft + watchW

        for (const card of ABOUT_CARDS) {
          const el = inner.querySelector<HTMLElement>(`.about__card--${card.id}`)
          if (!el) continue

          const w = el.offsetWidth
          const h = el.offsetHeight
          const gap = CARD_GAP * u
          const drift = EXIT_DRIFT * u
          const isLeft = card.side === 'left'

          cards.push({
            phase: PAIR_PHASES[card.pair],
            setX: gsap.quickSetter(el, 'x', 'px') as (v: number) => void,
            setY: gsap.quickSetter(el, 'y', 'px') as (v: number) => void,
            setOpacity: gsap.quickSetter(el, 'opacity') as (v: number) => void,
            base: { x: innerLeft + el.offsetLeft, y: innerTop + el.offsetTop },
            // 아래 바깥에서 출발한다.
            start: {
              x: isLeft ? -(w + OFFSCREEN_GAP) : stage.offsetWidth + OFFSCREEN_GAP,
              y: stage.offsetHeight + OFFSCREEN_GAP,
            },
            /*
             * 정지 자리. Watch 박스에서 직접 계산하므로 카드와 Watch의 세로 중심이
             * 정확히 같은 선에 놓이고, 양옆 간격도 같다.
             */
            pause: {
              x: isLeft ? watchLeft - gap - w : watchRight + gap,
              y: watchTop + (watchH - h) / 2,
            },
            // 화면 위로 완전히 빠진다. 가로는 lane에서 조금만 벗어난다.
            end: {
              x: (isLeft ? watchLeft - gap - w : watchRight + gap) + (isLeft ? -drift : drift),
              y: -(h + OFFSCREEN_GAP),
            },
          })
        }
      }

      /** progress 하나로 카드 네 장의 좌표를 정한다. */
      const renderCards = (p: number) => {
        for (const c of cards) {
          const { enterFrom, holdFrom, exitFrom, exitTo } = c.phase
          let x: number
          let y: number
          let opacity: number

          if (p <= enterFrom) {
            x = c.start.x
            y = c.start.y
            opacity = 0.35
          } else if (p < holdFrom) {
            const f = (p - enterFrom) / (holdFrom - enterFrom)
            /*
             * 가로만 sine으로 휘어 들어온다. 도착하는 순간 가로 속도가 0이 되므로
             * 정지 자리에 옆에서 부딪히듯 꽂히지 않고 자연스럽게 얹힌다.
             * 세로는 거의 직선이라 아래에서 위로 계속 올라오는 흐름이 유지된다.
             */
            const arc = Math.sin((f * Math.PI) / 2)
            x = lerp(c.start.x, c.pause.x, arc)
            y = lerp(c.start.y, c.pause.y, f)
            opacity = lerp(0.35, 0.6, Math.min(1, f / 0.7))
          } else if (p <= exitFrom) {
            // plateau. scroll은 계속 흐르지만 좌표는 그대로다.
            x = c.pause.x
            y = c.pause.y
            opacity = 0.6
          } else if (p < exitTo) {
            const f = (p - exitFrom) / (exitTo - exitFrom)
            // 들어올 때와 같은 방향(위쪽)으로 계속 간다. 방향이 꺾이지 않는다.
            x = lerp(c.pause.x, c.end.x, f)
            y = lerp(c.pause.y, c.end.y, f)
            opacity = lerp(0.6, 0.35, Math.max(0, (f - 0.3) / 0.7))
          } else {
            x = c.end.x
            y = c.end.y
            opacity = 0.35
          }

          c.setX(x - c.base.x)
          c.setY(y - c.base.y)
          c.setOpacity(opacity)
        }
      }

      /*
       * scrub이 따라갈 대상. 이 값 하나가 0 -> 1로 가는 동안 renderCards가 좌표를 그린다.
       * scroll을 멈추면 progress도 멈추고, 위로 올리면 plateau까지 그대로 역재생된다.
       */
      const driver = { p: 0 }

      const cardsTl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: () => `+=${window.innerHeight * PIN_VIEWPORTS}`,
          pin: stage,
          pinSpacing: true, // pin-spacer는 높이만 담당한다. 따로 스타일링하지 않는다.
          anticipatePin: 1,
          scrub: 0.5, // 살짝 따라붙는 scrub. scroll을 멈추면 카드도 곧바로 멈춘다.
          invalidateOnRefresh: true,
          onRefresh: () => {
            measureCards()
            renderCards(driver.p)
          },
        },
      })

      cardsTl.to(
        driver,
        { p: 1, ease: 'none', duration: 1, onUpdate: () => renderCards(driver.p) },
        0,
      )

      measureCards()
      renderCards(0)

      /* ---------- C. Digital Crown 회전 ---------- */

      /*
       * 문서 전체 scroll에 비례해서 돈다. 아래로 내리면 시계방향, 올리면 반시계방향.
       * Watch를 옮기는 transform과 다른 element라서 서로 덮어쓰지 않는다.
       */
      if (crownSpin) {
        gsap.to(crownSpin, {
          rotation: () => ScrollTrigger.maxScroll(window) * CROWN_DEG_PER_PX,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: true, invalidateOnRefresh: true },
        })
      }
    })

    /*
     * 마운트 직후 한 번 더 잰다.
     * 이 effect는 Intro가 사라지는 커밋에서 바로 돌기 때문에, 브라우저가 스크롤바
     * 등장까지 반영한 최종 레이아웃을 아직 확정하지 않았을 수 있다. 그 상태로 굳으면
     * trigger의 start/end가 어긋난 채로 남는다.
     */
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())

    // 폰트가 늦게 뜨면 Watch 앵커와 카드 위치가 조금씩 달라진다. 뜬 뒤 한 번 더 잰다.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(refreshId)
      ctx.revert()
    }
  }, [enabled])
}
