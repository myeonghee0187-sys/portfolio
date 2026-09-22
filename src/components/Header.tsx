import './Header.css'

/** Figma 111:439 — 1920 x 104, 좌우 120px 거터. */
export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <p className="site-header__brand">SONG MYEONG HEE</p>
        {/* 본문 Contact 섹션은 아직 없다. 추후 anchor 연결만 가능하도록 링크로 둔다. */}
        <a className="site-header__link" href="#contact">
          CONTACT
        </a>
      </div>
    </header>
  )
}
