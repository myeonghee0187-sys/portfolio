# Portfolio final polish — 구현 및 검수 기록

검수일: 2026-09-28. 현재 working tree를 기준으로 수정했으며 reset, checkout, commit, push는 하지 않았습니다.

최신 사용자 답변을 우선 적용했습니다. Contact는 최소 도착 지점만 추가했습니다. ALL FACES는 App 상태·Crown handler·프로젝트 3개·미래 `caseStudyPath` 필드만 준비했으며, 임시 화면·Modal·가짜 Case Study URL은 없습니다.

기준: [Figma Journey 201:38](https://www.figma.com/design/iSmydWe8KRNPAAUHSJ7E2X?node-id=201-38), [GSAP Pinned Panels with Overscroll](https://demos.gsap.com/demo/pinned-panels-with-overscroll/). Figma design context와 screenshot을 직접 확인했습니다.

## ABOUT — 1~8

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 1 | Card Active 기준 | 기존 counter-flow 경로의 실제 위치에서 계산되는 `--focus`를 Border에도 재사용. Timer나 index 기반 새 애니메이션 없음. |
| 2 | Card별 Timing | WHO I AM + HOW I SEE: 기존 Pair 1 HOLD 0.23~0.29. HOW I REFINE + HOW I MAKE: Pair 2 HOLD 0.63~0.69. 진입·퇴장 시 focus 보간. 1440에서 scrollY 약 1674 / 2754로 각 Pair 활성 확인. |
| 3 | Border 값 | 기본 white 0.09에서 `rgba(24,109,229,0.55)`로 보간. Black Glass 배경 유지, pulse·bounce·강한 glow 없음. |
| 4 | Reverse | 1672.67px로 되감아 Pair 1 focus=1/1, Pair 2=0/0 및 원래 테두리 복원 확인. |
| 5 | Light Layer | About ambient와 형제인 `.about__ice`; Faces 기존 composite shader에도 같은 radial light 연결. 영상 뒤의 빈 바탕에 합성. 새 Renderer 없음. |
| 6 | Peak Timing | 기존 About→Faces progress 0→0.2에서 0→0.35, 0.2→0.55에서 1, 0.55→1에서 0.32. 1440의 scrollY=4170에서 opacity=1 확인. |
| 7 | Background | About, Faces, Journey의 계산된 기본색 모두 `rgb(8,9,10)` / `#08090A`. 밝은 별도 section 없음. |
| 8 | Reverse Light | 역방향 scrollY=4165.33에서 opacity=0.999715, Faces 쪽에서는 약 0.32. 배경색 점프·흰 플래시·Canvas 직사각형 경계 관찰되지 않음. |

## FACES LIVE LINKS — 9~17

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 9 | Project Data | `FACE_PROJECTS`: id, index, title, category, media, liveUrl, aspect, optional focus와 `caseStudyPath?: string`. Live URL의 단일 원본. T100 제외. |
| 10 | F45 | `https://myeonghee0187-sys.github.io/f45_korea/` — 새 탭의 실제 주소 확인. |
| 11 | TCHAIKIM | `https://myeonghee0187-sys.github.io/tchaikim_all/` — Enter로 새 탭 열림 확인. |
| 12 | JADUYA | `https://jaduya.vercel.app/` — 새 탭의 실제 주소 확인. |
| 13 | Click Target | 실제 display rounded rect에만 투명 Anchor 배치. Outer Case·Titanium Rim·Crown을 Live Link에 포함하지 않음. |
| 14 | Drag Threshold | 7px. 누적 포인터 이동으로 click 취소, 수평 이동으로 drag 시작. 230px 드래그와 15px 짧은 드래그 모두 새 탭 0개. 연속 드래그로 offset1593px가 loopWidth1489.25px를 넘어 F45로 순환했으며 page scrollY4597.33은 유지됨. |
| 15 | 활성 조건 | Faces 구간, handoff<0.001, active influence≥0.92, drag 아님, target/current 차이÷폭<0.002, scroll velocity<420px/s, displaySlot 정수와 차이<0.015. 클릭 시에도 재확인. 경계 frame focus 약 0.51에서는 클릭 차단 확인. |
| 16 | Hover / Press / Focus | Hover: brightness +4%, display zoom 1.008, Frost inner edge. Press: zoom 0.99, 밝기 감소, 짧은 지수 보간. Keyboard: Ice rounded focus ring·Enter. 드래그 후 안정된 F45에서 Enter로 새 탭 열림도 확인. |
| 17 | Security | 모든 Live Anchor에 `target="_blank" rel="noopener noreferrer"`; 프로젝트 이름을 포함한 한국어 aria-label. |

## HEADER / HERO — 18~26

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 18 | CONTACT Size | 현재 computed 값 기준 12.5% 감소. 1920: 23.478→20.543px, 1440: 18→15.75px, 1024: 13→11.375px. |
| 19 | Hit Area | min 44×44px. 실제 높이 44px, 폭 1920 약 101.94px / 1024·390 약 56.45px. |
| 20 | Contact Anchor | `href="#contact"` + `<section id="contact">`. Email mailto와 지정 GitHub만 추가. |
| 21 | Offset | 현재 Contact 문서 좌표에서 실제 Header 높이를 뺌. 1440: Contact top 77.67 / Header bottom 78px. 1024: 63.67 / 64px. Mobile: 64.29 / 64px. |
| 22 | Hero Font | `160×site-u` → `150×site-u`, 6.25% 감소. 1920: 156.522→146.739px, 1440: 120→112.5px, 1024: 85.333→80px. |
| 23 | Line-height | 1.4→1.38. 실제 1920 202.5px / 1440 155.25px / 1024 110.4px. Anton·3줄·좌측 기준 유지. |
| 24 | 1920 Geometry | Header 약 101.73px + Hero 약 978.26px=1080px. Watch anchor 586.95×743.47px, 기존 좌표·중심 유지. 기존 MANY FACES/Watch 일부 겹침은 남아 있음(아래 제한 사항 참조). |
| 25 | 1440 Geometry | Header 78px + Hero 822px=900px. Watch anchor 450×570px 유지. Title 3줄 및 좌측 기준 유지. |
| 26 | 1024 Geometry | Header 64px + Hero 704px=768px. Watch anchor 320×405.33px 유지. Title 3줄, Header 링크 겹침 없음. |

## TRANSITION — 27~35

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 27 | 제거한 퇴장 Motion | Faces pin 종료 시 Watch가 문서와 함께 위로 밀리는 구조를 없앰. Watch만 별도로 위로 이동시키거나 fade하지 않음. |
| 28 | Handoff 구조 | 실제 Faces scene과 실제 Journey stage를 단일 `.panels__viewport`에 배치하고 이 viewport 하나만 pin. Journey 복제·nested pin·scroll wrapping 없음. |
| 29 | Distance | 0.9H: 1920/1080은 972px, 1440/900은 810px, 1024/768은 691.2px. |
| 30 | Journey yPercent | Handoff 0.08~0.88에 100→0. 실제 Journey가 아래에서 올라와 덮음. |
| 31 | Faces 전체 | 0.15~0.90에서 scale 1→0.94, opacity 1→0.34. Blur 추가 없음. Metadata는 0~0.15에서 먼저 사라짐. |
| 32 | Watch Layer | Faces Watch를 그리는 기존 WebGL canvas까지 `.faces__scene`에 포함. 고정 Crown은 기존 WatchStage에 남아 별도로 유지. |
| 33 | Reverse | Journey가 다시 아래로 내려가고 Faces scene scale=1/opacity=1, 기존 gallery render 재개 확인. |
| 34 | Header | Pin wrapper 밖의 기존 fixed Header 유지. Journey 중 top=0 및 같은 높이. |
| 35 | Crown | 같은 DOM·같은 front view 유지. 1024 Journey/Contact에서 x=905.742, y=666.514, size≈70.783px로 동일. |

## JOURNEY — 36~52

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 36 | Card 7개 | FROM FIGMA TO WEB → FIGMA DESIGN → VISUAL TOOLS → FRONT - END → BUILD, TEST, PUBLISH → WORKING WITH AI → STILL UPDATING. |
| 37 | Figma Typography | Title Anton 400, 40/1, tracking 1. Body SUIT 500, 24/1.4. Meta SUIT 500, 20/1. Date IBM Plex Sans 400. Title/body gap40, body/meta gap20, meta row gap12. 디자인 단위에 반응형 비율 적용. 기존 작은 VISUAL TOOLS는 0.78, AI는 0.9 배율로 외부 크기 보존. Mobile은 모두 text unit 0.72px. |
| 38 | Metal Gradient | 180deg: #55595D 0%, #F5F6F6 17%, #A4A9AD 31%, #FFFFFF 43%, #8D9093 57%, #DDE0E2 75%, #7B8085 100%. |
| 39 | Data | 7개의 typed JourneyNode: id, label, title, description 줄 배열, keywords 또는 meta, 기존 중심 좌표·width·height·compact. |
| 40 | 기존 Copy | FIGMA FIRST., FROM SCREEN TO WEB., 이전 Intro/NOW 및 구 AI 역할 제목·index·keyword 중복 제거. src 검색 확인. |
| 41 | AI Stack | 5개 panel 및 전용 3D CSS/data/hold/label 제거. 새 AI card의 4개 meta row로 통합. |
| 42 | Branch | 별도 branch geometry/trigger 0개. VISUAL TOOLS와 AI 모두 주 경로의 순차 노드. |
| 43 | Geometry | M 1개 + 연속 C 6개의 단일 `d`. Base/completed/active 3개 stroke가 정확히 같은 d를 공유. |
| 44 | Anchor | Card마다 논리 anchor 1개. 내부 side anchor는 최소 scale의 card edge 안으로 들어가도록 설정하여 크기 변화 중 틈을 방지. 앞·뒤 선이 Card 아래로 이어짐. |
| 45 | Colors | Base rgba(119,125,130,.18), completed rgba(212,229,239,.30), active rgba(24,109,229,.62). 강한 glow 없음. |
| 46 | Border | Anchor 도착 시 rgba(24,109,229,.55)까지 활성. 떠난 card는 원래 낮은 대비로 복원. |
| 47 | VISUAL TOOLS | 1440 브라우저에서 들어오는 경로가 border까지 닿고 Primary Border 활성 확인. 별도 곁가지 없음. |
| 48 | AI 연결 | BUILD → AI → STILL UPDATING 순차 연결. 4개 meta row 및 경로 연결 시각 확인. |
| 49 | 최종 Point | 5×5px Ice point 1개. 마지막 Card와 point 외곽 사이 실제 17.5px(중심 기준20px). 짧은 경로 연결, ring/pulse 없음. |
| 50 | Timeline Labels | fromFigmaToWeb, figmaDesign, visualTools, frontend, workflow, workingWithAi, stillUpdating. 위치 0 / .15 / .29 / .43 / .57 / .71 / .88. 각 구간의 65% 이동, 나머지 읽기 hold. |
| 51 | Pin Distance 전후 | 이전 Journey 독립 pin 8.6H → 통합 pin 안의 Journey 5.6H. 1080: 9288→6048px, 900: 7740→5040px, 768: 6604.8→4300.8px. 통합 pin 전체는 max(2H,loopWidth/.76)+.9H+5.6H. |
| 52 | 빈 Scroll | 제거된 AI panel의 빈 시간 제거. 마지막 hold는 STILL UPDATING을 읽는 구간이며 이후 바로 Contact 문서 흐름으로 이어짐. |

## CROWN — 53~62

| 번호 | 항목 | 구현·검수 결과 |
|---|---|---|
| 53 | Global Rotation | 기존 단일 page scroll listener를 재사용. 누적 scroll 위치×0.12deg를 별도 global layer에 적용. signed delta 적분과 같은 결과, reverse 대응. |
| 54 | Drag Rotation | Faces drag offset÷loopWidth×360deg를 별도 drag layer에 적용. Journey 진입 시 초기화하지 않음. |
| 55 | Interaction Layer | front-fx(scale/press) → front-spin(hover/cue) → global-rotation → drag-rotation → wheel. 회전이 서로 덮어쓰지 않음. |
| 56 | Journey | 1440 Journey에서 scrollY=12000일 때 global 1440deg. 이전 drag 회전 유지 확인. |
| 57 | Contact | 1024: Journey global838.64deg → Contact1343.5deg, Crown 좌표는 동일. |
| 58 | Cue | 첫 Faces 진입 시 760ms, 10deg→0, scale1.035→1. module session flag로 resize·reverse에도 반복하지 않음. |
| 59 | Hover | pointer cursor, scale1.04, y=-1.5px, dial15deg, brightness1.08. |
| 60 | Press | scale0.98, y=1px, brightness0.96, transition90ms. bounce 없음. |
| 61 | Focus | 실제 button, aria-label='모든 프로젝트 보기', 얇은 Ice focus ring. Hero/About는 비활성, front 전환 후 tabIndex=0. |
| 62 | ALL FACES | 클릭 후 App `open=true`, projects.length=3 확인. 임시 UI·Route·Case Study URL 없음. 최종 화면이 제공되면 이 상태에 연결 가능. |

## QA — 63~74

| 번호 | 항목 | 결과 |
|---|---|---|
| 63 | 1920×1080 | Hero/Watch/Header 크기 측정, Journey 활성 카드·경로 시각 확인, 7개 카드 내용 overflow 없음. |
| 64 | 1440×900 | Intro→Contact 전체 순방향/역방향 검수. About 2 Pair, Ice peak, 3개 Live URL, drag/transition lock, Journey7개, Crown 클릭 확인. |
| 65 | 1024×768 | 폰트 축소 적용, 7개 card overflow 없음, Journey 연결·Header 고정·Contact anchor·Crown 동일 좌표 확인. |
| 66 | 390×844 | pin0, Journey7개 document flow, 중앙선1개, 3개 프로젝트 native rail, Header 겹침 없음, Contact 도착 확인. AI 본문도 17.28px로 다른 카드와 일치. |
| 67 | Reduced Motion | 임시 로컬 fixture로 matchMedia의 reduced-motion 값과 change event를 주입하여 분기 검수. Static Faces3/Journey7, pin0, Faces WebGL 없음, Contact auto 이동 확인. ON→OFF→ON에서 pin0→2→0, canvas1→3→1, diagnostics cleanup 확인. OS 설정을 실제 변경한 검수는 아니며 fixture는 삭제함. |
| 68 | Horizontal Overflow | 4개 크기에서 document scrollWidth가 viewport를 초과하지 않음. Mobile Faces rail 내부의 의도된 수평 탐색은 유지. |
| 69 | Vertical Blank | AI stack 제거 후 빈 Journey stage 없음. Mobile cards 사이64px의 경로 간격 유지. Contact는 추후 디자인을 위한 최소 도착 section. |
| 70 | Duplicate / Cleanup | Desktop pin2(About + 통합 panels), Journey stage1, global Crown1. Static 전환 시 pin0, 다시 Desktop에서2. 삭제된 AI/branch trigger0. 등록한 pointer/link/refresh/frame callback 정리, StrictMode 개발 실행 확인. |
| 71 | Performance | Journey는 DOM+SVG+GSAP만 사용. Faces 완전 피복 시 running=false, reverse 시 재개. 새 WebGL Renderer·dependency 없음. |
| 72 | Console | 새로 연 localhost에서 앱 출처 error/warning 없음. Chrome 확장 `share-modal.js`의 addEventListener 오류1건은 별도 관찰됨. |
| 73 | lint | `npm.cmd run lint` exit0. |
| 74 | build | `npm.cmd run build` exit0. JS 약956.88KB/gzip281.29KB, 500KB chunk 크기 경고는 남음. |

## 남아 있는 디자인 판단

Hero의 기존 MANY FACES와 Watch 하단 일부 겹침은 유지되어 있습니다. 지정한 6.25% 글자 축소와 기존 Watch 위치 보존을 동시에 적용한 결과입니다. 따라서 ‘Text/Watch 겹침 0’까지 충족했다고 보고하지 않습니다. 겹침 제거를 우선하면 Watch 위치 조정이 필요하므로 사용자에게 우선순위를 질문했습니다.

Contact와 ALL FACES의 최종 시각 디자인은 최신 사용자 지시에 따라 이번 구현 범위에 포함하지 않았습니다.
