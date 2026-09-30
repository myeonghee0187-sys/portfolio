/**
 * Contact form — shared server logic (validation + email payload).
 * The underscore prefix keeps this file from becoming its own Vercel route.
 * Everything here runs server-side only; nothing is bundled into the client.
 */

/** The only recipient. Never taken from user input. */
export const CONTACT_TO_EMAIL = 'songmyeonghee0725@gmail.com'

export const SUBJECT_LABELS = {
  recruitment: '채용 제안',
  interview: '면접 제안',
  project: '프로젝트 문의',
  other: '기타',
} as const
export type SubjectKey = keyof typeof SUBJECT_LABELS

export const LIMITS = { name: 100, company: 150, contact: 200, message: 5000 } as const

export type ContactInput = { name: string; company: string; contact: string; subject: SubjectKey | ''; message: string }

type Result = { ok: true; value: ContactInput } | { ok: false; reason: 'invalid' | 'spam' }

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Server-side validation. Client validation is never trusted. */
export function validateContact(body: unknown): Result {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid' }
  const raw = body as Record<string, unknown>
  // Honeypot: a hidden "website" field real people never fill in.
  if (text(raw.website)) return { ok: false, reason: 'spam' }
  const value: ContactInput = {
    name: text(raw.name),
    company: text(raw.company),
    contact: text(raw.contact),
    subject: '',
    message: text(raw.message),
  }
  const subject = text(raw.subject)
  if (subject) {
    if (!(subject in SUBJECT_LABELS)) return { ok: false, reason: 'invalid' }
    value.subject = subject as SubjectKey
  }
  for (const key of ['name', 'company', 'contact', 'message'] as const) {
    if (!value[key] || value[key].length > LIMITS[key]) return { ok: false, reason: 'invalid' }
  }
  return { ok: true, value }
}

const EMAIL = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/

/** Only a plain email address becomes Reply-To; phone numbers etc. stay in the body only. */
export function replyToFor(contact: string) {
  return EMAIL.test(contact) ? contact : undefined
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Mail subject: "[Portfolio] 채용 제안 — 회사명 / 담당자명" (no line breaks from user input). */
export function mailSubject(input: ContactInput) {
  const kind = input.subject ? SUBJECT_LABELS[input.subject] : '문의'
  return `[Portfolio] ${kind} — ${input.company} / ${input.name}`.replace(/[\r\n]+/g, ' ')
}

export function mailBodies(input: ContactInput) {
  const kind = input.subject ? SUBJECT_LABELS[input.subject] : '선택 안 함'
  const rows: [string, string][] = [
    ['담당자명', input.name],
    ['회사명', input.company],
    ['회신 받을 이메일 또는 연락처', input.contact],
    ['문의 유형', kind],
  ]
  const textBody = [...rows.map(([k, v]) => `${k}: ${v}`), '', '메시지:', input.message].join('\n')
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#111">
<h2 style="font-size:17px;margin:0 0 16px">Portfolio 문의가 도착했습니다</h2>
<table style="border-collapse:collapse;margin-bottom:18px">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<div style="color:#666;margin-bottom:6px">메시지</div>
<div style="white-space:pre-wrap;border-left:3px solid #186de5;padding:4px 0 4px 12px">${escapeHtml(input.message)}</div>
</div>`
  return { text: textBody, html }
}

type Env = Record<string, string | undefined>
type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number }>

/**
 * Sends through Resend's REST API with the server-side key.
 * Returns 'unconfigured' when the credentials are missing (no fake success).
 */
export async function sendContactEmail(input: ContactInput, env: Env, fetchImpl: Fetch): Promise<'sent' | 'unconfigured' | 'failed'> {
  const apiKey = env.RESEND_API_KEY, from = env.CONTACT_FROM_EMAIL
  if (!apiKey || !from) return 'unconfigured'
  const { text: textBody, html } = mailBodies(input)
  const replyTo = replyToFor(input.contact)
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [CONTACT_TO_EMAIL],
        subject: mailSubject(input),
        text: textBody,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    return response.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
