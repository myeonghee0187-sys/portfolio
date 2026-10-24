import { FACE_PROJECTS } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import NextFace, { type NextFaceProject } from './NextFace'
import './F45CaseStudy.css'
import { F45MainPageOne, F45MainPageTwo } from './F45MainPages'
import F45ResponsiveExperience from './F45ResponsiveExperience'
import F45Ending from './F45Ending'

const ASSETS = '/projects/f45'
const project = FACE_PROJECTS.find(face => face.id === 'f45')!

function Hero() {
  return (
    <section className="f45-hero project-hero" data-case-hero data-figma-node="79:987" aria-labelledby="f45-title">
      <img className="f45-hero__background" src={ASSETS + '/figma-hero-background.png'} width="1024" height="1024" alt="" aria-hidden="true" />
      <div className="f45-hero__overlay" aria-hidden="true" />
      <div className="f45-hero__copy">
        <p className="f45-hero__kicker">강렬함은 그대로, 시작은 더 가깝게</p>
        <h1 id="f45-title" lang="en" tabIndex={-1}><span>F45</span><span>KOREA</span></h1>
      </div>
      <dl className="f45-hero__meta">
        <div><dt>기간</dt><dd lang="en">2026.7</dd></div>
        <div><dt>역할</dt><dd lang="en">WEB PLANNING · UX/UI DESIGN · FRONT-END IMPLEMENTATION</dd></div>
        <div><dt>기여도</dt><dd lang="en">100% (PERSONAL PROJECT)</dd></div>
      </dl>
      <img className="f45-hero__devices" src={ASSETS + '/figma-hero-devices.png'} width="3200" height="2400" alt="실제 Figma에 배치된 F45 웹사이트의 데스크톱·태블릿·아이폰 목업" />
    </section>
  )
}

function Overview() {
  return (
    <section className="f45-overview" data-figma-node="79:988" aria-labelledby="f45-overview-title">
      <img className="f45-overview__background" src={ASSETS + '/figma-overview-background.png'} width="1024" height="1024" alt="" aria-hidden="true" loading="lazy" />
      <div className="f45-overview__overlay" aria-hidden="true" />
      <div className="f45-overview__copy">
        <header><p lang="en">Overview</p><h2 id="f45-overview-title">운동의 매력을 알아가는 순간부터, 첫 체험을 준비하는 과정까지</h2></header>
        <p className="f45-overview__body"><span><span lang="en">F45</span>의 역동적인 브랜드 이미지는 강한 인상을 남기지만,</span><span>처음 접하는 사용자에게는 운동 방식과 체험 과정이 낯설게 느껴질 수 있습니다.</span><span>이에 브랜드의 에너지는 유지하면서도 프로그램 이해부터 지점 탐색,</span><span>첫 방문 준비까지 자연스럽게 이어지는 웹 경험을 설계했습니다.</span></p>
      </div>
    </section>
  )
}

const solutions = [
  { before: '첫 운동에 대한 막연한 부담', after: '첫 방문을 위한 사전 안내', beforeNode: '2128:190', afterNode: '2128:205' },
  { before: '프로그램에 대한 이해 부족', after: '프로그램 정보의 직관적 전달', beforeNode: '2128:194', afterNode: '2128:209' },
  { before: '분리된 체험 준비 과정', after: '체험 준비 과정의 연결', beforeNode: '2128:198', afterNode: '2128:213' },
]

function ProblemStrategy() {
  return (
    <section className="f45-problem" data-figma-node="79:989" aria-labelledby="f45-problem-title">
      <div className="f45-problem__panel">
        <h2 id="f45-problem-title">첫 운동의 불확실함을 줄이고,<br />이해부터 준비까지 이어지는 경험을 설계했습니다.</h2>
        <div className="f45-problem__diagram">
          <h3 className="f45-problem__row-label f45-problem__row-label--before" lang="en">As is</h3>
          <h3 className="f45-problem__row-label f45-problem__row-label--after" lang="en">To be</h3>
          <div className="f45-problem__pairs">
            {solutions.map((solution, index) => <div className="f45-problem__pair" key={solution.before}>
              <div className="f45-problem__item"><h3 className="f45-problem__mobile-label" lang="en">As is</h3><article className="f45-problem__card f45-problem__card--before"><img src={ASSETS + `/figma-asis-0${index + 1}.png`} width="2172" height="724" alt="" aria-hidden="true" data-figma-node={solution.beforeNode} loading="lazy" decoding="async" /><p>{solution.before}</p></article></div>
              <div className="f45-problem__connector" aria-hidden="true"><img src={ASSETS + '/figma-connector.png'} width="270" height="16" alt="" /></div>
              <div className="f45-problem__item"><h3 className="f45-problem__mobile-label" lang="en">To be</h3><article className="f45-problem__card f45-problem__card--after"><img src={ASSETS + `/figma-tobe-0${index + 1}.png`} width="2172" height="724" alt="" aria-hidden="true" data-figma-node={solution.afterNode} loading="lazy" decoding="async" /><p>{solution.after}</p></article></div>
            </div>)}
          </div>
        </div>
      </div>
    </section>
  )
}

function DesignConcept() {
  return (
    <section className="f45-concept" data-figma-node="2134:404" aria-labelledby="f45-concept-title">
      <div className="f45-concept__background" aria-hidden="true"><img src={ASSETS + '/figma-concept-background.png'} width="2172" height="724" alt="" loading="lazy" /><span /></div>
      <div className="f45-concept__content">
        <header><p lang="en">DESIGN CONCEPT</p><h2 id="f45-concept-title">함께라서 더 즐거운 <span lang="en">45</span>분</h2></header>
        <div className="f45-concept__circles"><p className="f45-concept__community" lang="en">COMMUNITY</p><p className="f45-concept__playful" lang="en">PLAYFUL</p></div>
      </div>
    </section>
  )
}

export default function F45CaseStudy({ onNavigate, nextProject }: { onNavigate?: ProjectNavigateHandler; nextProject?: NextFaceProject }) {
  return (
    <div className="f45-case-study project-case-study">
      <ProjectHeader onNavigate={onNavigate} faceId="f45" />
      <main><Hero /><Overview /><ProblemStrategy /><DesignConcept /><F45MainPageOne /><F45MainPageTwo /><F45ResponsiveExperience /><F45Ending /></main>
      {nextProject && <NextFace project={nextProject} onNavigate={onNavigate} />}
      <FloatingDock liveUrl={project.liveUrl} />
    </div>
  )
}
