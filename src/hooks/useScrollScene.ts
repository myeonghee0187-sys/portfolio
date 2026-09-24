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

/**
 * FACES에서 Watch의 높이(뷰포트 높이 비율). About보다 커져서 project 영상과 비슷하거나 조금 큰 크기가 된다.
 * project 영상의 높이는 62vh다(useFacesInteraction).
 */
const FACES_WATCH_HEIGHT = 0.7

/**
 * 정면 Crown의 지름(Watch 좌표계). DigitalCrown.css의 --crown-d, Faces.css의 --faces-crown-d와 같다.
 * FACES에서 Crown은 Watch 아래 footer band의 오른쪽 끝 자리(.faces__crown-slot)로 옮겨 가고,
 * 본체 전체가 화면 안에 보인다.
 */
const CROWN_FRONT_D = 100

/** 카드가 화면 밖에서 출발/퇴장할 때 확보하는 여유 px. */
const OFFSCREEN_GAP = 40

/**
 * 정지 장면에서 Watch와 카드 사이의 간격. About 좌표계(1920 기준) px.
 *
 * 88이면 1920 안에서 88 | 544 | 88 | 480(Watch) | 88 | 544 | 88 로 떨어져
 * 카드-Watch 간격과 바깥 여백이 같은 리듬이 된다.
 */
const CARD_GAP = 88

/**
 * 등장할 때 lane보다 바깥쪽에서 출발하는 가로 거리. About 좌표계 px.
 * 화면 밖 멀리서 날아드는 게 아니라, lane 조금 바깥에서 출발해 Watch 옆자리로 합류하는 정도다.
 */
const ENTER_OFFSET = 180

/** 퇴장하면서 lane 바깥으로 아주 조금만 흘리는 양(카드 폭의 약 11%). 세로 이동이 주가 되도록 작게 둔다. */
const EXIT_DRIFT = 60

/**
 * Pair별 scroll 구간.
 *   enterStart ~ enterEnd : 화면 밖에서 곡선을 그리며 Watch 옆자리로 들어온다
 *   enterEnd   ~ holdEnd  : 좌표가 그대로 유지되는 짧은 구간(= 정지해 보이는 순간)
 *   holdEnd    ~ exitEnd  : 들어온 방향 그대로 계속 흘러 반대편 화면 밖으로 나간다
 *
 * 세로 방향은 side마다 반대다(counter-flow).
 *   left  : 아래 -> Watch 중심선 -> 위
 *   right : 위 -> Watch 중심선 -> 아래
 *
 * Pair 1의 퇴장(0.29~0.54)과 Pair 2의 등장(0.40~0.63)이 겹쳐서,
 * 한 짝이 끝나고 다음 짝이 시작하는 슬라이드쇼가 아니라 양쪽 흐름이 계속 이어진다.
 */
const PAIR_PHASES = [
  { enterStart: 0, enterEnd: 0.23, holdEnd: 0.29, exitEnd: 0.54 },
  { enterStart: 0.4, enterEnd: 0.63, holdEnd: 0.69, exitEnd: 0.95 },
] as const

/**
 * 카드 재질이 선명해지기 시작하는 거리. 경로(정지 자리 ~ 화면 밖) 중 정지 자리에 가까운 이 비율 안에서만
 * 빛이 조금 더 맺힌다. 그 바깥은 이동 중 기본 재질이다. "활성화"가 아니라 "Watch 옆에서 빛을 더 받는" 정도.
 */
const FOCUS_RANGE = 0.5

/**
 * 내부 반사 원점이 경로를 따라 움직이는 세로 폭(카드 높이 %). 거의 인지되지 않는 수준으로 둔다.
 * Watch 높이에 있는 빛을 카드가 지나가는 것처럼, 원점은 카드 진행 방향의 반대로 흐른다.
 *   left  (아래 -> 위) : -4% -> 0 -> +4%
 *   right (위 -> 아래) : +4% -> 0 -> -4%
 */
const REFLECTION_SHIFT = 4

/** 이동 중 ambient reflection의 opacity. HOLD에서 1이 된다(약 +11%). */
const AMBIENT_REST = 0.9

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const smoothstep = (t: number) => t * t * (3 - 2 * t)

/*
 * 정지 구간 양끝의 속도를 0으로 맞추는 remap.
 * 들어올 때는 점점 느려지며 멈추고, 나갈 때는 멈춘 상태에서 점점 빨라진다.
 * 그래서 plateau에 들어가고 나오는 순간 속도가 튀지 않는다.
 */
const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2)
const easeInSine = (t: number) => 1 - Math.cos((t * Math.PI) / 2)

/**
 * Hero -> About scroll 연출.
 *
 * ScrollTrigger 두 개가 순서대로 이어진다. 구간이 겹치지 않아 서로의 transform을 건드리지 않는다.
 *
 *   A. Watch transition  About stage가 화면 아래에서 올라오는 동안(= pin 직전까지)
 *                        Watch 하나가 Hero 위치/크기에서 About 위치/크기로 이동한다.
 *   B. Cards pin         stage가 화면에 붙어 있는 300vh 동안 카드 4장만 lane을 따라 지나간다.
 *                        Watch는 A가 끝낸 자리에 그대로 있고 아무도 건드리지 않는다.
 *   C. FACES mode        pin이 끝나도 Watch는 그 자리에 남는다. FACES가 올라오는 한 화면 동안
 *                        watch face와 display 덮개가 빠지고(= FACES slider가 display로 보인다),
 *                        Watch가 FACES 크기로 커지고, Crown이 Watch 아래 footer band 오른쪽 끝의 controller 자리로 옮겨가며
 *                        정면으로 돌아서고,
 *                        마지막에 steel case가 같은 실루엣의 WebGL glass Watch로 이어진다.
 *
 * Digital Crown의 wheel은 여기서 다루지 않는다. DigitalCrown이 page scroll을 직접 따라간다.
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
        el: HTMLElement
        phase: (typeof PAIR_PHASES)[number]
        setX: (v: number) => void
        setY: (v: number) => void
        /** 반사 원점이 흐르는 방향. left는 +1, right는 -1(REFLECTION_SHIFT 참고). */
        reflectionSign: number
        /** CSS가 이미 놓아둔 자리. transform은 여기서부터의 차이로 계산한다. */
        base: { x: number; y: number }
        start: { x: number; y: number }
        pause: { x: number; y: number }
        end: { x: number; y: number }
      }

      const cards: CardRuntime[] = []

      /*
       * 재질 변수는 값이 실제로 바뀔 때만 쓴다. HOLD나 화면 밖처럼 값이 그대로인 구간에서
       * 매 프레임 style을 건드려 카드를 다시 그리게 하지 않는다.
       */
      const written = new WeakMap<HTMLElement, { focus: string; shift: string }>()
      const writeMaterial = (el: HTMLElement, focus: number, shift: number) => {
        const next = { focus: focus.toFixed(3), shift: `${shift.toFixed(2)}%` }
        const prev = written.get(el)
        if (prev?.focus !== next.focus) el.style.setProperty('--focus', next.focus)
        if (prev?.shift !== next.shift) el.style.setProperty('--reflection-shift', next.shift)
        written.set(el, next)
      }

      const ambient = inner.querySelector<HTMLElement>('.about__ambient')
      const setAmbientOpacity = ambient
        ? (gsap.quickSetter(ambient, 'opacity') as (v: number) => void)
        : () => {}

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
          const isLeft = card.side === 'left'
          /** lane 바깥쪽 방향. left는 -1, right는 +1. */
          const outward = isLeft ? -1 : 1

          /*
           * 정지 자리. Watch 박스에서 직접 계산하므로 카드와 Watch의 세로 중심이
           * 정확히 같은 선에 놓이고, 양옆 간격도 같다. Pair 1과 Pair 2가 같은 lane을 쓴다.
           */
          const pauseX = isLeft ? watchLeft - gap - w : watchRight + gap
          const pauseY = watchTop + (watchH - h) / 2

          /*
           * 세로 출발/퇴장 지점. 좌우가 mirror가 아니라 서로 반대 방향으로 흐른다.
           *   left  : stage 아래 바깥 -> stage 위 바깥
           *   right : stage 위 바깥   -> stage 아래 바깥
           */
          const belowY = stage.offsetHeight + OFFSCREEN_GAP
          const aboveY = -(h + OFFSCREEN_GAP)

          cards.push({
            el,
            phase: PAIR_PHASES[card.pair],
            setX: gsap.quickSetter(el, 'x', 'px') as (v: number) => void,
            setY: gsap.quickSetter(el, 'y', 'px') as (v: number) => void,
            reflectionSign: isLeft ? 1 : -1,
            base: { x: innerLeft + el.offsetLeft, y: innerTop + el.offsetTop },
            start: { x: pauseX + outward * ENTER_OFFSET * u, y: isLeft ? belowY : aboveY },
            pause: { x: pauseX, y: pauseY },
            // 가로는 lane에서 아주 조금만 바깥으로 벗어난다. 퇴장의 주된 움직임은 세로다.
            end: { x: pauseX + outward * EXIT_DRIFT * u, y: isLeft ? aboveY : belowY },
          })
        }
      }

      /** progress 하나로 카드 네 장의 좌표와 재질을 정한다. */
      const renderCards = (p: number) => {
        let pairFocus = 0

        for (const c of cards) {
          const { enterStart, enterEnd, holdEnd, exitEnd } = c.phase
          let x: number
          let y: number
          /**
           * 경로 위의 위치. -1(출발) -> 0(정지 자리) -> +1(퇴장).
           * 좌표와 같은 t에서 나오므로 재질 변화도 scroll progress에 묶이고, 되감으면 그대로 되돌아간다.
           */
          let along: number

          if (p <= enterStart) {
            x = c.start.x
            y = c.start.y
            along = -1
          } else if (p < enterEnd) {
            const f = (p - enterStart) / (enterEnd - enterStart)
            const t = easeOutSine(f)
            /*
             * 세로는 t를 그대로, 가로는 1-(1-t)^2로 먼저 lane에 수렴시킨다.
             * 그래서 바깥에서 비스듬히 출발해 Watch 옆 lane으로 휘어 들어오고,
             * 정지 자리에는 세로로 곧게 얹힌다(도착 순간 가로 기울기 0).
             */
            x = lerp(c.start.x, c.pause.x, 1 - (1 - t) ** 2)
            y = lerp(c.start.y, c.pause.y, t)
            along = t - 1
          } else if (p <= holdEnd) {
            // plateau. scroll은 계속 흐르지만 좌표는 그대로다.
            x = c.pause.x
            y = c.pause.y
            along = 0
          } else if (p < exitEnd) {
            const f = (p - holdEnd) / (exitEnd - holdEnd)
            const t = easeInSine(f)
            /*
             * 들어온 방향 그대로 계속 간다(left는 위로, right는 아래로). 방향이 꺾이지 않는다.
             * 가로 drift는 t^2라서 정지 자리를 떠날 때도 세로로 곧게 출발한다.
             */
            x = lerp(c.pause.x, c.end.x, t * t)
            y = lerp(c.pause.y, c.end.y, t)
            along = t
          } else {
            x = c.end.x
            y = c.end.y
            along = 1
          }

          /*
           * 재질 focus. 정지 자리 가까이에서만 0 -> 1로 부드럽게 오른다.
           * 카드의 크기·투명도·텍스트는 건드리지 않고 border / 반사 / edge 빛의 강도만 바뀐다.
           */
          const focus = 1 - smoothstep(Math.min(1, Math.abs(along) / FOCUS_RANGE))
          pairFocus = Math.max(pairFocus, focus)

          c.setX(x - c.base.x)
          c.setY(y - c.base.y)
          writeMaterial(c.el, focus, c.reflectionSign * REFLECTION_SHIFT * along)
        }

        // Watch 뒤 ambient도 HOLD에서만 아주 조금 밝아진다.
        setAmbientOpacity(lerp(AMBIENT_REST, 1, pairFocus))
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

      /* ---------- C. About -> FACES : 같은 Watch가 FACES mode가 된다 ---------- */

      /*
       * About pin이 끝난 뒤에도 Watch는 그 자리(화면 정중앙)에 그대로 남는다.
       * FACES가 화면 아래에서 올라오는 한 화면 동안(About pin 끝 -> FACES pin 시작)
       *   - watch face(시계·이름·THE ONE BEHIND THE FACES)가 빠지고
       *   - display를 덮던 검은 화면이 빠져, Watch case의 구멍으로 FACES slider(WebGL)가 보이기 시작하고
       *   - 같은 Watch가 FACES 크기(뷰포트 높이의 70%)까지 커지고
       *   - Crown이 Watch에서 떨어져 footer band 오른쪽 끝의 controller 자리로 옮겨가며 옆모습에서 정면으로 돌아선다.
       *   - 마지막에 steel case(PNG)가 녹아 없어지고, 같은 실루엣의 WebGL Watch(Blue / Ice glass rim +
       *     display)가 그 자리를 이어받는다. FACES canvas가 Watch 자리를 다 덮은 뒤라 빈틈이 없다.
       * Watch 위치는 그대로다. FACES pin 동안에는 크기도 위치도 고정이다.
       */
      const faces = document.querySelector<HTMLElement>('.faces')
      const face = watch.querySelector<HTMLElement>('.watch__face')
      const screen = watch.querySelector<HTMLElement>('.watch__screen')
      const hardware = watch.querySelectorAll<HTMLElement>('.watch__case, .watch__glass')
      const crown = watch.querySelector<HTMLElement>('.watch__crown')
      const watchLayer = watch.closest<HTMLElement>('.watch-stage')

      const crownSide = crown?.querySelector<HTMLElement>('.watch__crown-side')
      const crownFront = crown?.querySelector<HTMLElement>('.watch__crown-front')

      if (faces && face && screen && crown && crownSide && crownFront && watchLayer) {
        /** About 크기의 Watch를 FACES 크기(뷰포트 높이의 70%)로 키우는 레이어 배율. */
        const facesScale = () => (window.innerHeight * FACES_WATCH_HEIGHT) / aboutAnchor.offsetHeight

        /*
         * Crown이 옮겨갈 거리. Watch 안의 좌표(scale 전)로 돌려준다.
         * FACES에서 Watch는 화면 정중앙에 About 크기(sA)로 있고, 그 레이어 전체가 화면 중심 기준으로
         * facesScale만큼 커진다. 그 두 scale을 되돌려 정면 Crown의 중심이 footer의 Crown 자리 중심에 오게 한다.
         * 자리는 FACES stage 안에서 잰다 — FACES pin 동안 stage는 화면 맨 위에 붙어 있다.
         * Crown 박스는 Watch 좌표계 (582, 200)에 54 x 80(중심 609, 240)이고 Watch 중심은 (300, 380)이다.
         */
        const crownDetach = () => {
          const u = watchUnit()
          const sA = aboutAnchor.offsetWidth / heroAnchor.offsetWidth
          const s = sA * facesScale()
          const viewportW = document.documentElement.clientWidth
          const viewportH = window.innerHeight
          // FACES 크기에서 붙어 있을 때의 Crown 중심과, 옮겨갈 정면 Crown의 중심(화면 px).
          const attachedX = viewportW / 2 + (609 - 300) * u * s
          const attachedY = viewportH / 2 + (240 - 380) * u * s
          const facesStage = faces.querySelector<HTMLElement>('.faces__stage')
          const slot = faces.querySelector<HTMLElement>('.faces__crown-slot')
          let targetX = viewportW - 48 - (CROWN_FRONT_D * u * s) / 2
          let targetY = viewportH - 48 - (CROWN_FRONT_D * u * s) / 2
          if (facesStage && slot) {
            const st = facesStage.getBoundingClientRect()
            const r = slot.getBoundingClientRect()
            targetX = r.left - st.left + r.width / 2
            targetY = r.top - st.top + r.height / 2
          }
          return { x: (targetX - attachedX) / s, y: (targetY - attachedY) / s }
        }

        const facesTl = gsap.timeline({
          scrollTrigger: {
            trigger: faces,
            start: 'top bottom', // About pin이 끝나는 순간 = FACES 윗변이 화면 아래 끝
            end: 'top top', // FACES pin 시작
            scrub: true, // scroll과 1:1. 되감으면 About 상태로 정확히 돌아간다.
            invalidateOnRefresh: true,
          },
        })

        // 30~55%: watch face가 한 번에 빠진다. Hero -> About morph가 쓰는 안쪽 요소들과는 다른 element다.
        facesTl.to(face, { opacity: 0, ease: 'none', duration: 0.25 }, 0.3)

        // 45~70%: display를 덮던 검은 화면이 빠진다. 그 사이 FACES slider가 아래에서 display 안으로 올라온다.
        facesTl.to(screen, { opacity: 0, ease: 'none', duration: 0.25 }, 0.45)

        /*
         * 88~98%: steel case(PNG)와 display 유리 그림자가 녹아 없어지고, 그 아래 같은 실루엣으로 그려지던
         * WebGL Watch가 드러난다. Watch가 커진 만큼 FACES canvas가 Watch 자리를 전부 덮는 것은 약 86%부터다.
         */
        if (hardware.length) facesTl.to(hardware, { opacity: 0, ease: 'none', duration: 0.1 }, 0.88)

        // 20~85%: 같은 Watch 레이어가 화면 중심(= Watch 중심) 기준으로 FACES 크기까지 커진다. 위치는 그대로다.
        facesTl.to(watchLayer, { scale: facesScale, ease: 'power1.inOut', duration: 0.65 }, 0.2)

        // 20~85%: Crown이 footer band 오른쪽 끝의 controller 자리로 옮겨간다. 순간이동 없이 가속 -> 감속.
        facesTl.to(
          crown,
          {
            x: () => crownDetach().x,
            y: () => crownDetach().y,
            ease: 'power2.inOut',
            duration: 0.65,
          },
          0.2,
        )

        /*
         * 38~76%: 옆모습 -> 정면. 가는 도중에 Crown이 화면 쪽으로 돌아서는 것처럼 보이게 한다.
         * 옆모습은 가로로 눌리고 살짝 기울며 빠지고, 정면은 가로로 눌린 타원(3/4 각도)에서 원으로 펴지며
         * 기울기가 풀린다. 둘 다 2D transform + opacity라 asset을 rotateY로 비틀지 않는다.
         */
        facesTl.to(
          crownSide,
          { scaleX: 0.55, rotate: -10, ease: 'power1.in', duration: 0.3 },
          0.38,
        )
        facesTl.to(crownSide, { autoAlpha: 0, ease: 'none', duration: 0.22 }, 0.44)
        facesTl.fromTo(
          crownFront,
          { scaleX: 0.42, scaleY: 0.9, rotate: 14 },
          { scaleX: 1, scaleY: 1, rotate: 0, ease: 'power2.out', duration: 0.36, immediateRender: false },
          0.4,
        )
        facesTl.fromTo(
          crownFront,
          { autoAlpha: 0 },
          { autoAlpha: 1, ease: 'none', duration: 0.22, immediateRender: false },
          0.46,
        )

        // timeline 길이를 scroll 구간 전체(1)에 맞춘다. 위 시간이 곧 구간 안의 비율이 된다.
        facesTl.set({}, {}, 1)
      }

      /*
       * quickSetter로 쓴 좌표와 재질 변수, ambient opacity는 tween이 아니라서
       * ctx.revert()가 되돌리지 않는다. 연출이 꺼지면(좁은 화면으로 resize, reduced motion)
       * 전부 CSS의 정적 상태로 돌아가도록 직접 지운다.
       */
      const clearCards = () => {
        for (const c of cards) {
          for (const prop of ['transform', 'translate', 'rotate', 'scale', '--focus', '--reflection-shift']) {
            c.el.style.removeProperty(prop)
          }
        }
        ambient?.style.removeProperty('opacity')
      }

      // context가 revert될 때 GSAP이 함께 불러준다.
      return clearCards
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
