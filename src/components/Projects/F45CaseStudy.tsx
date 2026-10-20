import { FACE_PROJECTS } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import NextFace, { type NextFaceProject } from './NextFace'
import F45Devices from './F45Devices'
import './F45CaseStudy.css'

const ASSETS = '/projects/f45'
const project = FACE_PROJECTS.find(face => face.id === 'f45')!

function Heading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <header className="f45-section-heading"><p className="f45-eyebrow" lang="en">{eyebrow}</p><h2 id={id}>{title}</h2></header>
}

function Hero() {
  return (
    <section className="f45-hero project-hero" data-case-hero aria-labelledby="f45-title">
      <img className="f45-hero__background" src={ASSETS + '/hero_frame_03_wide.jpg'} width="1536" height="1200" alt="" aria-hidden="true" />
      <span className="f45-hero__veil" aria-hidden="true" />
      <div className="f45-hero__visual"><F45Devices className="f45-hero__devices" fit /></div>
      <div className="f45-hero__copy">
        <p>시작하기 전의 망설임을,<br />함께 움직이는 확신으로</p>
        <h1 id="f45-title" lang="en" tabIndex={-1}>F45<br />KOREA</h1>
      </div>
      <dl className="f45-hero__meta" lang="en">
        <div><dt>PERIOD</dt><dd>2026.07</dd></div>
        <div><dt>MY ROLE</dt><dd>WEB PLANNING · UX/UI DESIGN · FRONT-END IMPLEMENTATION</dd></div>
        <div><dt>CONTRIBUTION</dt><dd>100% (PERSONAL PROJECT)</dd></div>
      </dl>
    </section>
  )
}

function Overview() {
  return (
    <section className="f45-overview" aria-labelledby="f45-overview-title">
      <p className="f45-eyebrow" lang="en">OVERVIEW</p>
      <h2 id="f45-overview-title" lang="en"><span>UNDERSTAND</span><i aria-hidden="true">↗</i><span>EXPLORE</span><i aria-hidden="true">↗</i><span>START</span></h2>
      <p className="f45-overview__summary">처음의 궁금함을,<br /><strong>시작할 수 있는 정보로.</strong></p>
      <p className="f45-overview__body">브랜드와 프로그램을 이해하고, 가까운 지점을 찾고, 첫 체험을 준비하기까지.<br className="f45-desktop-break" /> 강한 운동 이미지 너머, 처음 시작하는 사람이 스스로 결정할 수 있는 웹 경험을 설계했습니다.</p>
      <p className="f45-overview__audience"><span lang="en">PRIMARY</span> 운동 초보자 · 가격 민감 사용자 <b aria-hidden="true">/</b> <span lang="en">SECONDARY</span> 운동 경험자 · <span lang="en">F45</span> 미경험자</p>
    </section>
  )
}

const strategies = [
  { before: <>운동 초보자의<br />높은 진입장벽</>, after: <>입문자 케어 가이드로<br />시작의 부담 완화</> },
  { before: <>프로그램·가격 정보 부족으로<br />어려운 선택과 판단</>, after: <>프로그램 특징을<br />이해하기 쉬운 정보로</> },
  { before: <>지점 탐색과 체험 신청 사이<br />끊어진 다음 단계</>, after: <>지점 찾기부터 앱 안내까지<br />체험 준비 경로 연결</> },
]

function ProblemStrategy() {
  return (
    <section className="f45-problem" aria-labelledby="f45-problem-title">
      <Heading eyebrow="PROBLEM & STRATEGY" title="망설임을 줄이는 세 가지 설계." id="f45-problem-title" />
      <div className="f45-problem__comparison">
        <div className="f45-problem__labels" lang="en"><h3>AS-IS</h3><h3>TO-BE <span aria-hidden="true">↗</span></h3></div>
        {strategies.map(({ before, after }, i) => <div className="f45-problem__pair" key={i}>
          <article className="f45-problem__before"><span lang="en">0{i + 1}</span><p><em className="f45-problem__mobile-label" lang="en">AS-IS</em>{before}</p></article>
          <article className="f45-problem__after"><span lang="en">0{i + 1}</span><p><em className="f45-problem__mobile-label" lang="en">TO-BE</em>{after}</p></article>
        </div>)}
      </div>
      <p className="f45-footnote f45-problem__note">기획에서 발견한 문제를 케어 가이드·프로그램 소개·지점과 앱의 연결로 풀었습니다.<br className="f45-desktop-break" /> 가격 상세·시간표·코치·후기는 후속 과제입니다.</p>
    </section>
  )
}

function Insight() {
  return (
    <section className="f45-insight" aria-labelledby="f45-insight-title">
      <p className="f45-eyebrow" lang="en">KEY INSIGHT</p>
      <h2 id="f45-insight-title">강함을 보여주는 것에서,<br />누구나 시작할 수 있다는 확신으로.</h2>
    </section>
  )
}

const moodImages = [
  { file: 'hero_frame_03_wide.jpg', label: '01 / TRAINING', alt: '배틀로프를 함께 움직이는 F45 트레이닝', width: 1536, height: 1200 },
  { file: 'intro_r.jpg', label: '02 / TEAMWORK', alt: '하이파이브로 서로를 응원하는 팀', width: 400, height: 400 },
  { file: 'intro_e.jpg', label: '03 / COACHING', alt: '첫 운동을 돕는 코치와의 대화', width: 400, height: 400 },
  { file: 'hero_frame_04_wide.jpg', label: '04 / COMMUNITY', alt: '함께 운동한 뒤 웃는 F45 커뮤니티', width: 1536, height: 1200 },
]

function BrandConcept() {
  return (
    <section className="f45-concept" aria-labelledby="f45-concept-title">
      <header className="f45-concept__heading"><p className="f45-eyebrow" lang="en">BRAND CONCEPT</p><h2 id="f45-concept-title" lang="en">PLAYFUL<br /><span>COMMUNITY</span></h2><p>혼자 버티는 운동에서,<br />함께 즐기는 움직임으로.</p></header>
      <div className="f45-concept__moodboard" aria-label="트레이닝·팀워크·코칭·커뮤니티를 담은 F45 브랜드 Moodboard">
        {moodImages.map(({ file, label, alt, width, height }, i) => <figure className={'f45-concept__image f45-concept__image--' + (i + 1)} key={file}><img src={ASSETS + '/' + file} alt={alt} width={width} height={height} loading="lazy" decoding="async" /><figcaption lang="en">{label}</figcaption></figure>)}
      </div>
      <div className="f45-concept__foundation">
        <div><p className="f45-eyebrow" lang="en">CASE STUDY DESIGN SYSTEM</p><p className="f45-footnote">상세페이지의 표현 시스템입니다.<br />실제 웹 화면의 서체와 색상은 원본을 유지했습니다.</p></div>
        <p className="f45-concept__type"><span>함께 움직이다 <small lang="en">Wanted Sans / KO</small></span><span lang="en">MOVE TOGETHER <small>Inter / EN · 012345</small></span></p>
        <ul aria-label="F45 포인트 컬러" lang="en"><li><i className="f45-swatch--teal" /><span>TEAL<small>#008BA3</small></span></li><li><i className="f45-swatch--purple" /><span>PURPLE<small>#5B5CEB</small></span></li></ul>
      </div>
    </section>
  )
}

function MainExperience() {
  return (
    <section className="f45-main" aria-labelledby="f45-main-title">
      <Heading eyebrow="MAIN EXPERIENCE" title="이해에서 발견으로." id="f45-main-title" />
      <div className="f45-main__why">
        <div className="f45-main__why-copy"><p className="f45-eyebrow" lang="en">01 / WHY F45 KOREA</p><h3>다섯 가지 이유로,<br />브랜드를 이해하다.</h3><p>사진과 짧은 설명을 짝지어<br />브랜드의 차이를 구체적으로 전달했습니다.</p><ol lang="en"><li><b>K</b><span>KINETIC<small>움직임에 집중하는 트레이닝</small></span></li><li><b>O</b><span>OPTIMIZED 45<small>45분에 담은 효율</small></span></li><li><b>R</b><span>RELATIONSHIPS<small>함께 만드는 관계</small></span></li><li><b>E</b><span>EXPERT COACHES<small>전문 코치의 가이드</small></span></li><li><b>A</b><span>ADAPTIVE PROGRAMS<small>다양한 프로그램 구성</small></span></li></ol></div>
        <figure className="f45-main__why-screen"><picture><source media="(max-width: 700px)" srcSet={ASSETS + '/why-mobile.webp'} width="390" height="2589" /><img src={ASSETS + '/why-desktop.webp'} width="1440" height="2982" alt="브랜드의 다섯 가지 장점을 사진과 설명으로 구성한 실제 WHY F45 KOREA 반응형 화면" loading="lazy" decoding="async" /></picture><figcaption>실제 웹사이트 화면 · <span lang="en">WHY F45 KOREA</span><span className="f45-main__mobile-caption"> · 모바일 상단</span></figcaption></figure>
      </div>
      <div className="f45-main__phase">
        <div className="f45-main__phase-copy"><div><p className="f45-eyebrow" lang="en">02 / PHASE</p><h3>나에게 맞는 운동을,<br />가로로 탐색하다.</h3></div><p>프로그램의 사진·이름·특징을 한눈에.<br />마우스·키보드·터치로 이어지는 탐색을 구성했습니다.</p></div>
        <figure className="f45-main__phase-screen"><picture><source media="(max-width: 700px)" srcSet={ASSETS + '/phase-mobile.webp'} width="390" height="691" /><img src={ASSETS + '/phase-desktop.webp'} width="1440" height="1022" alt="여러 프로그램 카드와 가로 탐색 컨트롤이 보이는 실제 PHASE 화면" loading="lazy" decoding="async" /></picture><figcaption>실제 웹사이트 화면 · <span lang="en">PHASE</span></figcaption></figure>
      </div>
    </section>
  )
}

const careItems = ['설문조사', '준비물', '식사', '입장', '운동 강도', '코치 케어']

function UXExperience() {
  return (
    <section className="f45-ux" aria-labelledby="f45-ux-title">
      <Heading eyebrow="UX EXPERIENCE" title="가까운 지점에서, 첫 체험의 준비까지." id="f45-ux-title" />
      <div className="f45-ux__location">
        <div className="f45-ux__intro"><p className="f45-eyebrow" lang="en">01 / LOCATION FINDER</p><h3>가고 싶은 지점을<br />쉽게 찾도록.</h3><ol><li><span lang="en">01</span> 지역 선택</li><li><span lang="en">02</span> 지점명·주소 검색</li><li><span lang="en">03</span> 지점 정보 확인</li></ol></div>
        <div className="f45-ux__finder"><figure className="f45-ux__desktop"><img src={ASSETS + '/location-desktop.webp'} width="1440" height="1201" alt="도시 선택·지점명과 주소 검색·지점 목록을 함께 보여주는 데스크톱 화면" loading="lazy" decoding="async" /></figure><figure className="f45-ux__phone f45-phone"><img src={ASSETS + '/location-mobile.webp'} width="390" height="856" alt="동일한 지점 검색을 제공하는 모바일 화면" loading="lazy" decoding="async" /></figure></div>
        <p className="f45-footnote">지도는 참고 이미지이며, ‘주변 매장 찾기’는 전체 목록을 복원합니다.<br />위치 기반 검색·거리순 정렬은 후속 과제입니다.</p>
      </div>
      <div className="f45-ux__care">
        <figure className="f45-ux__care-phone f45-phone"><img src={ASSETS + '/care-mobile.webp'} width="390" height="1298" alt="설문조사·준비물·식사·입장·강도·코치 케어를 안내하는 실제 모바일 웹 화면" loading="lazy" decoding="async" /></figure>
        <div className="f45-ux__care-copy"><p className="f45-eyebrow" lang="en">02 / BEGINNER CARE</p><h3>처음이라도,<br />준비할 수 있도록.</h3><p>방문 전에 알아둘 여섯 가지.<br />낯선 첫 수업의 부담을 정보로 덜었습니다.</p><ol>{careItems.map((item, i) => <li key={item}><span lang="en">0{i + 1}</span>{item}</li>)}</ol></div>
      </div>
      <div className="f45-ux__app-guide">
        <div className="f45-ux__app-copy"><p className="f45-eyebrow" lang="en">03 / APP GUIDE</p><h3>웹에서 알아보고,<br />앱에서 시작하다.</h3><p>앱 설치부터 체험권 이용까지,<br />다음 행동을 순서대로 안내했습니다.</p><ol>{['앱 설치', '지점 검색', '인증', '멤버십', '체험권 이용'].map((step, i) => <li key={step}><span lang="en">0{i + 1}</span>{step}</li>)}</ol><p className="f45-footnote">실제 체험권 구매와 수업 예약은<br />외부 <span lang="en">F45</span> 앱에서 진행합니다.</p></div>
        <figure className="f45-ux__app"><img src={ASSETS + '/phone01.png'} width="282" height="570" alt="원본 앱 가이드의 F45 앱 실행 화면" loading="lazy" /><span aria-hidden="true">→</span><img src={ASSETS + '/phone06.png'} width="282" height="570" alt="원본 앱 가이드의 외부 앱 예약 화면" loading="lazy" /></figure>
      </div>
    </section>
  )
}

function Result() {
  return (
    <section className="f45-result" aria-labelledby="f45-result-title">
      <img className="f45-result__background" src={ASSETS + '/hero_frame_05_wide.jpg'} width="1536" height="1200" alt="" aria-hidden="true" loading="lazy" />
      <span className="f45-result__veil" aria-hidden="true" />
      <div className="f45-result__visual"><F45Devices className="f45-result__devices" fit decorative /></div>
      <div className="f45-result__copy"><p className="f45-eyebrow" lang="en">RESULT / F45 KOREA</p><h2 id="f45-result-title">망설임을 넘어,<br />함께 움직이는<br />경험으로.</h2><p>기획과 디자인을<br />실제 반응형 웹으로 완성했습니다.</p></div>
    </section>
  )
}

export default function F45CaseStudy({ onNavigate, nextProject }: { onNavigate?: ProjectNavigateHandler; nextProject?: NextFaceProject }) {
  return (
    <div className="f45-case-study project-case-study">
      <ProjectHeader onNavigate={onNavigate} faceId="f45" />
      <main><Hero /><Overview /><ProblemStrategy /><Insight /><BrandConcept /><MainExperience /><UXExperience /><Result /></main>
      {nextProject && <NextFace project={nextProject} onNavigate={onNavigate} />}
      <FloatingDock liveUrl={project.liveUrl} />
    </div>
  )
}
