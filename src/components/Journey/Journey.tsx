import { useRef, type CSSProperties } from 'react'
import { JOURNEY_NODES, JOURNEY_TIMES, JOURNEY_WORLD_HEIGHT } from './journeyData'
import useJourneyInteraction from './useJourneyInteraction'
import './Journey.css'

type JourneyProps = { interactive: boolean; ready: boolean }

export default function Journey({ interactive, ready }: JourneyProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  useJourneyInteraction({ enabled: interactive && ready, sectionRef, stageRef, worldRef })

  return (
    <section ref={sectionRef} className={`journey journey--${interactive ? 'interactive' : 'static'}`} id="journey" aria-labelledby="journey-title">
      <div ref={stageRef} className="journey__stage">
        {/*
          Contact 쪽에서 새어 들어오는 빛. Journey 자체는 Carbon Black 그대로이고,
          마지막 구간(진행률 0.78 이후)에서만 화면 아래에서 아주 천천히 밝아진다(--contact-ambient, useJourneyInteraction).
        */}
        <div className="journey__handoff" aria-hidden="true" />
        <div ref={worldRef} className="journey__world" style={{ '--world-h': JOURNEY_WORLD_HEIGHT } as CSSProperties}>
          {/*
            경로는 하나다. 두 path가 같은 d(모든 card를 잇는 하나의 문자열)를 쓴다 —
            아주 옅은 전체 길과, 처음부터 지금 위치까지 이어진 #D4E5EF 한 줄.
            d는 card의 실제 크기를 재서, card 변에 들어오고 나가는 점으로 만든다(useJourneyInteraction).
            card 안쪽 구간은 불투명한 surface 아래로 지나간다.
          */}
          {/*
            하루의 시간(14 : 10 -> 17 : 00). line 옆 여백의 배경 글자다 — 빛이 그 구간에 다가오면 아주 옅게 나타나
            지나간 흔적처럼 남는다(--time-o, useJourneyInteraction). 보조기술에는 읽히지 않는다.
          */}
          {JOURNEY_TIMES.map((t) => (
            <div
              key={t.time}
              className={`journey__time journey__time--${t.style} journey__time--${t.side}`}
              style={{ '--node-x': t.x, '--node-y': t.y } as CSSProperties}
              aria-hidden="true"
            >
              {t.style === 'arc' && (
                <svg className="journey__time-arc" viewBox="0 0 200 200" focusable="false">
                  <circle cx="100" cy="100" r="96" pathLength="360" />
                </svg>
              )}
              {t.style === 'ticks' && <span className="journey__time-ticks" />}
              <span className="journey__time-value">{t.time}</span>
              {t.style === 'timecode' && <span className="journey__time-ruler" />}
            </div>
          ))}
          <svg className="journey__path" viewBox={`0 0 1920 ${JOURNEY_WORLD_HEIGHT}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
            <path className="journey__path-base" />
            <path className="journey__path-active" />
          </svg>
          {JOURNEY_NODES.map((node, i) => {
            const Title = i === 0 ? 'h2' : 'h3'
            return (
              <article key={node.id} className="journey__node" data-node={node.id}
                style={{ '--node-x': node.position.x, '--node-y': node.position.y } as CSSProperties}>
                <div className={i === 0 ? 'journey__intro-entry' : undefined}>
                  {/*
                    card 바탕. 경로 위, card 테두리 / 글자 아래에 놓이는 불투명한 면이다(opacity / blur 없음).
                    card 안쪽으로 들어온 경로 끝을 덮고, 흐려진 card가 경로 위에 어두운 번짐을 만들지 않는다.
                  */}
                  <span className="journey__surface" data-anchor={node.anchor} aria-hidden="true" />
                  <div className="journey__card" data-anchor={node.anchor}>
                    <div className="journey-card__main">
                      <Title className="journey-card__title" id={i === 0 ? 'journey-title' : undefined}>{node.title}</Title>
                      <p className="journey__desc">{node.description.map(line => <span key={line}>{line}</span>)}</p>
                    </div>
                    <div className="journey-card__meta">
                      {node.meta && (
                        <dl className="journey__meta">
                          {node.meta.map(row => (
                            <div key={row.label}>
                              <dt>{row.label}</dt>
                              <dd className={row.date ? 'journey__date' : undefined}>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {node.keywords && <ul className="journey__keywords">{node.keywords.map(word => <li key={word}>{word}</li>)}</ul>}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
