import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const load = async file => {
  const source = await readFile(new URL(`../api/${file}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return outputText
}
const shared = await load('_contact.ts')
const lib = await import(`data:text/javascript;base64,${Buffer.from(shared).toString('base64')}`)
const libUrl = `data:text/javascript;base64,${Buffer.from(shared).toString('base64')}`
const handlerSource = (await load('contact.ts')).replace("'./_contact'", `'${libUrl}'`)
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(handlerSource).toString('base64')}`)

const valid = { name: ' 김철수 ', company: 'ABC Company', contact: 'hr@abc.com', subject: 'recruitment', message: '안녕하세요' }

test('server validation trims, requires fields, limits length and allowed subjects', () => {
  const ok = lib.validateContact(valid)
  assert.equal(ok.ok, true)
  assert.equal(ok.value.name, '김철수')
  for (const key of ['name', 'company', 'contact', 'message']) {
    assert.equal(lib.validateContact({ ...valid, [key]: '   ' }).ok, false, `${key} required`)
    assert.equal(lib.validateContact({ ...valid, [key]: 'x'.repeat(lib.LIMITS[key] + 1) }).ok, false, `${key} max length`)
    assert.equal(lib.validateContact({ ...valid, [key]: 'x'.repeat(lib.LIMITS[key]) }).ok, true)
  }
  assert.equal(lib.validateContact({ ...valid, subject: 'hack' }).ok, false)
  assert.equal(lib.validateContact({ ...valid, subject: '' }).ok, true)
  assert.equal(lib.validateContact(null).ok, false)
  assert.equal(lib.validateContact({ ...valid, name: 42 }).ok, false)
})

test('honeypot rejects bots', () => {
  assert.deepEqual(lib.validateContact({ ...valid, website: 'http://spam' }), { ok: false, reason: 'spam' })
})

test('subject line, reply-to and escaped body', () => {
  const input = lib.validateContact({ ...valid, subject: 'interview', message: '<script>x</script>' }).value
  assert.equal(lib.mailSubject(input), '[Portfolio] 면접 제안 — ABC Company / 김철수')
  assert.equal(lib.replyToFor('hr@abc.com'), 'hr@abc.com')
  assert.equal(lib.replyToFor('010-1234-5678'), undefined)
  const { html, text } = lib.mailBodies(input)
  assert.ok(!html.includes('<script>') && html.includes('&lt;script&gt;'))
  for (const part of ['김철수', 'ABC Company', 'hr@abc.com', '면접 제안']) assert.ok(text.includes(part) && html.includes(part))
})

test('provider call: fixed recipient, reply-to only for emails, unconfigured and failures never succeed', async () => {
  const calls = []
  const fetchOk = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 } }
  const input = lib.validateContact({ ...valid, to: 'attacker@evil.com' }).value
  assert.equal(await lib.sendContactEmail(input, {}, fetchOk), 'unconfigured')
  assert.equal(calls.length, 0)
  const env = { RESEND_API_KEY: 'k', CONTACT_FROM_EMAIL: 'Portfolio <contact@example.com>' }
  assert.equal(await lib.sendContactEmail(input, env, fetchOk), 'sent')
  const payload = JSON.parse(calls[0].init.body)
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.deepEqual(payload.to, ['songmyeonghee0725@gmail.com'])
  assert.equal(payload.reply_to, 'hr@abc.com')
  const phone = lib.validateContact({ ...valid, contact: '010-1234-5678' }).value
  await lib.sendContactEmail(phone, env, fetchOk)
  assert.equal(JSON.parse(calls[1].init.body).reply_to, undefined)
  assert.equal(await lib.sendContactEmail(input, env, async () => ({ ok: false, status: 422 })), 'failed')
  assert.equal(await lib.sendContactEmail(input, env, async () => { throw new Error('network') }), 'failed')
})

test('handler: method, validation and not-configured responses expose no details', async () => {
  const call = async (req) => {
    let code = 0, body = null
    const res = { status(c) { code = c; return res }, json(b) { body = b }, setHeader() {} }
    await handler(req, res)
    return { code, body }
  }
  assert.deepEqual(await call({ method: 'GET' }), { code: 405, body: { ok: false, error: 'method_not_allowed' } })
  assert.deepEqual(await call({ method: 'POST', body: { ...valid, name: '' } }), { code: 400, body: { ok: false, error: 'invalid_request' } })
  assert.deepEqual(await call({ method: 'POST', body: { ...valid, website: 'x' } }), { code: 400, body: { ok: false, error: 'invalid_request' } })
  // No credentials in this test environment: never a fake success.
  assert.deepEqual(await call({ method: 'POST', body: JSON.stringify(valid) }), { code: 503, body: { ok: false, error: 'not_configured' } })
})
