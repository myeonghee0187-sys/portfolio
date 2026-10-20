# F45 KOREA — 1차 구현 및 검수

2026-10-20 · `codex/f45-case-study` · 기준 `101d862` (PHASE 1 디자인 복구본).

## 구현과 근거

신규 `/projects/f45`에 HERO, OVERVIEW, PROBLEM DEFINITION, TARGET & INSIGHT, STRATEGY & PRIORITY, UX STRUCTURE, DESIGN DIRECTION, DESIGN APPLICATION, IMPLEMENTATION & QA, ENDING의 10개 섹션을 구현했다. 섹션별 의도와 자료 노드는 [Reference Audit](./f45-reference-audit.md)에 기록했다.

NONFICTION 전체 콘텐츠 이미지 54개와 GIF 프레임을 구현 전에 확인했다. 큰 제목과 절제된 본문, 얇은 구분선, 비대칭 분석 컬럼, 밝고 어두운 UI 사례의 교차 리듬을 F45의 콘텐츠에 적용했다. 문제 비교표 → 사용자 그룹 비교 → 우선순위 레인 → 연결된 사용자 흐름 → 서체·컬러 구성 → 네 가지 실제 UI 사례 → 검증 기록으로 표현 방식을 바꿨다. 원본의 이미지·브랜드·개별 화면 배치를 복제하지 않았다.

Figma Moodboard의 Montserrat / Pretendard 및 Dark `#0A0913`, Teal `#008BA3`, Purple `#5B5CEB`, Light `#F8F9FA`를 사용한다. 원본 사진·앱 안내 PNG와 실제 배포 웹사이트 캡처의 출처는 [ASSETS.md](../public/projects/f45/ASSETS.md), 체크섬은 `asset-map.json`에 기록했다. 모바일 PHASE·지점 찾기는 실제 모바일 UI 캡처를 사용한다.

기획 가설, Figma 피드백 메모, 실제 구현을 구분했다. 가짜 통계·페르소나·예약 성공·전환 성과는 기재하지 않았다. 원본 지점 찾기는 정적 목록 필터와 기본 상세, 참고 지도이며 위치 기반 검색이 아니다. 가격·시간표·코치·후기는 후속 과제로 명시했다. 결제·예약은 외부 앱의 역할이다.

## 공통 UI 및 최소 통합

- ProjectHeader, ProjectViewport, FloatingDock, NextFace와 기존 페이지 전환 / History를 재사용했다.
- FACES의 F45 상세 경로와 EXPLORE PROJECT를 활성화했다. Crown / ALL FACES의 동작과 갤러리 구조는 유지했다.
- 이동 순서: TCHAIKIM → JADUYA → F45 → TCHAIKIM.
- F45 Dock에는 실제 LIVE SITE만 표시한다. 다른 두 프로젝트의 CASE STUDY 링크와 디자인은 그대로다.
- `/projects/f45` 및 후행 슬래시의 Vercel SPA rewrite를 추가했다.
- 새 스크롤 애니메이션·핀·리스너·패키지를 추가하지 않았다.

## Visual QA

실제 Chrome에서 각 영역을 스크롤하고 이미지·폰트 로딩 후 검수했다. 내용 위계, 섹션별 편집 리듬, UI 캡처의 비율, 도표의 읽기 순서, HERO의 텍스트 / 비주얼 / 메타데이터 간격, ENDING과 NextFace를 확인했다.

| Viewport | 검수 결과 |
| --- | --- |
| 1920 × 1080 | 통과 — 대형 편집 구성 및 HERO / ENDING |
| 1440 × 900 | 통과 — 비대칭 컬럼·타이포그래피 |
| 1366 × 768 | 통과 — 짧은 화면 HERO와 Dock 여백 |
| 1024 × 768 | 통과 — 분석 컬럼과 이미지 비율 |
| 768 × 1024 | 통과 — 세로 흐름·본문 재배치 |
| 430 × 932 | 통과 — 모바일 비교표·우선순위·실제 모바일 UI |
| 390 × 844 | 통과 — 전체 섹션 및 안전 여백 |
| 375 × 667 | 통과 — 작은 화면 줄바꿈·스크롤 접근 |

WebKit의 390 × 844, 375 × 667에서도 추가 검수했다. 물리 iPhone / Safari 앱을 직접 검증했다는 의미는 아니다. 모든 검수 화면에서 가로 넘침, 잘린 텍스트, 깨진 이미지, 이미지 비율 왜곡, HTTP 오류, 페이지 / 콘솔 오류가 없었다. F45 페이지의 pin-spacer는 0개다.

전체 PNG는 브라우저에서 촬영한 각 섹션을 측정된 문서 좌표에 원래 해상도로 연결한 결과다. 긴 페이지의 단일 fullPage 캡처에서 발생한 브라우저 합성 오류를 피하기 위한 방식이며, 섹션의 배치나 내용을 편집한 이미지는 아니다. 전체 비교 이미지에서는 고정 Header / Dock만 캡처 시 숨겼고, 별도 HERO 화면에는 실제 공통 UI가 포함되어 있다.

## 기능 및 회귀 검수

- 실제 WebGL FACES의 F45 CTA 진입, 양방향 드래그, Crown / ALL FACES 선택 → CTA 진입.
- F45 Header 스크롤 숨김 / 복원, FACES 복귀 시 F45 선택 유지.
- 브라우저 뒤로 / 앞으로, 상세 새로고침 시 읽기 위치 복원.
- 3개 상세페이지 NextFace 순환, 기존 외부 링크와 F45 LIVE SITE 단일 링크.
- F45 직접 URL 및 후행 슬래시 접근.
- 모바일 reduced-motion 레일에서 F45 탭 진입과 동적 viewport 높이 변경.
- 새 세션 Intro 영상 재생 / 종료, Hero, Magic Rings, SplashCursor, Shared Watch 및 About / Faces / Journey / Contact 스크롤.
- 기존 TCHAIKIM / JADUYA의 1920, 1440, 390 폭 화면을 복구 기준과 비교했다. 섹션 좌표·크기, 폰트, 이미지, 본문, 문서 높이는 동일했다. JADUYA의 NextFace 목적지 / 표시가 F45 상세페이지로 활성화되는 차이만 있다.

검수 원본 JSON과 스크린샷은 이번 작업의 `f45-case-study` 아티팩트 폴더에 저장했다. `local-visual-qa.json`, `local-functional-qa.json`, `home-smoke-qa.json`, `existing-design-comparison.json`, `local-section-captures.json`이 측정 근거다. 핵심 산출물은 `local-f45-full-1920-chrome.png`, `local-f45-full-390-chrome.png`다.

## 필수 명령 검증

최종 `npm run build` (TypeScript 포함), `npm run lint`, `node --test tests/*.test.mjs` 모두 통과했다. 테스트는 52개 성공, 실패 / 생략 0개다. 소스·문서의 `git diff --cached --check`도 통과했다. 원본 그대로 보존한 두 폰트 라이선스에는 upstream의 줄 끝 공백이 각 한 줄 있으며, 해당 두 파일만 공백 검사에서 제외했다. 변경된 테스트는 F45의 실제 구현 상태를 반영하며, 기존 제스처·중복 진입 방지·History 검증을 유지한다. FloatingDock의 단일 / 이중 링크 동작도 확인했다.

Vite는 기존 HomePage 청크의 500kB 초과 경고를 출력한다 (723.16kB, gzip 203.66kB). 빌드 실패는 아니며 해당 청크 크기는 이번 F45 추가 전과 동일하다. 새로운 패키지는 추가하지 않았다.

## 사용자 확인을 반영한 프로젝트 이력

사용자가 최초 제작과 이후 독립적인 고도화 기간을 확인해주었다. HERO의 세 항목을 `PERIOD: 2026.07`, `MY ROLE: WEB PLANNING · UX/UI DESIGN · FRONT-END IMPLEMENTATION`, `CONTRIBUTION: 100% (PERSONAL PROJECT)`로 갱신했다. 기존 유형·컨셉 설명은 본문의 Overview / Design Direction에 유지된다.

IMPLEMENTATION & QA의 기존 구분선 레이아웃 안에서 `2026.07` 최초 기획·디자인·웹사이트 제작과 `2026.08–09` 정규 과정 종료 후 독립적인 추가 개발·고도화를 나눴다. 최초 디자인을 웹 환경에 구현한 후 스스로 반응형·인터랙션·모바일 사용성을 검수하며 발전시킨 과정을 설명한다. 8~9월을 정규 과정의 연장이나 단순 유지보수로 표현하지 않는다.

AI 활용은 코드 구현·오류 수정의 보조와, 직접 진행한 기획·디자인 의사결정·최종 검수로 설명한다. 원본 `PROJECT_CONTEXT.md`의 Codex 작업 / 브라우저 QA 기록을 근거로 하며, 확인되지 않은 개별 AI 모델·사용 시점·모든 코드의 수작업 작성 여부는 주장하지 않는다. 긴 영문 역할과 레이블이 모바일에서 줄바꿈되도록 HERO 메타데이터의 열 너비만 보완했다. 다른 섹션의 디자인·공통 UI·라우팅·인터랙션은 변경하지 않았다.

이 보완 후에도 Chrome의 필수 8개 해상도와 WebKit 모바일 2개 해상도에서 다시 검수했다. HERO의 제목·비주얼·메타데이터 겹침, 텍스트 넘침, 이미지 오류, 콘솔 오류가 없었다. 메타데이터는 375px 폭에서도 Dock과 겹치지 않고 읽을 수 있다. 본문 섹션 높이는 내용을 추가한 IMPLEMENTATION & QA에서만 늘었으며, 나머지 섹션의 높이는 동일하다. TypeScript / Build, Lint, 52개 테스트 및 `git diff --check`를 다시 통과했다.

최신 증거 파일은 `metadata-update-visual-qa.json`, `metadata-update-layout-comparison.json`과 `metadata-update-section-captures.json`이다. 갱신된 전체 스크린샷은 `metadata-update-f45-full-1920-chrome.png`, `metadata-update-f45-full-390-chrome.png`다. HERO와 IMPLEMENTATION & QA의 개별 화면도 동일 접두사로 보존했다.

## 남은 확인 범위

- 브리프에 언급된 `f45-case-study-implementation.zip`은 제공된 첨부에서 찾지 못했다. 검토되지 않은 초안을 적용했다고 주장하지 않는다.
- Figma 피드백의 테스트 일자 / 대상 시안, 실제 위치 탐색 / 가격 / 시간표 / 코치 / 후기는 미검증 또는 원본 사이트의 후속 과제다.

이 버전은 디자인 검토용 Preview다. 사용자 디자인 승인 전 main 병합 / Production 배포를 진행하지 않는다.
