import { useEffect, useRef } from 'react'
import { LoopBuffer } from './loopBuffer'

type LoopVideoProps = {
  src: string
  /** 두 video element가 겹쳐 놓이는 상자의 class. 크기 / object-fit은 이 상자와 `video` 규칙이 정한다. */
  className?: string
  /** 재생할지. false면 두 element 모두 멈춘다(currentTime은 그대로다). */
  playing: boolean
  /** 첫 frame을 미리 받아 둘지. */
  preload?: 'auto' | 'metadata'
}

/**
 * DOM으로 보여 주는 FACES 영상(모바일 FACES 목록, ALL FACES).
 * WebGL FACES와 같은 LOOP CROSSFADE BUFFER(loopBuffer.ts)를 쓴다 — 같은 영상 element 두 개를 겹쳐 두고,
 * 끝나기 직전 0.2초 동안 다음 바퀴의 처음 frame과 opacity로 섞는다. 끝 -> 처음이 뚝 끊기지 않는다.
 * 재생 중에만 rAF가 돈다.
 */
export default function LoopVideo({ src, className, playing, preload = 'metadata' }: LoopVideoProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<LoopBuffer | null>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const loop = new LoopBuffer(src, preload)
    loop.videos.forEach((video) => {
      video.setAttribute('aria-hidden', 'true')
      video.draggable = false
      box.append(video)
    })
    loopRef.current = loop
    return () => {
      loop.dispose()
      loop.videos.forEach((video) => video.remove())
      loopRef.current = null
    }
  }, [src, preload])

  useEffect(() => {
    const loop = loopRef.current
    if (!loop) return
    if (!playing) {
      loop.pause()
      paint(loop)
      return
    }
    loop.play()
    let raf = 0
    const tick = (now: number) => {
      loop.tick(now)
      paint(loop)
      raf = requestAnimationFrame(tick)
    }
    paint(loop)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, src, preload])

  return <div ref={boxRef} className={className} />
}

/** 재생 중인 element가 아래(opacity 1), 다음 바퀴를 기다리는 element가 위(opacity = 섞는 정도). */
function paint(loop: LoopBuffer) {
  loop.videos.forEach((video, i) => {
    const isActive = i === loop.active
    const opacity = isActive ? '1' : loop.mix.toFixed(3)
    if (video.style.opacity !== opacity) video.style.opacity = opacity
    const z = isActive ? '0' : '1'
    if (video.style.zIndex !== z) video.style.zIndex = z
  })
}
