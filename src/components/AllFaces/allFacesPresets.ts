/*
 * ALL FACES 구도(composition preset). 세 project dial은 화면에 흩어지지 않고, 화면 가운데의 한 shared orbit 위에
 * 놓인 하나의 face selector다. 구도는 orbit 위의 각도로만 정한다 — 세 dial은 늘 같은 orbit 위에 있고
 * (중심 거리 ORBIT_RADIUS x dial 지름), 구도마다 그 위의 자리만 다르다. 자유 random 좌표는 쓰지 않는다.
 * 각도: 0 = 오른쪽, 90 = 아래(화면 좌표, 시계 방향).
 *
 *   A (데스크톱)  TCHAIKIM                         두 개는 위쪽 좌우, F45는 아래 조금 왼쪽 — 비대칭 삼각
 *                            JADUYA
 *                    F45
 *
 *   B            TCHAIKIM 위 가운데, JADUYA 왼쪽 아래, F45 오른쪽 아래
 *   C            TCHAIKIM 왼쪽, JADUYA 오른쪽 위, F45 오른쪽 아래
 *
 * dial 사이 각도는 모두 107도 이상이라 dial끼리 겹치지 않는다(가장 가까운 두 dial의 중심 거리 >= 지름 x 1.19).
 * 모바일은 같은 성격의 작은 삼각 구도를 따로 둔다(데스크톱 각도를 그대로 줄이면 세로 화면에서 옆으로 넘친다).
 */

export type PresetKey = 'A' | 'B' | 'C'
export const PRESET_KEYS: PresetKey[] = ['A', 'B', 'C']

/** project id -> orbit 위의 각도(deg). */
type Preset = Record<string, number>

/** dial 중심이 놓이는 orbit 반지름(dial 지름 배수). */
export const ORBIT_RADIUS = 0.74

export const DESKTOP_PRESETS: Record<PresetKey, Preset> = {
  A: { tchaikim: 212, jaduya: 350, f45: 97 },
  B: { tchaikim: 268, jaduya: 148, f45: 28 },
  C: { tchaikim: 176, jaduya: 296, f45: 56 },
}

export const MOBILE_PRESETS: Record<PresetKey, Preset> = {
  A: { tchaikim: 270, jaduya: 150, f45: 30 },
  B: { tchaikim: 210, jaduya: 330, f45: 90 },
  C: { tchaikim: 300, jaduya: 180, f45: 60 },
}

/** 각도 -> dial 중심의 offset(dial 지름 배수, 그룹 중심 기준). */
export function orbitOffset(deg: number) {
  const a = (deg * Math.PI) / 180
  return { x: Math.cos(a) * ORBIT_RADIUS, y: Math.sin(a) * ORBIT_RADIUS }
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
