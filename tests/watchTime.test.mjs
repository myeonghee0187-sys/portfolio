import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/time/watchTime.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { createWatchTimeStore, formatWatchTime, millisecondsUntilNextMinute } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

test('formats visitor-local hours and minutes as zero-padded 24-hour watch text', () => {
  assert.equal(formatWatchTime(new Date(2026, 0, 2, 3, 7, 59, 999)), '03 : 07')
  assert.equal(formatWatchTime(new Date(2026, 0, 2, 15, 27)), '15 : 27')
  assert.equal(formatWatchTime(new Date(2026, 0, 2, 23, 59)), '23 : 59')
})

test('aligns updates to the next minute instead of polling every second', () => {
  assert.equal(millisecondsUntilNextMinute(new Date(2026, 0, 2, 3, 7, 0, 0)), 60_000)
  assert.equal(millisecondsUntilNextMinute(new Date(2026, 0, 2, 3, 7, 56, 789)), 3_211)
})

test('shares one timer and one listener set, resyncs on return, and cleans up after the final subscriber', () => {
  let now = new Date(2026, 0, 2, 15, 27, 12, 250)
  let nextTimer = 0
  const timers = new Map()
  const windowListeners = new Map()
  const visibilityListeners = new Set()
  const cleared = []
  const removed = []
  let visible = true

  const host = {
    now: () => now,
    setTimer: (callback, delay) => {
      const id = ++nextTimer
      timers.set(id, { callback, delay })
      return id
    },
    clearTimer: (id) => {
      cleared.push(id)
      timers.delete(id)
    },
    isVisible: () => visible,
    addWindowListener: (type, listener) => windowListeners.set(type, listener),
    removeWindowListener: (type, listener) => {
      assert.equal(windowListeners.get(type), listener)
      removed.push(type)
      windowListeners.delete(type)
    },
    addVisibilityListener: (listener) => visibilityListeners.add(listener),
    removeVisibilityListener: (listener) => {
      assert.ok(visibilityListeners.delete(listener))
      removed.push('visibilitychange')
    },
  }

  const store = createWatchTimeStore(host)
  let firstUpdates = 0
  let secondUpdates = 0
  const unsubscribeFirst = store.subscribe(() => { firstUpdates += 1 })
  const unsubscribeSecond = store.subscribe(() => { secondUpdates += 1 })

  assert.equal(store.getSnapshot(), '15 : 27')
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [47_750])
  assert.deepEqual([...windowListeners.keys()].sort(), ['focus', 'pageshow'])
  assert.equal(visibilityListeners.size, 1)

  visible = false
  now = new Date(2026, 0, 2, 15, 31, 45)
  visibilityListeners.values().next().value()
  assert.equal(firstUpdates, 0)
  assert.equal(timers.size, 1)

  visible = true
  windowListeners.get('focus')()
  assert.equal(store.getSnapshot(), '15 : 31')
  assert.deepEqual([firstUpdates, secondUpdates], [1, 1])
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [15_000])

  now = new Date(2026, 0, 2, 15, 32)
  const [timerId, minuteTimer] = timers.entries().next().value
  timers.delete(timerId)
  minuteTimer.callback()
  assert.equal(store.getSnapshot(), '15 : 32')
  assert.deepEqual([firstUpdates, secondUpdates], [2, 2])
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [60_000])

  now = new Date(2026, 0, 2, 15, 32, 20)
  windowListeners.get('pageshow')()
  assert.deepEqual([firstUpdates, secondUpdates], [2, 2], 'same-minute pageshow only realigns the timer')
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [40_000])

  now = new Date(2026, 0, 2, 15, 33, 10)
  visibilityListeners.values().next().value()
  assert.equal(store.getSnapshot(), '15 : 33')
  assert.deepEqual([firstUpdates, secondUpdates], [3, 3])
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [50_000])

  unsubscribeFirst()
  assert.equal(timers.size, 1)
  assert.equal(windowListeners.size, 2)

  unsubscribeSecond()
  assert.equal(timers.size, 0)
  assert.deepEqual(removed.sort(), ['focus', 'pageshow', 'visibilitychange'])
  assert.ok(cleared.length >= 2, 'resync and final cleanup clear the prior shared timer')

  removed.length = 0
  now = new Date(2026, 0, 2, 15, 40, 5)
  let resumedUpdates = 0
  const unsubscribeResumed = store.subscribe(() => { resumedUpdates += 1 })
  assert.equal(resumedUpdates, 1, 'the first returning subscriber receives the stale-snapshot correction')
  assert.equal(store.getSnapshot(), '15 : 40')
  assert.equal(timers.size, 1)
  assert.deepEqual([...timers.values()].map(({ delay }) => delay), [55_000])
  assert.deepEqual([...windowListeners.keys()].sort(), ['focus', 'pageshow'])
  assert.equal(visibilityListeners.size, 1)

  unsubscribeResumed()
  assert.equal(timers.size, 0)
  assert.deepEqual(removed.sort(), ['focus', 'pageshow', 'visibilitychange'])
})

test('minute-boundary scheduling rolls 23:59 over to local midnight', () => {
  let now = new Date(2026, 0, 2, 23, 59, 59, 750)
  let nextTimer = 0
  let timer = null
  const host = {
    now: () => now,
    setTimer: (callback, delay) => {
      timer = { id: ++nextTimer, callback, delay }
      return timer.id
    },
    clearTimer: (id) => {
      if (timer?.id === id) timer = null
    },
    isVisible: () => true,
    addWindowListener: () => {},
    removeWindowListener: () => {},
    addVisibilityListener: () => {},
    removeVisibilityListener: () => {},
  }

  const store = createWatchTimeStore(host)
  let updates = 0
  const unsubscribe = store.subscribe(() => { updates += 1 })
  assert.equal(store.getSnapshot(), '23 : 59')
  assert.equal(timer.delay, 250)

  const midnightTimer = timer
  timer = null
  now = new Date(2026, 0, 3, 0, 0)
  midnightTimer.callback()
  assert.equal(store.getSnapshot(), '00 : 00')
  assert.equal(updates, 1)
  assert.equal(timer.delay, 60_000)

  unsubscribe()
  assert.equal(timer, null)
})
