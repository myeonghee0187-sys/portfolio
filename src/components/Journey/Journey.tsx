import { useRef, type CSSProperties } from 'react'
import { JOURNEY_NODES, JOURNEY_WORLD_HEIGHT } from './journeyData'
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
        <div className="journey__ambient" aria-hidden="true" />
        <div ref={worldRef} className="journey__world" style={{ '--world-h': JOURNEY_WORLD_HEIGHT } as CSSProperties}>
          {/*
            경로는 하나다. 두 path가 같은 d를 쓴다(전체 길 / 처음부터 지금까지 이어진 빛).
            d는 card 안의 anchor를 실제로 재서 만든다(useJourneyInteraction). 시작 / 끝에 따로 점을 두지 않는다.
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
                  <div className="journey__card" data-anchor={node.anchor}>
                    {/* 경로가 이 card에 닿는 한 점. 눈에는 보이지 않는다. */}
                    <span className="journey-card__anchor" aria-hidden="true" />
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
