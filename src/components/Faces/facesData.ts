import f45Video from '../../../assets/vid/faces/hero.mp4'
import tchaikimVideo from '../../../assets/vid/faces/shop.mp4'
import jaduyaVideo from '../../../assets/vid/faces/intro_vid.mp4'
import t100Video from '../../../assets/vid/faces/splash.mp4'

/**
 * FACES에 놓이는 프로젝트. 배열 순서가 곧 rail 위의 순서다(왼쪽 -> 오른쪽).
 * WebGL slider, 모바일 fallback, metadata가 전부 이 배열 하나를 읽는다.
 */
export type FaceProject = {
  id: string
  /** 화면에 그대로 찍히는 두 자리 번호. */
  index: string
  title: string
  category: string
  /** 프로젝트 영상. 소리는 쓰지 않는다(muted). */
  video: string
  /**
   * 영상의 원본 비율(가로 / 세로). loadedmetadata의 videoWidth / videoHeight로 다시 확인하지만,
   * 그 전에도 레이아웃이 튀지 않도록 원본 파일에서 잰 값을 미리 둔다.
   */
  aspect: number
}

export const FACE_PROJECTS: FaceProject[] = [
  {
    id: 'f45',
    index: '01',
    title: 'F45 KOREA',
    category: 'RESPONSIVE WEB REDESIGN',
    video: f45Video,
    aspect: 1620 / 1080,
  },
  {
    id: 'tchaikim',
    index: '02',
    title: 'TCHAIKIM',
    category: 'FASHION BRAND WEB REDESIGN',
    video: tchaikimVideo,
    aspect: 1916 / 1080,
  },
  {
    id: 'jaduya',
    index: '03',
    title: 'JADUYA',
    category: 'MOBILE UX/UI PLATFORM',
    video: jaduyaVideo,
    aspect: 1664 / 3648,
  },
  {
    id: 't100',
    index: '04',
    title: 'T100',
    category: 'MOBILE WEB APP',
    video: t100Video,
    aspect: 1080 / 2352,
  },
]
