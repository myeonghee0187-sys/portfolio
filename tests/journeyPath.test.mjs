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
const { longSCurve, journeySCurve } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

function parsePath(d) {
  assert.deepEqual(d.match(/[A-Za-z]/g), ['M', 'C', 'C', 'C'], 'one move and exactly three long cubics')
  const values = d.match(/-?\d+(?:\.\d+)?/g).map(Number)
  assert.equal(values.length, 20)
  assert.ok(values.every(Number.isFinite))
  const curves = []
  let start = { x: values[0], y: values[1] }
  for (let i = 2; i < values.length; i += 6) {
    const end = { x: values[i + 4], y: values[i + 5] }
    curves.push([start, { x: values[i], y: values[i + 1] }, { x: values[i + 2], y: values[i + 3] }, end])
    start = end
  }
  return curves
}

function at(curve, t) {
  const u = 1 - t
  const p = {}, v = {}, a = {}
  for (const axis of ['x', 'y']) {
    const [p0, p1, p2, p3] = curve.map(point => point[axis])
    p[axis] = u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3
    v[axis] = 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2)
    a[axis] = 6 * u * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)
  }
  return { p, v, a }
}

function samples(curves) {
  return curves.flatMap((curve, index) => Array.from({ length: 1001 }, (_, i) => ({ ...at(curve, i / 1000), index })))
}

function assertShape(curves, scale = 1) {
  let turns = 0, previousSign = 0, minimumRadius = Infinity
  for (const { v, a } of samples(curves)) {
    assert.ok(v.y > 0, 'vertical progress must be strictly increasing')
    const sign = Math.abs(v.x) < 1e-8 ? 0 : Math.sign(v.x)
    if (sign && previousSign && sign !== previousSign) turns++
    if (sign) previousSign = sign
    const cross = Math.abs(v.x * a.y - v.y * a.x)
    if (cross > 1e-8) minimumRadius = Math.min(minimumRadius, Math.hypot(v.x, v.y) ** 3 / cross * scale)
  }
  assert.ok(turns <= 2, `${turns} horizontal direction reversals create extra wiggles`)
  assert.ok(minimumRadius >= 220, `minimum screen curvature radius ${minimumRadius}px is below 220px`)
  for (let i = 1; i < curves.length; i++) {
    const before = at(curves[i - 1], 1).v, after = at(curves[i], 0).v
    assert.ok(before.y > 0 && after.y > 0)
    assert.ok(Math.abs(before.x / before.y) < 1e-9 && Math.abs(after.x / after.y) < 1e-9,
      'both sides of each join must share the same vertical tangent')
  }
  return minimumRadius
}

function clearanceAt(p, box) {
  return Math.hypot(
    Math.max(box.x - box.hw - p.x, 0, p.x - box.x - box.hw),
    Math.max(box.y - box.hh - p.y, 0, p.y - box.y - box.hh),
  )
}

// Embedded measurements from the prior browser QA; tests do not depend on ignored logs.
const fixtures = [
  { name: '1920', scale: 1905 / 1920, width: 620, height: 439.99, diameter: 106 },
  { name: '1440', scale: 1425 / 1920, width: 465, height: 366.656, diameter: 102 },
  { name: '1024', scale: 1009 / 1920, width: 395.24, height: 340, diameter: 88 },
]
const centers = [[960, 0], [470, 1060], [1420, 1500], [1450, 2180], [470, 2900], [1250, 3560], [960, 4750]]
const boxesFor = fixture => centers.map(([x, y]) => ({
  x, y, hw: fixture.width / fixture.scale / 2, hh: fixture.height / fixture.scale / 2,
}))

for (const fixture of fixtures) {
  test(`${fixture.name}: three broad cubics retain clear cards, bounded offsets and smooth motion`, context => {
    const original = boxesFor(fixture), snapshot = original.map(box => ({ ...box }))
    const clearance = (fixture.diameter / 2 + 4) / fixture.scale
    const result = journeySCurve(original, clearance)
    assert.deepEqual(original, snapshot, 'geometry measurement must not mutate card inputs')
    assert.equal(result.boxes.length, original.length)
    assert.equal(result.offsets.length, original.length)
    for (let i = 0; i < original.length; i++) {
      assert.ok(Math.abs(result.offsets[i] * fixture.scale) <= 70, 'card adjustment exceeds 70 screen pixels')
      assert.equal(result.boxes[i].y, original[i].y)
      assert.equal(result.boxes[i].hw, original[i].hw)
      assert.equal(result.boxes[i].hh, original[i].hh)
      assert.ok(Math.abs(result.boxes[i].x - original[i].x - result.offsets[i]) < 1e-8)
    }
    for (const i of [0, 3, 6]) assert.equal(result.offsets[i], 0, 'only the two opposing pairs may move')
    const curves = parsePath(result.d)
    const minimumRadius = assertShape(curves, fixture.scale)
    // The pinned hook trims the interior intro/final endpoints; include its 28px intro travel.
    const firstY = result.boxes[0].y + result.boxes[0].hh + clearance + 28 / fixture.scale
    const lastY = result.boxes[6].y - result.boxes[6].hh - clearance
    let count = 0, minimumGap = Infinity
    for (const { p } of samples(curves)) {
      if (p.y < firstY || p.y > lastY) continue
      count++
      for (let i = 0; i < result.boxes.length; i++) {
        const distance = clearanceAt(p, result.boxes[i])
        minimumGap = Math.min(minimumGap, distance * fixture.scale - fixture.diameter / 2)
        assert.ok(distance >= clearance - 0.03 / fixture.scale,
          `card ${i} clearance is ${distance * fixture.scale}px at (${p.x}, ${p.y})`)
      }
    }
    assert.ok(count > 2000, 'inspect the entire visible route densely')
    context.diagnostic(`minimum radius ${minimumRadius.toFixed(2)}px; clock/card gap ${minimumGap.toFixed(2)}px`)
  })
}

test('mobile three-span gutter curve keeps the complete clock inside the viewport and clear of every card', context => {
  const worldWidth = 375, radius = 36, cardLeft = 92, cardWidth = 262.667
  const heights = [345.542, 283.375, 213.406, 259.188, 287.99, 363.51, 235]
  let top = 100
  const boxes = heights.map(height => {
    const box = { x: cardLeft + cardWidth / 2, y: top + height / 2, hw: cardWidth / 2, hh: height / 2 }
    top += height + 64
    return box
  })
  const left = radius + 4, right = cardLeft - radius - 4, x = (left + right) / 2
  const firstY = boxes[0].y + boxes[0].hh + radius + 4, lastY = boxes.at(-1).y
  const span = lastY - firstY
  const curves = parsePath(longSCurve([
    { x, y: firstY }, { x: right, y: firstY + span / 3 },
    { x: left, y: firstY + span * 2 / 3 }, { x, y: lastY },
  ]))
  const minimumRadius = assertShape(curves)
  assert.ok(curves[0][0].y - radius >= boxes[0].y + boxes[0].hh + 4 - 0.001,
    'first endpoint must clear the intro card with the complete clock radius')
  for (const { p } of samples(curves)) {
    assert.ok(p.x - radius >= 4 - 0.001 && p.x + radius <= worldWidth - 4 + 0.001,
      'complete clock must stay within the mobile viewport')
    for (const box of boxes) assert.ok(clearanceAt(p, box) >= radius + 4 - 0.001, 'clock overlaps mobile card')
  }
  context.diagnostic(`minimum mobile curvature radius ${minimumRadius.toFixed(2)}px`)
})
