import { useCallback, useRef, useState } from 'react'
import WatchAssembly from './Watch/WatchAssembly'
import ContactModal from './ContactModal'
import useContactScene from '../hooks/useContactScene'
import { CONTACT_EMAIL } from './contactInfo'
import './Contact.css'

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
  useContactScene({ interactive, ready, sectionRef })

  const closeForm = useCallback(() => {
    setFormOpen(false)
    // modal이 닫히면 열었던 버튼으로 focus를 돌려준다.
    requestAnimationFrame(() => ctaRef.current?.focus())
  }, [])

  return (
    <section ref={sectionRef} id="contact" className="contact" aria-labelledby="contact-title">
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
            <a
              className="contact__email"
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label={`이메일 보내기 ${CONTACT_EMAIL}`}
              data-contact-reveal="16"
            >
              <span className="contact__email-label">{CONTACT_EMAIL}</span>
              <span aria-hidden="true">&#8599;</span>
            </a>
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
