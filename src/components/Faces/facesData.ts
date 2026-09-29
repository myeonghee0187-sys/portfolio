import f45Video from '../../../assets/vid/faces/f45-faces-4x5.mp4'
/*
 * TCHAIKIM은 loop 전용 영상을 쓴다. 원본(tchaikim-faces-4x5.mp4)은 0.67초의 wide shot 뒤에 close-up으로 hard cut되는
 * 편집이라, 반복될 때마다 close-up -> wide -> close-up으로 두 번 끊겨 보였다. loop 영상은 이어지는 close-up 한 컷만 쓰고
 * 마지막 1초가 첫 1초로 부드럽게 녹아들게(smoothstep dissolve) 다시 인코딩했다. 영상을 되감거나 reset하는 코드는 없다.
 */
import tchaikimVideo from '../../../assets/vid/faces/tchaikim-faces-4x5-loop.mp4'
import jaduyaVideo from '../../../assets/vid/faces/intro_vid.mp4'

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
    aspect: 864 / 1080,
  },
  {
    id: 'tchaikim',
    liveUrl: 'https://myeonghee0187-sys.github.io/tchaikim_all/',
    index: '02',
    title: 'TCHAIKIM',
    category: 'FASHION BRAND WEB REDESIGN',
    // FACES 전용 4:5 영상(960 x 1200). PixVerse 결과(960 x 1280)의 위쪽 80px(워터마크 자리)을 잘라 만들었다. loop 이음매 없음.
    media: tchaikimVideo,
    aspect: 960 / 1200,
  },
  {
    id: 'jaduya',
    liveUrl: 'https://jaduya.vercel.app/',
    index: '03',
    title: 'JADUYA',
    category: 'MOBILE UX/UI PLATFORM',
    media: jaduyaVideo,
    aspect: 1664 / 3648,
    // 캐릭터 위로 사과가 튀어 오르는 동작까지 창 안에 남도록 조금 위를 중심으로 둔다.
    focus: [0.5, 0.46],
  },
]
