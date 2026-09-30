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
const { mapJourneyFlow, journeyMinutesAt, pathExitDistance, pathEntryDistance } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

// Deliberately uneven distances model anchors measured from the actual SVG geometry.
const milestones = [
  { progress: 0, minutes: 13 * 60 + 40 },
  { progress: 0.137, minutes: 14 * 60 + 10 },
  { progress: 0.463, minutes: 15 * 60 },
  { progress: 0.812, minutes: 16 * 60 + 20 },
  { progress: 1, minutes: 17 * 60 },
]
const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`)

test('start clears the entire clock radius after leaving the intro card', () => {
  const path = { getTotalLength: () => 1000, getPointAtLength: s => ({ x: 0, y: 110 + s }) }
  const intro = { x: 0, y: 14, hw: 310, hh: 234 }
  const distance = pathExitDistance(path, intro, 57)
  // Bottom edge248, radius53 + gap4; entry animation is included in the box.
  near(distance, 195, 0.001)
  assert.ok(path.getPointAtLength(distance).y - intro.y - intro.hh >= 57)
})

test('safe start ignores empty path before the first card and finds its exit', () => {
  const path = { getTotalLength: () => 1000, getPointAtLength: s => ({ x: 0, y: s }) }
  const distance = pathExitDistance(path, { x: 0, y: 300, hw: 100, hh: 100 }, 36)
  near(distance, 436, 0.001)
})

test('the final clock stops fully clear of the last card and returns on the same path', () => {
  const path = { getTotalLength: () => 1000, getPointAtLength: s => ({ x: 0, y: s }) }
  const distance = pathEntryDistance(path, { x: 0, y: 1000, hw: 310, hh: 220 }, 57)
  near(distance, 723, 0.001)
  assert.ok(780 - path.getPointAtLength(distance).y >= 57)
  assert.ok(780 - path.getPointAtLength(distance - 10).y > 57)
})

test('uneven geometry anchors retain their exact path positions and story times', () => {
  for (const { progress, minutes } of milestones) {
    near(mapJourneyFlow(progress, milestones), progress)
    near(journeyMinutesAt(mapJourneyFlow(progress, milestones), milestones), minutes)
  }
  assert.equal(mapJourneyFlow(-0.1, milestones), 0)
  assert.equal(mapJourneyFlow(1.1, milestones), 1)
})

test('flow stays strictly forward without holds and slows on both sides of milestones', () => {
  let previous = mapJourneyFlow(0, milestones)
  for (let i = 1; i <= 10000; i++) {
    const current = mapJourneyFlow(i / 10000, milestones)
    assert.ok(current > previous, `flow must advance at sample ${i}`)
    previous = current
  }
  const step = 1e-5
  const slope = p => (mapJourneyFlow(p + step, milestones) - mapJourneyFlow(p - step, milestones)) / (2 * step)
  for (let i = 1; i < milestones.length - 1; i++) {
    const at = milestones[i].progress
    assert.ok(slope(at - 0.001) < slope((milestones[i - 1].progress + at) / 2))
    assert.ok(slope(at + 0.001) < slope((at + milestones[i + 1].progress) / 2))
  }
})

test('milestone mapping has continuous positive velocity from either direction', () => {
  const step = 1e-7
  for (const { progress } of milestones.slice(1, -1)) {
    const center = mapJourneyFlow(progress, milestones)
    const leftSlope = (center - mapJourneyFlow(progress - step, milestones)) / step
    const rightSlope = (mapJourneyFlow(progress + step, milestones) - center) / step
    assert.ok(leftSlope > 0 && rightSlope > 0)
    near(leftSlope, rightSlope, 1e-4)
  }
})

test('milestone speed remains between 30% and 45% of cruising speed', () => {
  const step = 1e-7
  const slope = p => (mapJourneyFlow(p + step, milestones) - mapJourneyFlow(p - step, milestones)) / (2 * step)
  for (let i = 1; i < milestones.length - 1; i++) {
    const at = milestones[i].progress
    const cruise = slope((milestones[i - 1].progress + at) / 2)
    const ratio = slope(at) / cruise
    assert.ok(ratio >= 0.3 && ratio <= 0.45, `milestone/cruise speed: ${ratio}`)
  }
})

test('reverse scroll retraces identical positions and minutes without reset or history', () => {
  const progress = Array.from({ length: 1001 }, (_, i) => i / 1000)
  const sample = p => {
    const flow = mapJourneyFlow(p, milestones)
    return { flow, minutes: journeyMinutesAt(flow, milestones) }
  }
  const forward = progress.map(sample)
  const reverse = progress.toReversed().map(sample).toReversed()
  assert.deepEqual(reverse, forward)
  for (let i = 1; i < forward.length; i++) assert.ok(forward[i].minutes > forward[i - 1].minutes)
})

test('time and analog angles stay continuous when minutes roll into the next hour', () => {
  const boundary = milestones[2].progress
  const before = journeyMinutesAt(boundary - 1e-7, milestones)
  const at = journeyMinutesAt(boundary, milestones)
  const after = journeyMinutesAt(boundary + 1e-7, milestones)
  assert.ok(before < 900 && after > 900)
  assert.equal(at, 900)
  assert.ok(after - before < 0.001)
  // Unwrapped angles preserve rotation while matching the requested clock face angles.
  for (const minutes of [before, at, after]) {
    near((minutes / 2) % 360, ((minutes / 60) % 12) * 30)
    near((minutes * 6) % 360, (minutes % 60) * 6)
  }
  assert.ok(after / 2 - before / 2 < 0.001)
  assert.ok(after * 6 - before * 6 < 0.01)
})

test('reduced motion removes easing while preserving clamped scroll progress and time', () => {
  for (const p of [-1, 0, 0.01, 0.137, 0.5, 0.812, 0.99, 1, 2]) {
    assert.equal(mapJourneyFlow(p, milestones, true), Math.max(0, Math.min(1, p)))
  }
  assert.equal(journeyMinutesAt(-1, milestones), 820)
  assert.equal(journeyMinutesAt(2, milestones), 1020)
})

test('the clock completes the remaining path after STILL UPDATING while retaining 17:00', () => {
  const last = 0.979962
  const measured = [...milestones.slice(0, -1), { progress: last, minutes: 1020 }]
  near(mapJourneyFlow(last, measured), last)
  let previous = last
  for (let i = 1; i <= 100; i++) {
    const progress = last + (1 - last) * i / 100
    const flow = mapJourneyFlow(progress, measured)
    assert.ok(flow > previous, `remaining path must advance at sample ${i}`)
    assert.equal(journeyMinutesAt(flow, measured), 1020)
    previous = flow
  }
  assert.equal(previous, 1)
  const step = 1e-7
  const leftSlope = (last - mapJourneyFlow(last - step, measured)) / step
  const rightSlope = (mapJourneyFlow(last + step, measured) - last) / step
  near(leftSlope, rightSlope, 1e-4)
  assert.ok(journeyMinutesAt(mapJourneyFlow(last - step, measured), measured) < 1020)
})
