import { useRef } from 'react'
import useBottomSheetScroll from '../../hooks/useBottomSheetScroll'
import useScrollPointFocus from '../../hooks/useScrollPointFocus'
import './JaduyaExperienceSections.css'

const EXPERIENCE_ASSET_ROOT = '/projects/jaduya/experience'

type MainPoint = {
  number: string
  title: string
  description: string
  connector: string
  connectorWidth: number
  connectorHeight: number
}

const mainOnePoints: MainPoint[] = [
  {
    number: '01',
    title: '개인화된 자취 현황',
    description: '입주 일정과 준비 현황을 한눈에 확인',
    connector: 'main-one-connector-straight.svg',
    connectorWidth: 179.167,
    connectorHeight: 5.33333,
  },
  {
    number: '02',
    title: '나에게 맞는 자취 혜택',
    description: '개인의 생활 조건에 맞는 지원 정보로 연결',
    connector: 'main-one-connector-bent.svg',
    connectorWidth: 183.667,
    connectorHeight: 110.667,
  },
  {
    number: '03',
    title: '위젯형 홈 구성',
    description: '바텀시트로 생활 정보를 간편하게 탐색',
    connector: 'main-one-connector-straight.svg',
    connectorWidth: 179.167,
    connectorHeight: 5.33333,
  },
]

const mainTwoPoints: MainPoint[] = [
  {
    number: '04',
    title: '맞춤형 내 메뉴',
    description: '필요한 기능을 선택해 나만의 홈 구성',
    connector: 'main-two-connector-top.svg',
    connectorWidth: 167.667,
    connectorHeight: 81.6667,
  },
  {
    number: '05',
    title: '자유로운 위젯 편집',
    description: '위젯 추가 · 삭제 및 순서 변경',
    connector: 'main-two-connector-middle.svg',
    connectorWidth: 168.167,
    connectorHeight: 101.167,
  },
  {
    number: '06',
    title: '맞춤형 생활 큐레이션',
    description: '관심사에 맞는 생활 정보와 팀 추천',
    connector: 'main-two-connector-bottom.svg',
    connectorWidth: 163.167,
    connectorHeight: 5.33333,
  },
]

function MainSectionHeading({ id }: { id: string }) {
  return (
    <header className="jaduya-experience-heading">
      <p>Main Page</p>
      <h2 id={id}>내 자취생활에 맞춰 달라지는 홈</h2>
    </header>
  )
}

function MainPoints({ points }: { points: MainPoint[] }) {
  return (
    <div className="jaduya-main__points">
      {points.map((point) => (
        <div className="jaduya-main__point-item" key={point.number}>
          <span className="jaduya-main__connector" aria-hidden="true">
            <img
              src={`${EXPERIENCE_ASSET_ROOT}/${point.connector}`}
              width={point.connectorWidth}
              height={point.connectorHeight}
              alt=""
            />
          </span>
          <article className="jaduya-main__point-card">
            <p className="jaduya-main__point-number">POINT {point.number}</p>
            <div>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </div>
          </article>
        </div>
      ))}
    </div>
  )
}

export function JaduyaMainPageOne() {
  return (
    <section className="jaduya-main jaduya-main--one" aria-labelledby="jaduya-main-one-title">
      <MainSectionHeading id="jaduya-main-one-title" />
      <div className="jaduya-main__stage">
        <figure
          className="jaduya-main__phone jaduya-main__phone--one"
          role="img"
          aria-label="입주 준비 현황과 맞춤 혜택, 내 메뉴를 함께 보여주는 자두야 홈 화면"
        >
          <img
            src={`${EXPERIENCE_ASSET_ROOT}/main-one-home-phone.png`}
            width="758"
            height="1494"
            alt=""
            loading="lazy"
          />
        </figure>
        <MainPoints points={mainOnePoints} />
      </div>
    </section>
  )
}

export function JaduyaMainPageTwo() {
  const sectionRef = useRef<HTMLElement>(null)
  useBottomSheetScroll(sectionRef)
  return (
    <section ref={sectionRef} className="jaduya-main jaduya-main--two" aria-labelledby="jaduya-main-two-title">
      <MainSectionHeading id="jaduya-main-two-title" />
      <div className="jaduya-main__stage">
        <MainPoints points={mainTwoPoints} />
        <figure
          className="jaduya-main__phone jaduya-main__phone--two"
          role="img"
          aria-label="같은 자두야 홈에서 바텀시트를 올리고 내 메뉴 위젯을 편집하는 상태"
        >
          <span className="jaduya-main__phone-clip" aria-hidden="true">
            <img
              className="jaduya-main__phone-base"
              src={`${EXPERIENCE_ASSET_ROOT}/main-two-home-phone.png`}
              width="724"
              height="1488"
              alt=""
              loading="lazy"
            />
            {/* Reuse original screens inside the phone; keep its frame stationary. */}
            <span className="jaduya-main__screen-window">
              <span className="jaduya-main__resting-screen">
                <img src={`${EXPERIENCE_ASSET_ROOT}/main-one-home-phone.png`} width="758" height="1494" alt="" loading="lazy" />
              </span>
              <span className="jaduya-main__sheet-content" data-sheet-layer>
                <img className="jaduya-main__phone-base" src={`${EXPERIENCE_ASSET_ROOT}/main-two-home-phone.png`} width="724" height="1488" alt="" loading="lazy" />
              </span>
            </span>
          </span>
          <span className="jaduya-main__sheet-halo" data-sheet-layer aria-hidden="true" />
          <img
            className="jaduya-main__raised-sheet"
            data-sheet-layer
            src={`${EXPERIENCE_ASSET_ROOT}/main-two-raised-sheet.png`}
            width="622"
            height="350"
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  )
}

export function JaduyaHomeCare() {
  const sectionRef = useRef<HTMLElement>(null)
  useScrollPointFocus(sectionRef)
  return (
    <section ref={sectionRef} className="jaduya-home-care" aria-labelledby="jaduya-home-care-title">
      <span className="jaduya-home-care__handle" aria-hidden="true" />
      <header className="jaduya-experience-heading">
        <p>Life Page - Home Care</p>
        <h2 id="jaduya-home-care-title">생활 속 문제부터 해결까지, 내 상황에 맞춘 홈케어</h2>
      </header>

      <figure
        className="jaduya-home-care__phone"
        role="img"
        aria-label="곰팡이 문제의 상황 선택부터 직접 관리, 원인 확인, 전문 관리 연결까지 이어지는 홈케어 화면"
      >
        <img
          src={`${EXPERIENCE_ASSET_ROOT}/home-care-long-phone.png`}
          width="726"
          height="2167"
          alt=""
          loading="lazy"
        />
      </figure>

      <div className="jaduya-home-care__callouts">
        <div className="jaduya-home-care__callout jaduya-home-care__callout--one" data-scroll-point="situation">
          <span className="jaduya-home-care__connector" aria-hidden="true">
            <img
              src={`${EXPERIENCE_ASSET_ROOT}/home-care-connector-right.svg`}
              width="180.167"
              height="5.33333"
              alt=""
            />
          </span>
          <p>
            문제 유형과 발생 위치, 상태를 선택하면<br />{' '}
            <strong>복잡한 검색 없이 내 상황에 맞는</strong><br />{' '}
            해결 방법을 확인할 수 있습니다.
          </p>
        </div>

        <div className="jaduya-home-care__callout jaduya-home-care__callout--two" data-scroll-point="action">
          <span className="jaduya-home-care__connector" aria-hidden="true">
            <img
              src={`${EXPERIENCE_ASSET_ROOT}/home-care-connector-left.svg`}
              width="180.167"
              height="5.33333"
              alt=""
            />
          </span>
          <p>
            단순한 정보 제공을 넘어,<br />{' '}
            초기 조치부터 직접 관리와 원인 점검까지<br />{' '}
            <strong>실제 행동으로 이어지는 해결 과정을 안내</strong>합니다.
          </p>
        </div>

        <div className="jaduya-home-care__callout jaduya-home-care__callout--three" data-scroll-point="service">
          <span className="jaduya-home-care__connector" aria-hidden="true">
            <img
              src={`${EXPERIENCE_ASSET_ROOT}/home-care-connector-right.svg`}
              width="180.167"
              height="5.33333"
              alt=""
            />
          </span>
          <p>
            스스로 해결하기 어려운 문제는<br />{' '}
            <strong>전문 업체 정보와 연결</strong>해, 전화나 홈페이지를 통해<br />{' '}
            필요한 서비스를 직접 찾을 수 있도록 돕습니다.
          </p>
        </div>
      </div>
    </section>
  )
}
