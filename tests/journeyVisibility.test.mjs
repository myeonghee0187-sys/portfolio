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
const { createJourneyFlow, journeyFlowVisibility } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)
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

function fixture() {
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
  const range = { from: 0.12, to: 0.9 }
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
    visibility: active.style.visibility, reveal: world.style.getPropertyValue('--journey-flow-opacity'),
    state: world.dataset.flowState,
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
  const start = -parseFloat(f.active.style.strokeDashoffset)
  near(start, f.geometry.total * scale * f.range.from)
  assert.ok(drawn > 0)
  assert.ok(gap > f.geometry.total * scale, 'another dash cannot wrap into the hidden prefix')
  assert.equal(f.active.style.visibility, 'visible')
  const expected = f.expectedPoint((start + drawn) / scale)
  f.clockPoint().forEach((value, i) => near(value, expected[i]))
}

test('the gate waits for both progress sources and actual handoff completion', () => {
  for (const reduced of [false, true]) {
    for (const [display, target, complete] of [[0, 0, true], [0, 0.4, true], [0.4, 0, true], [0.4, -0.1, true], [-0.1, 0.4, true], [0.4, 0.4, false]]) {
      assert.equal(journeyFlowVisibility(display, target, complete, reduced), 0)
    }
  }
  near(journeyFlowVisibility(0.005, 0.01), 0.25)
  near(journeyFlowVisibility(0.01, 0.005), 0.25)
  near(journeyFlowVisibility(0.01), 0.5)
  assert.equal(journeyFlowVisibility(0.02), 1)
  assert.equal(journeyFlowVisibility(2), 1)
  assert.equal(journeyFlowVisibility(0.00001, 0.00001, true, true), 1)
})

test('pre-active and zero flow paint no dot while the clock retains its exposed start and time', () => {
  const f = fixture()
  assertNoStroke(f)
  f.flow.render(0, false, 0)
  assertNoStroke(f)
  assert.equal(f.world.dataset.flowState, 'pre-active')
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '0.0000')
  const expected = f.expectedPoint(f.geometry.total * f.range.from)
  f.clockPoint().forEach((value, i) => near(value, expected[i]))
  assert.equal(f.hour.style.transform, 'translateX(-50%) rotate(410deg)')
  assert.equal(f.minute.style.transform, 'translateX(-50%) rotate(4920deg)')
  const clock = f.marker.style.transform
  f.flow.render(0, false, 0.5)
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '0.5000')
  assert.equal(f.world.dataset.flowState, 'active')
  assert.equal(f.marker.style.transform, clock)
  assertNoStroke(f)
})

test('handoff completion alone reveals an unchanged current position', () => {
  const f = fixture(), progress = 0.3
  f.flow.render(progress, false, journeyFlowVisibility(progress, progress, false))
  assertNoStroke(f)
  const before = f.snapshot()
  f.flow.render(progress, false, journeyFlowVisibility(progress, progress, true))
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '1.0000')
  assert.equal(f.world.dataset.flowState, 'active')
  assert.equal(f.marker.style.transform, before.clock)
  assert.equal(f.hour.style.transform, before.hour)
  assert.equal(f.minute.style.transform, before.minute)
  assertPaintedHead(f)
  // Reverse crossing closes immediately even if the displayed progress still lags.
  f.flow.render(progress, false, journeyFlowVisibility(progress, 0, true))
  assertNoStroke(f)
  assert.equal(f.world.dataset.flowState, 'pre-active')
})

test('visible dash begins at the exposed start and its head retraces the same clock in reverse', () => {
  const f = fixture()
  const progress = [0, 0.01, 0.137, 0.35, 0.65, 0.9, 1]
  const sample = p => {
    f.flow.render(p, false, 1)
    if (p === 0) assertNoStroke(f)
    else assertPaintedHead(f)
    return f.snapshot()
  }
  const forward = progress.map(sample)
  const last = f.expectedPoint(f.geometry.total * f.range.to)
  f.clockPoint().forEach((value, i) => near(value, last[i]))
  assert.deepEqual(progress.toReversed().map(sample).toReversed(), forward)
  assert.deepEqual(f.reads, { length: 1, matrix: 1 }, 'scroll rendering uses the cached geometry')
})

test('remeasure hides the stroke and recomputes unchanged progress without preserving stale reveal', () => {
  const f = fixture(), progress = 0.42
  f.flow.render(progress, false, 1)
  const originalClock = f.marker.style.transform
  f.geometry.total = 1500
  f.geometry.matrix = { a: 0.6, b: 0.45, c: -0.45, d: 0.6, e: 5, f: -2 }
  f.flow.measure()
  assertNoStroke(f)
  f.flow.render(progress, false, 1)
  assert.notEqual(f.marker.style.transform, originalClock)
  assertPaintedHead(f)
  f.flow.measure()
  f.flow.render(progress, false, 0)
  assertNoStroke(f)
  assert.equal(f.world.dataset.flowState, 'pre-active')
  assert.equal(f.world.style.getPropertyValue('--journey-flow-opacity'), '0.0000')
})

test('clear removes all owned visual state and preserves unrelated styles and data', () => {
  const f = fixture()
  f.world.style.setProperty('--unrelated', 'keep')
  f.world.dataset.unrelated = 'keep'
  f.flow.render(0.7, false, 1)
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
