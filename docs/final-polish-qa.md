# Portfolio final polish — 구현 및 검수 기록

## 2026-09-29 이어서 작업 (FINAL POLISH + ALL FACES)

기준 코드: 원격 브랜치의 마지막 커밋 `c3beb2b contact 구현 2차, 디테일 수정`. 이전 VS Code 세션의 로컬 미커밋 변경은 이 작업 환경에 없었으므로 포함되지 않는다.
완료된 항목(G: PROJECTS 03, H: Contact 문장 / Watch 배치 / display 구조 / 이메일 주소)은 그대로 두고, 나머지만 이어서 구현했다. reset / checkout / revert / commit / push 없음.

| 항목 | 구현 | 브라우저 검수 |
|---|---|---|
| A. About → Faces | 첫 project F45(`preload=auto`로 첫 frame 확보). bloom은 display 자리만 `clip-path: path(evenodd)`로 뚫고, brightness는 About stage / Watch case / Crown에만 CSS filter, Faces canvas는 shader `uExposure`로 display 바깥(gallery · rim)에만 곱한다. display에는 유리 반사 한 줄(`.watch__display-glint`)만 지나간다. | 진입 구간 display slot 0 / active 0 확인. 노출 최대(p 0.45~0.62)에서 display가 뿌옇게 밝아지지 않고 주변만 밝아지는 것 스크린샷 비교. |
| B. Faces loop | 원본 TCHAIKIM은 0.67초 wide shot → close-up hard cut 편집이라 반복마다 두 번 끊겼다. 이어지는 close-up 한 컷 + 마지막 1초를 첫 1초로 smoothstep dissolve한 `tchaikim-faces-4x5-loop.mp4`(4.71초, 1.47MB)로 교체. 원본 파일은 그대로 둠. 코드의 video / VideoTexture reset 없음. | 인접 frame PSNR 최저 31.9dB(cut 없음), 이음매 29.2dB. 13초 동안 2회 loop, loadstart 1회(최초)뿐. |
| B. Live Link | display를 한 project가 55% 이상 차지하면(slot 오차 < 0.45) pointer + 그 project로 열림. rail 지연 < 2%, scroll 속도 < 1200px/s. pin 시작 지점에서 링크가 닫혀 있던 문제(`isActive`) 수정. href / aria-label은 display에 보이는 project를 따른다. 7px drag threshold 유지. | F45 / TCHAIKIM / JADUYA 각각 클릭 → 새 탭 요청 URL이 정확히 해당 사이트. 15px · 230px drag → 새 탭 0. |
| C. Crown | Outer Rim Electric Ice(#186DE5 1.5px + Ice 안쪽 반사 + glow, `--rim-glow`로 idle 1 / hover 1.9 / press 0.7 / cue 2.2). hover scale 1.045. 첫 도착 cue 1회(기존) 유지. ALL FACES 열림 동안 dial +22deg. | hover 스크린샷, ALL FACES 열림 시 `data-all-faces-open=true`. |
| D. Intro → Hero | 1.15초(`duration - 0.1 - 1.15`부터), 확대 0 → 0.9 sine.inOut, overlay keyframe 완만화, Hero 공개 0.76~1. Hero transform 없음, 완료 후 unmount. | video.currentTime 3.79s부터 확대 1 → 1.168, overlay 단조 증가, Hero transform none, Intro 제거 확인. |
| E. Faces → Journey | handoff 1.1H(110vh), scrub 1.15, 모든 tween sine ease, Faces scene 전체 scale 0.93 / opacity 0.3. Faces 재생 종료를 handoff 끝 + 0.25H로 늦춤(scrub 지연 중 정지 방지). | handoff 1.1H(1440×900에서 990px) 확인, 역방향 스크린샷. |
| F. Journey line | 한 path(M 1 + C 6). 옆 anchor에서 경로가 card 테두리 1px 안쪽을 따라 card 밑에 숨었다 나오던 것이 끊김의 원인 → 옆 card는 14단위 바깥을 스쳐 지나가는 세로 흐름으로 변경. active stroke `#D4E5EF`, 앞쪽 빛 조각(path-edge) 제거, 시작 / 끝 point 제거. 선은 scroll 진행률을 100ms smoothing으로만 따르고 card / camera(scrub 0.5)와 분리. | 6개 진행률 스크린샷: 선이 끊기지 않고 card 밖으로 보임. point 0, edge path 0, stroke rgb(212,229,239). |
| H. Contact | line-height 1.35, 이메일 = 복사 button(Copy → Check 1.2초, toast 없음, status 문구는 보조기술용). | 클립보드 값 `songmyeonghee0725@gmail.com`, 1.2초 뒤 원래 아이콘. 1920 / 1440 / 1024 / 390에서 1.35배. |
| I. Crown attach | 시간 기반 결합 tween 제거. progress 0.4 → 0.92에서 매 frame `getBoundingClientRect()`로 Crown 중심 → socket 중심 delta를 재서 sine.inOut 비율만큼 이동, 끝에서 속도 0으로 닿는다. Watch는 Crown 쪽으로 최대 10px 다가갔다 제자리. 회전 영향 1 → .7 → .35 → 0, 각도 reset 없음. | delta: 0.8에서 (0, -37.6) → 0.9에서 (0, -1.4) → 0.92 이후 (0, 0). 역방향에서 같은 값으로 분리. |
| J. Light Rays | React Bits LightRays(OGL, `ogl` 의존성 추가). 설정값 지정대로. 층: Carbon → Rays → mask → 문장 → Watch → Crown. 진입(top 75%) 때 opacity 0 → 0.5 1.4초. IntersectionObserver / RAF / context 정리, reduced motion은 정지 한 장. | opacity 0.5, canvas 생성, 모든 크기에서 오류 0. |
| K. Border | `--ui-border: #186DE5` 하나로 About / Journey card, Contact CTA, 문의 modal, Intro SKIP, Crown rim, ALL FACES card를 통일. 활성 / 비활성 차이가 필요한 곳은 같은 색의 투명도만 다르다. Watch titanium rim / shader는 변경 없음. | computed border 색 모두 rgb(24,109,229) 계열. |
| L. ALL FACES | 신규 `AllFaces`. 화면보다 큰 bounded 평면(1.6 × 1.6 뷰포트) 위 3개 project 비대칭 배치, drag(7px) + 관성(friction 0.935) + 경계 저항 / 복귀, wheel 이동, idle 부유(x ±6~10 / y ±8~14 / ±0.4~0.7deg), hover scale 1.025 · 나머지 0.55. 열림 약 0.84초(overlay, card opacity / scale .96 / offset), CLOSE × · ESC, page scroll 위치 유지, Tab 가두기, 닫으면 Crown으로 focus 복귀. project 선택은 `onProjectSelect(projectId)`까지만(App이 id만 기록). | 열기 / 관성(합성 pointer 입력으로 경계까지 미끄러짐) / rubber 복귀 / hover / 선택 기록 / ESC · CLOSE / scrollY 불변을 1920 · 1440 · 1024에서 확인. |
| M. QA | 1920×1080, 1440×900, 1024×768, 390×844, reduced motion. | pin 2 / 2 / 2 / 0 / 0, 가로 overflow 0, 앱 console error 0. `npm run lint` exit 0, `npm run build` 성공(500KB chunk 경고는 기존과 같음). |

### 검수 환경의 한계

- 이 작업 환경의 headless Chromium은 H.264를 재생하지 못해, 검수 때만 같은 영상을 WebM으로 바꿔 넣었다(저장소의 영상 파일은 그대로).
- GPU가 없어 WebGL이 SwiftShader로 약 1.5fps에서 돈다. 그래서 위치 / 상태 / 기하 / 순서는 확인했지만, 60fps에서의 움직임의 부드러움(scrub 느낌, 관성의 손맛, hover 전환)은 실제 브라우저에서 한 번 더 봐야 한다.
- Google Fonts가 차단되어 Anton / Inter / SUIT 대신 대체 글꼴로 렌더됐다. 390px Contact 제목이 잘려 보인 것은 대체 글꼴 폭 때문이며, 실제 글꼴에서의 줄바꿈은 확인하지 못했다.

---

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
