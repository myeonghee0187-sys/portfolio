/**
 * LOOP CROSSFADE BUFFER.
 *
 * FACES 영상은 처음과 끝 frame이 이어지지 않는다(원본 자체의 장면 전환). 그대로 video.loop만 쓰면
 * 끝 frame에서 첫 frame으로 뚝 끊긴다 — TCHAIKIM은 마지막 0.5초가 거의 멈춘 클로즈업이고 첫 frame은 다른 장면이다.
 * 영상을 다시 만들지 않고, 같은 영상의 element 두 개를 번갈아 쓴다.
 *
 *   active   재생 중인 element. 끝나기 FADE초 전에
 *   standby  (0초에 멈춰 기다리던) 다른 element가 재생을 시작하고, 두 그림을 FADE초 동안 섞는다.
 *            다 섞이면 역할을 바꾸고, 앞의 element는 멈춰 0초로 돌아가 다음 차례를 기다린다.
 *
 * element도 texture도 새로 만들지 않는다. active / inactive가 바뀔 때 currentTime을 0으로 되돌리지 않는다 —
 * 0으로 가는 것은 방금 다 섞여 화면에서 빠진 element뿐이다.
 * loop 속성은 그대로 켜 둔다(탭이 가려져 rAF가 멈춘 동안에도 영상이 끝에서 멈추지 않는다).
 */

/** 섞는 시간(초). 150 ~ 220ms 안. */
export const LOOP_FADE = 0.2
/** 끝보다 이만큼 더 일찍 섞기 시작한다 — 섞는 동안 active가 끝에 닿아 0으로 되감기지 않게. */
const LOOP_LEAD = 0.06

export function createFaceVideo(src: string, preload: 'auto' | 'metadata' = 'metadata') {
  const video = document.createElement('video')
  video.src = src
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.playsInline = true
  video.preload = preload
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  return video
}

export class LoopBuffer {
  readonly videos: [HTMLVideoElement, HTMLVideoElement]
  /** videos 중 지금 주로 보이는 쪽(0 / 1). */
  active = 0
  /** 0 = active만, 1 = standby로 다 넘어감. 섞는 동안에만 0보다 크다. */
  mix = 0
  private fadeFrom = -1
  private playing = false

  constructor(src: string, preload: 'auto' | 'metadata' = 'metadata') {
    this.videos = [createFaceVideo(src, preload), createFaceVideo(src, preload)]
  }

  get current() {
    return this.videos[this.active]
  }

  get standby() {
    return this.videos[1 - this.active]
  }

  get fading() {
    return this.fadeFrom >= 0
  }

  /** 두 element 모두 미리 받아 둔다(첫 loop 전에 standby가 0초 frame을 갖고 있도록). */
  preload() {
    for (const v of this.videos) if (v.preload !== 'auto') v.preload = 'auto'
  }

  play() {
    this.playing = true
    this.preload()
    if (this.current.paused) this.current.play().catch(() => {})
    if (this.fading && this.standby.paused) this.standby.play().catch(() => {})
  }

  pause() {
    this.playing = false
    // 섞는 도중에 멈추면 넘어가던 쪽으로 바로 마무리한다(반쯤 섞인 채로 남지 않는다).
    if (this.fading) this.finish()
    for (const v of this.videos) if (!v.paused) v.pause()
  }

  /**
   * 매 frame(rAF) 부른다. 섞기 시작 / 진행 / 마무리를 영상 시간과 실제 시간으로 정한다.
   * 돌려주는 값: 이번 frame에 섞는 정도가 바뀌었는지(다시 그려야 하는지).
   */
  tick(now: number) {
    if (!this.playing) return false
    const v = this.current
    const d = v.duration
    if (!this.fading) {
      if (!Number.isFinite(d) || d <= LOOP_FADE * 2 || v.paused) return false
      if (v.currentTime < d - LOOP_FADE - LOOP_LEAD) return false
      this.fadeFrom = now
      const next = this.standby
      if (next.currentTime > 0.05) next.currentTime = 0
      next.play().catch(() => {})
    }
    const mix = Math.min(1, (now - this.fadeFrom) / (LOOP_FADE * 1000))
    // 섞는 곡선은 가운데가 조금 빠른 sine — 앞뒤 frame이 겹쳐 보이는 시간이 짧다.
    this.mix = 0.5 - 0.5 * Math.cos(Math.PI * mix)
    if (mix >= 1) this.finish()
    return true
  }

  private finish() {
    const old = this.current
    this.active = 1 - this.active
    this.mix = 0
    this.fadeFrom = -1
    old.pause()
    // 화면에서 빠진 element만 처음으로 돌려 다음 차례를 기다린다.
    old.currentTime = 0
  }

  dispose() {
    for (const v of this.videos) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }
}
