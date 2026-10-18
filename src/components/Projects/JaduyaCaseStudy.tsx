import { FACE_PROJECTS } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import './JaduyaCaseStudy.css'

const ASSET_ROOT = '/projects/jaduya'
const project = FACE_PROJECTS.find((face) => face.id === 'jaduya')!

// Each pair keeps its original Figma icon and its research → solution relationship.
const pairs = [
  {
    problem: '여러 플랫폼에 흩어진 자취 정보',
    solution: ['생활 정보와 실제 자취 경험을', '한곳에서 탐색'],
  },
  {
    problem: '개인의 생활 조건을 고려하지 않은 안내',
    solution: ['자취 단계와 주거환경에 맞춰', '지금 필요한 정보부터 제안'],
  },
  {
    problem: '정보 탐색 후에도 남는 판단과 실행의 부담',
    solution: ['자두 AI가 해결 순서를 안내하고', '생활 속 실천까지 연결'],
  },
]

function JaduyaHero() {
  return (
    <section className="jaduya-hero" data-case-hero aria-labelledby="jaduya-title">
      <img className="jaduya-hero__landscape" src={`${ASSET_ROOT}/hero-landscape.png`} alt="" aria-hidden="true" />
      <span className="jaduya-hero__veil" aria-hidden="true" />
      <div className="jaduya-hero__phones" aria-label="자두야 앱 화면 다섯 개">
        {['1518', '1431', '1519', '1520', '1521'].map((id, index) => (
          <div className={`jaduya-hero__phone jaduya-hero__phone--${index + 1}`} key={id}>
            <img src={`${ASSET_ROOT}/phone-${id}.png`} alt={[
              '자취 생활 정보 안내 화면', '내 정보와 자취 생활 프로필 화면', '생활비와 나의 일상 관리 화면',
              '실제 자취 경험과 생활 정보 탐색 화면', '자두야 홈 화면',
            ][index]} fetchPriority={index === 4 ? 'high' : 'auto'} />
          </div>
        ))}
      </div>
      <div className="jaduya-hero__fade" aria-hidden="true" />
      <div className="jaduya-hero__copy">
        <p>혼자여두 괜찮아,</p>
        <h1 id="jaduya-title" tabIndex={-1}>
          <img src={`${ASSET_ROOT}/jaduya-wordmark.svg`} width="547" height="189" alt="자두야" />
        </h1>
      </div>
      <dl className="jaduya-hero__meta">
        <div className="jaduya-hero__award"><dt>수상</dt><dd>UXUI 디자인 &amp; 웹기획 프로젝트 최우수상</dd></div>
        <div><dt>기간</dt><dd className="jaduya-numeric">2026.8 - 2026.9</dd></div>
        <div><dt>역할</dt><dd className="jaduya-role">UI ARCHITECT / PRESENTATION CONTENT</dd></div>
        <div><dt>팀 내 기여도</dt><dd className="jaduya-numeric">16%</dd></div>
      </dl>
    </section>
  )
}

function JaduyaOverview() {
  return (
    <section className="jaduya-overview" aria-labelledby="jaduya-overview-title">
      <img className="jaduya-overview__plum" src={`${ASSET_ROOT}/overview-plum.png`} alt="" aria-hidden="true" loading="lazy" width="160" height="175" />
      <p className="jaduya-overview__eyebrow">OVERVIEW</p>
      <div className="jaduya-overview__copy">
        <h2 id="jaduya-overview-title">처음 시작하는 자취부터, 익숙해진 일상까지</h2>
        <div>
          <p>혼자 사는 일상에는 누구에게나 통하는 정답이 없습니다.</p>
          <p>자두야는 실제 자취 경험과 생활 정보를 나의 상황에 맞게 연결해,<br className="jaduya-desktop-break" />{' '}
            무엇이 필요한지 이해하고 직접 해결할 수 있도록 돕는 자취생활 플랫폼입니다.</p>
        </div>
      </div>
    </section>
  )
}

function JaduyaDirection() {
  return (
    <section className="jaduya-direction" aria-labelledby="jaduya-direction-title">
      <h2 id="jaduya-direction-title" className="jaduya-sr-only">AS-IS / TO-BE — 자두야의 기획 방향</h2>
      <div className="jaduya-direction__waves" aria-hidden="true">
        <div className="jaduya-direction__green"><img src={`${ASSET_ROOT}/wave-green.svg`} alt="" width="758" height="2001" /></div>
        <div className="jaduya-direction__beige"><img src={`${ASSET_ROOT}/wave-beige.svg`} alt="" width="601" height="2292" /></div>
      </div>
      <p className="jaduya-direction__label jaduya-direction__label--as-is" aria-hidden="true">As is</p>
      <p className="jaduya-direction__label jaduya-direction__label--to-be" aria-hidden="true">To be</p>
      <div className="jaduya-direction__pairs">
        {pairs.map((pair, index) => (
          <article className="jaduya-direction__pair" key={pair.problem} aria-label={`기획 방향 ${index + 1}`}>
            <div className="jaduya-direction__pair-wave" aria-hidden="true"><img src={`${ASSET_ROOT}/wave-beige.svg`} alt="" width="601" height="2292" /></div>
            <div className="jaduya-direction__card jaduya-direction__card--as-is">
              <span className="jaduya-direction__mobile-label">As is</span>
              <img src={`${ASSET_ROOT}/as-is-${index + 1}.webp`} alt="" aria-hidden="true" width="312" height="104" loading="lazy" />
              <p>{pair.problem}</p>
            </div>
            <div className="jaduya-direction__connector" aria-hidden="true">
              <img src={`${ASSET_ROOT}/connector.svg`} width="144" height="8" alt="" />
            </div>
            <div className="jaduya-direction__card jaduya-direction__card--to-be">
              <span className="jaduya-direction__mobile-label">To be</span>
              <img src={`${ASSET_ROOT}/to-be-${index + 1}.webp`} alt="" aria-hidden="true" width="312" height="104" loading="lazy" />
              <p>{pair.solution[0]}<br className="jaduya-desktop-break" />{' '}{pair.solution[1]}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function JaduyaConclusion() {
  return (
    <section className="jaduya-conclusion" aria-label="기획 결론">
      <div className="jaduya-conclusion__curves" aria-hidden="true">
        <img src={`${ASSET_ROOT}/conclusion-green.svg`} alt="" width="1920" height="90" />
        <img src={`${ASSET_ROOT}/conclusion-yellow.svg`} alt="" width="1920" height="90" />
      </div>
      <div className="jaduya-conclusion__card">
        <p>실제 자취 경험을 신뢰할 수 있는 <strong>생활 정보로 연결</strong>하고,<br className="jaduya-desktop-break" />{' '}
          개인별 맞춤 안내를 통해 문제 해결부터 일상 관리까지 <strong>하나의 경험으로 설계</strong>했습니다.</p>
      </div>
    </section>
  )
}

export default function JaduyaCaseStudy({ onNavigate }: { onNavigate?: ProjectNavigateHandler }) {
  return (
    <div className="jaduya-case-study">
      <ProjectHeader onNavigate={onNavigate} faceId="jaduya" tone="light" />
      <main>
        <JaduyaHero />
        <JaduyaOverview />
        <JaduyaDirection />
        <JaduyaConclusion />
      </main>
      <FloatingDock liveUrl={project.liveUrl} caseStudyUrl={project.caseStudyUrl!} />
    </div>
  )
}
