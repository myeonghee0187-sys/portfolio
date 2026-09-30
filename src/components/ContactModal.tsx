import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { CONTACT_EMAIL } from './contactInfo'
import './ContactModal.css'

/** 문의 종류. value는 영문 그대로 두고(보낼 데이터), 화면에는 label만 한국어로 보인다. */
const SUBJECTS = [
  { value: 'recruitment', label: '채용 제안' },
  { value: 'interview', label: '면접 제안' },
  { value: 'project', label: '프로젝트 문의' },
  { value: 'other', label: '기타' },
] as const
type Subject = (typeof SUBJECTS)[number]['value']

type Values = { name: string; company: string; email: string; subject: Subject | ''; message: string }
type Field = 'name' | 'company' | 'email' | 'message'
type Errors = Partial<Record<Field, string>>

const EMPTY: Values = { name: '', company: '', email: '', subject: '', message: '' }
const FIELD_ORDER: Field[] = ['name', 'company', 'email', 'message']

/** 뒤 화면을 scroll시키는 키. 입력 칸 / radio / button이 원래 쓰는 경우는 막지 않는다. */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '])

/**
 * 실제 전송. 이 프로젝트에는 아직 메일 전송 Provider(서버 API / 메일 서비스)가 없다.
 * TODO: Provider를 연결하면 이 함수를 채운다(성공이면 resolve, 실패면 reject).
 * 연결 전에는 전송하지 않고, 가짜 성공도 보여 주지 않는다 — success 상태는 이 함수가 실제로 resolve된 뒤에만 온다.
 */
const sendMessage: ((values: Values) => Promise<void>) | null = null

/**
 * 개발 서버 전용 QA mock. window.__contactSendMock = 'success' | 'error'일 때만 가짜 응답을 돌려준다.
 * production build에서는 import.meta.env.DEV가 false라 이 코드 자체가 빠진다 — 배포된 화면은 절대 가짜 성공을 보이지 않는다.
 */
const devSendMock: ((values: Values) => Promise<void>) | null = import.meta.env.DEV
  ? () => {
      const mode = (window as unknown as { __contactSendMock?: 'success' | 'error' }).__contactSendMock
      return new Promise<void>((resolve, reject) =>
        window.setTimeout(() => (mode === 'success' ? resolve() : reject(new Error('mock send failure'))), 900))
    }
  : null

/** 전송 상태. success는 실제 전송이 성공 응답을 준 뒤에만 된다. */
type SubmitState = 'idle' | 'sending' | 'success' | 'error'

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = '성함을 입력해 주세요.'
  if (!values.company.trim()) errors.company = '회사명을 입력해 주세요.'
  // 이메일뿐 아니라 전화번호 등 연락처도 받는다. 비어 있는지만 확인한다(형식은 강제하지 않는다).
  if (!values.email.trim()) errors.email = '회신 받을 이메일 또는 연락처를 입력해 주세요.'
  if (!values.message.trim()) errors.message = '전달할 내용을 입력해 주세요.'
  return errors
}

type ContactModalProps = {
  /** 닫힘 motion이 끝난 뒤 호출된다. 부모가 이 시점에 modal을 unmount한다. */
  onClose: () => void
}

/**
 * GET IN TOUCH — 같은 화면 위에 여는 문의 form.
 * 닫기: X / 바깥 click / ESC. 열려 있는 동안 뒤 화면은 scroll되지 않고, Tab은 modal 안에서만 돈다.
 */
export default function ContactModal({ onClose }: ContactModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const closingRef = useRef(false)
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<'idle' | 'unavailable'>('idle')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const successCloseRef = useRef<HTMLButtonElement>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0)
    tl.fromTo(
      panelRef.current,
      reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.985 },
      reduced
        ? { opacity: 1, duration: 0.3, ease: 'none' }
        : { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power3.out' },
      0,
    )
    firstFieldRef.current?.focus({ preventScroll: true })
    return () => {
      tl.kill()
    }
  }, [reduced])

  /*
   * 열려 있는 동안 뒤 화면 scroll을 막는다. overflow: hidden은 쓰지 않는다 — 스크롤바가 사라지며
   * 뒤 화면과 fixed layer가 좌우로 밀리기 때문이다. 대신 wheel / touch / scroll 키만 막는다.
   * panel 자체가 넘칠 만큼 길면(작은 화면) panel 안에서는 scroll된다.
   */
  useEffect(() => {
    const block = (event: Event) => {
      const panel = panelRef.current
      if (panel && panel.contains(event.target as Node) && panel.scrollHeight > panel.clientHeight + 1) return
      event.preventDefault()
    }
    document.addEventListener('wheel', block, { passive: false, capture: true })
    document.addEventListener('touchmove', block, { passive: false, capture: true })
    return () => {
      document.removeEventListener('wheel', block, { capture: true })
      document.removeEventListener('touchmove', block, { capture: true })
    }
  }, [])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    gsap
      .timeline({ onComplete: onClose })
      .to(panelRef.current, reduced ? { opacity: 0, duration: 0.2 } : { opacity: 0, y: 12, scale: 0.99, duration: 0.24, ease: 'power2.in' }, 0)
      .to(overlayRef.current, { opacity: 0, duration: 0.24, ease: 'power1.in' }, 0)
  }
  const requestCloseRef = useRef(requestClose)
  useEffect(() => {
    requestCloseRef.current = requestClose
  })

  // ESC로 닫고, Tab이 modal 밖으로 나가지 않게 한다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (SCROLL_KEYS.has(event.key)) {
        const target = event.target as HTMLElement
        const typing = target.matches('input:not([type="radio"]), textarea')
        const choosing = target.matches('input[type="radio"]') && event.key.startsWith('Arrow')
        const pressing = target.matches('button') && event.key === ' '
        if (!typing && !choosing && !pressing) event.preventDefault()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const update = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    // 한 번 보내 본 뒤에는 고치는 즉시 오류가 사라진다.
    if (submitted) setErrors(validate(next))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const nextErrors = validate(values)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      panelRef.current?.querySelector<HTMLElement>(`#contact-${firstInvalid}`)?.focus()
      setNotice('idle')
      return
    }
    const sender = sendMessage ?? (import.meta.env.DEV && (window as unknown as { __contactSendMock?: string }).__contactSendMock ? devSendMock : null)
    if (!sender) {
      setNotice('unavailable')
      return
    }
    if (submitState === 'sending') return
    setNotice('idle')
    setSubmitState('sending')
    try {
      await sender(values)
    } catch {
      // 실패: form과 입력값은 그대로 두고, 작은 안내만 보인다. 버튼은 다시 누를 수 있다.
      if (!closingRef.current) setSubmitState('error')
      return
    }
    if (closingRef.current) return
    // 실제 성공 응답 뒤에만: form이 짧게 사라지고 modal 안이 성공 상태로 바뀐다(자동으로 닫지 않는다).
    const form = formRef.current
    if (form && !reduced) await gsap.to(form, { opacity: 0, y: -6, duration: 0.22, ease: 'power1.in' })
    setSubmitState('success')
  }

  // 성공 상태가 되면 check / 문구가 들어오고, focus는 CLOSE로 옮긴다(보조기술도 성공을 알 수 있게 role="status").
  useLayoutEffect(() => {
    if (submitState !== 'success' || !successRef.current) return
    const root = successRef.current
    const check = root.querySelector('.contact-modal__success-check')
    const rest = root.querySelectorAll('.contact-modal__success-title, .contact-modal__success-text, .contact-modal__submit')
    const tl = gsap.timeline()
    if (reduced) {
      tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' })
    } else {
      tl.fromTo(check, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, 0)
      tl.fromTo(rest, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.05 }, 0.08)
    }
    successCloseRef.current?.focus({ preventScroll: true })
    return () => {
      tl.kill()
    }
  }, [submitState, reduced])

  const fieldProps = (field: Field) => ({
    id: `contact-${field}`,
    name: field,
    value: values[field],
    required: true,
    'aria-required': true,
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `contact-${field}-error` : undefined,
  })

  const errorText = (field: Field) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} className="contact-modal__error">
        {errors[field]}
      </p>
    ) : null

  return createPortal(
    <div className="contact-modal">
      <div ref={overlayRef} className="contact-modal__overlay" onMouseDown={requestClose} />
      <div
        ref={panelRef}
        className="contact-modal__panel"
        data-state={submitState}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <button type="button" className="contact-modal__close" aria-label="닫기" onClick={requestClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 id="contact-modal-title" className="contact-modal__title">
          GET IN TOUCH
        </h2>

        {submitState === 'success' ? (
          <div ref={successRef} className="contact-modal__success" role="status" aria-live="polite">
            <span className="contact-modal__success-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="contact-modal__success-title">MESSAGE SENT</p>
            <p className="contact-modal__success-text">
              메시지가 전달되었습니다.
              <br />
              확인 후 회신드리겠습니다.
            </p>
            <button ref={successCloseRef} type="button" className="contact-modal__submit" onClick={requestClose}>
              CLOSE
            </button>
          </div>
        ) : (
        <form ref={formRef} className="contact-modal__form" noValidate onSubmit={submit}>
          <div className="contact-modal__row">
            <div className="contact-modal__field">
              <label htmlFor="contact-name">
                NAME <span aria-hidden="true">*</span>
              </label>
              <input
                ref={firstFieldRef}
                type="text"
                autoComplete="name"
                placeholder="담당자 성함"
                onChange={(e) => update('name', e.target.value)}
                {...fieldProps('name')}
              />
              {errorText('name')}
            </div>
            <div className="contact-modal__field">
              <label htmlFor="contact-company">
                COMPANY <span aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                autoComplete="organization"
                placeholder="회사명"
                onChange={(e) => update('company', e.target.value)}
                {...fieldProps('company')}
              />
              {errorText('company')}
            </div>
          </div>

          <div className="contact-modal__field">
            <label htmlFor="contact-email" className="contact-modal__label-ko">
              회신 받을 이메일 또는 연락처 <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              autoComplete="on"
              placeholder="이메일 또는 연락처를 입력해주세요."
              onChange={(e) => update('email', e.target.value)}
              {...fieldProps('email')}
            />
            {errorText('email')}
          </div>

          <fieldset className="contact-modal__subjects">
            <legend>SUBJECT</legend>
            <div className="contact-modal__chips">
              {SUBJECTS.map((subject) => (
                <label key={subject.value} className="contact-modal__chip">
                  <input
                    type="radio"
                    name="subject"
                    value={subject.value}
                    checked={values.subject === subject.value}
                    onChange={() => update('subject', subject.value)}
                  />
                  <span>{subject.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="contact-modal__field">
            <label htmlFor="contact-message">
              MESSAGE <span aria-hidden="true">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="채용 포지션 또는 전달할 내용"
              onChange={(e) => update('message', e.target.value)}
              {...fieldProps('message')}
            />
            {errorText('message')}
          </div>

          <div className="contact-modal__actions">
            <button type="submit" className="contact-modal__submit" disabled={submitState === 'sending'} aria-busy={submitState === 'sending'}>
              {submitState === 'sending' ? (
                <>
                  SENDING
                  <span className="contact-modal__sending-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </>
              ) : (
                <>
                  SEND MESSAGE<span className="contact-modal__submit-arrow" aria-hidden="true">&#8599;</span>
                </>
              )}
            </button>
          </div>

          {/* 전송 실패 안내. 입력값은 그대로 남는다. 보조기술에는 조용히 읽힌다. */}
          <p className="contact-modal__send-error" aria-live="polite">
            {submitState === 'error' ? '전송하지 못했습니다. 잠시 후 다시 시도해주세요.' : ''}
          </p>

          {notice === 'unavailable' && (
            <p className="contact-modal__notice" role="status">
              아직 메시지 전송이 연결되어 있지 않습니다.{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>으로 직접 보내 주세요.
            </p>
          )}
        </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
