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
          <svg className="journey__path" viewBox={`0 0 1920 ${JOURNEY_WORLD_HEIGHT}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
            <path className="journey__path-base" />
            <path className="journey__path-drawn" />
            <path className="journey__path-accent" />
          </svg>
          {JOURNEY_NODES.map((node, i) => (
            <article key={node.id} className={`journey__node${node.compact ? ' journey__node--compact' : ''}`} data-node={node.id}
              style={{ '--node-x': node.position.x, '--node-y': node.position.y, '--card-w': node.width, '--card-h': node.height } as CSSProperties}>
              <div className={i === 0 ? 'journey__intro-entry' : undefined}>
                <div className="journey__card">
                  {i === 0 ? <h2 className="journey__headline" id="journey-title">{node.title}</h2> : <h3 className="journey__headline">{node.title}</h3>}
                  <div className="journey__card-body">
                    <p className="journey__desc">{node.description.map(line => <span key={line}>{line}</span>)}</p>
                    {node.meta && <dl className="journey__meta">{node.meta.map(row => <div key={row.label}><dt>{row.label}</dt><dd className={row.date ? 'journey__date' : undefined}>{row.value}</dd></div>)}</dl>}
                    {node.keywords && <ul className="journey__keywords">{node.keywords.map(word => <li key={word}>{word}</li>)}</ul>}
                  </div>
                </div>
                {(i === 0 || i === JOURNEY_NODES.length - 1) && <span className="journey__point" aria-hidden="true" />}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
