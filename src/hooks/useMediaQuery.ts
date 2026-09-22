import { useEffect, useState } from 'react'

/** 미디어 쿼리 일치 여부를 구독한다. SSR이 없으므로 초기값도 바로 읽는다. */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)

    // 마운트 사이에 값이 바뀌었을 수 있으니 한 번 맞춰두고 구독한다.
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
