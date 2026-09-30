import f45Video from '../../../assets/vid/faces/f45-faces-4x5.mp4'
import tchaikimVideo from '../../../assets/vid/faces/tchaikim-faces-4x5.mp4'
import jaduyaVideo from '../../../assets/vid/faces/jaduya-faces.mp4'

/**
 * FACES에 놓이는 프로젝트. 배열 순서가 곧 rail 위의 순서다(왼쪽 -> 오른쪽).
 * 순서: 01 TCHAIKIM -> 02 JADUYA -> 03 F45 KOREA -> (다시 TCHAIKIM). FACES 첫 화면은 TCHAIKIM이다.
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
  /** Case Study(Figma Deck) 주소. 없는 project는 CASE STUDY CTA를 렌더링하지 않는다. */
  caseStudyUrl?: string
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
    id: 'tchaikim',
    liveUrl: 'https://myeonghee0187-sys.github.io/tchaikim_all/',
    caseStudyUrl: 'https://www.figma.com/deck/IVOhQsvxXEl7LkIonDRzPa/-%ED%8C%80%ED%94%8C1-4%EC%A1%B0--%EA%B2%B0%EA%B3%BC%EB%B3%B4%EA%B3%A0%EC%84%9C_%EC%B0%A8%EC%9D%B4%ED%82%B4-%ED%95%9C%EB%B3%B5%ED%8C%90-?node-id=6242-19&p=f&viewport=527%2C373%2C0.38&t=y4aDmydh5sbZj8c2-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1',
    index: '01',
    title: 'TCHAIKIM',
    category: 'FASHION BRAND WEB REDESIGN',
    // FACES 전용 4:5 영상(960 x 1200). PixVerse 결과(960 x 1280)의 위쪽 80px(워터마크 자리)을 잘라 만들었다.
    media: tchaikimVideo,
    aspect: 960 / 1200,
  },
  {
    id: 'jaduya',
    liveUrl: 'https://jaduya.vercel.app/',
    caseStudyUrl: 'https://www.figma.com/deck/1JhaNnsCFGHiULHwL2677r/2%EC%A1%B0--%EC%95%88%EB%85%95%EC%9E%90%EB%91%90%EC%95%BC--%EC%B5%9C%EC%A2%85%EB%B0%9C%ED%91%9C-%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C?node-id=42-45&viewport=-146%2C62%2C0.68&t=IESmG21W7J7vH3Fs-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1',
    index: '02',
    title: 'JADUYA',
    category: 'MOBILE UX/UI PLATFORM',
    /*
     * FACES 전용 영상(728 x 1596, H.264 High@4.0, 약 1.1Mbps). 원본 intro_vid.mp4(1664 x 3648, High@5.1, 16.5Mbps)에서
     * 비율 / 길이 / 내용을 그대로 두고 크기만 줄여 만들었다(원본 파일은 그대로 있다).
     * 원본은 FACES가 loop 이음매용으로 쓰는 element 두 개를 동시에 풀기에 너무 커서, 하드웨어 decoder가 받지 못하는
     * 환경(Safari / iOS, 많은 Android 등)에서 frame이 나오지 않고 texture가 검게 남았다. F45 / TCHAIKIM도 FACES 전용 크기다.
     */
    media: jaduyaVideo,
    aspect: 1664 / 3648,
    // 캐릭터 위로 사과가 튀어 오르는 동작까지 창 안에 남도록 조금 위를 중심으로 둔다.
    focus: [0.5, 0.46],
  },
  {
    id: 'f45',
    liveUrl: 'https://myeonghee0187-sys.github.io/f45_korea/',
    index: '03',
    title: 'F45 KOREA',
    category: 'RESPONSIVE WEB REDESIGN',
    // FACES 전용 4:5 영상(864 x 1080). Watch display와 비율이 가까워 cover로 거의 전체가 보인다.
    media: f45Video,
    aspect: 864 / 1080,
  },
]
