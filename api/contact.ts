import { sendContactEmail, validateContact } from './_contact.js'

/**
 * POST /api/contact — Vercel Serverless Function.
 * Validates on the server, then sends through the email provider with server-only env vars
 * (RESEND_API_KEY, CONTACT_FROM_EMAIL). The recipient is fixed in _contact.ts.
 * Responses never include provider details, stack traces or secrets.
 */
type Request = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const env = () => ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {})

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  const checked = validateContact(body)
  if (!checked.ok) {
    // Honeypot hits get a generic error too, so bots learn nothing.
    return res.status(400).json({ ok: false, error: 'invalid_request' })
  }
  const result = await sendContactEmail(checked.value, env(), fetch)
  if (result === 'sent') return res.status(200).json({ ok: true })
  if (result === 'unconfigured') return res.status(503).json({ ok: false, error: 'not_configured' })
  return res.status(502).json({ ok: false, error: 'send_failed' })
}
