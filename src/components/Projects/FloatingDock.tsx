import './FloatingDock.css'

export type FloatingDockProps = {
  liveUrl: string
  caseStudyUrl: string
}

function ExternalLinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M5 11 11 5M6.5 5H11v4.5" />
    </svg>
  )
}

export default function FloatingDock({ liveUrl, caseStudyUrl }: FloatingDockProps) {
  return (
    <nav className="floating-dock" aria-label="Project links">
      <a href={liveUrl} target="_blank" rel="noreferrer">
        <ExternalLinkIcon />
        <span>LIVE SITE</span>
      </a>
      <span className="floating-dock__divider" aria-hidden="true" />
      <a href={caseStudyUrl} target="_blank" rel="noreferrer">
        <ExternalLinkIcon />
        <span>CASE STUDY</span>
      </a>
    </nav>
  )
}
