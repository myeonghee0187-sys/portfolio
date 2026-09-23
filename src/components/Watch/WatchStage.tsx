import WatchAssembly from './WatchAssembly'
import './WatchStage.css'

/**
 * Hero와 About 사이를 오가는 Watch가 사는 fixed 레이어.
 *
 * 페이지 전체에서 단 하나만 마운트된다. Hero도 About도 자기 Watch를 갖지 않고,
 * 이 하나가 scroll progress를 따라 두 위치 사이를 이동한다.
 * 그래서 전환 중 Watch가 사라졌다 다시 생기는 구간이 없다.
 */
export default function WatchStage() {
  return (
    <div className="watch-stage" aria-hidden="true">
      <WatchAssembly variant="stage" />
    </div>
  )
}
