import { useCallback } from 'react'
import useMediaQuery from '../hooks/useMediaQuery'
import './Header.css'

/**
 * Figma 111:439 — 1920 x 104, 좌우 120px 거터.
 *
 * Intro가 끝난 뒤부터 Contact까지 화면 맨 위에 그대로 붙어 있다.
 * scroll 방향에 따라 숨었다 나타나지 않는다.
 *
 * 이 요소는 App 전역에 있고(About / FACES / Journey의 pin wrapper 바깥),
 * 어떤 ScrollTrigger의 transform도 받지 않는다.
 */
export default function Header() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // 브랜드는 페이지 맨 위로. Hero가 Header 바로 아래에서 시작하므로 anchor가 아니라 0으로 간다.
  const handleBrandClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [prefersReducedMotion])

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button type="button" className="site-header__brand" onClick={handleBrandClick}>
          SONG MYEONG HEE
        </button>
        {/*
          본문 Contact 섹션은 아직 없다. anchor는 그대로 두고, 섹션이 생기면
          index.css의 scroll-margin-top 덕분에 Header에 가리지 않고 멈춘다.
        */}
        <a className="site-header__link" href="#contact">
          CONTACT
        </a>
      </div>
    </header>
  )
}
