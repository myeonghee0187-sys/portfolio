import WatchAssembly from './Watch/WatchAssembly'
import './About.css'

/**
 * Figma 157:146 — 카드 4장의 최종 배치와 본문.
 *
 * 배열 순서가 곧 읽기 순서다: WHO I AM -> HOW I SEE -> HOW I REFINE -> HOW I MAKE.
 *
 * 카드는 두 장씩 짝을 지어 Watch 양옆에 선다. pinned 구간에서 보여야 할 두 장면이
 *
 *   Pair 1   WHO I AM      [ WATCH ]   HOW I SEE
 *   Pair 2   HOW I REFINE  [ WATCH ]   HOW I MAKE
 *
 * 이고, 각 장면에서 두 카드의 세로 중심이 Watch의 세로 중심과 같은 선에 놓인다.
 *
 *   pair - 어느 짝인지(0: 먼저, 1: 나중).
 *   side - Watch의 어느 쪽에 서는지. 들어오는 방향이자 빠져나가는 방향이기도 하다.
 *
 * 실제 정지 좌표는 Figma의 top-left 값이 아니라 Watch의 실제 박스에서 계산한다
 * (useScrollScene). 아래 CSS 좌표는 scroll 연출이 꺼진 환경의 정적 배치용이다.
 */
export const ABOUT_CARDS = [
  {
    id: 'am',
    title: 'WHO I AM',
    body: [
      '브랜드와 사용자의 목적을 이해하고,',
      '보기 좋은 화면을 넘어 실제 사용 경험을',
      '설계하는 웹디자이너입니다.',
    ],
    pair: 0,
    side: 'left',
  },
  {
    id: 'see',
    title: 'HOW I SEE',
    body: [
      '사용자가 어디에서 멈추고',
      '무엇을 어려워하는지 살펴본 뒤,',
      '왜 필요한지부터 다시 질문합니다.',
    ],
    pair: 0,
    side: 'right',
  },
  {
    id: 'refine',
    title: 'HOW I REFINE',
    body: [
      '작은 디테일부터 전체 화면의 흐름까지 살펴본 뒤,',
      '사용자가 더 자연스럽게 경험할 수 있도록',
      '반복해서 다듬습니다.',
    ],
    pair: 1,
    side: 'left',
  },
  {
    id: 'make',
    title: 'HOW I MAKE',
    body: [
      'Figma에서 끝내지 않고',
      'HTML·CSS·JavaScript·React를 활용해',
      '실제 화면에서 디자인이 작동하는지 확인합니다.',
    ],
    pair: 1,
    side: 'right',
  },
] as const

type AboutProps = {
  /** Hero와 같은 의미. scroll scene이 꺼진 환경에서만 About이 Watch를 직접 들고 있다. */
  inlineWatch: boolean
}

/** Figma 157:146 — about 1920 x 1180 (상단 여백 100 + stage 1920 x 1080). */
export default function About({ inlineWatch }: AboutProps) {
  return (
    <section className="about" id="about">
      {/* pinned 되는 단위. 이 안의 카드만 움직이고 Watch는 중앙에 머문다. */}
      <div className="about__stage">
        <div className="about__inner">
          {ABOUT_CARDS.map((card) => (
            <article key={card.id} className={`about__card about__card--${card.id}`}>
              <h2 className="about__card-title">{card.title}</h2>
              <p className="about__card-body">
                {card.body.map((line, i) => (
                  // Figma의 줄바꿈을 그대로 따른다. 카피는 수정하지 않는다.
                  <span key={i}>{line}</span>
                ))}
              </p>
            </article>
          ))}

          {/*
            Watch가 놓일 자리. WatchStage가 About 쪽 목표 좌표를 여기서 읽는다.
            .watch--about과 크기·위치가 같고 화면에만 보이지 않는다.
          */}
          <div className="about__watch-anchor" aria-hidden="true" />

          {inlineWatch && <WatchAssembly variant="about" />}
        </div>
      </div>
    </section>
  )
}
