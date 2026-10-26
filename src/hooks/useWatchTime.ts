import { useSyncExternalStore } from 'react'
import { watchTimeStore } from '../time/watchTime'

export default function useWatchTime() {
  return useSyncExternalStore(
    watchTimeStore.subscribe,
    watchTimeStore.getSnapshot,
    watchTimeStore.getSnapshot,
  )
}
