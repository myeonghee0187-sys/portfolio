/*
 * ALL FACES 구도(composition preset). 좌표를 자유 random으로 만들지 않고, 미리 설계한 세 구도 A / B / C 중
 * 하나를 연다(allFacesStore가 open 때 한 번 고른다). 값은 project dial 중심의 화면 비율(0~1)이다.
 *
 *   A   TCHAIKIM            JADUYA            (위 두 개, 아래 가운데 하나)
 *                  F45
 *
 *   B              TCHAIKIM                    (위 가운데 하나, 아래 두 개)
 *       F45                        JADUYA
 *
 *   C   F45                                    (왼쪽 위 -> 오른쪽 가운데 -> 왼쪽 아래, 사선으로 흐른다)
 *                        TCHAIKIM
 *              JADUYA
 *
 * 데스크톱 dial 지름 clamp(280px, 19vw, 360px), 모바일 clamp(130px, 38vw, 170px) 기준으로
 * 1920 / 1440 / 1024 / 390에서 dial끼리 겹치지 않고 위쪽 bar(ALL FACES / CLOSE)와 화면 가장자리에 닿지 않는 값이다.
 * 모바일은 데스크톱을 줄인 것이 아니라 세로 화면용으로 따로 둔 같은 성격의 세 구도다.
 */

export type PresetKey = 'A' | 'B' | 'C'
export const PRESET_KEYS: PresetKey[] = ['A', 'B', 'C']

type Center = { cx: number; cy: number }
type Preset = Record<string, Center>

export const DESKTOP_PRESETS: Record<PresetKey, Preset> = {
  A: {
    tchaikim: { cx: 0.27, cy: 0.38 },
    jaduya: { cx: 0.73, cy: 0.36 },
    f45: { cx: 0.5, cy: 0.72 },
  },
  B: {
    tchaikim: { cx: 0.5, cy: 0.34 },
    f45: { cx: 0.24, cy: 0.68 },
    jaduya: { cx: 0.76, cy: 0.66 },
  },
  C: {
    f45: { cx: 0.22, cy: 0.33 },
    tchaikim: { cx: 0.66, cy: 0.5 },
    jaduya: { cx: 0.38, cy: 0.77 },
  },
}

export const MOBILE_PRESETS: Record<PresetKey, Preset> = {
  A: {
    tchaikim: { cx: 0.29, cy: 0.27 },
    jaduya: { cx: 0.71, cy: 0.46 },
    f45: { cx: 0.46, cy: 0.71 },
  },
  B: {
    tchaikim: { cx: 0.5, cy: 0.25 },
    f45: { cx: 0.29, cy: 0.49 },
    jaduya: { cx: 0.7, cy: 0.72 },
  },
  C: {
    f45: { cx: 0.29, cy: 0.25 },
    tchaikim: { cx: 0.7, cy: 0.47 },
    jaduya: { cx: 0.36, cy: 0.71 },
  },
}

export const MOBILE_QUERY = '(max-width: 760px)'

const STORAGE_KEY = 'all-faces-preset'

/** 직전에 연 구도. 새로고침해도 이어지도록 sessionStorage에도 둔다(쓸 수 없으면 메모리만). */
let last: PresetKey | null = null

function readLast(): PresetKey | null {
  if (last) return last
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY)
    return saved === 'A' || saved === 'B' || saved === 'C' ? saved : null
  } catch {
    return null
  }
}

/**
 * 다음에 열 구도를 고른다. 직전 구도는 다시 고르지 않는다(남은 두 개 중 하나).
 * open 동작(allFacesStore.openAllFaces) 안에서 한 번만 부른다 — render 안에서 부르지 않으므로
 * StrictMode가 render를 두 번 돌려도 구도가 두 번 바뀌지 않는다.
 */
export function pickPreset(rand: () => number = Math.random): PresetKey {
  const previous = readLast()
  const choices = PRESET_KEYS.filter((key) => key !== previous)
  const next = choices[Math.min(choices.length - 1, Math.floor(rand() * choices.length))]
  last = next
  try {
    window.sessionStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 저장할 수 없으면 이번 page 안에서만 기억한다 */
  }
  return next
}
