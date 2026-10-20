import { FACE_PROJECTS } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import NextFace, { type NextFaceProject } from './NextFace'
import F45Devices from './F45Devices'
import './F45CaseStudy.css'

const ASSETS = '/projects/f45'
const project = FACE_PROJECTS.find(face => face.id === 'f45')!

const screens = {
  why: { desktop: 'why-desktop', size: [1440, 2982], mobile: 'why-mobile', mobileSize: [390, 2589] },
  phase: { desktop: 'phase-desktop', size: [1440, 1022], mobile: 'phase-mobile', mobileSize: [390, 691] },
  location: { desktop: 'location-desktop', size: [1440, 1201], mobile: 'location-mobile', mobileSize: [390, 856] },
} as const

function Screen({ name, alt }: { name: keyof typeof screens; alt: string }) {
  const screen = screens[name]
  return (
    <picture className="f45-screen">
      <source media="(max-width: 700px)" srcSet={ASSETS + '/' + screen.mobile + '.webp'} width={screen.mobileSize[0]} height={screen.mobileSize[1]} />
      <img src={ASSETS + '/' + screen.desktop + '.webp'} alt={alt} width={screen.size[0]} height={screen.size[1]} loading="lazy" decoding="async" />
    </picture>
  )
}

function Heading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <header className="f45-section-heading"><p>{eyebrow}</p><h2 id={id}>{title}</h2></header>
}

function Hero() {
  return (
    <section className="f45-hero project-hero" data-case-hero aria-labelledby="f45-title">
      <img className="f45-hero__background" src={ASSETS + '/hero_frame_04_wide.jpg'} alt="" aria-hidden="true" />
      <span className="f45-hero__veil" aria-hidden="true" />
      <div className="f45-hero__visual"><F45Devices className="f45-hero__devices" fit /></div>
      <div className="f45-hero__copy">
        <p>시작하기 전의 망설임을,<br />함께 움직이는 확신으로</p>
        <h1 id="f45-title" tabIndex={-1}>F45<br />KOREA</h1>
      </div>
      <dl className="f45-hero__meta">
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
      <img src={ASSETS + '/hero_frame_04_wide.jpg'} alt="" aria-hidden="true" />
      <span aria-hidden="true" />
      <div className="f45-overview__copy">
        <p className="f45-eyebrow">Overview</p>
        <h2 id="f45-overview-title">FROM INTEREST TO THE FIRST STEP</h2>
        <p>강한 운동 이미지 너머, 처음 시작하는 사람이 알고 싶은 정보에 집중했습니다.<br className="f45-desktop-break" /> 브랜드 이해부터 프로그램 탐색, 지점 찾기와 체험 준비까지<br className="f45-desktop-break" /> 스스로 시작을 결정할 수 있는 웹 경험을 설계했습니다.</p>
        <p className="f45-overview__audience">PRIMARY 운동 초보자 · 가격 민감 사용자 <span aria-hidden="true">/</span> SECONDARY 운동 경험자 · F45 미경험자</p>
      </div>
    </section>
  )
}

const problems = [
  ['강한 운동 이미지로 인한', '초보자의 진입장벽'],
  ['프로그램 · 가격 정보 부족으로', '어려운 선택과 판단'],
  ['지점 탐색과 체험 신청 사이', '끊어진 다음 단계'],
]
const strategies = [
  ['입문자 케어 가이드로', '시작의 부담 완화'],
  ['프로그램 특징을', '이해하기 쉬운 정보로'],
  ['지점 찾기에서 앱 안내까지', '체험 준비 경로 연결'],
]

function CircleRow({ items, tone }: { items: string[][]; tone: 'before' | 'after' }) {
  return (
    <div className={'f45-problem__row f45-problem__row--' + tone}>
      {items.map((lines, index) => <article className="f45-problem__circle" key={lines[0]}><span>{String(index + 1).padStart(2, '0')}</span><p>{lines[0]}<br />{lines[1]}</p></article>)}
    </div>
  )
}

function ProblemStrategy() {
  return (
    <section className="f45-problem" aria-labelledby="f45-problem-title">
      <h2 id="f45-problem-title" className="f45-visually-hidden">PROBLEM &amp; STRATEGY</h2>
      <div className="f45-problem__group"><h3>As is</h3><CircleRow items={problems} tone="before" /></div>
      <div className="f45-problem__group f45-problem__group--after"><h3>To be</h3><CircleRow items={strategies} tone="after" /></div>
      <p className="f45-problem__note">Lean Product Canvas의 문제 정의를 바탕으로 케어 가이드와 지점·앱 연결을 우선했습니다.<br className="f45-desktop-break" /> 프로그램 소개는 구현했으며, 가격 상세·시간표·코치·후기는 후속 과제입니다.</p>
    </section>
  )
}

function Insight() {
  return (
    <section className="f45-insight" aria-labelledby="f45-insight-title">
      <span aria-hidden="true">F45</span>
      <h2 id="f45-insight-title">강함을 보여주는 것에서,<br /><strong>누구나 시작할 수 있다는 확신으로.</strong></h2>
    </section>
  )
}

const moodImages = [
  ['intro_k.jpg', '운동의 에너지를 보여주는 F45 브랜드 이미지'],
  ['intro_o.jpg', '45분 트레이닝의 시간과 리듬'],
  ['intro_r.jpg', '함께 응원하는 F45 커뮤니티'],
  ['intro_e.jpg', '첫 운동을 돕는 코치와의 소통'],
  ['hero_frame_03_wide.jpg', '실제 사이트에서 사용한 F45 트레이닝 비주얼'],
]

function BrandConcept() {
  return (
    <section className="f45-concept" aria-labelledby="f45-concept-title">
      <Heading eyebrow="BRAND CONCEPT" title="PLAYFUL COMMUNITY" id="f45-concept-title" />
      <div className="f45-concept__moodboard" aria-label="F45 브랜드 Moodboard">
        {moodImages.map(([name, alt], index) => <figure className={'f45-concept__image f45-concept__image--' + (index + 1)} key={name}><img src={ASSETS + '/' + name} alt={alt} width={index === 4 ? 1536 : 400} height={index === 4 ? 1200 : 400} loading="lazy" decoding="async" /></figure>)}
      </div>
      <div className="f45-concept__foundation">
        <p><strong>Montserrat</strong><span>Pretendard</span></p>
        <ul aria-label="브랜드 컬러"><li><i className="f45-swatch--dark" />Dark <span>#0A0913</span></li><li><i className="f45-swatch--teal" />Teal <span>#008BA3</span></li><li><i className="f45-swatch--purple" />Purple <span>#5B5CEB</span></li><li><i className="f45-swatch--light" />Light <span>#F8F9FA</span></li></ul>
      </div>
    </section>
  )
}

function MainExperience() {
  return (
    <section className="f45-main" aria-labelledby="f45-main-title">
      <img className="f45-main__ambient" src={ASSETS + '/hero_frame_03_wide.jpg'} alt="" aria-hidden="true" loading="lazy" />
      <Heading eyebrow="MAIN EXPERIENCE" title="브랜드의 차이를 이해하고, 나에게 맞는 운동을 발견하다." id="f45-main-title" />
      <div className="f45-main__scene">
        <figure className="f45-main__capture" aria-label="WHY F45 KOREA에서 PHASE로 이어지는 실제 웹사이트 화면">
          <Screen name="why" alt="KOREA의 다섯 글자를 브랜드의 다섯 장점으로 설명하는 WHY F45 KOREA" />
          <Screen name="phase" alt="프로그램별 특징을 가로 카드로 탐색하는 PHASE" />
        </figure>
        <img className="f45-main__frame" src={ASSETS + '/main-frame.png'} width="1448" height="1086" alt="" aria-hidden="true" loading="lazy" />
        <div className="f45-main__notes">
          <p className="f45-callout f45-callout--why"><span>01 / WHY F45 KOREA</span>트레이닝 · 시간 · 관계 · 코치 · 프로그램.<br className="f45-desktop-break" /> 사진과 짧은 설명으로<br className="f45-desktop-break" /> <strong>다섯 가지 차별성</strong>을 전달했습니다.</p>
          <p className="f45-callout f45-callout--phase"><span>02 / PHASE</span>프로그램의 성격을 먼저 보여주고,<br className="f45-desktop-break" /> <strong>가로 탐색</strong>으로 선택지를 연결했습니다.<br className="f45-desktop-break" /> 마우스 · 키보드 · 터치에 대응합니다.</p>
        </div>
      </div>
    </section>
  )
}

function UXExperience() {
  return (
    <section className="f45-ux" aria-labelledby="f45-ux-title">
      <Heading eyebrow="UX EXPERIENCE" title="가까운 지점에서, 첫 체험의 준비까지." id="f45-ux-title" />
      <div className="f45-ux__finder">
        <figure className="f45-ux__desktop"><img src={ASSETS + '/location-desktop.webp'} width="1440" height="1201" alt="도시 선택·지점명과 주소 검색·지점 목록을 함께 보여주는 데스크톱 화면" loading="lazy" decoding="async" /></figure>
        <figure className="f45-ux__phone f45-phone"><img src={ASSETS + '/location-mobile.webp'} width="390" height="856" alt="같은 지점을 탐색하는 모바일 화면" loading="lazy" decoding="async" /></figure>
        <div className="f45-ux__finder-notes"><p><span>01</span>지역 선택</p><p><span>02</span>이름·주소 검색</p><p><span>03</span>지점 정보 확인</p></div>
      </div>
      <p className="f45-footnote f45-ux__finder-note">지도는 참고 이미지이며, ‘주변 매장 찾기’는 전체 목록을 복원합니다. 위치 기반 검색·거리순 정렬은 후속 과제입니다.</p>
      <div className="f45-ux__care">
        <figure className="f45-ux__care-phone f45-phone"><img src={ASSETS + '/care-mobile.webp'} width="390" height="1298" alt="설문조사·준비물·식사·입장·강도·코치 케어를 안내하는 실제 모바일 웹 화면" loading="lazy" decoding="async" /></figure>
        <div className="f45-ux__care-copy"><p className="f45-eyebrow">BEGINNER CARE → APP GUIDE</p><h3>처음이라도,<br />준비할 수 있도록.</h3><p>설문조사 · 준비물 · 식사 · 입장 · 운동 강도 · 코치 케어.<br className="f45-desktop-break" /> 방문 전에 알아둘 여섯 가지를 먼저 안내합니다.</p><div className="f45-ux__app"><img src={ASSETS + '/phone01.png'} width="282" height="570" alt="원본 앱 가이드의 F45 앱 실행 화면" loading="lazy" /><span aria-hidden="true">→</span><img src={ASSETS + '/phone06.png'} width="282" height="570" alt="원본 앱 가이드의 외부 앱 예약 화면" loading="lazy" /></div><p className="f45-ux__app-steps">설치 → 지점 검색 → 인증 → 멤버십 → 체험권 이용</p><p className="f45-footnote">웹사이트는 첫 방문 정보와 앱 이용 절차를 안내합니다.<br className="f45-desktop-break" /> 실제 체험권 구매와 수업 예약은 외부 F45 앱에서 진행합니다.</p></div>
      </div>
    </section>
  )
}

function Evolution() {
  return (
    <section className="f45-evolution" aria-labelledby="f45-evolution-title">
      <Heading eyebrow="EVOLUTION" title="디자인을 웹으로, 웹을 더 나은 경험으로." id="f45-evolution-title" />
      <div className="f45-evolution__layout">
        <div className="f45-evolution__devices" aria-label="고도화한 F45의 데스크톱과 모바일 프로그램 탐색 화면">
          <div className="f45-evolution__desktop"><img className="f45-evolution__frame" src={ASSETS + '/evolution-frame.jpg'} width="760" height="634" alt="" aria-hidden="true" loading="lazy" /><div className="f45-evolution__screen"><img src={ASSETS + '/phase-desktop.webp'} width="1440" height="1022" alt="PC의 실제 PHASE 프로그램 탐색 화면" loading="lazy" /></div></div>
          <div className="f45-evolution__phone f45-phone"><img src={ASSETS + '/phase-mobile.webp'} width="390" height="691" alt="네이티브 가로 터치 탐색을 지원하는 모바일 PHASE" loading="lazy" /></div>
        </div>
        <div className="f45-evolution__story"><div><p className="f45-eyebrow">2026.07</p><h3>첫 개인 프로젝트의 출발.</h3><p>학원 정규 과정에서 웹 기획·UX/UI 디자인·최초 웹사이트 제작을 진행했습니다.</p></div><div><p className="f45-eyebrow">2026.08–09</p><h3>과정이 끝난 뒤,<br />독립적으로 고도화하다.</h3><p>실제 웹 환경에서 반응형·인터랙션·모바일 사용성을 스스로 검수하며 디자인과 기능을 추가 개선했습니다.</p><ul><li>PC 영상 / 모바일 이미지 구성 분리</li><li>PHASE·앱 안내의 터치·키보드 탐색 보완</li><li>Safari 가장자리 제스처와의 충돌 대응</li></ul></div><p className="f45-evolution__ai"><strong>WORKING WITH AI</strong>코드 구현과 오류 수정에는 AI 개발 도구의 도움을 받았습니다. 디자인 방향과 개선 우선순위, 실제 브라우저 검수와 최종 판단은 직접 맡았습니다.</p></div>
      </div>
      <p className="f45-footnote f45-evolution__note">Figma의 가격 위계·FAQ·주차 안내 피드백은 테스트 시안과 일자가 확인되지 않아 최종 배포 성과로 제시하지 않았습니다. 전환율이나 체험 신청 증가 수치도 주장하지 않습니다.</p>
    </section>
  )
}

function Result() {
  return (
    <section className="f45-result" aria-labelledby="f45-result-title">
      <img className="f45-result__background" src={ASSETS + '/hero_frame_05_wide.jpg'} width="1536" height="1200" alt="" aria-hidden="true" loading="lazy" />
      <span className="f45-result__veil" aria-hidden="true" />
      <div className="f45-result__visual"><F45Devices className="f45-result__devices" fit decorative /></div>
      <div className="f45-result__copy"><h2 id="f45-result-title">시작을 망설이는 순간부터,<br />함께 움직이는 경험까지.<br /><span>기획을 실제 웹으로<br />완성했습니다.</span></h2></div>
    </section>
  )
}

export default function F45CaseStudy({ onNavigate, nextProject }: { onNavigate?: ProjectNavigateHandler; nextProject?: NextFaceProject }) {
  return (
    <div className="f45-case-study project-case-study">
      <ProjectHeader onNavigate={onNavigate} faceId="f45" tone="light" />
      <main><Hero /><Overview /><ProblemStrategy /><Insight /><BrandConcept /><MainExperience /><UXExperience /><Evolution /><Result /></main>
      {nextProject && <NextFace project={nextProject} onNavigate={onNavigate} />}
      <FloatingDock liveUrl={project.liveUrl} />
    </div>
  )
}
