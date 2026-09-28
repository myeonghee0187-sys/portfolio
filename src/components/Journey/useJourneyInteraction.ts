import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { JOURNEY_AI_PANELS, JOURNEY_AI_STACK_POSITION, JOURNEY_NODES } from './journeyData'

gsap.registerPlugin(ScrollTrigger)

/**
 * pin 구간의 길이(뷰포트 높이 배수).
 * 단계 12개 x 약 0.72화면. 국문 설명을 읽을 수 있을 만큼은 되고,
 * 갇혀 있다고 느낄 만큼 길지는 않은 범위에서 잡았다.
 */
const PIN_VIEWPORTS = 8.6

/**
 * Master timeline의 label과 각 label이 시작하는 지점(전체 progress 0~1).
 *
 * 한 구간 안에서 카메라는 앞쪽 65%만 움직이고 나머지는 멈춰 있다 —
 * 그 멈춤이 곧 읽는 시간이다. 다음 label에서 다시 움직이기 시작한다.
 */
const LABELS = {
  intro: 0,
  uxui: 0.1,
  visualTools: 0.19,
  frontend: 0.28,
  workflow: 0.38,
  aiIntro: 0.48,
  aiThink: 0.57,
  aiDesign: 0.635,
  aiCode: 0.7,
  aiImage: 0.765,
  aiMotion: 0.83,
  now: 0.9,
} as const

/** 카메라가 한 구간에서 실제로 이동하는 비율. 나머지는 머무는 시간이다. */
const TRAVEL = 0.65

/** node가 활성으로 바뀌는 데 걸리는 progress. 카메라 이동보다 조금 빨리 끝난다. */
const FOCUS_FADE = 0.055

/** AI panel 하나가 앞으로 나오는 데 걸리는 progress. */
const PANEL_FADE = 0.05

/**
 * label 순서대로 카메라가 멈추는 world y.
 * 화면 가운데에 와야 하는 것은 경로 위의 점이 아니라 읽을 카드이므로 offset을 더한다.
 */
const nodeY = (id: string) => {
  const n = JOURNEY_NODES.find((node) => node.id === id)
  return n ? n.position.y + n.cardOffset.y : 0
}

/** 04 카드 중심과 AI stack 중심의 사이. */
const AI_CAMERA_Y = (nodeY('ai-workflow') + JOURNEY_AI_STACK_POSITION.y) / 2

/*
 * 01과 VISUAL TOOLS는 한 묶음이다(§ 본체 + 보조 도구).
 * 위성을 보려고 카메라를 더 내리면 01 카드가 고정 Header 뒤로 밀려 들어가므로,
 * 둘이 한 화면에 같이 들어오는 높이에 카메라를 세우고 위성만 뒤따라 켠다.
 */
const UXUI_PAIR_CAMERA_Y = 1233

const CAMERA: [keyof typeof LABELS, number][] = [
  ['intro', nodeY('intro')],
  ['uxui', UXUI_PAIR_CAMERA_Y],
  // 카메라는 그대로 — 위성은 같은 화면 안에서 켜진다.
  ['visualTools', UXUI_PAIR_CAMERA_Y],
  ['frontend', nodeY('frontend')],
  ['workflow', nodeY('workflow')],
  ['aiIntro', nodeY('ai-workflow')],
  /*
   * AI panel 다섯 장 동안 카메라는 04 카드와 stack 사이에 머문다.
   * 둘 다 화면 안에 들어오고, 04 headline이 고정 Header에 잘리지 않는 높이다.
   */
  ['aiThink', AI_CAMERA_Y],
  ['aiDesign', AI_CAMERA_Y],
  ['aiCode', AI_CAMERA_Y],
  ['aiImage', AI_CAMERA_Y],
  ['aiMotion', AI_CAMERA_Y],
  ['now', nodeY('now')],
]

/** node가 focus를 받는 label. */
const NODE_FOCUS: Record<string, keyof typeof LABELS> = {
  intro: 'intro',
  uxui: 'uxui',
  'visual-tools': 'visualTools',
  frontend: 'frontend',
  workflow: 'workflow',
  'ai-workflow': 'aiIntro',
  now: 'now',
}

/** node가 focus를 넘겨주는 label(= 다음 단계). now는 끝까지 focus를 유지한다. */
const NODE_RELEASE: Record<string, keyof typeof LABELS | null> = {
  intro: 'uxui',
  uxui: 'frontend',
  // 01과 그 위성은 같은 묶음이라 02로 넘어갈 때 함께 물러난다.
  'visual-tools': 'frontend',
  frontend: 'workflow',
  workflow: 'aiIntro',
  // 04는 AI panel이 도는 동안 계속 살아 있고, NOW로 갈 때 물러난다.
  'ai-workflow': 'now',
  now: null,
}

const AI_PANEL_LABELS: (keyof typeof LABELS)[] = [
  'aiThink',
  'aiDesign',
  'aiCode',
  'aiImage',
  'aiMotion',
]

type Options = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
}

/**
 * JOURNEY의 단 하나의 master timeline.
 *
 * ScrollTrigger는 이 하나뿐이다. AI stack 안에 pin이나 trigger를 따로 만들지 않는다 —
 * panel도 같은 timeline 위의 label에 얹혀 있어서 pin이 겹칠 일이 없다.
 *
 * timeline이 직접 건드리는 것:
 *   world     카메라. y 하나만 움직인다.
 *   node      --node-in / --node-out 두 변수. 실제 스타일(투명도·크기·blur·정보 공개)은 CSS가 만든다.
 *   panel     같은 방식의 두 변수.
 *   path      stroke-dashoffset.
 * React state는 쓰지 않는다. scroll 중에 렌더가 일어나지 않는다.
 */
export default function useJourneyInteraction({ enabled, sectionRef, stageRef, worldRef }: Options) {
  useLayoutEffect(() => {
    if (!enabled) return
    const section = sectionRef.current
    const stage = stageRef.current
    const world = worldRef.current
    if (!section || !stage || !world) return

    const ctx = gsap.context(() => {
      const drawn = stage.querySelector<SVGPathElement>('.journey__path-drawn')
      const accent = stage.querySelector<SVGPathElement>('.journey__path-accent')
      const ambient = stage.querySelector<HTMLElement>('.journey__ambient')

      /** world 1 디자인단위당 실제 px. stage 폭에서 나온다(스크롤바가 이미 빠져 있다). */
      const unit = () => stage.clientWidth / 1920

      /**
       * 화면에서 "지금 단계"가 놓이는 높이.
       * 고정 Header 아래에서 시작하는 영역의 한가운데다 — 카드가 Header에 가리지 않고,
       * 그렇다고 화면 아래 Crown 쪽으로 내려가지도 않는다.
       */
      const headerEl = document.querySelector<HTMLElement>('.site-header')
      const focusCenter = () => {
        const header = headerEl?.getBoundingClientRect().height ?? 0
        return header + (stage.clientHeight - header) / 2
      }

      /** 카메라가 world y를 화면 focus 중심에 놓기 위한 world의 y 이동량. */
      const cameraY = (worldY: number) => focusCenter() - worldY * unit()

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * PIN_VIEWPORTS}`,
          pin: stage,
          pinSpacing: true, // pin-spacer는 높이만 담당한다. 따로 스타일링하지 않는다.
          anticipatePin: 1,
          scrub: 0.7,
          invalidateOnRefresh: true,
          /*
           * 앞선 pin(About 0, FACES -1)이 자리를 잡은 뒤에 계산되어야 한다.
           * Journey는 페이지에서 가장 뒤에 있으므로 refresh도 가장 마지막이다.
           * 이 값이 없으면 FACES pin spacer가 아직 없는 상태에서 start를 재서
           * 카메라가 scroll보다 한참 앞서간다.
           */
          refreshPriority: -2,
        },
      })

      // 전체 길이를 1로 두면 위 LABELS 값이 그대로 timeline 시간이 된다.
      tl.set({}, {}, 1)
      for (const [name, at] of Object.entries(LABELS)) tl.addLabel(name, at)

      /* ---------- 카메라 ---------- */

      gsap.set(world, { y: () => cameraY(CAMERA[0][1]) })

      for (let i = 1; i < CAMERA.length; i++) {
        const [label, y] = CAMERA[i]
        const prevY = CAMERA[i - 1][1]
        if (y === prevY) continue // AI panel 구간: 카메라는 그대로 머문다.
        const from = LABELS[CAMERA[i - 1][0]]
        const span = LABELS[label] - from
        tl.to(
          world,
          { y: () => cameraY(y), ease: 'power1.inOut', duration: span * TRAVEL },
          from + span * (1 - TRAVEL),
        )
      }

      /* ---------- node 상태 ---------- */

      for (const node of JOURNEY_NODES) {
        const el = world.querySelector<HTMLElement>(`[data-node="${node.id}"]`)
        if (!el) continue
        gsap.set(el, { '--node-in': 0, '--node-out': 0 })

        const focusAt = LABELS[NODE_FOCUS[node.id]]
        if (focusAt === 0) {
          /*
           * 첫 단계는 pin이 시작되는 순간 이미 읽히는 상태여야 한다.
           * 등장은 그 전 구간(FACES -> Journey)의 ambient가 맡는다.
           */
          gsap.set(el, { '--node-in': 1 })
        } else {
          // 카메라가 도착하기 조금 전부터 선명해진다.
          tl.to(
            el,
            { '--node-in': 1, ease: 'none', duration: FOCUS_FADE },
            Math.max(0, focusAt - FOCUS_FADE * 0.6),
          )
        }

        const release = NODE_RELEASE[node.id]
        if (release) {
          tl.to(el, { '--node-out': 1, ease: 'none', duration: FOCUS_FADE }, LABELS[release] - FOCUS_FADE)
        }
      }

      /* ---------- AI panel ---------- */

      const panels = JOURNEY_AI_PANELS.map((panel) =>
        stage.querySelector<HTMLElement>(`[data-panel="${panel.id}"]`),
      )

      panels.forEach((el, i) => {
        if (!el) return
        gsap.set(el, { '--panel-in': 0, '--panel-out': 0 })

        const at = LABELS[AI_PANEL_LABELS[i]]
        tl.to(el, { '--panel-in': 1, ease: 'none', duration: PANEL_FADE }, at - PANEL_FADE)

        /*
         * 다음 장이 앞으로 나올 때 뒤로 물러난다.
         * 마지막 장은 NOW로 가기 직전에 다 같이 정리된다 — panel이 NOW와 겹치지 않는다.
         */
        const next = AI_PANEL_LABELS[i + 1]
        tl.to(
          el,
          { '--panel-out': 1, ease: 'none', duration: PANEL_FADE },
          next ? LABELS[next] - PANEL_FADE : LABELS.now - PANEL_FADE * 1.6,
        )
      })

      /* ---------- path draw ---------- */

      if (drawn && accent) {
        const length = drawn.getTotalLength()
        gsap.set([drawn, accent], { strokeDasharray: length })
        gsap.set(drawn, { strokeDashoffset: length })
        // 짧은 Electric Ice 한 조각이 그려지는 머리 끝에 얹혀 같이 내려간다.
        const accentLen = Math.min(240, length * 0.05)
        gsap.set(accent, { strokeDasharray: `${accentLen} ${length}` })

        tl.fromTo(
          drawn,
          { strokeDashoffset: length },
          { strokeDashoffset: 0, ease: 'none', duration: LABELS.now },
          0,
        )
        tl.fromTo(
          accent,
          { strokeDashoffset: accentLen },
          { strokeDashoffset: -(length - accentLen), ease: 'none', duration: LABELS.now },
          0,
        )
      }

      /* ---------- ambient ---------- */

      /*
       * FACES에서 넘어오는 순간 배경은 그대로 Carbon Black이고, path 주변의 낮은 빛만 떠오른다.
       * 섹션이 화면에 들어오는 동안 켜지고 나가면서 꺼진다. 화면 전체를 파랗게 칠하지 않는다.
       */
      if (ambient) {
        gsap.fromTo(
          ambient,
          { opacity: 0 },
          {
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'top top',
              scrub: true,
              invalidateOnRefresh: true,
              // 위 master timeline과 같은 이유로 가장 마지막에 계산되어야 한다.
              refreshPriority: -2,
            },
          },
        )
      }
    }, stage)

    // 폰트가 늦게 뜨면 카드 높이와 path 길이가 달라진다. 뜬 뒤 한 번 다시 잰다.
    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(refreshId)
      ctx.revert()
    }
  }, [enabled, sectionRef, stageRef, worldRef])
}
