import { FACE_PROJECTS } from './facesData'

export type FaceNavigationStatus = 'ready' | 'unchanged' | 'unavailable'

export type FaceNavigationResult = {
  status: FaceNavigationStatus
  focusTarget: HTMLElement | null
}

export type FacesNavigationController = {
  navigateToFace: (projectId: string) => Promise<FaceNavigationResult>
}

export async function navigateToFaceWithRetries(
  projectId: string,
  controllerAt: () => FacesNavigationController | null,
  attempts = 3,
  pause: () => Promise<void> = () => Promise.resolve(),
) {
  let result: FaceNavigationResult = { status: 'unavailable', focusTarget: null }
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = controllerAt()
    result = controller
      ? await controller.navigateToFace(projectId)
      : { status: 'unavailable', focusTarget: null }
    if (result.status !== 'unavailable') return result
    if (attempt + 1 < attempts) await pause()
  }
  return result
}

export const faceIndexById = (projectId: string) => FACE_PROJECTS.findIndex((project) => project.id === projectId)

/**
 * Maps a project center in the WebGL loop to the document scroll owned by the
 * shared Faces/Journey ScrollTrigger. Project zero uses the middle of the
 * entry hold so it remains unambiguously inside the first presentation.
 */
export function faceTargetScroll(
  index: number,
  start: number,
  entryHold: number,
  facesDistance: number,
  loopWidth: number,
  centers: readonly number[],
) {
  if (index < 0 || index >= centers.length || loopWidth <= 0) return null
  if (index === 0) return start + entryHold / 2
  return start + entryHold + (facesDistance - entryHold) * (centers[index] / loopWidth)
}
