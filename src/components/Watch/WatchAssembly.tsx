import useCurrentTime from '../../hooks/useCurrentTime'
import watchFaceSrc from '../../../assets/img/watch_face.png'
import digitalCrownSrc from '../../../assets/img/digital_crown.png'
import './WatchAssembly.css'

/** 프로젝트가 늘어나면 이 값만 수정한다. 화면에는 항상 두 자리로 표시된다. */
const WORKS_COUNT = 4

/**
 * hero  - Hero 안에 정적으로 놓이는 상태 (scroll scene이 꺼졌을 때)
 * about - About 안에 정적으로 놓이는 상태 (scroll scene이 꺼졌을 때)
 * stage - WatchStage(fixed 레이어)에 놓여 Hero <-> About을 오가는 상태.
 *         기본 좌표는 hero와 같고, 나머지는 전부 GSAP이 transform으로 얹는다.
 */
export type WatchVariant = 'hero' | 'about' | 'stage'

type WatchAssemblyProps = {
  variant: WatchVariant
}

/**
 * Hero와 About이 공유하는 단 하나의 Apple Watch.
 *
 * 마크업은 Hero(125:1056) / About(157:164) 어느 쪽에서도 동일하다.
 * 두 상태의 차이는 전부 CSS 변수 --wu(디자인 1px당 실제 px)와
 * variant modifier가 만들고, 그 사이를 GSAP이 보간한다.
 * 그래서 Hero의 Watch가 fade-out되고 About의 Watch가 fade-in되는 일이 없다.
 *
 * 내부 좌표계는 Figma Hero 기준인 600 x 760이다.
 * About(480 x 608)은 --wu에 0.8을 곱해 같은 좌표계를 그대로 쓴다.
 */
export default function WatchAssembly({ variant }: WatchAssemblyProps) {
  // Hero / About이 같은 source를 쓴다. 값이 새로 만들어지지 않고 그대로 이어진다.
  const currentTime = useCurrentTime()

  return (
    <div className={`watch watch--${variant}`}>
      {/* Figma asset의 실제 crop 위치·배율 그대로. Hero와 About이 같은 파일을 쓴다. */}
      <div className="watch__case">
        <img src={watchFaceSrc} alt="워치 페이스 형태로 표현한 포트폴리오 소개 화면" />
      </div>

      <div className="watch__content">
        <div className="watch__top">
          {/*
            time / name은 Hero <-> About에서 살아남는 두 요소다.
            지우고 다시 만드는 대신 transform(위치·크기)과 color만 바뀐다.
          */}
          <p className="watch__time">{currentTime}</p>
          <div className="watch__info">
            <p className="watch__name">SONG MYEONG HEE</p>
            {/* 아래 셋은 Hero 전용. About으로 가면서 사라진다. */}
            <p className="watch__role">WEB DESIGNER</p>
          </div>
        </div>

        <div className="watch__meta">
          <p className="watch__works">PROJECTS {String(WORKS_COUNT).padStart(2, '0')}</p>
          <p className="watch__status">
            <span>OPEN TO WORK</span>
          </p>
        </div>
      </div>

      {/* About 전용. Watch 정중앙에 놓이고 About에 진입하면서 나타난다. */}
      <p className="watch__title">
        <span>THE ONE</span>
        <span>BEHIND THE FACES</span>
      </p>

      {/*
        Digital Crown. transform이 세 겹으로 분리되어 있다.
          watch__crown       - Watch에 대한 고정 위치. Watch assembly와 함께 움직이는 부품.
          watch__crown-spin  - scroll rotation (GSAP). 다른 transform과 절대 섞지 않는다.
          watch__crown-rotor - asset을 세우는 고정 회전. 건드리지 않는다.
      */}
      <div className="watch__crown">
        <div className="watch__crown-spin">
          <div className="watch__crown-rotor">
            <div className="watch__crown-box">
              <div className="watch__crown-frame">
                <img src={digitalCrownSrc} alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
