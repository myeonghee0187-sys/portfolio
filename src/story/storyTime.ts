/**
 * Portfolio 하루의 시간. Watch / Crown / Journey에 보이는 시간은 실시간 시계가 아니라
 * 장면마다 정해 둔 storytelling 값이다 — 09 : 20에 시작해 18 : 10에 끝난다.
 * 시간 문자열은 전부 이 파일 하나에서 관리한다(component마다 hard-code하지 않는다).
 */
export const STORY_TIME = {
  /** Hero Watch */
  hero: '09 : 20',
  /** About Watch */
  about: '11 : 10',
  /** FACES 이후 정면 Crown controller */
  faces: '13 : 30',
  /** Journey line 옆 여백(순서대로 네 구간). */
  journey: ['14 : 10', '15 : 00', '16 : 20', '17 : 00'],
  /** Contact Watch */
  contact: '18 : 10',
} as const

/** Watch face에 보이는 직무명. 모든 Watch variant가 같은 값을 쓴다. */
export const WATCH_ROLE = 'PRODUCT DESIGNER'
