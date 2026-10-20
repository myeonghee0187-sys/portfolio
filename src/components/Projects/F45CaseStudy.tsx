import { FACE_PROJECTS } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import NextFace, { type NextFaceProject } from './NextFace'
import './F45CaseStudy.css'

const ASSETS = '/projects/f45'
const project = FACE_PROJECTS.find(face => face.id === 'f45')!
const screenSizes = {
  'why-desktop': [1440, 2982],
  'phase-desktop': [1440, 1022],
  'location-desktop': [1440, 1201],
  'care-mobile': [390, 1298],
} as const
const mobileScreens: Partial<Record<keyof typeof screenSizes, readonly [string, number, number]>> = {
  'phase-desktop': ['phase-mobile', 390, 691],
  'location-desktop': ['location-mobile', 390, 856],
}

function SectionLabel({ number, children }: { number: string; children: string }) {
  return <p className="f45-section-label"><span>{number}</span>{children}</p>
}

function Screen({ name, alt }: { name: keyof typeof screenSizes; alt: string }) {
  const [width, height] = screenSizes[name]
  const mobile = mobileScreens[name]
  return <picture className="f45-screen">
    {mobile && <source media="(max-width: 640px)" srcSet={`${ASSETS}/${mobile[0]}.webp`} width={mobile[1]} height={mobile[2]} />}
    <img className="f45-ui-image" src={`${ASSETS}/${name}.webp`} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
  </picture>
}

function F45Hero() {
  return (
    <section className="f45-hero project-hero" data-case-hero aria-labelledby="f45-title">
      <img className="f45-hero__background" src={`${ASSETS}/hero_frame_01_wide.jpg`} alt="" aria-hidden="true" />
      <div className="f45-hero__copy">
        <p>시작하기 전의 망설임을,<br />함께 움직이는 확신으로</p>
        <h1 id="f45-title" tabIndex={-1}>F45<br />KOREA</h1>
      </div>
      <div className="f45-hero__visual" aria-label="F45 KOREA 웹사이트의 데스크톱과 모바일 화면">
        <div className="f45-hero__browser">
          <div className="f45-browser-bar" aria-hidden="true"><i /><i /><i /><span>F45 KOREA</span></div>
          <img src={`${ASSETS}/main-desktop.webp`} alt="F45 KOREA 데스크톱 메인 첫 화면" fetchPriority="high" width="1440" height="1000" />
        </div>
        <div className="f45-hero__mobile"><img src={`${ASSETS}/main-mobile.webp`} alt="같은 사이트의 모바일 메인 첫 화면" width="390" height="844" /></div>
      </div>
      <dl className="f45-hero__meta">
        <div><dt>기간</dt><dd>2026.7 — 2026.9</dd></div>
        <div><dt>유형</dt><dd>RESPONSIVE WEB REDESIGN</dd></div>
        <div><dt>컨셉</dt><dd>Playful Community</dd></div>
      </dl>
    </section>
  )
}

function Overview() {
  return (
    <section className="f45-overview f45-section" aria-labelledby="f45-overview-title">
      <SectionLabel number="01">OVERVIEW</SectionLabel>
      <div className="f45-overview__grid">
        <h2 id="f45-overview-title">BEFORE<br />THE FIRST<br /><span>WORKOUT.</span></h2>
        <div className="f45-overview__copy">
          <p className="f45-lead">운동을 시작하기 전,<br />무엇을 알아야 결정할 수 있을까?</p>
          <p>강한 운동 이미지 뒤에 가려진 첫 방문의 궁금증에 주목했습니다. 브랜드와 프로그램을 이해하고, 가까운 지점을 살펴보고, 체험 준비와 앱 이용 방법까지 알아갈 수 있도록 웹 경험의 흐름을 정리했습니다.</p>
          <p>F45의 에너지는 유지하면서도, 처음 방문하는 사람이 스스로 시작을 판단할 수 있는 정보를 앞에 두었습니다.</p>
          <dl className="f45-overview__scope"><div><dt>QUESTION</dt><dd>체험 전의 불확실함</dd></div><div><dt>APPROACH</dt><dd>이해 → 탐색 → 준비</dd></div><div><dt>OUTPUT</dt><dd>반응형 브랜드 웹사이트</dd></div></dl>
        </div>
      </div>
    </section>
  )
}

const problems = [
  { title: '심리적 거리', before: '강한 운동 이미지가 먼저 보여, 초보자가 나에게 맞는 운동인지 판단하기 어렵다.', after: '함께하는 분위기와 첫 방문 안내로 시작의 부담을 낮춘다.' },
  { title: '정보의 빈자리', before: '프로그램과 비용 등 선택에 필요한 정보가 충분히 연결되지 않는다.', after: '프로그램의 성격을 먼저 설명하고, 체험 전 확인할 정보를 정리한다.' },
  { title: '끊어진 다음 단계', before: '브랜드 소개, 지점 탐색, 체험 신청 사이에서 다음 행동을 찾기 어렵다.', after: '지점 찾기부터 케어 가이드, 외부 앱 안내까지 이어지는 경로를 만든다.' },
]

function ProblemDefinition() {
  return (
    <section className="f45-problem f45-section f45-dark" aria-labelledby="f45-problem-title">
      <SectionLabel number="02">PROBLEM DEFINITION</SectionLabel>
      <div className="f45-section-intro"><h2 id="f45-problem-title">운동의 강도보다,<br />시작의 불확실함.</h2><p>Lean Product Canvas에서 정의한 문제를<br className="f45-desktop-break" /> 사용자가 결정하기 어려운 세 지점으로 묶었습니다.</p></div>
      <div className="f45-comparison" role="table" aria-label="기존 경험의 문제와 제안한 방향">
        <div className="f45-comparison__head" role="row"><span role="columnheader">DECISION BARRIER</span><span role="columnheader">AS IS</span><span role="columnheader">TO BE</span></div>
        {problems.map((item, index) => <div className="f45-comparison__row" role="row" key={item.title}><h3 role="rowheader"><span>0{index + 1}</span>{item.title}</h3><p role="cell"><span className="f45-mobile-label">AS IS</span>{item.before}</p><p role="cell"><span className="f45-mobile-label">TO BE</span>{item.after}</p></div>)}
      </div>
      <p className="f45-source-note">기획 단계의 문제 정의와 해결 방향입니다. 전환율 개선을 측정한 결과를 의미하지 않습니다.</p>
    </section>
  )
}

function TargetInsight() {
  return (
    <section className="f45-target f45-section" aria-labelledby="f45-target-title">
      <SectionLabel number="03">TARGET &amp; INSIGHT</SectionLabel>
      <div className="f45-section-intro"><h2 id="f45-target-title">다른 출발점,<br />같은 질문.</h2><p>가상의 개인 프로필 대신,<br className="f45-desktop-break" /> 기획서에서 정의한 두 사용자 그룹을 비교했습니다.</p></div>
      <div className="f45-target__grid">
        <article className="f45-target__primary"><p className="f45-mini-label">PRIMARY / 시작을 고민하는 사람</p><h3>“처음인 나도<br />따라갈 수 있을까?”</h3><div className="f45-target__detail"><img src={`${ASSETS}/intro_k.jpg`} alt="F45 원본 브랜드 이미지" loading="lazy" width="400" height="400" /><div><h4>운동 초보자 · 가격 민감 사용자</h4><p>강한 이미지에 부담을 느끼고, 시간과 비용에 비해 나에게 맞는 경험인지 먼저 확인하고 싶습니다.</p><p className="f45-target__need">NEED<span>수업 방식 · 준비물 · 첫 방문 안내</span></p></div></div></article>
        <article className="f45-target__secondary"><p className="f45-mini-label">SECONDARY / 새로운 운동을 찾는 사람</p><h3>“내가 해온 운동과<br />무엇이 다를까?”</h3><h4>운동 경험자 · F45 미경험자</h4><p>다른 운동과의 차별점, 프로그램의 구성, 함께하는 커뮤니티를 살펴본 뒤 선택하고 싶습니다.</p><p className="f45-target__need">NEED<span>프로그램의 성격 · 브랜드의 차이</span></p></article>
      </div>
      <div className="f45-insight"><span>KEY INSIGHT</span><p>강함을 증명하기 전에,<br /><strong>시작할 수 있다는 확신을.</strong></p></div>
    </section>
  )
}

function StrategyPriority() {
  return (
    <section className="f45-strategy f45-section" aria-labelledby="f45-strategy-title">
      <SectionLabel number="04">STRATEGY &amp; PRIORITY</SectionLabel>
      <div className="f45-section-intro"><h2 id="f45-strategy-title">더 많은 기능보다,<br />먼저 필요한 정보.</h2><p>기획서의 우선순위를 기준으로,<br className="f45-desktop-break" /> 체험 전의 판단과 다음 행동을 먼저 연결했습니다.</p></div>
      <div className="f45-priority-map">
        <div className="f45-priority-map__lane"><div className="f45-priority-map__label"><span>PRIMARY</span><p>시작을 돕는<br />핵심 경험</p></div><div className="f45-priority-map__items"><article><span>01</span><div><h3>입문자 케어 가이드</h3><p>방문 전 궁금증과 준비할 정보를 한곳에.</p><small>구현: 6개 항목의 사전 안내</small></div></article><article><span>02</span><div><h3>지점 탐색 → 모바일 앱 안내</h3><p>내가 갈 지점을 찾고, 체험을 위한 다음 단계로.</p><small>구현: 지점 필터 · 기본 상세 · 앱 이용 안내</small></div></article></div></div>
        <div className="f45-priority-map__lane f45-priority-map__lane--secondary"><div className="f45-priority-map__label"><span>SECONDARY</span><p>판단을 넓히는<br />확장 정보</p></div><div className="f45-priority-map__items"><article><span>03</span><div><h3>가격 · 프로그램 정보</h3><p>비용과 운동의 성격을 비교할 수 있도록.</p><small>프로그램 소개 구현 / 가격 정보는 후속 과제</small></div></article><article><span>04</span><div><h3>지점별 시간표 · 코치 · 후기</h3><p>각 지점의 실제 운영 정보로 선택을 구체화.</p><small>기획 범위 / 현재 배포 사이트에는 미구현</small></div></article></div></div>
      </div>
    </section>
  )
}

const flow = [
  ['BRAND', '브랜드 이해', 'WHY F45 KOREA'], ['PROGRAM', '프로그램 탐색', 'PHASE'], ['LOCATION', '지점 찾기', 'LOCATION FINDER'], ['PREPARATION', '첫 방문 준비', 'BEGINNER CARE'], ['MOBILE APP', '앱 이용 안내', 'APP GUIDE'],
]

function UXStructure() {
  return (
    <section className="f45-flow f45-section f45-dark" aria-labelledby="f45-flow-title">
      <SectionLabel number="05">UX STRUCTURE</SectionLabel>
      <div className="f45-section-intro"><h2 id="f45-flow-title">이해에서 탐색으로,<br />탐색에서 준비로.</h2><p>사용자의 질문에 답하는 순서가<br className="f45-desktop-break" /> 웹사이트의 정보 구조가 되었습니다.</p></div>
      <ol className="f45-flow__steps" aria-label="브랜드 이해부터 앱 안내까지의 사용자 흐름">{flow.map(([english, title, screen], index) => <li key={english}><span className="f45-flow__index">0{index + 1}</span><p>{english}</p><h3>{title}</h3><span>{screen}</span></li>)}</ol>
      <div className="f45-flow__handoff"><p>WEB EXPERIENCE<span>체험을 판단하는 정보와 준비 과정</span></p><span className="f45-flow__arrow" aria-hidden="true">→</span><p>EXTERNAL F45 APP<span>설치 후 체험권 구매 · 수업 예약</span></p></div>
    </section>
  )
}

function DesignDirection() {
  return (
    <section className="f45-direction f45-section" aria-labelledby="f45-direction-title">
      <SectionLabel number="06">DESIGN DIRECTION</SectionLabel>
      <h2 id="f45-direction-title">PLAYFUL<br /><span>COMMUNITY.</span></h2>
      <div className="f45-direction__grid"><div className="f45-direction__type"><p className="f45-mini-label">TYPOGRAPHY</p><p>Montserrat<span>Pretendard</span></p><p className="f45-direction__explanation">명확한 영문 제목과 편안한 국문 설명.<br />운동의 에너지와 정보의 가독성을 함께 전달합니다.</p></div><div className="f45-direction__image"><img src={`${ASSETS}/hero_frame_04_wide.jpg`} alt="함께 웃는 F45 팀을 보여주는 원본 브랜드 비주얼" loading="lazy" width="1536" height="1200" /><p>경쟁의 강도보다, 함께하는 분위기를 보여주는 이미지.</p></div></div>
      <div className="f45-palette" aria-label="F45 Moodboard 컬러"><div><span>01 / DARK</span><strong>#0A0913</strong></div><div><span>02 / TEAL</span><strong>#008BA3</strong></div><div><span>03 / PURPLE</span><strong>#5B5CEB</strong></div><div><span>04 / LIGHT</span><strong>#F8F9FA</strong></div></div>
    </section>
  )
}

function ApplicationCopy({ number, title, problem, decision }: { number: string; title: string; problem: string; decision: string }) {
  return <div className="f45-application-copy"><p className="f45-mini-label">DESIGN APPLICATION / {number}</p><h3>{title}</h3><dl><div><dt>PROBLEM</dt><dd>{problem}</dd></div><div><dt>DECISION</dt><dd>{decision}</dd></div></dl></div>
}

function DesignApplication() {
  return (
    <section className="f45-application" aria-labelledby="f45-application-title">
      <div className="f45-section f45-application__heading"><SectionLabel number="07">DESIGN APPLICATION</SectionLabel><h2 id="f45-application-title">생각을,<br /><span>실제 화면으로.</span></h2><p>문제 정의에서 출발한 네 가지 경험.<br />아래 화면은 실제 배포 사이트와 원본 에셋을 사용했습니다.</p></div>
      <article className="f45-application__why f45-section">
        <ApplicationCopy number="01" title="WHY F45 KOREA" problem="운동의 강한 인상만으로는 나와의 적합성을 판단하기 어렵습니다." decision="KOREA의 다섯 글자를 트레이닝, 시간, 관계, 코치, 프로그램의 다섯 장점으로 연결했습니다." />
        <figure><Screen name="why-desktop" alt="다섯 가지 브랜드 장점을 이미지와 번갈아 배치한 실제 WHY F45 KOREA 화면" /><figcaption>브랜드의 차이를 사진과 짧은 설명으로 읽는 구조</figcaption></figure>
      </article>
      <article className="f45-application__phase f45-section f45-dark">
        <ApplicationCopy number="02" title="PHASE" problem="프로그램 이름만으로는 어떤 운동을 경험하게 될지 알기 어렵습니다." decision="카드마다 프로그램의 성격을 짧게 설명하고, 가로 탐색으로 여러 선택지를 연결했습니다." />
        <figure><Screen name="phase-desktop" alt="서로 다른 프로그램을 가로 카드로 탐색하는 실제 PHASE 화면" /><figcaption>마우스 · 키보드 · 모바일 가로 스크롤로 프로그램 탐색</figcaption></figure>
      </article>
      <article className="f45-application__location f45-section">
        <ApplicationCopy number="03" title="LOCATION FINDER" problem="관심이 생겨도 방문할 지점과 연락 정보를 바로 찾기 어렵습니다." decision="도시와 지점명·주소로 목록을 좁히고, 기본 상세 정보로 이어지는 경로를 만들었습니다." />
        <figure><Screen name="location-desktop" alt="도시 선택, 이름·주소 검색, 지점 목록과 참고 지도 이미지가 있는 실제 화면" /><figcaption>목록 필터와 기본 지점 상세를 제공하며, 지도는 참고 이미지입니다.</figcaption></figure>
        <p className="f45-application__boundary">현재 ‘주변 매장 찾기’는 전체 목록을 복원합니다. 실제 위치 기반 탐색과 거리순 정렬은 후속 개선 과제입니다.</p>
      </article>
      <article className="f45-application__care f45-section">
        <ApplicationCopy number="04" title="BEGINNER CARE / APP GUIDE" problem="처음 방문할 때의 준비와 앱에서 체험을 시작하는 방법이 낯설 수 있습니다." decision="첫 방문 안내를 6개 항목으로 정리하고, 별도의 6단계 앱 가이드로 다음 행동을 설명했습니다." />
        <div className="f45-care-composition"><figure className="f45-care-composition__guide"><Screen name="care-mobile" alt="설문조사, 준비물, 식사, 입장, 강도, 코치 케어를 안내하는 실제 모바일 웹 화면" /><figcaption>첫 방문 전, 확인할 정보를 순서대로.</figcaption></figure><div className="f45-care-composition__app"><p className="f45-mini-label">WEB → APP</p><h4>이어서 시작하는 방법까지.</h4><div><img src={`${ASSETS}/phone01.png`} alt="원본 가이드의 F45 앱 실행 화면" loading="lazy" width="282" height="570" /><span aria-hidden="true">→</span><img src={`${ASSETS}/phone06.png`} alt="원본 가이드의 외부 F45 앱 예약 화면" loading="lazy" width="282" height="570" /></div><p>설치 → 지점 검색 → 인증 → 멤버십 → 크레딧 구매 → 예약</p><p className="f45-source-note">F45 원본 가이드에 포함된 외부 앱 화면입니다. 웹사이트는 이용 방법과 스토어 링크를 안내합니다.</p></div></div>
      </article>
    </section>
  )
}

const validation = [
  { label: 'DESIGN NOTES', title: '피드백을 읽고, 적용 범위를 구분하다.', body: 'Figma 메모에는 모바일 가격 위계, FAQ 행간, 주차 안내의 굵기 등에 관한 의견이 남아 있습니다.', detail: '테스트 일자와 대상 시안이 확인되지 않아, 최종 배포 성과나 개선 완료 수치로 제시하지 않았습니다.' },
  { label: 'IMPLEMENTATION', title: '화면 크기보다, 사용하는 방식에 맞추다.', body: '원본 구현은 데스크톱의 영상과 모바일 이미지 구성을 나누고, PHASE와 앱 안내에 터치·키보드 탐색을 지원합니다.', detail: 'Safari 가장자리 제스처와 충돌하지 않도록 둔 터치 처리도 확인했습니다. 물리 기기 검증 결과를 의미하지 않습니다.' },
  { label: 'NEXT ITERATION', title: '남아 있는 불확실함을 다음 과제로.', body: '실제 위치 기반 지점 탐색, 가격, 시간표, 코치와 후기 정보를 다음 개선 대상으로 남겼습니다.', detail: '원본 기획의 가설은 유지하되, 전환율이나 체험 신청 증가를 측정한 성과는 주장하지 않습니다.' },
]

function Validation() {
  return (
    <section className="f45-validation f45-section f45-dark" aria-labelledby="f45-validation-title">
      <SectionLabel number="08">VALIDATION &amp; IMPROVEMENT</SectionLabel>
      <div className="f45-section-intro"><h2 id="f45-validation-title">설계한 것,<br />확인한 것,<br /><span>다음에 검증할 것.</span></h2><p>기획의 의도, 구현의 사실,<br className="f45-desktop-break" /> 검증이 필요한 가설을 구분합니다.</p></div>
      <div className="f45-validation__list">{validation.map((item, index) => <article key={item.label}><p><span>0{index + 1}</span>{item.label}</p><div><h3>{item.title}</h3><p>{item.body}</p><p className="f45-validation__detail">{item.detail}</p></div></article>)}</div>
    </section>
  )
}

function Ending() {
  return (
    <section className="f45-ending" aria-labelledby="f45-ending-title">
      <div className="f45-ending__copy"><p className="f45-mini-label">FROM UNCERTAINTY TO THE FIRST STEP</p><h2 id="f45-ending-title">시작하기 전의<br />망설임을 줄이고,<br /><span>함께 움직이는 경험으로.</span></h2><p>브랜드를 이해하는 순간부터 첫 방문을 준비하는 순간까지.<br className="f45-desktop-break" /> 체험을 결정할 수 있는 정보의 흐름을 만들었습니다.</p></div>
      <img src={`${ASSETS}/hero_frame_05_wide.jpg`} alt="F45 스튜디오에서 함께하는 팀의 원본 대표 이미지" loading="lazy" width="1536" height="1200" />
    </section>
  )
}

export default function F45CaseStudy({ onNavigate, nextProject }: { onNavigate?: ProjectNavigateHandler; nextProject?: NextFaceProject }) {
  return (
    <div className="f45-case-study project-case-study">
      <ProjectHeader onNavigate={onNavigate} faceId="f45" tone="light" />
      <main><F45Hero /><Overview /><ProblemDefinition /><TargetInsight /><StrategyPriority /><UXStructure /><DesignDirection /><DesignApplication /><Validation /><Ending /></main>
      {nextProject && <NextFace project={nextProject} onNavigate={onNavigate} />}
      <FloatingDock liveUrl={project.liveUrl} />
    </div>
  )
}
