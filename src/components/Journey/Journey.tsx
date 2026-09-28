import { useRef, type CSSProperties } from 'react'
import {
  JOURNEY_AI_PANELS,
  JOURNEY_AI_STACK_POSITION,
  JOURNEY_BRANCH_D,
  JOURNEY_NODES,
  JOURNEY_PATH_D,
  JOURNEY_WORLD_HEIGHT,
  type JourneyNode,
} from './journeyData'
import useJourneyInteraction from './useJourneyInteraction'
import './Journey.css'

type JourneyProps = {
  /** 카메라 이동 / pin / path draw를 켤지. 터치 기기, reduced motion, 좁은 화면에서는 끈다. */
  interactive: boolean
  /** Intro가 끝났는지. About / FACES와 같은 이유로 측정은 스크롤바가 생긴 뒤에 한다. */
  ready: boolean
}

/** 키워드 한 줄. pill badge가 아니라 가운뎃점으로 끊는 작은 metadata row다. */
function Keywords({ items }: { items: string[] }) {
  return (
    <ul className="journey__keywords">
      {items.map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  )
}

function NodeBody({ node }: { node: JourneyNode }) {
  return (
    <>
      {node.description && (
        <p className="journey__desc">
          {node.description.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      )}

      {node.meta && (
        <dl className="journey__meta">
          <div>
            <dt>PERIOD</dt>
            <dd>{node.meta.period}</dd>
          </div>
          <div>
            <dt>COURSE</dt>
            <dd>
              {node.meta.course.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </div>
          <div>
            <dt>INSTITUTION</dt>
            <dd>{node.meta.institution}</dd>
          </div>
        </dl>
      )}

      {node.tools && (
        <ul className="journey__tools">
          {node.tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      )}

      {node.keywords && <Keywords items={node.keywords} />}
    </>
  )
}

/** 04 안에서 한 장씩 앞으로 나오는 기록 layer. carousel이 아니라 겹쳐 쌓인 판이다. */
function JourneyAiStack() {
  return (
    <div
      className="journey__ai-stack"
      style={{
        '--stack-x': JOURNEY_AI_STACK_POSITION.x,
        '--stack-y': JOURNEY_AI_STACK_POSITION.y,
      } as CSSProperties}
    >
      {JOURNEY_AI_PANELS.map((panel, i) => (
        <article
          key={panel.id}
          className="journey__ai-panel"
          data-panel={panel.id}
          style={{ '--panel-depth': i } as CSSProperties}
        >
          <header className="journey__ai-panel-head">
            <span className="journey__ai-panel-no">{String(i + 1).padStart(2, '0')}</span>
            <h4 className="journey__ai-panel-title">{panel.title}</h4>
          </header>
          <ul className="journey__tools journey__tools--panel">
            {panel.tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
          <Keywords items={panel.keywords} />
        </article>
      ))}
    </div>
  )
}

/**
 * JOURNEY — 하나로 이어진 세로 경로.
 *
 * Desktop에서는 stage를 pin한 채 world(카메라)가 path를 따라 내려간다.
 * 한 화면에는 한 단계만 선명하고, 나머지는 물러나 있다.
 * 04에서는 카메라가 잠시 머무는 동안 AI panel 다섯 장이 한 장씩 앞으로 나온다.
 *
 * 연출이 꺼진 환경(터치 / reduced motion / 좁은 화면)에서는 같은 DOM이
 * 위에서 아래로 읽히는 일반 문서 흐름이 된다. 축소된 desktop 화면을 보여주지 않는다.
 */
export default function Journey({ interactive, ready }: JourneyProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)

  useJourneyInteraction({ enabled: interactive && ready, sectionRef, stageRef, worldRef })

  return (
    <section
      ref={sectionRef}
      className={`journey ${interactive ? 'journey--interactive' : 'journey--static'}`}
      id="journey"
      aria-labelledby="journey-title"
    >
      <div ref={stageRef} className="journey__stage">
        {/* path 주변에만 아주 낮게 도는 차가운 빛. 화면 전체를 파랗게 칠하지 않는다. */}
        <div className="journey__ambient" aria-hidden="true" />

        <div
          ref={worldRef}
          className="journey__world"
          style={{ '--world-h': JOURNEY_WORLD_HEIGHT } as CSSProperties}
        >
          {/* 경로는 world와 같은 좌표계에 있고 카메라와 함께 움직인다. */}
          <svg
            className="journey__path"
            viewBox={`0 0 1920 ${JOURNEY_WORLD_HEIGHT}`}
            preserveAspectRatio="xMidYMin meet"
            aria-hidden="true"
            focusable="false"
          >
            {/* 아직 지나지 않은 길 */}
            <path className="journey__path-base" d={JOURNEY_PATH_D} />
            <path className="journey__path-base" d={JOURNEY_BRANCH_D} />
            {/* 지나온 길 — scroll에 따라 그려진다 */}
            <path className="journey__path-drawn" d={JOURNEY_PATH_D} />
            {/* 그려지는 머리 끝에 얹히는 짧은 Electric Ice */}
            <path className="journey__path-accent" d={JOURNEY_PATH_D} />
          </svg>

          {JOURNEY_NODES.map((node) => (
            <article
              key={node.id}
              className={`journey__node journey__node--${node.type}`}
              data-node={node.id}
              style={
                {
                  '--node-x': node.position.x,
                  '--node-y': node.position.y,
                  '--card-dx': node.cardOffset.x,
                  '--card-dy': node.cardOffset.y,
                } as CSSProperties
              }
            >
              {/* path 위에 찍히는 점. node와 경로가 같은 자리에서 만난다. */}
              <span className="journey__point" aria-hidden="true" />

              <div className="journey__card">
                <header className="journey__card-head">
                  {(node.index || node.label) && (
                    <p className="journey__index">{node.index ?? node.label}</p>
                  )}
                  {node.id === 'intro' ? (
                    <h2 className="journey__headline" id="journey-title">
                      {node.headline.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </h2>
                  ) : (
                    <h3 className="journey__headline">
                      {node.headline.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </h3>
                  )}
                </header>

                <div className="journey__card-body">
                  <NodeBody node={node} />
                </div>
              </div>

              {/* DOM 순서는 읽기 순서 그대로다 — 04 다음에 AI panel 다섯 장이 온다. */}
              {node.type === 'ai' && <JourneyAiStack />}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
