import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/Journey/journeyFlow.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
// Supply Vite's diagnostic flag without changing the renderer under test.
const moduleSource = `import.meta.env = { DEV: true };\n${outputText}`
const { createJourneyFlow } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)
const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`)

function style() {
  const key = name => name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  return {
    setProperty(name, value) { this[key(name)] = value },
    getPropertyValue(name) { return this[key(name)] ?? '' },
    removeProperty(name) { delete this[key(name)] },
  }
}

function fixture(range = { from: 0, to: 0.9 }) {
  const element = () => ({ style: style(), dataset: {} })
  const world = element(), marker = element(), hour = element(), minute = element(), active = element()
  world.querySelector = selector => {
    assert.equal(selector, '.journey__marker')
    return marker
  }
  marker.querySelector = selector => {
    const match = { '.journey__marker-hand--hour': hour, '.journey__marker-hand--minute': minute }[selector]
    assert.ok(match, `unexpected selector: ${selector}`)
    return match
  }
  // A unit-speed diagonal path and a scaled/rotated CTM expose unit-conversion errors.
  const geometry = { total: 1000, matrix: { a: 1.2, b: 0.9, c: -0.9, d: 1.2, e: 13, f: -9 } }
  const reads = { length: 0, matrix: 0 }
  active.getTotalLength = () => { reads.length++; return geometry.total }
  active.getCTM = () => { reads.matrix++; return geometry.matrix }
  active.getPointAtLength = distance => ({ x: 120 + 0.6 * distance, y: 60 + 0.8 * distance })
  const stops = [
    { progress: range.from, minutes: 820 },
    { progress: 0.25, minutes: 850 },
    { progress: 0.5, minutes: 900 },
    { progress: 0.75, minutes: 980 },
    { progress: range.to, minutes: 1020 },
  ]
  const flow = createJourneyFlow(world, active)
  flow.measure(stops, range)
  const expectedPoint = distance => {
    const p = active.getPointAtLength(distance), m = geometry.matrix
    return [p.x * m.a + p.y * m.c + m.e, p.x * m.b + p.y * m.d + m.f]
  }
  const clockPoint = () => {
    const match = /^translate3d\(([-\d.e]+)px, ([-\d.e]+)px, 0\)$/.exec(marker.style.transform)
    assert.ok(match, 'clock has a translated center')
    return match.slice(1).map(Number)
  }
  const snapshot = () => ({
    clock: marker.style.transform, hour: hour.style.transform, minute: minute.style.transform,
    dash: active.style.strokeDasharray, offset: active.style.strokeDashoffset,
    visibility: active.style.visibility,
  })
  return { world, marker, hour, minute, active, flow, geometry, range, reads, expectedPoint, clockPoint, snapshot }
}

function assertNoStroke(f) {
  const length = f.geometry.total * Math.hypot(f.geometry.matrix.a, f.geometry.matrix.b)
  near(parseFloat(f.active.style.strokeDasharray), length)
  near(parseFloat(f.active.style.strokeDashoffset), length)
  assert.equal(f.active.style.visibility, 'hidden', 'zero draw must not leave a round-cap dot')
}

function assertPaintedHead(f) {
  const scale = Math.hypot(f.geometry.matrix.a, f.geometry.matrix.b)
  const [drawn, gap] = f.active.style.strokeDasharray.split(' ').map(parseFloat)
  // The active line is painted from the path start (the first card's edge) up to the clock.
  const start = -parseFloat(f.active.style.strokeDashoffset)
  near(start, 0)
  assert.ok(drawn > 0)
  assert.ok(gap > f.geometry.total * scale, 'another dash cannot wrap into the path')
  assert.equal(f.active.style.visibility, 'visible')
  const expected = f.expectedPoint((start + drawn) / scale)
  f.clockPoint().forEach((value, i) => near(value, expected[i]))
}

function assertClockNotHidden(f) {
  for (const node of [f.world, f.marker]) {
    assert.equal(node.style.getPropertyValue('opacity'), '')
    assert.equal(node.style.getPropertyValue('visibility'), '')
    assert.equal(node.style.getPropertyValue('display'), '')
  }
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '')
  assert.equal(f.world.dataset.flowState, undefined)
}

test('zero flow keeps the clock at the physical path start and 13:40 while only the empty active stroke is hidden', () => {
  const f = fixture()
  assertNoStroke(f)
  assert.equal(f.flow.render(0), 0)
  assertNoStroke(f)
  assertClockNotHidden(f)
  const expected = f.expectedPoint(0)
  f.clockPoint().forEach((value, i) => near(value, expected[i]))
  assert.equal(f.hour.style.transform, 'translateX(-50%) rotate(410deg)')
  assert.equal(f.minute.style.transform, 'translateX(-50%) rotate(4920deg)')
  const waiting = f.snapshot()
  for (let i = 0; i < 10; i++) f.flow.render(0)
  assert.deepEqual(f.snapshot(), waiting, 'a stationary handoff cannot move or hide the waiting clock')
  assertNoStroke(f)
})

test('the first positive progress draws continuously from distance zero with no reveal gate', () => {
  for (const reduced of [false, true]) {
    const f = fixture()
    f.flow.render(0, reduced)
    const start = f.clockPoint()
    f.flow.render(1e-6, reduced)
    assertPaintedHead(f)
    assertClockNotHidden(f)
    assert.equal(parseFloat(f.active.style.strokeDashoffset), 0)
    const moved = Math.hypot(...f.clockPoint().map((value, i) => value - start[i]))
    assert.ok(moved > 0 && moved < 0.01, `first movement is continuous: ${moved}px`)
    f.flow.render(0, reduced)
    assertNoStroke(f)
    assertClockNotHidden(f)
    assert.deepEqual(f.clockPoint(), start)
  }
})

test('the continuous active line and clock retrace the full physical range in reverse using cached geometry', () => {
  const f = fixture()
  const progress = [0, 0.01, 0.137, 0.35, 0.65, 0.9, 1]
  const sample = p => {
    f.flow.render(p)
    if (p === 0) assertNoStroke(f)
    else assertPaintedHead(f)
    assertClockNotHidden(f)
    return f.snapshot()
  }
  const forward = progress.map(sample)
  const last = f.expectedPoint(f.geometry.total * f.range.to)
  f.clockPoint().forEach((value, i) => near(value, last[i]))
  assert.deepEqual(progress.toReversed().map(sample).toReversed(), forward)
  assert.deepEqual(f.reads, { length: 1, matrix: 1 }, 'scroll rendering uses the cached geometry')
})

test('remeasure recomputes unchanged progress and can return to the new physical start', () => {
  const f = fixture(), progress = 0.42
  f.flow.render(progress)
  const originalClock = f.marker.style.transform
  f.geometry.total = 1500
  f.geometry.matrix = { a: 0.6, b: 0.45, c: -0.45, d: 0.6, e: 5, f: -2 }
  f.flow.measure()
  assertNoStroke(f)
  f.flow.render(progress)
  assert.notEqual(f.marker.style.transform, originalClock)
  assertPaintedHead(f)
  f.flow.measure()
  f.flow.render(0)
  assertNoStroke(f)
  assertClockNotHidden(f)
  f.clockPoint().forEach((value, i) => near(value, f.expectedPoint(0)[i]))
})

test('a nonzero clock start lights the lead-in from the path start and aligns the clock', () => {
  const f = fixture({ from: 0.12, to: 0.9 })
  f.flow.render(0)
  assertPaintedHead(f)
  f.clockPoint().forEach((value, i) => near(value, f.expectedPoint(120)[i]))
  for (const p of [0.000001, 0.4, 1, 0.4]) {
    f.flow.render(p)
    assertPaintedHead(f)
    assertClockNotHidden(f)
  }
})

test('clear removes all owned visual state and preserves unrelated styles and data', () => {
  const f = fixture()
  f.world.style.setProperty('--unrelated', 'keep')
  f.world.dataset.unrelated = 'keep'
  f.flow.render(0.7)
  assert.ok(f.marker.dataset.flow)
  f.flow.clear()
  for (const prop of ['stroke-dasharray', 'stroke-dashoffset', 'visibility']) assert.equal(f.active.style.getPropertyValue(prop), '')
  for (const node of [f.marker, f.hour, f.minute]) assert.equal(node.style.getPropertyValue('transform'), '')
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '')
  assert.equal(f.world.dataset.flowState, undefined)
  assert.equal(f.marker.dataset.flow, undefined)
  assert.equal(f.world.style.getPropertyValue('--unrelated'), 'keep')
  assert.equal(f.world.dataset.unrelated, 'keep')
})
