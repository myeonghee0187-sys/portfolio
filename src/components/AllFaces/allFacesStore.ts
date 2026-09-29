import { useSyncExternalStore } from 'react'
import { pickPreset, type PresetKey } from './allFacesPresets'

/**
 * ALL FACES가 열려 있는지. 한 곳에만 둔다.
 *   열기   Digital Crown(FACES 이후의 정면 controller / 연출이 꺼진 화면의 Watch 옆 Crown)
 *   읽기   App(overlay mount), Contact Light Rays / FACES WebGL(가려진 동안 그리지 않는다)
 * React state를 거치지 않는 rAF 루프도 isAllFacesOpen()으로 바로 읽는다.
 */
let open = false
/** 이번에 연 ALL FACES의 구도(A / B / C). 여는 순간 한 번만 정한다 — 열려 있는 동안은 바뀌지 않는다. */
let preset: PresetKey = 'A'
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((fn) => fn())

export function openAllFaces() {
  if (open) return
  // 구도는 render가 아니라 여는 동작에서 고른다(StrictMode의 이중 render와 무관하게 한 번).
  preset = pickPreset()
  open = true
  emit()
}

export const getAllFacesPreset = () => preset

export function closeAllFaces() {
  if (!open) return
  open = false
  emit()
}

export const isAllFacesOpen = () => open

export function subscribeAllFaces(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useAllFacesOpen() {
  return useSyncExternalStore(subscribeAllFaces, isAllFacesOpen, () => false)
}
