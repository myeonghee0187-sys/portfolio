import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/Journey/journeyPath.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { detourJourneyPath } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

function parsePath(d) {
  const commands = d.match(/[A-Za-z]/g)
  assert.equal(commands[0], 'M')
  assert.ok(commands.slice(1).every(command => command === 'C'), 'one continuous M + C path')
  const values = d.match(/-?\d+(?:\.\d+)?/g).map(Number)
  assert.ok(values.every(Number.isFinite))
  assert.equal(values.length, 2 + (commands.length - 1) * 6)
  const curves = []
  let start = { x: values[0], y: values[1] }
  for (let i = 2; i < values.length; i += 6) {
    const end = { x: values[i + 4], y: values[i + 5] }
    curves.push([start, { x: values[i], y: values[i + 1] }, { x: values[i + 2], y: values[i + 3] }, end])
    start = end
  }
  return curves
}

function pointAt(curve, t) {
  const u = 1 - t
  return Object.fromEntries(['x', 'y'].map(axis => [axis,
    u ** 3 * curve[0][axis] + 3 * u * u * t * curve[1][axis] +
    3 * u * t * t * curve[2][axis] + t ** 3 * curve[3][axis],
  ]))
}

function parameterAtY(curve, y) {
  let low = 0, high = 1
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    if (pointAt(curve, mid).y < y) low = mid
    else high = mid
  }
  return (low + high) / 2
}

function samples(curves) {
  return curves.flatMap(curve => Array.from({ length: 33 }, (_, i) => pointAt(curve, i / 32)))
}

function assertClearance(curves, obstacles, radius) {
  for (const p of samples(curves)) {
    for (const box of obstacles) {
      const dx = Math.max(box.x - box.hw - p.x, 0, p.x - box.x - box.hw)
      const dy = Math.max(box.y - box.hh - p.y, 0, p.y - box.y - box.hh)
      assert.ok(Math.hypot(dx, dy) >= radius - 0.03,
        `clock radius ${radius} overlaps card at (${p.x}, ${p.y})`)
    }
  }
}

const original = 'M 0 0 C 80 180, -80 620, 0 900'

test('an obstacle-free path remains byte-for-byte unchanged', () => {
  assert.equal(detourJourneyPath(original, [], 42), original)
})

test('local detours preserve original vertical progression and distant path geometry', () => {
  const base = parsePath(original)[0]
  const curves = parsePath(detourJourneyPath(original, [{ x: 0, y: 450, hw: 70, hh: 90, side: 'right' }], 42))
  assert.deepEqual(curves[0][0], base[0])
  assert.deepEqual(curves.at(-1)[3], base[3])
  let previousY = -Infinity
  for (const curve of curves) {
    const t0 = parameterAtY(base, curve[0].y), t1 = parameterAtY(base, curve[3].y)
    for (let i = 0; i <= 32; i++) {
      const u = i / 32, p = pointAt(curve, u)
      assert.ok(p.y >= previousY - 1e-8, 'vertical travel must never reverse')
      previousY = p.y
      assert.ok(Math.abs(p.y - pointAt(base, t0 + (t1 - t0) * u).y) < 0.003,
        'detours must retain the original cubic vertical progression')
      if (p.y < 150 || p.y > 750) {
        const reference = pointAt(base, parameterAtY(base, p.y))
        assert.ok(Math.abs(p.x - reference.x) < 0.003, 'distant portions must retain their original geometry')
      }
    }
  }
})

for (const side of ['left', 'right']) {
  test(`${side} detour keeps the complete clock radius outside a rectangular card`, () => {
    const obstacle = { x: 0, y: 450, hw: 70, hh: 90, side }
    const curves = parsePath(detourJourneyPath(original, [obstacle], 42))
    assertClearance(curves, [obstacle], 42)
    const midpointSamples = samples(curves).filter(p => Math.abs(p.y - obstacle.y) < 20)
    assert.ok(midpointSamples.length > 0)
    assert.ok(midpointSamples.every(p => side === 'right' ? p.x >= 112 : p.x <= -112))
  })
}

test('subdivision and original cubic joins keep continuous nonzero tangents', () => {
  const d = 'M 0 0 C 80 100, -40 200, 0 300 C 40 400, -80 500, 0 600'
  const curves = parsePath(detourJourneyPath(d, [{ x: 0, y: 300, hw: 60, hh: 65, side: 'right' }], 36))
  for (let i = 1; i < curves.length; i++) {
    const before = curves[i - 1], after = curves[i]
    const incoming = { x: before[3].x - before[2].x, y: before[3].y - before[2].y }
    const outgoing = { x: after[1].x - after[0].x, y: after[1].y - after[0].y }
    assert.ok(Math.hypot(incoming.x, incoming.y) > 0)
    assert.ok(Math.hypot(outgoing.x, outgoing.y) > 0)
    assert.ok(incoming.x * outgoing.x + incoming.y * outgoing.y > 0, 'join must not reverse tangent')
    assert.ok(Math.hypot(incoming.x - outgoing.x, incoming.y - outgoing.y) < 0.003,
      `tangent discontinuity at cubic join ${i}`)
  }
})

test('adjacent opposite cards retain clearance through a feasible narrow corridor', () => {
  const d = 'M 0 0 C -400 266.667, 400 533.333, 0 800'
  const obstacles = [
    { x: -105, y: 300, hw: 55, hh: 135, side: 'right' },
    { x: 105, y: 500, hw: 55, hh: 135, side: 'left' },
  ]
  const curves = parsePath(detourJourneyPath(d, obstacles, 38))
  assertClearance(curves, obstacles, 38)
  const corridor = samples(curves).filter(p => p.y >= 365 && p.y <= 435)
  assert.ok(corridor.length > 0)
  assert.ok(corridor.every(p => p.x >= -12 - 0.03 && p.x <= 12 + 0.03))
})
