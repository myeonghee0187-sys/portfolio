/**
 * FACES에 놓이는 프로젝트. 배열 순서가 곧 트랙 위의 순서다(왼쪽 -> 오른쪽).
 *
 * PHASE 1은 mechanic 검수용이라 실제 이미지를 연결하지 않는다.
 * 나중에 image / href 같은 필드를 여기에 더하면 트랙과 active 정보가 그대로 따라간다.
 */
export type FaceProject = {
  id: string
  /** 화면에 그대로 찍히는 두 자리 번호. */
  index: string
  title: string
  category: string
}

export const FACE_PROJECTS: FaceProject[] = [
  { id: 'f45', index: '01', title: 'F45 KOREA', category: 'Responsive Web Redesign' },
  { id: 'tchaikim', index: '02', title: 'TCHAIKIM', category: 'Fashion Brand Web Redesign' },
  { id: 'jaduya', index: '03', title: 'JADUYA', category: 'Mobile UX/UI Platform' },
  { id: 'foln', index: '04', title: 'FOLN', category: 'Original Beauty Brand' },
]
