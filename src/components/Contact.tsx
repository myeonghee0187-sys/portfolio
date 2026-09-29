import { useCallback, useEffect, useRef, useState } from 'react'
import WatchAssembly from './Watch/WatchAssembly'
import ContactModal from './ContactModal'
import LightRays from './LightRays/LightRays'
import useContactScene from '../hooks/useContactScene'
import useMediaQuery from '../hooks/useMediaQuery'
import { CONTACT_EMAIL } from './contactInfo'
import './Contact.css'

/** 복사 완료 표시(Copy -> Check)가 유지되는 시간(ms). */
const COPIED_MS = 1200

/** Clipboard API가 없거나 거부된 환경(비보안 origin 등)의 대체 복사. */
function copyWithSelection(text: string) {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  field.remove()
  return ok
}

type ContactProps = {
  /** scroll 연출이 켜져 있는지. 켜져 있으면 FACES부터 따라온 global Crown이 이 Watch에 다시 결합한다. */
  interactive: boolean
  /** Intro가 끝났는지. 측정은 Intro 이후에 한다(useScrollScene과 같은 기준). */
  ready: boolean
}

/**
 * Portfolio의 마지막 장면.
 *
 * 왼쪽: 큰 문장 하나 + 대화 시작(문의 form을 이 화면 위 modal로 연다) + 이메일.
 * 오른쪽 가운데: Apple Watch. 연출이 켜져 있으면 Journey까지 화면 오른쪽 아래에 있던 같은 Crown이
 * 이 Watch의 socket으로 돌아와 결합한다(useContactScene). 이 Watch는 그때 자기 Crown을 그리지 않는다.
 * 바닥: 작은 footer(모바일에서는 문장 -> 링크 -> Watch -> footer 순서로 쌓인다).
 *
 * data-contact-reveal 값은 등장할 때 올라오는 거리(px)다.
 */
export default function Contact({ interactive, ready }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(0)
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  useContactScene({ interactive, ready, sectionRef })

  /* 이메일 주소를 복사하고 1.2초 동안 아이콘만 Check로 바꾼다. Toast는 없다. */
  const copyEmail = useCallback(async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      ok = true
    } catch {
      ok = copyWithSelection(CONTACT_EMAIL)
    }
    if (!ok) return
    setCopied(true)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    // modal이 닫히면 열었던 버튼으로 focus를 돌려준다.
    requestAnimationFrame(() => ctaRef.current?.focus())
  }, [])

  return (
    <section ref={sectionRef} id="contact" className="contact" aria-labelledby="contact-title">
      {/*
        층 순서: Carbon Black 바탕(section) -> Light Rays -> 가독성 mask -> 문장 -> Watch -> Crown(global, fixed layer).
        Light Rays의 opacity(0 -> 0.5)는 Journey -> Contact 진입 때 useContactScene이 1.4초 동안 올린다.
      */}
      <div className="contact__rays" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor="#D4E5EF"
          raysSpeed={0.4}
          lightSpread={0.7}
          rayLength={3}
          followMouse={isFinePointer && !prefersReducedMotion}
          mouseInfluence={0.2}
          noiseAmount={0}
          distortion={0}
          className="custom-rays"
          pulsating={false}
          fadeDistance={0.9}
          saturation={0.3}
          static={prefersReducedMotion}
        />
      </div>
      <div className="contact__mask" aria-hidden="true" />

      <div className="contact__inner">
        <div className="contact__copy">
          <h2 id="contact-title" className="contact__title" data-contact-reveal="36">
            <span>LET&rsquo;S CREATE</span>
            <span>THE NEXT FACE</span>
          </h2>
          <div className="contact__actions">
            <button
              ref={ctaRef}
              type="button"
              className="contact__cta"
              aria-haspopup="dialog"
              onClick={() => setFormOpen(true)}
              data-contact-reveal="16"
            >
              START A CONVERSATION <span aria-hidden="true">&#8599;</span>
            </button>
            {/* 이메일: 누르면 주소를 복사한다. 오른쪽 아이콘이 Copy -> Check로 1.2초 동안 바뀌는 것이 전부다. */}
            <button
              type="button"
              className={`contact__email${copied ? ' is-copied' : ''}`}
              onClick={copyEmail}
              aria-label={`이메일 주소 복사 ${CONTACT_EMAIL}`}
              data-contact-reveal="16"
            >
              <span className="contact__email-label">{CONTACT_EMAIL}</span>
              <span className="contact__email-icon" aria-hidden="true">
                <svg className="contact__icon-copy" viewBox="0 0 20 20">
                  <rect x="6.5" y="6.5" width="9.5" height="9.5" rx="2" />
                  <path d="M13 6.5V5.5A2 2 0 0 0 11 3.5H5.5A2 2 0 0 0 3.5 5.5V11A2 2 0 0 0 5.5 13H6.5" />
                </svg>
                <svg className="contact__icon-check" viewBox="0 0 20 20">
                  <path d="M4.5 10.5 8.2 14 15.5 6.5" />
                </svg>
              </span>
            </button>
            {/* 보조기술에는 복사 결과를 짧게 알린다(화면에는 아이콘 변화만 있다). */}
            <span className="contact__sr" role="status">{copied ? '이메일 주소를 복사했습니다' : ''}</span>
          </div>
        </div>
      </div>

      {/*
        장식 visual. 세 층이 각자 한 가지만 맡는다.
          contact__watch        자리(오른쪽 세로 가운데)
          contact__watch-enter  등장 motion(GSAP)
          contact__watch-tilt   3/4 각도(CSS)와 결합 순간의 몇 px 이동(useContactScene)
      */}
      <div className="contact__watch" aria-hidden="true">
        <div className="contact__watch-enter">
          <div className="contact__watch-tilt">
            <WatchAssembly variant="contact" withCrown={!interactive} />
          </div>
        </div>
      </div>

      {/* 화면 바닥의 작은 footer. 모바일에서는 Watch 다음에 온다. */}
      <footer className="contact__footer">
        <span>SONG MYEONG HEE</span>
        <span>&copy; 2026</span>
      </footer>

      {formOpen && <ContactModal onClose={closeForm} />}
    </section>
  )
}
