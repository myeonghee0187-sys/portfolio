import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/hooks/journeyLighting.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { journeyAmbientAt, CONTACT_ENTRY_LIGHT } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`)

test('Journey stays exactly unlit from its start through 78 percent', () => {
  for (let i = 0; i <= 780; i++) assert.equal(journeyAmbientAt(i / 1000), 0)
  assert.equal(journeyAmbientAt(0.78), 0)
})

test('late light reaches the requested knots and the shared Contact entry level', () => {
  for (const [progress, light] of [[0.78, 0], [0.88, 0.08], [0.96, 0.22], [1, 0.38]]) {
    near(journeyAmbientAt(progress), light)
  }
  assert.equal(CONTACT_ENTRY_LIGHT, 0.38)
  assert.equal(journeyAmbientAt(1), CONTACT_ENTRY_LIGHT)
  near(journeyAmbientAt(0.83), 0.04)
  near(journeyAmbientAt(0.92), 0.15)
  near(journeyAmbientAt(0.98), 0.30)
})

test('late lighting rises continuously without a jump or reversal', () => {
  let previous = journeyAmbientAt(0.78)
  for (let i = 1; i <= 2200; i++) {
    const current = journeyAmbientAt(0.78 + i / 10000)
    assert.ok(current >= previous && current <= CONTACT_ENTRY_LIGHT)
    assert.ok(current - previous <= 0.000401, 'adjacent samples must not produce a visible jump')
    previous = current
  }
  for (const knot of [0.78, 0.88, 0.96, 1]) {
    const center = journeyAmbientAt(knot)
    near(journeyAmbientAt(knot - 1e-8), center, 1e-7)
    near(journeyAmbientAt(knot + 1e-8), center, 1e-7)
  }
})

test('reverse and arbitrary seeking retrace identical lighting without history', () => {
  const progress = [0, 0.3, 0.77, 0.78, 0.79, 0.83, 0.88, 0.92, 0.96, 0.98, 1]
  const forward = progress.map(journeyAmbientAt)
  const reverse = progress.toReversed().map(journeyAmbientAt).toReversed()
  assert.deepEqual(reverse, forward)
  for (const p of [0.98, 0, 1, 0.78, 0.92, 0.3, 0.88, 0.77]) {
    assert.equal(journeyAmbientAt(p), forward[progress.indexOf(p)])
  }
})

test('progress outside the Journey clamps to its dark and Contact boundaries', () => {
  for (const p of [-Infinity, -100, -1, -0.001]) assert.equal(journeyAmbientAt(p), 0)
  for (const p of [1.0001, 2, 100, Infinity]) assert.equal(journeyAmbientAt(p), CONTACT_ENTRY_LIGHT)
})
