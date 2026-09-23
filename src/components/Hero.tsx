import useMediaQuery from '../hooks/useMediaQuery'
import MagicRings from './MagicRings/MagicRings'
import WatchAssembly from './Watch/WatchAssembly'
import './Hero.css'

type HeroProps = {
  /**
   * scroll scene이 꺼진 환경(터치 / reduced motion / 좁은 화면)에서만 true.
   * 그 경우 Hero가 Watch를 직접 들고 있고, 켜져 있을 때는 WatchStage가 맡는다.
   * 어느 쪽이든 화면에 있는 Watch는 항상 하나다.
   */
  inlineWatch: boolean
}

/** Figma 98:19 — hero 1920 x 1000, inner 1680. */
export default function Hero({ inlineWatch }: HeroProps) {
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <section className="hero" id="hero">
      {/* 배경 장식. Hero 안에만 존재하며 Intro나 About에는 나타나지 않는다. */}
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

        {/*
          Watch가 있던 자리. 크기와 위치가 예전 .hero__watch와 완전히 같고
          눈에만 보이지 않는다. WatchStage가 Hero 쪽 좌표를 여기서 측정하므로,
          Hero 레이아웃이 바뀌어도 Watch가 따라온다.
        */}
        <div className="hero__watch-anchor" aria-hidden="true" />

        {inlineWatch && <WatchAssembly variant="hero" />}
      </div>
    </section>
  )
}
