import WatchAssembly from './WatchAssembly'
import './WatchStage.css'

/**
 * Hero와 About 사이를 오가는 Watch가 사는 fixed 레이어.
 *
 * 페이지 전체에서 단 하나만 마운트된다. Hero도 About도 자기 Watch를 갖지 않고,
 * 이 하나가 scroll progress를 따라 두 위치 사이를 이동한다.
 * 그래서 전환 중 Watch가 사라졌다 다시 생기는 구간이 없다.
 */
type WatchStageProps = {
  /** 정면 Digital Crown(= FACES 이후의 global controller)을 눌렀을 때. */
  onOpenAllFaces?: () => void
}

export default function WatchStage({ onOpenAllFaces }: WatchStageProps) {
  return (
    /*
     * aria-hidden을 두지 않는다. 이 안에는 Watch face의 실제 텍스트와
     * ALL FACES를 여는 Crown button이 있어서 보조기술에서 닿아야 한다.
     * 레이어 자체는 pointer-events: none이고 Crown button만 auto로 열린다.
     */
    <>
      {/*
        About -> FACES에서 화면 전체의 노출이 잠깐 올라가는 빛(camera flash / 일출).
        About / FACES 위, Watch 아래에 screen으로 겹친다 — Watch display가 하얀 사각형처럼 밝아지지 않는다.
        Watch housing은 brightness로, display 유리는 전용 반사로 따로 빛을 받는다. 세기와 크기는 useScrollScene이 정한다.
      */}
      <div className="about-faces-bloom" aria-hidden="true" />
      <div className="watch-stage">
        <WatchAssembly variant="stage" onOpenAllFaces={onOpenAllFaces} />
      </div>
    </>
  )
}
