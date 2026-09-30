import { useRef, type CSSProperties } from 'react'
import { JOURNEY_NODES, JOURNEY_WORLD_HEIGHT } from './journeyData'
import useJourneyInteraction from './useJourneyInteraction'
import useJourneyDocumentFlow from './useJourneyDocumentFlow'
import './Journey.css'

type JourneyProps = { interactive: boolean; ready: boolean }

export default function Journey({ interactive, ready }: JourneyProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  useJourneyInteraction({ enabled: interactive && ready, sectionRef, stageRef, worldRef })
  useJourneyDocumentFlow(ready && !interactive, worldRef)

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
            시계가 지나는 구간만 카드 외곽으로 부드럽게 우회하며 두 path와 시계가 같은 geometry를 쓴다.
          */}
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
          {/* One persistent clock follows the shared line outside card surfaces. */}
          <div className="journey__marker" aria-hidden="true">
            <span className="journey__marker-glass">
              {Array.from({ length: 12 }, (_, tick) => (
                <span key={tick} className={`journey__marker-tick${tick % 3 === 0 ? ' journey__marker-tick--major' : ''}`}
                  style={{ '--tick-angle': `${tick * 30}deg` } as CSSProperties} />
              ))}
              <span className="journey__marker-hand journey__marker-hand--hour" />
              <span className="journey__marker-hand journey__marker-hand--minute" />
              <span className="journey__marker-pin" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
