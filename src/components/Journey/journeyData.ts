/** Journey copy and preserved card geometry, in 1920px design coordinates. */
export type JourneyNode = {
  id: string
  /** Scroll timeline label; never rendered as a section index. */
  label: string
  title: string
  description: string[]
  keywords?: string[]
  meta?: { label: string; value: string; date?: boolean }[]
  /** Card center in the Journey world. */
  position: { x: number; y: number }
  width: number
  height: number
  compact?: boolean
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
    width: 620,
    height: 561,
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
    width: 580,
    height: 449,
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
    width: 392,
    height: 325,
    compact: true,
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
    width: 580,
    height: 492,
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
    width: 580,
    height: 539,
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
    width: 520,
    height: 383,
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
    width: 620,
    height: 490,
  },
]

export const JOURNEY_WORLD_HEIGHT = 5300
