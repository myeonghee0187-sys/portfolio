import { useRef } from 'react'
import WatchAssembly from './Watch/WatchAssembly'
import useContactScene from '../hooks/useContactScene'
import './Contact.css'

type ContactProps = {
  /** scroll 연출이 켜져 있는지. 켜져 있으면 FACES부터 따라온 global Crown이 이 Watch에 다시 결합한다. */
  interactive: boolean
  /** Intro가 끝났는지. 측정은 Intro 이후에 한다(useScrollScene과 같은 기준). */
  ready: boolean
}

const EMAIL = 'myeonghee0187@gmail.com'
const GITHUB = 'https://github.com/myeonghee0187-sys'

/**
 * Portfolio의 마지막 장면.
 *
 * 큰 문장 하나 + 연락 링크 두 개 + 넓은 여백 + 바닥의 작은 footer가 한 화면이다(form 없음).
 * Apple Watch는 오른쪽 아래의 마지막 visual이고, 연출이 켜져 있으면 Journey까지 화면 오른쪽 아래에 있던
 * 같은 Crown이 이 Watch의 socket으로 돌아와 결합한다(useContactScene). 이 Watch는 자기 Crown을 그리지 않는다.
 *
 * data-contact-reveal 값은 등장할 때 올라오는 거리(px)다.
 */
export default function Contact({ interactive, ready }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null)
  useContactScene({ interactive, ready, sectionRef })

  return (
    <section ref={sectionRef} id="contact" className="contact" aria-labelledby="contact-title">
      <div className="contact__inner">
        <div className="contact__copy">
          <p className="contact__status" data-contact-reveal="12">
            AVAILABLE FOR NEW OPPORTUNITIES
          </p>
          <h2 id="contact-title" className="contact__title" data-contact-reveal="36">
            <span>LET&rsquo;S CREATE</span>
            <span>THE NEXT FACE.</span>
          </h2>
          <p className="contact__note" data-contact-reveal="16">
            함께 새로운 경험을 만들어가고 싶습니다.
          </p>
          <ul className="contact__links" data-contact-reveal="16">
            <li>
              <a className="contact__link" href={`mailto:${EMAIL}`} aria-label={`이메일 보내기 ${EMAIL}`}>
                <span className="contact__link-label">EMAIL</span>
                <span aria-hidden="true">&#8599;</span>
              </a>
            </li>
            <li>
              <a
                className="contact__link"
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub 새 창에서 열기"
              >
                <span className="contact__link-label">GITHUB</span>
                <span aria-hidden="true">&#8599;</span>
              </a>
            </li>
          </ul>
        </div>

        {/* 장식 visual. 등장 motion은 바깥 box, 3/4 각도는 안쪽 box가 맡는다. */}
        <div className="contact__watch" aria-hidden="true">
          <div className="contact__watch-tilt">
            <WatchAssembly variant="contact" withCrown={!interactive} />
          </div>
        </div>

        <footer className="contact__footer">
          <span>SONG MYEONG HEE</span>
          <span>&copy; 2026</span>
        </footer>
      </div>
    </section>
  )
}
