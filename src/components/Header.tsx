import { useCallback, type MouseEvent } from 'react'
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

  const handleContactClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const contact = document.getElementById('contact')
    if (!contact || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
    history.replaceState(null, '', '#contact')
    window.scrollTo({ top: window.scrollY + contact.getBoundingClientRect().top - header, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [prefersReducedMotion])

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button type="button" className="site-header__brand" onClick={handleBrandClick}>
          SONG MYEONG HEE
        </button>
        {/* 실제 문서 흐름의 Contact 좌표를 사용해 pin 구간에서도 정확히 이동한다. */}
        <a className="site-header__link" href="#contact" onClick={handleContactClick}>
          CONTACT
        </a>
      </div>
    </header>
  )
}
