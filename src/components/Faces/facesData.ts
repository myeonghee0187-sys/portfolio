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
  /**
   * Watch display 안에서 영상을 맞추는 방식. 바깥 gallery는 언제나 원본 비율 그대로다.
   *   contain-optical  영상 frame 전체를 자르지 않고 담는다(object-fit: contain). 남는 위아래(또는 좌우)는
   *                    같은 영상의 가장자리를 늘인 optical glass extension으로 채운다. 가로로 긴 화면용.
   *   cover            display를 꽉 채우고 넘치는 쪽을 잘라낸다(object-fit: cover). 세로로 긴 화면용.
   */
  fit: FaceFit
  /** cover일 때 잘라내고 남길 창의 중심(영상 UV, 왼쪽 위 0 ~ 오른쪽 아래 1). 없으면 가운데. */
  focus?: [number, number]
}

export type FaceFit = 'contain-optical' | 'cover'

export const FACE_PROJECTS: FaceProject[] = [
  {
    id: 'f45',
    index: '01',
    title: 'F45 KOREA',
    category: 'RESPONSIVE WEB REDESIGN',
    video: f45Video,
    aspect: 1620 / 1080,
    fit: 'contain-optical',
  },
  {
    id: 'tchaikim',
    index: '02',
    title: 'TCHAIKIM',
    category: 'FASHION BRAND WEB REDESIGN',
    video: tchaikimVideo,
    aspect: 1916 / 1080,
    fit: 'contain-optical',
  },
  {
    id: 'jaduya',
    index: '03',
    title: 'JADUYA',
    category: 'MOBILE UX/UI PLATFORM',
    video: jaduyaVideo,
    aspect: 1664 / 3648,
    fit: 'cover',
    // 캐릭터 위로 사과가 튀어 오르는 동작까지 창 안에 남도록 조금 위를 중심으로 둔다.
    focus: [0.5, 0.46],
  },
  {
    id: 't100',
    index: '04',
    title: 'T100',
    category: 'MOBILE WEB APP',
    video: t100Video,
    aspect: 1080 / 2352,
    fit: 'cover',
  },
]
