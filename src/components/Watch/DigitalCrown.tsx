import { useRef, type CSSProperties } from 'react'
import digitalCrownSrc from '../../../assets/img/digital_crown.png'
import useCrownWheel from '../../hooks/useCrownWheel'
import useMediaQuery from '../../hooks/useMediaQuery'
import './DigitalCrown.css'

/*
 * digital_crown.png(2048 x 2048) 안의 knurl 원통. 단위는 원본 이미지 px.
 *
 * asset은 Crown을 비스듬히 내려다본 모습이다. 측면 벽의 홈은 원통 축과 평행한 세로선이고,
 * 각도 θ에 있는 홈은 x = cx + radius·sin θ 에 보인다. 그래서 가운데는 넓고 양끝으로 갈수록 촘촘하다.
 * 아래 값은 실루엣과 아래 테두리 타원에 맞춰 잰 것이고, 홈 간격은 벽 전체를 θ로 펴서 잰 평균이다.
 */
const KNURL = {
  cx: 1027, // 원통 축의 x
  radius: 504, // 원통 반지름(측면 실루엣)
  rimY: 1133, // 아래 테두리 타원의 중심 y
  rimRy: 198, // 아래 테두리 타원의 세로 반지름(내려다보는 각도에서 나온다)
  wallHeight: 228, // 아래 테두리에서 홈이 시작되는 톱니 끝까지
  pitch: (4.29 * Math.PI) / 180, // 홈 하나의 각도(한 바퀴에 약 84개)
}

/** .watch__crown-frame이 보여주는 원본 영역. DigitalCrown.css의 crop 값(194.31% / 285.24%)에서 나온다. */
const FRAME = { x: 494, y: 640, w: 1054, h: 718 }

/** 원본 px -> Crown 좌표계(frame 80 wu). Watch의 --wu를 곱하면 실제 px이 된다. */
const WU_PER_PX = 80 / FRAME.w

/** 원통 정면에서 홈 하나의 간격(wu). 위상 1이 곧 이만큼 굴러간 것이다. */
const KNURL_PITCH_WU = KNURL.radius * KNURL.pitch * WU_PER_PX

/**
 * 굴러가는 표면을 나누는 띠의 수와 범위. 실루엣 바로 앞(±84°)까지만 움직이고 그 바깥은 거의 멈춰 보인다.
 * 띠 하나가 8.4°라 이웃 띠와의 어긋남은 가장자리에서도 0.3px 아래다. 늘리면 매 프레임 style 계산만 늘어난다.
 */
const SLICE_COUNT = 20
const SLICE_RANGE = (84 * Math.PI) / 180

const pctX = (x: number) => ((x - FRAME.x) / FRAME.w) * 100
const pctY = (y: number) => ((y - FRAME.y) / FRAME.h) * 100
const rimAt = (theta: number) => KNURL.rimY + KNURL.rimRy * Math.cos(theta)

/*
 * 띠 하나는 원통의 좁은 각도 구간이다. 그 안에서는 원통을 평면으로 봐도 되므로,
 * 표면이 홈 하나(Δ)만큼 구르면 띠 안의 그림은 그 각도에서 보이는 만큼만 옮겨 간다.
 *   가로: radius·cos θ·Δ  — 정면은 크게, 가장자리는 거의 0 (원통의 원근)
 *   세로: rimRy·sin θ·Δ   — 테두리 타원을 따라가게 해서 톱니 끝과 아래 실루엣이 제자리에 남는다
 * 방향은 θ가 줄어드는 쪽이다. 화면에서는(-90° 회전 + 상하 반전) 아래로 흐른다.
 *
 * 위상은 홈 하나마다 0으로 돌아간다. 실제 asset의 홈은 하나하나 미세하게 달라서 그냥 되돌리면
 * 홈마다 작게 튄다. 그래서 띠마다 한 칸 뒤에 있는 표면(--next)을 하나 더 두고 위상만큼 겹쳐 보인다.
 * 위상 1에서 보이는 것은 --next뿐이고, 그 그림은 위상 0의 그림과 정확히 같다 — 되돌아가도 이음매가 없다.
 */
const SLICES = Array.from({ length: SLICE_COUNT }, (_, i) => {
  const step = (2 * SLICE_RANGE) / SLICE_COUNT
  const from = -SLICE_RANGE + i * step
  const mid = from + step / 2
  // 경계에 머리카락 같은 틈이 생기지 않도록 양옆으로 아주 조금 겹친다.
  const left = pctX(KNURL.cx + KNURL.radius * Math.sin(from)) - 0.15
  const right = pctX(KNURL.cx + KNURL.radius * Math.sin(from + step)) + 0.15
  return {
    '--slice-left': `${left.toFixed(3)}%`,
    '--slice-right': `${(100 - right).toFixed(3)}%`,
    '--slice-dx': (-KNURL.radius * Math.cos(mid) * KNURL.pitch * WU_PER_PX).toFixed(4),
    '--slice-dy': (KNURL.rimRy * Math.sin(mid) * KNURL.pitch * WU_PER_PX).toFixed(4),
  } as CSSProperties
})

/*
 * 홈이 있는 측면 벽만 남기는 clip. 아래 테두리에서 wallHeight 위(톱니 끝)까지다.
 * 위쪽 경계는 톱니가 원통 가장자리에서 더 솟아 보이는 만큼 양끝으로 갈수록 조금 올라가고,
 * 그 위의 광택 bevel과 top cap은 포함하지 않는다 — 광원이 고정된 반사는 움직이면 안 된다.
 * 아래쪽 경계는 실루엣보다 3px 안쪽이다. 반투명한 외곽선은 shell 하나만 그려야 두 번 겹쳐 진해지지 않는다.
 */
const KNURL_CLIP = (() => {
  const degs = Array.from({ length: 61 }, (_, i) => -90 + i * 3)
  const point = (deg: number, y: (t: number) => number) => {
    const t = (deg * Math.PI) / 180
    return `${pctX(KNURL.cx + KNURL.radius * Math.sin(t)).toFixed(2)}% ${pctY(y(t)).toFixed(2)}%`
  }
  const top = degs.map((d) =>
    point(d, (t) => rimAt(t) - KNURL.wallHeight - 4 - 18 * Math.sin(t) ** 2),
  )
  const bottom = [...degs].reverse().map((d) => point(d, (t) => rimAt(t) - 3))
  return `polygon(${[...top, ...bottom].join(', ')})`
})()

/**
 * Apple Watch Digital Crown.
 *
 * Crown 자체(위치·크기·외곽·top cap·bevel 반사)는 움직이지 않는다.
 * page scroll에 따라 측면 knurl 홈만 원통을 따라 굴러간다.
 *
 *   watch__crown              Watch 기준 위치 (WatchAssembly.css)
 *   watch__crown-orientation  asset을 세우는 고정 방향 보정(-90° + 상하 반전). scroll과 무관하다.
 *   watch__crown-shell        Crown 전체 asset. 정지해 있는 몸체. top cap과 bevel의 광택 반사도
 *                             여기에 있고 mask 밖이라 표면이 굴러도 제자리에 있다(광원 고정).
 *   watch__crown-wheel-mask   측면 벽만 잘라낸다.
 *   watch__crown-wheel-track  같은 asset을 원통 각도별 띠(slice)로 나눠 --crown-wheel-phase만큼 옮긴다.
 *
 * 스스로 page scroll을 따라가므로 Watch에서 떼어 다른 곳에 두어도 그대로 동작한다.
 *
 * FACES에서는 같은 Crown이 화면 오른쪽 끝의 controller가 되면서 정면을 향한다(useScrollScene).
 * 옆모습(asset)을 rotateY로 억지로 돌리지 않고, 옆모습이 빠지는 자리에 정면 Crown이 3/4 각도에서
 * 펴지며 들어온다. 정면 Crown은 CSS로만 그린다.
 *   watch__crown-front-mount      고정된 dark titanium 받침(housing). 움직이지 않는다.
 *   watch__crown-front-wheel      knurl 톱니와 동심원 brushed cap. FACES slider 위치를 따라 rotateZ만 한다
 *                                 (useFacesInteraction). 이 layer 하나만 돈다.
 *   watch__crown-front-highlight  광원이 고정된 반사(frost specular, ice 반사, electric ice edge). 돌지 않는다.
 */
export default function DigitalCrown() {
  const trackRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useCrownWheel(trackRef, KNURL_PITCH_WU, !prefersReducedMotion)

  return (
    <div className="watch__crown" aria-hidden="true">
      <div className="watch__crown-side">
        <div className="watch__crown-orientation">
          <div className="watch__crown-box">
            <div className="watch__crown-frame">
              <img className="watch__crown-shell" src={digitalCrownSrc} alt="" />

              <div className="watch__crown-wheel-mask" style={{ clipPath: KNURL_CLIP }}>
                <div ref={trackRef} className="watch__crown-wheel-track">
                  {SLICES.map((style, i) => (
                    <div key={i} className="watch__crown-wheel-slice" style={style}>
                      <img
                        className="watch__crown-wheel-surface"
                        src={digitalCrownSrc}
                        alt=""
                        data-crown-wheel=""
                      />
                      <img
                        className="watch__crown-wheel-surface watch__crown-wheel-surface--next"
                        src={digitalCrownSrc}
                        alt=""
                        data-crown-wheel=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="watch__crown-front">
        <div className="watch__crown-front-mount" />
        <div className="watch__crown-front-wheel" />
        <div className="watch__crown-front-highlight" />
      </div>
    </div>
  )
}
