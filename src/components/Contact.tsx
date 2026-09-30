import { useCallback, useEffect, useRef, useState } from 'react'
import WatchAssembly from './Watch/WatchAssembly'
import ContactModal from './ContactModal'
import RotatingWords from './RotatingWords'
import LightRays from './LightRays/LightRays'
import useContactScene from '../hooks/useContactScene'
import { useAllFacesOpen } from './AllFaces/allFacesStore'
import { CONTACT_EMAIL } from './contactInfo'
import './Contact.css'

type ContactProps = {
  /** scroll 연출이 켜져 있는지. 켜져 있으면 FACES부터 따라온 global Crown이 이 Watch에 다시 결합한다. */
  interactive: boolean
  /** Intro가 끝났는지. 측정은 Intro 이후에 한다(useScrollScene과 같은 기준). */
  ready: boolean
}

/** 복사됐다는 표시(Check)가 머무는 시간(ms). */
const COPIED_MS = 1200

/**
 * 클립보드에 글자를 넣는다. Clipboard API가 없거나 거부되면(권한 / http / 오래된 브라우저)
 * 화면 밖 textarea를 잠깐 만들어 선택한 뒤 execCommand('copy')로 한 번 더 시도한다.
 */
async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback으로 넘어간다 */
  }
  const active = document.activeElement as HTMLElement | null
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '-9999px'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  area.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  active?.focus({ preventScroll: true })
  return ok
}

/**
 * Portfolio의 마지막 장면.
 *
 * 왼쪽: 큰 문장 하나 + 대화 시작(문의 form을 이 화면 위 modal로 연다) + 이메일(누르면 주소 복사).
 * 오른쪽 가운데: Apple Watch. 연출이 켜져 있으면 Journey까지 화면 오른쪽 아래에 있던 같은 Crown이
 * 이 Watch의 socket으로 돌아와 결합한다(useContactScene). 이 Watch는 그때 자기 Crown을 그리지 않는다.
 * 바닥: 작은 footer(모바일에서는 문장 -> 링크 -> Watch -> footer 순서로 쌓인다).
 *
 * 층: 바탕(Carbon) -> Light Rays -> 가독성 mask -> 문장 -> Watch -> (global) Crown
 *
 * data-contact-reveal 값은 등장할 때 올라오는 거리(px)다.
 */
export default function Contact({ interactive, ready }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(0)
  const allFacesOpen = useAllFacesOpen()
  useContactScene({ interactive, ready, sectionRef })

  const closeForm = useCallback(() => {
    setFormOpen(false)
    // modal이 닫히면 열었던 버튼으로 focus를 돌려준다.
    requestAnimationFrame(() => ctaRef.current?.focus())
  }, [])

  const copyEmail = async () => {
    if (!(await copyText(CONTACT_EMAIL))) return
    setCopied(true)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
  }
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="contact"
      data-scene={interactive ? 'interactive' : 'static'}
      aria-labelledby="contact-title"
    >
      {/*
        Light Rays(React Bits). 위쪽 가운데에서 내려오는 느리고 옅은 빛. opacity는 진입할 때 0 -> 0.5(useContactScene).
        ALL FACES가 화면을 덮고 있는 동안에는 그리지 않는다.
      */}
      <div className="contact-light-rays" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor="#D4E5EF"
          raysSpeed={0.4}
          lightSpread={0.7}
          rayLength={3}
          followMouse={true}
          mouseInfluence={0.2}
          noiseAmount={0}
          distortion={0}
          className="custom-rays"
          pulsating={false}
          fadeDistance={0.9}
          saturation={0.3}
          paused={allFacesOpen}
        />
      </div>
      {/* 왼쪽 문장이 빛보다 늘 앞에 읽히도록 가라앉히는 막. */}
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
              {/* hover / keyboard focus 때 한 번, 문장과 ↗가 하나의 텍스트 유닛으로 함께 굴러 올라온다(문구는 그대로). */}
              <RotatingWords text="START A CONVERSATION" trailing={'\u2197'} />
            </button>
            {/* 메일 앱으로 가지 않고 주소를 복사한다. 줄 전체가 button이다(Enter / Space도 된다). */}
            <button
              type="button"
              className="contact__email"
              aria-label="이메일 주소 복사"
              aria-describedby="contact-email-address"
              data-copied={copied || undefined}
              onClick={copyEmail}
              data-contact-reveal="16"
            >
              <span id="contact-email-address" className="contact__email-label">
                {CONTACT_EMAIL}
              </span>
              <span className="contact__email-icon" aria-hidden="true">
                <svg className="contact__email-copy" viewBox="0 0 24 24" focusable="false">
                  <rect x="9" y="9" width="11" height="11" rx="2.2" />
                  <path d="M15 9V6.2A2.2 2.2 0 0 0 12.8 4H6.2A2.2 2.2 0 0 0 4 6.2v6.6A2.2 2.2 0 0 0 6.2 15H9" />
                </svg>
                <svg className="contact__email-check" viewBox="0 0 24 24" focusable="false">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </span>
            </button>
            <span className="contact__status" role="status">
              {copied ? '이메일 주소를 복사했습니다' : ''}
            </span>
          </div>
        </div>
      </div>

      {/*
        장식 visual. 세 층이 각자 한 가지만 맡는다.
          contact__watch        자리(오른쪽 세로 가운데)
          contact__watch-enter  등장 motion(GSAP)
          contact__watch-tilt   3/4 각도(CSS)
        연출이 꺼진 화면에서는 이 Watch의 Crown이 ALL FACES button이라 보조기술에서 닿아야 한다(글자는 WatchAssembly가 숨긴다).
      */}
      <div className="contact__watch" aria-hidden={interactive ? true : undefined}>
        <div className="contact__watch-enter">
          <div className="contact__watch-tilt">
            <WatchAssembly variant="contact" withCrown={!interactive} crownOpensAllFaces />
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
