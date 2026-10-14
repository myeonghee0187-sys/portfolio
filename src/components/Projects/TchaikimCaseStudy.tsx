import type { ReactNode } from 'react'
import { TCHAIKIM_CASE_STUDY_URL } from '../Faces/facesData'
import FloatingDock from './FloatingDock'
import NextFace, { type NextFaceProject } from './NextFace'
import ProjectHeader, { type ProjectNavigateHandler } from './ProjectHeader'
import './TchaikimCaseStudy.css'

const ASSET_ROOT = '/projects/tchaikim'

const assets = {
  story6: `${ASSET_ROOT}/story6.png`,
  // Native image-only Figma layers preserve the original crop and paint opacity.
  mainBackground: `${ASSET_ROOT}/main-background.png`,
  resultBackground: `${ASSET_ROOT}/result-background.png`,
  resultTopFade: `${ASSET_ROOT}/frame1707487159.png`,
  responsiveDevices: `${ASSET_ROOT}/image340.png`,
  wordmark: `${ASSET_ROOT}/tchai-kim-wordmark.svg`,
  moodEditorial: `${ASSET_ROOT}/media-hover.png`,
  moodSeasonal: `${ASSET_ROOT}/seasonal.png`,
  moodYoungjin: `${ASSET_ROOT}/youngjin-red.png`,
  moodAtelier: `${ASSET_ROOT}/atelier6.png`,
  moodDetail: `${ASSET_ROOT}/image.png`,
  mainCapture: `${ASSET_ROOT}/image348.png`,
  macbook: `${ASSET_ROOT}/image344.png`,
  brandDesktop: `${ASSET_ROOT}/imac-27-2020.jpg`,
  shopCapture: `${ASSET_ROOT}/image349.png`,
  shopFrontCapture: `${ASSET_ROOT}/image351.png`,
  mainVisualLine: `${ASSET_ROOT}/line77.svg`,
  mainStoryLine: `${ASSET_ROOT}/line78.svg`,
  mainStartLine: `${ASSET_ROOT}/frame1707487150.svg`,
  shopFilterLine: `${ASSET_ROOT}/line79.svg`,
  shopNewLine: `${ASSET_ROOT}/line80.svg`,
  shopFitLine: `${ASSET_ROOT}/line81.svg`,
  shopVerticalLine: `${ASSET_ROOT}/line82.svg`,
}

const LIVE_URL = 'https://myeonghee0187-sys.github.io/tchaikim_all/pages/main/index.html'

const problems = [
  ['브랜드를 이해하고', '신뢰할 정보가 부족함'],
  ['상품 · 사이즈 정보가 부족해', '구매 판단이 어려움'],
  ['탐색 이후 구매 · 예약으로', '이어지는 흐름이 부족함'],
]

const solutions = [
  ['브랜드 철학과 콘텐츠를', '쉽게 이해할 수 있도록 개선'],
  ['명확한 상품 · 사이즈 정보로', '구매 신뢰 강화'],
  ['탐색부터 구매 · 비스포크', '예약까지 자연스럽게 연결'],
]

export type TchaikimCaseStudyProps = {
  /** A 16:9 video/controller composition. It is clipped to the desktop screen. */
  brandExperience: ReactNode
  /** Handles same-tab, unmodified internal navigation while anchors retain native semantics. */
  onNavigate?: ProjectNavigateHandler
  /** Omit href until the next case-study route exists; the editorial panel renders disabled. */
  nextProject?: NextFaceProject
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <header className="tchai-section-heading">
      <p>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </header>
  )
}

function CircleRow({ items, tone }: { items: string[][]; tone: 'as-is' | 'to-be' }) {
  return (
    <div className={`tchai-problem__row tchai-problem__row--${tone}`}>
      {items.map((lines, index) => (
        <article className="tchai-problem__circle" key={lines.join(' ')}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>{lines[0]}<br />{' '}{lines[1]}</p>
        </article>
      ))}
    </div>
  )
}

export default function TchaikimCaseStudy({
  brandExperience,
  onNavigate,
  nextProject = { title: 'JADUYA' },
}: TchaikimCaseStudyProps) {
  return (
    <div className="tchai-case-study">
      <ProjectHeader onNavigate={onNavigate} />

      <main>
        <section className="tchai-hero" data-case-hero aria-labelledby="tchai-title">
          <img className="tchai-hero__background" src={assets.story6} alt="" aria-hidden="true" />
          <span className="tchai-hero__veil" aria-hidden="true" />
          <img
            className="tchai-hero__devices"
            src={assets.responsiveDevices}
            alt="Tchai Kim website shown on desktop, tablet, and mobile devices"
          />
          <div className="tchai-hero__copy">
            <p className="tchai-hero__kicker">전통의 재해석, 글로벌 경험의 재설계.</p>
            <h1 className="tchai-hero__title" id="tchai-title" tabIndex={-1}>
              <img src={assets.wordmark} alt="" aria-hidden="true" />
              <span className="tchai-visually-hidden">TCHAI KIM</span>
            </h1>
          </div>
          <dl className="tchai-hero__meta">
            <div><dt>기간</dt><dd>2026.5 – 2026.8</dd></div>
            <div><dt>역할</dt><dd>PM / UXUI SUB / PRESENTATION CONTENT</dd></div>
            <div><dt>기여도</dt><dd>팀 프로젝트 30%<br />개인 디벨롭 포함 약 45%</dd></div>
          </dl>
        </section>

        <section className="tchai-overview" aria-labelledby="tchai-overview-title">
          <img src={assets.story6} alt="" aria-hidden="true" />
          <span aria-hidden="true" />
          <div className="tchai-overview__copy">
            <p>Overview</p>
            <h2 id="tchai-overview-title">FROM INTEREST TO EXPERIENCE</h2>
            <p>
              차이킴의 전통성과 브랜드 정체성은 유지하면서,<br />{' '}
              해외 사용자가 브랜드 탐색부터 상품 구매와 비스포크 예약까지<br />{' '}
              자연스럽게 이어갈 수 있도록 글로벌 웹 경험을 재설계했습니다.
            </p>
          </div>
        </section>

        <section className="tchai-problem" aria-labelledby="tchai-problem-title">
          <h2 className="tchai-visually-hidden" id="tchai-problem-title">Problem and solution</h2>
          <div className="tchai-problem__group tchai-problem__group--as-is">
            <h3>As is</h3>
            <CircleRow items={problems} tone="as-is" />
          </div>
          <div className="tchai-problem__group tchai-problem__group--to-be">
            <h3>To be</h3>
            <CircleRow items={solutions} tone="to-be" />
          </div>
        </section>

        <section className="tchai-insight" aria-label="Research result">
          <span aria-hidden="true">TCHAI</span>
          <p>글로벌 사용자 리서치에서 발견한 Pain Point를 바탕으로<br />{' '}브랜드 이해부터 구매·예약까지의 경험을 개선했습니다.</p>
        </section>

        <section className="tchai-concept" aria-labelledby="tchai-concept-title">
          <SectionHeading eyebrow="DESIGN CONCEPT" title="UNIQUE · ELEGANT · MODERN" id="tchai-concept-title" />
          <div className="tchai-concept__moodboard" aria-label="Editorial moodboard">
            <figure className="tchai-concept__image tchai-concept__image--one"><img src={assets.moodEditorial} alt="Modern hanbok editorial detail" loading="lazy" /></figure>
            <figure className="tchai-concept__image tchai-concept__image--two"><img src={assets.moodSeasonal} alt="Seasonal Tchai Kim visual" loading="lazy" /></figure>
            <figure className="tchai-concept__image tchai-concept__image--three"><img src={assets.moodYoungjin} alt="Youngjin collection in red" loading="lazy" /></figure>
            <figure className="tchai-concept__image tchai-concept__image--four"><img src={assets.moodAtelier} alt="Tchai Kim atelier styling" loading="lazy" /></figure>
            <figure className="tchai-concept__image tchai-concept__image--five"><img src={assets.moodDetail} alt="Textile and silhouette detail" loading="lazy" /></figure>
          </div>
        </section>

        <section className="tchai-main-point" aria-labelledby="tchai-main-title">
          <img className="tchai-main-point__ambient" src={assets.mainBackground} alt="" aria-hidden="true" loading="lazy" />
          <SectionHeading eyebrow="MAIN PAGE" title="브랜드 정체성을 보여주는 몰입형 메인 경험" id="tchai-main-title" />
          <div className="tchai-main-point__scene">
            <div className="tchai-main-point__capture">
              <img src={assets.mainCapture} alt="Full-length Tchai Kim main page design" loading="lazy" />
            </div>
            <img className="tchai-main-point__macbook" src={assets.macbook} alt="" aria-hidden="true" loading="lazy" />
            <img className="tchai-connector tchai-connector--main-start" src={assets.mainStartLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--main-visual" src={assets.mainVisualLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--main-story" src={assets.mainStoryLine} alt="" aria-hidden="true" />
            <p className="tchai-callout tchai-callout--main-start">
              두 브랜드 라인을 첫 화면에서<br />{' '}
              명확히 구분해 <strong>사용자가 원하는 방향</strong>으로<br />{' '}
              <strong>빠르게 탐색</strong>할 수 있도록 구성했습니다.
            </p>
            <p className="tchai-callout tchai-callout--main-visual">
              대형 비주얼과 넉넉한 여백을 활용해<br />{' '}
              차이킴의 <strong>전통성</strong>과 <strong>현대적인 감도</strong>를<br />{' '}
              동시에 전달했습니다.
            </p>
            <p className="tchai-callout tchai-callout--main-story">
              스크롤을 따라 브랜드 스토리와 콘텐츠가<br />{' '}
              자연스럽게 이어지도록 구성해<br />{' '}
              단순 탐색을 넘어 <strong>브랜드 경험</strong>으로<br />{' '}
              연결되도록 했습니다.
            </p>
          </div>
        </section>

        <section className="tchai-shop-point" aria-labelledby="tchai-shop-title">
          <SectionHeading eyebrow="SHOP PAGE" title="브랜드 스토리와 상품 탐색을 연결한 쇼핑 경험" id="tchai-shop-title" />
          <div className="tchai-shop-point__scene">
            <div className="tchai-shop-point__crop tchai-shop-point__crop--top">
              <img src={assets.shopCapture} alt="Tchai Kim shop landing and product listing" loading="lazy" />
              <span aria-hidden="true" />
            </div>
            <div className="tchai-shop-point__crop tchai-shop-point__crop--bottom">
              <img src={assets.shopFrontCapture} alt="Tchai Kim shop product grid" loading="lazy" />
            </div>
            <img className="tchai-connector tchai-connector--shop-filter" src={assets.shopFilterLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--shop-new" src={assets.shopNewLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--shop-new-vertical" src={assets.shopVerticalLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--shop-fit" src={assets.shopFitLine} alt="" aria-hidden="true" />
            <img className="tchai-connector tchai-connector--shop-fit-vertical" src={assets.shopVerticalLine} alt="" aria-hidden="true" />
            <p className="tchai-callout tchai-callout--shop-new">신상품을 크게 보여<br />{' '}<strong>주목도</strong>를 높였습니다.</p>
            <p className="tchai-callout tchai-callout--shop-filter">검색 · 필터로<br />{' '}<strong>탐색 효율</strong>을 높였습니다.</p>
            <p className="tchai-callout tchai-callout--shop-fit"><strong>모델 착용 이미지</strong>를 중심으로<br />{' '}상품의 핏과 스타일을<br />{' '}<strong>쉽게 확인</strong>하도록 했습니다.</p>
          </div>
        </section>

        <section className="tchai-brand" id="brand-experience" aria-labelledby="tchai-brand-title">
          <span className="tchai-brand__center" data-brand-center aria-hidden="true" />
          <SectionHeading eyebrow="BRAND EXPERIENCE" title="STORY IN MOTION." id="tchai-brand-title" />
          <p className="tchai-brand__description">전통의 결을 따라 흐르는 브랜드 경험</p>
          <div className="tchai-brand__desktop" aria-label="Tchai Kim brand experience video">
            <img className="tchai-brand__frame" src={assets.brandDesktop} width={760} height={634} alt="" aria-hidden="true" loading="lazy" />
            <div className="tchai-brand__screen">{brandExperience}</div>
          </div>
        </section>

        <section className="tchai-result" aria-labelledby="tchai-result-title">
          <img className="tchai-result__background" src={assets.resultBackground} alt="" aria-hidden="true" loading="lazy" />
          <img className="tchai-result__devices" src={assets.responsiveDevices} alt="" aria-hidden="true" loading="lazy" />
          <img className="tchai-result__top-fade" src={assets.resultTopFade} alt="" aria-hidden="true" loading="lazy" />
          <div className="tchai-result__copy">
            <h2 id="tchai-result-title">트렌드의 한복판에서<br />{' '}전통을 세계로 잇는<br />{' '}경험을 완성했습니다.</h2>
          </div>
        </section>

        <NextFace project={nextProject} onNavigate={onNavigate} />
      </main>

      <FloatingDock liveUrl={LIVE_URL} caseStudyUrl={TCHAIKIM_CASE_STUDY_URL} />
    </div>
  )
}
