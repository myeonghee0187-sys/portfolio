export const formatWatchTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours} : ${minutes}`
}

export const millisecondsUntilNextMinute = (date: Date) =>
  60_000 - (date.getSeconds() * 1_000 + date.getMilliseconds())

type WindowEvent = 'focus' | 'pageshow'

export type WatchTimeHost = {
  now: () => Date
  setTimer: (callback: () => void, delay: number) => number
  clearTimer: (timer: number) => void
  isVisible: () => boolean
  addWindowListener: (type: WindowEvent, listener: () => void) => void
  removeWindowListener: (type: WindowEvent, listener: () => void) => void
  addVisibilityListener: (listener: () => void) => void
  removeVisibilityListener: (listener: () => void) => void
}

const browserHost: WatchTimeHost = {
  now: () => new Date(),
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: (timer) => window.clearTimeout(timer),
  isVisible: () => document.visibilityState !== 'hidden',
  addWindowListener: (type, listener) => window.addEventListener(type, listener),
  removeWindowListener: (type, listener) => window.removeEventListener(type, listener),
  addVisibilityListener: (listener) => document.addEventListener('visibilitychange', listener),
  removeVisibilityListener: (listener) => document.removeEventListener('visibilitychange', listener),
}

export function createWatchTimeStore(host: WatchTimeHost = browserHost) {
  const listeners = new Set<() => void>()
  let snapshot = formatWatchTime(host.now())
  let timer: number | null = null

  const refresh = (now: Date) => {
    const next = formatWatchTime(now)
    if (next === snapshot) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  const schedule = (now: Date) => {
    if (timer !== null) host.clearTimer(timer)
    timer = host.setTimer(onMinuteBoundary, millisecondsUntilNextMinute(now))
  }

  const synchronize = () => {
    const now = host.now()
    refresh(now)
    schedule(now)
  }

  function onMinuteBoundary() {
    timer = null
    if (listeners.size > 0) synchronize()
  }

  const onVisibilityChange = () => {
    if (host.isVisible()) synchronize()
  }

  const start = () => {
    host.addWindowListener('focus', synchronize)
    host.addWindowListener('pageshow', synchronize)
    host.addVisibilityListener(onVisibilityChange)
    synchronize()
  }

  const stop = () => {
    if (timer !== null) host.clearTimer(timer)
    timer = null
    host.removeWindowListener('focus', synchronize)
    host.removeWindowListener('pageshow', synchronize)
    host.removeVisibilityListener(onVisibilityChange)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      if (listeners.size === 1) start()
      let active = true
      return () => {
        if (!active) return
        active = false
        listeners.delete(listener)
        if (listeners.size === 0) stop()
      }
    },
  }
}

export const watchTimeStore = createWatchTimeStore()
