import f45Video from '../../../assets/vid/faces/f45-faces-4x5.mp4'
import tchaikimVideo from '../../../assets/vid/faces/tchaikim-faces-4x5.mp4'
import jaduyaVideo from '../../../assets/vid/faces/jaduya-faces.mp4'
// ALL FACES 원형 object visual. Figma "all faces logo" node(F45 255:597 / TCHAIKIM 253:529 / JADUYA 253:563)에서 가져왔다.
// 배경은 원본 이미지 + Figma의 옅은 막을 정사각 cover로 그린 것이고, logo는 글자를 outline한 SVG다.
import f45OrbImage from '../../../assets/img/all-faces/f45-bg.jpg'
import f45Logo from '../../../assets/img/all-faces/f45-logo.svg'
import tchaikimOrbImage from '../../../assets/img/all-faces/tchaikim-bg.jpg'
import tchaikimLogo from '../../../assets/img/all-faces/tchaikim-logo.svg'
import jaduyaOrbImage from '../../../assets/img/all-faces/jaduya-bg.jpg'
import jaduyaLogo from '../../../assets/img/all-faces/jaduya-logo.svg'

/**
 * FACES에 놓이는 프로젝트. 배열 순서가 곧 rail 위의 순서다(왼쪽 -> 오른쪽).
 * WebGL slider, 모바일 fallback, metadata가 전부 이 배열 하나를 읽는다.
 * project 수는 어디에도 숫자로 적지 않는다 — plane / bridge / VideoTexture / display 띠 / 한 바퀴 거리가
 * 전부 FACE_PROJECTS.length에서 나온다. (T100은 완성 전이라 이번 FACES에서 빠져 있다. asset은 그대로 있다.)
 */
export type FaceProject = {
  id: string
  /** 화면에 그대로 찍히는 두 자리 번호. */
  index: string
  title: string
  category: string
  /** 프로젝트 영상. 소리는 쓰지 않는다(muted). */
  media: string
  liveUrl: string
  caseStudyPath?: string
  /**
   * ALL FACES 원형 object의 visual(Figma "all faces logo" node에서 가져온 asset).
   *   orbImage  원을 꽉 채우는 배경 이미지(object-fit: cover)
   *   logo      그 위 정중앙의 project logo
   * FACES section은 이 두 값을 쓰지 않는다(media 영상만 쓴다). 없으면 ALL FACES는 project 이름만 가운데에 둔다(fallback).
   */
  orbImage?: string
  logo?: string
  /**
   * 영상의 원본 비율(가로 / 세로). loadedmetadata의 videoWidth / videoHeight로 다시 확인하지만,
   * 그 전에도 레이아웃이 튀지 않도록 원본 파일에서 잰 값을 미리 둔다.
   */
  aspect: number
  /**
   * Watch display는 모든 project를 object-fit: cover로 채운다(바깥 gallery는 언제나 원본 비율 그대로다).
   * 그때 잘라내고 남길 창의 중심(영상 UV, 왼쪽 위 0 ~ 오른쪽 아래 1). 없으면 가운데.
   */
  focus?: [number, number]
}

export const FACE_PROJECTS: FaceProject[] = [
  {
    id: 'f45',
    liveUrl: 'https://myeonghee0187-sys.github.io/f45_korea/',
    index: '01',
    title: 'F45 KOREA',
    category: 'RESPONSIVE WEB REDESIGN',
    // FACES 전용 4:5 영상(864 x 1080). Watch display와 비율이 가까워 cover로 거의 전체가 보인다.
    media: f45Video,
    orbImage: f45OrbImage,
    logo: f45Logo,
    aspect: 864 / 1080,
  },
  {
    id: 'tchaikim',
    liveUrl: 'https://myeonghee0187-sys.github.io/tchaikim_all/',
    index: '02',
    title: 'TCHAIKIM',
    category: 'FASHION BRAND WEB REDESIGN',
    // FACES 전용 4:5 영상(960 x 1200). PixVerse 결과(960 x 1280)의 위쪽 80px(워터마크 자리)을 잘라 만들었다.
    media: tchaikimVideo,
    orbImage: tchaikimOrbImage,
    logo: tchaikimLogo,
    aspect: 960 / 1200,
  },
  {
    id: 'jaduya',
    liveUrl: 'https://jaduya.vercel.app/',
    index: '03',
    title: 'JADUYA',
    category: 'MOBILE UX/UI PLATFORM',
    /*
     * FACES 전용 영상(728 x 1596, H.264 High@4.0, 약 1.1Mbps). 원본 intro_vid.mp4(1664 x 3648, High@5.1, 16.5Mbps)에서
     * 비율 / 길이 / 내용을 그대로 두고 크기만 줄여 만들었다(원본 파일은 그대로 있다).
     * 원본은 FACES가 loop 이음매용으로 쓰는 element 두 개를 동시에 풀기에 너무 커서, 하드웨어 decoder가 받지 못하는
     * 환경(Safari / iOS, 많은 Android 등)에서 frame이 나오지 않고 texture가 검게 남았다. F45 / TCHAIKIM도 FACES 전용 크기다.
     */
    media: jaduyaVideo,
    orbImage: jaduyaOrbImage,
    logo: jaduyaLogo,
    aspect: 1664 / 3648,
    // 캐릭터 위로 사과가 튀어 오르는 동작까지 창 안에 남도록 조금 위를 중심으로 둔다.
    focus: [0.5, 0.46],
  },
]
