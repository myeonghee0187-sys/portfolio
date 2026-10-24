import type { ReactNode } from 'react'
import './F45MainPages.css'

const ASSET_ROOT = '/projects/f45'

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <header className="f45-main__heading">
      <p lang="en">Main Page</p>
      <h2 id={id}>{children}</h2>
    </header>
  )
}

function Connector({ src, className = '' }: { src: string; className?: string }) {
  return (
    <span className={`f45-main__connector ${className}`} aria-hidden="true">
      <svg viewBox="0 0 245.167 5.33333" width="245.167" height="5.33333" focusable="false">
        <image href={`${ASSET_ROOT}/${src}`} width="245.167" height="5.33333" />
      </svg>
    </span>
  )
}

export function F45MainPageOne() {
  return (
    <section className="f45-main f45-main--one" data-figma-node="2144:523" aria-labelledby="f45-main-one-title">
      <span className="f45-main__circle f45-main__circle--one-right" aria-hidden="true">
        <svg viewBox="0 0 787 787" width="787" height="787" focusable="false">
          <image href={`${ASSET_ROOT}/figma-main-01-circle-right.svg`} width="787" height="787" />
        </svg>
      </span>
      <span className="f45-main__circle f45-main__circle--one-bottom" aria-hidden="true">
        <svg viewBox="0 0 1328 1177" width="1328" height="1177" focusable="false">
          <image href={`${ASSET_ROOT}/figma-main-01-circle-bottom.svg`} width="1328" height="1177" />
        </svg>
      </span>

      <SectionHeading id="f45-main-one-title"><span lang="en">F45</span>의 매력을 알아가고, 가까운 지점을 찾아요</SectionHeading>

      <figure className="f45-main__page f45-main__page--one">
        <img
          className="f45-main__page-image"
          src={`${ASSET_ROOT}/figma-main-01-page.png`}
          width="1550"
          height="4096"
          alt="F45의 브랜드 소개, 트레이닝 프로그램, 지점 찾기로 이어지는 메인 페이지"
          loading="lazy"
          decoding="async"
        />
        <span className="f45-main__phase-blur" aria-hidden="true" />
        <span className="f45-main__phase" aria-hidden="true">
          <img src={`${ASSET_ROOT}/figma-main-01-phase.png`} width="2356" height="750" alt="" loading="lazy" decoding="async" />
        </span>
      </figure>

      <div className="f45-main__callouts">
        <article className="f45-main__callout f45-main__callout--brand">
          <Connector src="figma-main-01-connector-brand.svg" />
          <p>
            <span className="f45-main__line">역동적인 비주얼로{' '}</span>
            <span className="f45-main__line"><span lang="en">F45</span>의 에너지를 전달하고,{' '}</span>
            <span className="f45-main__line f45-main__em">‘<span lang="en">KOREA</span>’ 다섯 글자에{' '}</span>
            <span className="f45-main__line"><strong>트레이닝의 핵심 가치</strong>를 담아{' '}</span>
            <span className="f45-main__line">브랜드의 차별성을{' '}</span>
            <span className="f45-main__line">직관적으로 표현했습니다.</span>
          </p>
        </article>

        <article className="f45-main__callout f45-main__callout--phase">
          <p>
            <span className="f45-main__line"><span lang="en">7</span>개의 트레이닝 프로그램을{' '}</span>
            <span className="f45-main__line">카드형 콘텐츠로 구성해{' '}</span>
            <span className="f45-main__line f45-main__em">각 프로그램의 운동 방식과{' '}</span>
            <span className="f45-main__line"><strong>특징을 시각화</strong>하고,{' '}</span>
            <span className="f45-main__line f45-main__em">낯선 운동에 대한{' '}</span>
            <span className="f45-main__line"><strong>이해도</strong>를 높이도록 설계했습니다.</span>
          </p>
          <Connector src="figma-main-01-connector-phase.svg" />
        </article>

        <article className="f45-main__callout f45-main__callout--location">
          <Connector src="figma-main-01-connector-location.svg" />
          <p>
            <span className="f45-main__line">지역별 필터와 검색 기능,{' '}</span>
            <span className="f45-main__line">지점 정보를 통합해{' '}</span>
            <span className="f45-main__line">원하는 스튜디오를{' '}</span>
            <span className="f45-main__line"><strong>직관적으로 탐색</strong>하고,{' '}</span>
            <span className="f45-main__line"><strong>방문에 필요한 정보</strong>를{' '}</span>
            <span className="f45-main__line">쉽게 확인하도록 했습니다.</span>
          </p>
        </article>
      </div>
    </section>
  )
}

export function F45MainPageTwo() {
  return (
    <section className="f45-main f45-main--two" data-figma-node="2144:549" aria-labelledby="f45-main-two-title">
      <span className="f45-main__circle f45-main__circle--two-top" aria-hidden="true">
        <svg viewBox="0 0 1333 1177" width="1333" height="1177" focusable="false">
          <image href={`${ASSET_ROOT}/figma-main-02-circle-top.svg`} width="1333" height="1177" />
        </svg>
      </span>
      <span className="f45-main__circle f45-main__circle--two-bottom" aria-hidden="true">
        <svg viewBox="0 0 1252 1248" width="1252" height="1248" focusable="false">
          <image href={`${ASSET_ROOT}/figma-main-02-circle-bottom.svg`} width="1252" height="1248" />
        </svg>
      </span>

      <SectionHeading id="f45-main-two-title">첫 운동이 낯설지 않도록, 차근차근 준비해요</SectionHeading>

      <figure className="f45-main__page f45-main__page--two">
        <img
          className="f45-main__page-image"
          src={`${ASSET_ROOT}/figma-main-02-page.png`}
          width="1208"
          height="4096"
          alt="첫 방문 안내 여섯 단계와 F45 앱 설치 방법을 보여주는 메인 페이지"
          loading="lazy"
          decoding="async"
        />
      </figure>

      <div className="f45-main__callouts">
        <article className="f45-main__callout f45-main__callout--guide">
          <p>
            <span className="f45-main__line"><strong>첫 방문에 필요한 <span lang="en">6</span>가지 안내</strong>를{' '}</span>
            <span className="f45-main__line">단계별로 구성해 운동 초보자의{' '}</span>
            <span className="f45-main__line">막연한 부담을 줄이고,{' '}</span>
            <span className="f45-main__line f45-main__em">체험 전 준비 과정을{' '}</span>
            <span className="f45-main__line"><strong>명확하게 전달</strong>했습니다.</span>
          </p>
          <Connector src="figma-main-02-connector-guide.svg" />
        </article>

        <article className="f45-main__callout f45-main__callout--app">
          <Connector src="figma-main-02-connector-app.svg" />
          <p>
            <span className="f45-main__line"><strong>실제 앱 화면을 활용</strong>한{' '}</span>
            <span className="f45-main__line"><span lang="en">6</span>단계 가이드를 통해{' '}</span>
            <span className="f45-main__line">앱 설치와 이용 과정을{' '}</span>
            <span className="f45-main__line">쉽게 이해하고,{' '}</span>
            <span className="f45-main__line f45-main__em">체험 준비까지 자연스럽게{' '}</span>
            <span className="f45-main__line"><strong>연결</strong>되도록 했습니다.</span>
          </p>
        </article>
      </div>
    </section>
  )
}
