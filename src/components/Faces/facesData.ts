/**
 * FACES에 놓이는 프로젝트. 배열 순서가 곧 rail 위의 순서다(왼쪽 -> 오른쪽).
 *
 * 실제 이미지가 준비되면 image 같은 필드를 여기에 더한다.
 * rail 두 벌(FACES 바깥 / Watch 화면 안)과 metadata가 전부 이 배열 하나를 읽는다.
 */
export type FaceProject = {
  id: string
  /** 화면에 그대로 찍히는 두 자리 번호. */
  index: string
  title: string
  category: string
}

export const FACE_PROJECTS: FaceProject[] = [
  { id: 'f45', index: '01', title: 'F45 KOREA', category: 'RESPONSIVE WEB REDESIGN' },
  { id: 'tchaikim', index: '02', title: 'TCHAIKIM', category: 'FASHION BRAND WEB REDESIGN' },
  { id: 'jaduya', index: '03', title: 'JADUYA', category: 'MOBILE UX/UI PLATFORM' },
  { id: 't100', index: '04', title: 'T100', category: 'MOBILE WEB APP' },
]
