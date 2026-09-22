import { useEffect, useState } from 'react'

/** Watch 표기 형식. 24시간제, 시/분만, 두 자리 고정, colon 좌우 공백 유지. */
export function formatWatchTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh} : ${mm}`
}

/**
 * 브라우저 로컬 시간을 "HH : MM"으로 돌려준다.
 *
 * 1초 interval을 돌리지 않고 다음 분 경계에 한 번씩만 깨어난다.
 * Hero의 Watch와 이후 About의 Watch가 같은 source를 그대로 재사용할 수 있다.
 */
export default function useCurrentTime(): string {
  const [time, setTime] = useState(() => formatWatchTime(new Date()))

  useEffect(() => {
    let timerId = 0

    const sync = () => {
      const now = new Date()
      setTime(formatWatchTime(now))

      // 다음 분이 바뀌는 순간까지만 기다린다. 50ms는 경계를 확실히 넘기기 위한 여유.
      const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds())
      timerId = window.setTimeout(sync, msToNextMinute + 50)
    }

    // 백그라운드 탭에서는 타이머가 지연되므로, 돌아왔을 때 한 번 맞춘다.
    const onVisibility = () => {
      if (document.hidden) return
      window.clearTimeout(timerId)
      sync()
    }

    sync()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(timerId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return time
}
