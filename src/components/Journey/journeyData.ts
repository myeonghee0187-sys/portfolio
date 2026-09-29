import { STORY_TIME } from '../../story/storyTime'

/**
 * Journey copy와 card 배치. 좌표는 1920 기준 world 좌표다.
 *
 * card 크기는 여기서 정하지 않는다 — 7장 모두 Journey.css의 공통 크기(1920에서 620 x 440)를 쓴다.
 * 경로도 여기 좌표로 그리지 않는다. 각 card의 실제 크기를 재서, anchor 쪽 변 안쪽의 점을 부드러운 곡선으로 잇는다(useJourneyInteraction).
 */
export type JourneyAnchor = 'top' | 'bottom' | 'left' | 'right'

export type JourneyNode = {
  id: string
  /** Scroll timeline label; never rendered as a section index. */
  label: string
  title: string
  description: string[]
  keywords?: string[]
  meta?: { label: string; value: string; date?: boolean }[]
  /** card 중심(world 좌표). */
  position: { x: number; y: number }
  /**
   * 경로가 card에 닿는 변. 좌우에 놓인 card는 경로 쪽 변(왼쪽 card는 right, 오른쪽 card는 left),
   * 처음과 끝의 가운데 card는 경로가 떠나고(bottom) 도착하는(top) 변이다.
   * card의 scale 기준점도 이 변이라, 비활성 상태로 작아져도 경로 끝과 card 사이에 틈이 생기지 않는다.
   */
  anchor: JourneyAnchor
}

export const JOURNEY_NODES: JourneyNode[] = [
  {
    id: 'intro',
    label: 'fromFigmaToWeb',
    title: 'FROM FIGMA TO WEB',
    description: [
      'Figma로 화면을 설계하는 것에서 시작해,',
      '웹 구현과 AI를 활용한 작업 방식까지',
      '할 수 있는 범위를 넓혀왔습니다.',
    ],
    meta: [
      { label: '기관', value: '이젠아카데미 강남점' },
      { label: '기간', value: '2026.04.15 - 2026.10.2', date: true },
      { label: '과정', value: 'UXUI 디자인 & 웹기획 프론트엔드 부트캠프' },
    ],
    position: { x: 960, y: 0 },
    anchor: 'bottom',
  },
  {
    id: 'uxui',
    label: 'figmaDesign',
    title: 'FIGMA DESIGN',
    description: [
      'Figma를 중심으로 정보 구조와',
      '사용자 흐름을 정리하고,웹과 앱의 화면을',
      '구체화하는 방법을 익혔습니다.',
    ],
    keywords: ['Wireframe', 'User Flow', 'IA', 'Prototype'],
    position: { x: 470, y: 1060 },
    anchor: 'right',
  },
  {
    id: 'visual-tools',
    label: 'visualTools',
    title: 'VISUAL TOOLS',
    description: [
      '짧은 실습을 통해',
      '이미지 편집과 그래픽 제작의',
      '기본 기능을 익혔습니다.',
    ],
    keywords: ['Photoshop', 'Illustrator'],
    position: { x: 1420, y: 1500 },
    anchor: 'left',
  },
  {
    id: 'frontend',
    label: 'frontend',
    title: 'FRONT - END',
    description: [
      '디자인한 화면을 실제 웹으로 옮기며',
      '구조와 스타일, 인터랙션이',
      '브라우저에서 작동하는 방식을 익혔습니다.',
    ],
    keywords: ['HTML', 'CSS', 'Javascript', 'React'],
    position: { x: 1450, y: 2180 },
    anchor: 'left',
  },
  {
    id: 'workflow',
    label: 'workflow',
    title: 'BUILD, TEST, PUBLISH',
    description: [
      '코드 작성부터 버전 관리와 배포까지,',
      '웹 프로젝트가 완성되는',
      '실제 작업 흐름을 경험했습니다.',
    ],
    keywords: ['VS CODE', 'VITE', 'GIT', 'GITHUB', 'VERCEL'],
    position: { x: 470, y: 2900 },
    anchor: 'right',
  },
  {
    id: 'ai-workflow',
    label: 'workingWithAi',
    title: 'WORKING WITH AI',
    description: [
      '기획과 리서치부터 디자인과 구현,',
      '비주얼 제작까지 작업 목적에 맞는',
      'AI 도구를 선택해 활용하는 방법을 익혔습니다.',
    ],
    meta: [
      { label: '기획', value: 'ChatGPT ‧ Gemini ‧ Aside ‧ Claude' },
      { label: '설계', value: 'Figma Make ‧ Google Stitch' },
      { label: '구현', value: 'Codex ‧ Claude Code' },
      { label: '제작', value: 'Midjourney ‧ Kling AI' },
    ],
    position: { x: 1250, y: 3560 },
    anchor: 'left',
  },
  {
    id: 'now',
    label: 'stillUpdating',
    title: 'STILL UPDATING',
    description: [
      '완성된 답에 머무르지 않고,',
      '더 나은 경험을 향해',
      '계속 움직이고 있습니다.',
    ],
    keywords: ['UXUI', 'WEB', 'FRONT-END', 'AI'],
    position: { x: 960, y: 4750 },
    anchor: 'top',
  },
]

export const JOURNEY_WORLD_HEIGHT = 5300

/**
 * Journey의 시간(story/storyTime.ts). 따로 선 시계가 아니라 line에 붙은 작은 time marker다 —
 * 빛이 그 구간을 지나가며 남기는 흔적처럼, line 옆 여백에 아주 옅게 적힌다(opacity 최대 .12).
 *   from / to   marker가 붙는 line 구간(JOURNEY_NODES index). 빛이 from card를 떠나면 나타나기 시작한다
 *   side        line의 어느 쪽에 적히는지. 자리는 좌표로 적지 않는다 — 실제 경로를 재서, 그 구간 중
 *               card에서 떨어진 여백의 한 점을 고르고 line에서 MARKER_GAP만큼 떨어뜨린다(useJourneyInteraction)
 */
export type JourneyTime = {
  time: string
  from: number
  to: number
  side: 'left' | 'right'
}

export const JOURNEY_TIMES: JourneyTime[] = [
  // FROM FIGMA TO WEB -> FIGMA DESIGN, line 오른쪽
  { time: STORY_TIME.journey[0], from: 0, to: 1, side: 'right' },
  // FIGMA DESIGN -> FRONT - END, line 왼쪽
  { time: STORY_TIME.journey[1], from: 1, to: 3, side: 'left' },
  // FRONT - END -> WORKING WITH AI, line 오른쪽
  { time: STORY_TIME.journey[2], from: 3, to: 5, side: 'right' },
  // WORKING WITH AI -> STILL UPDATING, line 왼쪽
  { time: STORY_TIME.journey[3], from: 5, to: 6, side: 'left' },
]
