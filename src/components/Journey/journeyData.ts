/*
 * JOURNEY — Figma로 화면을 설계하는 것에서 시작해 웹 구현과 AI 작업 방식까지
 * 넓혀 온 경로. 카피는 여기가 유일한 출처다. JSX에 문장을 직접 쓰지 않는다.
 *
 * 경로는 화면 가운데 좁은 폭 안에서만 S자로 흐르고, 카드는 그 좌우로 번갈아 놓인다.
 * 그래서 선이 본문 위를 지나가는 일이 없다.
 * position은 경로 위의 점(1920 기준 디자인 px), cardOffset은 그 점에서 카드 중심까지의 거리다.
 * 카메라는 scroll에 따라 카드 중심을 차례로 화면 focus 중심에 가져다 놓는다.
 */

export type JourneyNodeType = 'intro' | 'main' | 'satellite' | 'ai' | 'now'

export type JourneyNode = {
  id: string
  type: JourneyNodeType
  /** 01 / 02 ... 단계 번호. intro / now에는 없다. */
  index?: string
  /** JOURNEY, VISUAL TOOLS, NOW처럼 번호를 대신하는 라벨. */
  label?: string
  /** 큰 영문 headline. 배열 한 칸이 한 줄이다. */
  headline: string[]
  /** 국문 본문. 배열 한 칸이 한 줄이다. */
  description?: string[]
  tools?: string[]
  keywords?: string[]
  /** intro에만 있는 과정 정보. */
  meta?: { period: string; course: string[]; institution: string }
  /** 경로 위의 점. node가 path와 만나는 자리다. */
  position: { x: number; y: number }
  /**
   * 카드 중심이 그 점에서 얼마나 비켜 있는지(디자인 px).
   * 카드를 점 위에 그대로 얹으면 path가 본문을 가로지르기 때문에,
   * 경로는 화면 바깥쪽으로 흐르게 두고 카드는 안쪽으로 물린다.
   */
  cardOffset: { x: number; y: number }
}

export const JOURNEY_NODES: JourneyNode[] = [
  {
    id: 'intro',
    type: 'intro',
    label: 'JOURNEY',
    headline: ['STILL', 'UPDATING.'],
    description: [
      'Figma로 화면을 설계하는 것에서 시작해,',
      '웹 구현과 AI를 활용한 작업 방식까지',
      '할 수 있는 범위를 계속 넓혀가고 있습니다.',
    ],
    meta: {
      period: '2026.04 — 2026.10',
      course: ['UX/UI디자인 & 웹기획', '프론트엔드 부트캠프'],
      institution: '이젠아카데미 강남점',
    },
    position: { x: 960, y: 0 },
    cardOffset: { x: 0, y: 0 },
  },
  {
    id: 'uxui',
    type: 'main',
    index: '01 / UX·UI DESIGN',
    headline: ['FIGMA', 'FIRST.'],
    description: [
      'Figma를 중심으로',
      '정보 구조와 사용자 흐름을 정리하고,',
      '웹과 앱의 화면을 구체화하는 방법을 익혔습니다.',
    ],
    keywords: [
      'FIGMA',
      'WIREFRAME',
      'USER FLOW',
      'IA',
      'PROTOTYPE',
      'DESIGN SYSTEM',
      'RESPONSIVE DESIGN',
    ],
    position: { x: 830, y: 1060 },
    cardOffset: { x: -360, y: 0 },
  },
  {
    /* 01에 딸린 작은 보조 도구. 크기·정보량 모두 main node보다 한 단계 아래다. */
    id: 'visual-tools',
    type: 'satellite',
    label: 'VISUAL TOOLS',
    headline: ['PHOTOSHOP', 'ILLUSTRATOR'],
    description: ['짧은 실습을 통해', '이미지 편집과 그래픽 제작의', '기본 기능을 익혔습니다.'],
    keywords: ['BASIC IMAGE EDITING', 'GRAPHIC WORK'],
    position: { x: 1224, y: 1500 },
    cardOffset: { x: 196, y: 0 },
  },
  {
    id: 'frontend',
    type: 'main',
    index: '02 / FRONT-END',
    headline: ['FROM SCREEN', 'TO WEB.'],
    description: [
      '디자인한 화면을 실제 웹으로 옮기며,',
      '구조와 스타일, 인터랙션이',
      '브라우저에서 작동하는 방식을 익혔습니다.',
    ],
    tools: ['HTML', 'CSS', 'JAVASCRIPT', 'REACT'],
    keywords: ['RESPONSIVE WEB', 'INTERACTION', 'COMPONENT', 'WEB QA'],
    position: { x: 1100, y: 2180 },
    cardOffset: { x: 350, y: 0 },
  },
  {
    id: 'workflow',
    type: 'main',
    index: '03 / WORKFLOW',
    headline: ['BUILD.', 'TEST.', 'PUBLISH.'],
    description: [
      '코드 작성부터 버전 관리와 배포까지,',
      '웹 프로젝트가 완성되는',
      '실제 작업 흐름을 경험했습니다.',
    ],
    tools: ['VS CODE', 'VITE', 'GIT', 'GITHUB', 'VERCEL'],
    keywords: ['BUILD', 'VERSION CONTROL', 'DEPLOY'],
    position: { x: 820, y: 2900 },
    cardOffset: { x: -350, y: 0 },
  },
  {
    id: 'ai-workflow',
    type: 'ai',
    index: '04 / AI WORKFLOW',
    headline: ['AI IS PART', 'OF THE PROCESS.'],
    description: [
      '하나의 AI에 의존하기보다,',
      '기획과 리서치부터 디자인, 구현,',
      '이미지와 영상 제작까지',
      '목적에 맞는 도구를 선택해 활용합니다.',
    ],
    /* AI 구간에서는 경로가 화면 오른쪽 끝으로 비켜 간다 — 가운데를 panel stack이 쓴다. */
    position: { x: 1700, y: 3560 },
    cardOffset: { x: -450, y: 0 },
  },
  {
    id: 'now',
    type: 'now',
    label: 'NOW',
    headline: ['STILL', 'UPDATING.'],
    description: [
      '디자인과 구현,',
      '그리고 AI를 활용한 작업 방식을 연결하며',
      '더 넓은 범위의 웹 경험을 만들어가고 있습니다.',
    ],
    keywords: ['UX·UI DESIGN', 'WEB DESIGN', 'RESPONSIVE WEB', 'FRONT-END', 'AI WORKFLOW'],
    position: { x: 960, y: 4500 },
    cardOffset: { x: 0, y: 250 },
  },
]

export type JourneyAiPanel = {
  id: string
  title: string
  tools: string[]
  keywords: string[]
}

/** 04 안에서 한 장씩 앞으로 나오는 기록 layer. 순서가 곧 전개 순서다. */
export const JOURNEY_AI_PANELS: JourneyAiPanel[] = [
  {
    id: 'think',
    title: 'THINK / RESEARCH',
    tools: ['CHATGPT', 'GEMINI', 'ASIDE'],
    keywords: ['RESEARCH', 'IDEATION', 'STRUCTURE', 'REVIEW'],
  },
  {
    id: 'design',
    title: 'DESIGN / PROTOTYPE',
    tools: ['FIGMA MAKE', 'GOOGLE STITCH'],
    keywords: ['UI EXPLORATION', 'RAPID DESIGN', 'PROTOTYPE'],
  },
  {
    id: 'code',
    title: 'CODE / IMPLEMENT',
    tools: ['CHATGPT / CODEX', 'CLAUDE / CLAUDE CODE'],
    keywords: ['IMPLEMENTATION', 'DEBUGGING', 'REFACTORING', 'QA'],
  },
  {
    id: 'image',
    title: 'IMAGE / VISUAL',
    tools: ['MIDJOURNEY'],
    keywords: ['IMAGE GENERATION', 'VISUAL EXPLORATION', 'ART DIRECTION'],
  },
  {
    id: 'motion',
    title: 'MOTION / VIDEO',
    tools: ['KLING AI'],
    keywords: ['VIDEO GENERATION', 'MOTION EXPLORATION'],
  },
]

/** AI stack이 놓이는 world 좌표. 04 카드 아래 가운데. */
/* 04 카드 맞은편(경로 왼쪽). 경로가 카드와 stack 사이를 지나간다. */
export const JOURNEY_AI_STACK_POSITION = { x: 820, y: 3990 }

/** world의 세로 길이(디자인 px). 마지막 node 아래 여유까지 포함한다. */
export const JOURNEY_WORLD_HEIGHT = 5300

/**
 * 주요 node를 잇는 하나의 S curve. 좌우 node 사이를 완만하게 흐르고 꺾이는 곳이 없다.
 * 제어점은 각 구간의 세로 길이를 나눠 갖게 두어 접선이 이어진다.
 * 좌표는 world와 같은 1920 기준이다.
 */
export const JOURNEY_PATH_D = [
  // intro 카드 아래에서 시작한다 — 카드 위를 지나지 않는다.
  'M 960 330',
  'C 960 640, 830 760, 830 1060',
  'C 830 1400, 1100 1840, 1100 2180',
  'C 1100 2420, 820 2620, 820 2900',
  'C 820 3140, 1700 3200, 1700 3560',
  'C 1700 4100, 960 4180, 960 4500',
].join(' ')

/** 01에서 갈라져 나가는 짧은 가지. 본선과 겹치지 않는 구간에만 둔다. */
/*
 * 01 카드에서 갈라져 위성으로 이어지는 짧은 가지.
 * 본선(이 구간에서 x 250~400)과 멀리 떨어져 있어 서로 겹치지 않는다.
 */
export const JOURNEY_BRANCH_D = 'M 845 1120 C 960 1230, 1080 1330, 1200 1440'
