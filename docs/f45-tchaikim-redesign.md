# F45 KOREA — TCHAIKIM 기반 리디자인

## 기준과 보존 범위

2026-10-20. 깨끗한 `codex/f45-case-study`와 최신 원격 HEAD `795f2a2b23d52714b4d90b7f5d0d3f8773deabb1`을 확인한 뒤 `codex/f45-tchaikim-redesign`을 만들었다. 기존 F45 구현은 원 브랜치에 보존한다. main / Production은 디자인 승인 전 변경하지 않는다.

주 디자인 기준은 실제 [TCHAIKIM 배포 화면](https://portfolio-git-codex-f45-case-study-myeonghee.vercel.app/projects/tchaikim)이다. Chrome에서 Hero부터 Result까지 스크롤하고 로딩된 이미지·레이아웃을 확인했다. 초기 스크롤 직후 캡처에서 비어 있던 지연 로딩 영역은 이미지 완료 상태를 확인하고 다시 촬영했다. 소스의 JSX·CSS·원본 목업·공통 viewport 규칙도 대조했다. 이전 NONFICTION 기준은 이번 리디자인에 적용하지 않는다.

F45 Figma Moodboard `2037:311`과 Lean Product Canvas `2037:251`의 고해상도 context / screenshot을 다시 읽었다. 브랜드 기준은 Dark `#0A0913`, Teal `#008BA3`, Purple `#5B5CEB`, Light `#F8F9FA`, Montserrat / Pretendard, Playful Community다. 사용되는 운동 사진과 UI는 F45 원본 / 실제 배포 사이트에서 가져온다.

TCHAIKIM / JADUYA의 JSX·CSS·에셋과 공통 UI, FACES WebGL, Crown, 라우팅, History 및 미디어 lifecycle은 수정하지 않는다. 필요한 목업 프레임은 F45 디렉터리에 원본 그대로 복사하고 실제 F45 화면만 넣는다. F45 전용 클래스만 사용한다. 새 스크롤 효과·핀·Parallax·Reveal은 추가하지 않는다.

## 9개 섹션으로 옮기는 방식

| F45 | 확인한 TCHAIKIM 패턴 | 재구성 |
| --- | --- | --- |
| HERO | 왼쪽 타이틀·하단 메타데이터 / 오른쪽 디바이스 3종 / 전체 배경 사진 | 실제 F45 화면과 원본 운동 사진, 확정된 개인 프로젝트 메타데이터 |
| OVERVIEW | 중앙 정렬 제목·설명과 절제된 여백 | 배경·문제·목표를 짧게, 주요 타깃 근거는 작은 보충 설명 |
| PROBLEM & STRATEGY | As-is의 밝은 원 / To-be의 진한 원, 두 그룹의 비대칭 배치 | 문제·해결 세 쌍을 통합하고 우선순위·미구현 범위는 짧게 표시 |
| KEY INSIGHT | 큰 배경 워드마크와 중앙 핵심 문장 | 강함을 보여주는 것에서 시작의 확신으로 |
| BRAND CONCEPT | 중앙 제목 / 비율이 다른 다섯 사진의 Moodboard | F45 운동·코치·커뮤니티 이미지와 정확한 컬러·서체 |
| MAIN EXPERIENCE | 큰 노트북 / 긴 화면과 짧은 callout·연결선 | WHY와 PHASE를 하나의 큰 화면 흐름으로, 모바일은 실제 모바일 UI |
| UX EXPERIENCE | 서로 겹치는 화면과 간단한 설명 | 지점 찾기 desktop + mobile, 케어와 외부 앱 안내를 하나의 경로로 |
| EVOLUTION | Brand Experience의 큰 iMac 비주얼과 중앙 제목 | 실제 PC / mobile 화면, 7월 최초 제작과 8~9월 독립적인 고도화, AI 보조와 직접 검수 |
| RESULT | 전체 배경 사진 / 왼쪽 결론 / 오른쪽 세 디바이스 | 기획·디자인·실제 웹 구현 경험을 짧게 마무리, 기존 NextFace·Dock |

기존의 별도 Target, Priority, UX Structure, Design Application, 5행 QA ledger를 새 섹션으로 합쳐 중복 설명과 전체 길이를 줄인다. 사용자 그룹·우선순위·가설의 성격·기능의 한계는 없애지 않는다. 가격 상세·시간표·코치·후기·실제 위치 검색·사이트 내 예약 / 결제를 구현 성과로 표현하지 않는다. Figma 피드백의 미확인 시점과 실제 개발 기록은 구분한다.

## 반응형과 검수 계획

1920×1080, 1440×900, 1024×768, 768×1024, 430×932, 390×844, 375×667 및 모바일 WebKit을 확인한다. 큰 화면에서는 원형 비교·콜라주·화면 겹침·callout을 유지하고, 모바일에서는 읽기 순서대로 재배치한다. 작은 글자가 되는 desktop UI 대신 가능한 실제 mobile 캡처를 사용한다. Hero는 기존 viewport / safe-area 규칙을 재사용한다.

수정 전 1920 / 1440 / 390 화면의 문서 높이는 각각 19,570 / 16,220 / 17,875px다. 구현 후 같은 조건에서 길이와 이미지 비중·가독성을 확인했다.

## 최종 로컬 검수

| Viewport | 문서 높이 | 결과 |
| --- | --- | --- |
| 1920 × 1080 | 12,521px | 통과 |
| 1440 × 900 | 10,861px | 통과 |
| 1366 × 768 (추가) | 10,366px | 통과 |
| 1024 × 768 | 10,222px | 통과 |
| 768 × 1024 | 10,126px | 통과 |
| 430 × 932 | 11,689px | 통과 |
| 390 × 844 | 11,085px | 통과 |
| 375 × 667 | 10,723px | 통과 |

1920px에서 약 36%, 390px에서 약 38% 짧아졌다. 실제 전체 화면과 각 섹션을 확인했다. 같은 디자인 패턴 안에서 F45의 대조색과 다섯 원본 사진, 실제 WHY / PHASE / 지점 찾기 / 케어 / 앱 안내 UI가 중심이 되도록 재배치했다. 모바일의 WHY / PHASE는 desktop 이미지를 축소하지 않고 실제 mobile 캡처를 사용한다. 겹치는 원형, 사진의 지정 크롭, 화면을 잇는 목업 구성과 연결선은 의도된 배치이며 텍스트 겹침·잘림은 없다.

모바일 WebKit 390 × 844 / 375 × 667과 reduced motion에서도 통과했다. 모든 검수 화면에서 가로 넘침, 텍스트 넘침, 깨진 이미지·비율 왜곡, 콘솔·페이지·HTTP 오류가 없었다. F45 pin-spacer는 0개다. 투영된 스크린은 기존의 검증된 기하 계산을 재사용하고 새 스크롤 리스너나 애니메이션 루프는 추가하지 않았다. 물리 iPhone / Safari 앱 검증을 의미하지는 않는다.

FACES의 F45 CTA, Crown / ALL FACES 선택, 양방향 drag, Header 숨김 / 복원과 FACES 복귀, 단일 LIVE SITE Dock 및 기존 hover, NextFace 세 프로젝트 순환, History / 새로고침 시 읽기 위치, 직접 URL / 후행 슬래시, 모바일 fallback / 동적 viewport를 실제 Chrome에서 검수해 통과했다.

TCHAIKIM / JADUYA를 1920 / 1440 / 390에서 다시 캡처·계측했다. 리디자인 전과 섹션·목업·이미지·타이포그래피·연결선·문서 높이·링크의 모든 측정 필드가 동일하다. JADUYA ENDING의 길 그래픽은 정방향 / 역방향 모두 완전한 정적 상태다. 원본 JSX·CSS·에셋, 공통 UI, 라우팅 및 홈페이지 코드는 수정하지 않았다.

`npm run build` (TypeScript 포함), `npm run lint`, `node --test tests/*.test.mjs` 모두 통과했다. 테스트는 52개 성공 / 실패·생략 0개다. 기존 HomePage의 500kB 청크 경고는 유지되지만 크기는 723.16kB로 동일하다. 새 패키지는 없다. `git diff --check`도 통과했다.

증거는 `f45-tchaikim-redesign` 아티팩트 폴더에 보존한다. `local-visual-qa.json`, `local-functional-qa.json`, `existing-page-comparison.json`, `local-section-captures.json`이 계측·기능·회귀 검수 근거다. 전체 스크린샷은 실제 섹션 캡처를 원래 문서 좌표에 원래 해상도로 연결했으며, `local-f45-full-1920-chrome.png` / `local-f45-full-390-chrome.png`다. 전체 비교 이미지의 고정 Header / Dock은 캡처 시에만 숨겼고 별도 Hero 화면에는 실제 UI가 표시된다.

남은 범위는 사용자의 디자인 검토와 승인이다. 가격 상세·시간표·코치·후기, 실제 위치 탐색 등 원본 사이트의 미구현 기능은 후속 과제로 남기며, 디자인 변경을 이유로 기능이 완성되었다고 표현하지 않는다. main / Production은 승인 전 유지한다.
