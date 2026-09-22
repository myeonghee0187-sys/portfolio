import useCurrentTime from '../hooks/useCurrentTime'
import useMediaQuery from '../hooks/useMediaQuery'
import MagicRings from './MagicRings/MagicRings'
import watchFaceSrc from '../../assets/img/watch_face.png'
import digitalCrownSrc from '../../assets/img/digital_crown.png'
import './Hero.css'

/** 프로젝트가 늘어나면 이 값만 수정한다. 화면에는 항상 두 자리로 표시된다. */
const WORKS_COUNT = 4

/** Figma 98:19 — hero 1920 x 1000, inner 1680. */
export default function Hero() {
  const currentTime = useCurrentTime()
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <section className="hero" id="hero">
      {/* 배경 장식. Hero 안에만 존재하며 Intro나 다른 섹션에는 나타나지 않는다. */}
      <div className="hero__rings" aria-hidden="true">
        <MagicRings
          color="#186DE5"
          colorTwo="#D4E5EF"
          ringCount={6}
          speed={prefersReducedMotion ? 0.15 : 0.7}
          attenuation={20.5}
          lineThickness={1}
          baseRadius={0.45}
          radiusStep={0.32}
          scaleRate={0.1}
          opacity={isFinePointer ? 0.18 : 0.14}
          blur={1}
          noiseAmount={0.1}
          rotation={0}
          ringGap={2}
          fadeIn={0.5}
          fadeOut={0.6}
          /* 마우스 반응은 데스크톱에서만, 그리고 아주 약하게. */
          followMouse={isFinePointer && !prefersReducedMotion}
          mouseInfluence={0.15}
          hoverScale={prefersReducedMotion ? 1 : 1.08}
          parallax={prefersReducedMotion ? 0 : 0.03}
          clickBurst={false}
        />
      </div>

      <div className="hero__inner">
        <h1 className="hero__headline">
          <span>ONE</span>
          <span>DESIGNER</span>
          <span>MANY FACES</span>
        </h1>

        <div className="hero__watch">
          <div className="hero__watch-image">
            <img src={watchFaceSrc} alt="워치 페이스 형태로 표현한 포트폴리오 소개 화면" />
          </div>

          <div className="hero__watch-content">
            <div className="hero__watch-top">
              <p className="hero__watch-time">{currentTime}</p>
              <div className="hero__watch-info">
                <p className="hero__watch-name">SONG MYEONG HEE</p>
                <p className="hero__watch-role">WEB DESIGNER</p>
              </div>
            </div>

            <div className="hero__watch-meta">
              <p className="hero__watch-works">PROJECTS {String(WORKS_COUNT).padStart(2, '0')}</p>
              <p className="hero__watch-status">
                <span>OPEN TO WORK</span>
              </p>
            </div>
          </div>
        </div>

        <div className="hero__crown">
          <div className="hero__crown-rotor">
            <div className="hero__crown-box">
              <div className="hero__crown-frame">
                <img src={digitalCrownSrc} alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
