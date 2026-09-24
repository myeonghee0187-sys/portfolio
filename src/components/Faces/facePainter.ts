import type { FaceProject } from './facesData'

/**
 * 프로젝트 이미지가 오기 전까지 쓰는 임시 "화면". 카드가 아니라 plane을 꽉 채우는 editorial 화면이다.
 *
 * FACES의 WebGL plane(texture)과 모바일 fallback strip이 같은 그림을 쓴다.
 * 실제 이미지가 준비되면 이 함수 대신 이미지를 넘기기만 하면 된다.
 * index / 제목 / category 같은 metadata는 그리지 않는다(Watch 아래 metadata 한 곳에만 있다).
 */

/** plane 비율(가로 / 세로). 16:10에 가까운 editorial 비율. */
export const FACE_ASPECT = 1.6

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

const logo = (ctx: CanvasRenderingContext2D, text: string, color: string, w: number, h: number) => {
  ctx.fillStyle = color
  ctx.font = `${Math.round(h * 0.042)}px Anton, 'Arial Narrow', sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w * 0.05, h * 0.075)
  // 오른쪽 nav 세 줄
  ctx.globalAlpha = 0.45
  for (let i = 0; i < 3; i++) ctx.fillRect(w * (0.83 + i * 0.045), h * 0.07, w * 0.03, h * 0.012)
  ctx.globalAlpha = 1
}

const linearV = (ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

const rows = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pitch: number, bar: number, color: string) => {
  ctx.fillStyle = color
  for (let yy = y; yy + bar <= y + h; yy += pitch) ctx.fillRect(x, yy, w, bar)
}

const phone = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: string, fill: string) => {
  const r = w * 0.14
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = Math.max(2, w * 0.018)
  ctx.strokeStyle = frame
  ctx.stroke()
}

const PAINTERS: Record<string, Paint> = {
  // 01 F45 — 어두운 fitness 화면 + red.
  f45: (ctx, w, h) => {
    ctx.fillStyle = '#0b0c0e'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = linearV(ctx, h * 0.15, h * 0.68, [[0, '#2a2d33'], [1, '#101215']])
    ctx.fillRect(0, h * 0.15, w, h * 0.53)
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.36, 0, w * 0.7, h * 0.36, w * 0.4)
    glow.addColorStop(0, 'rgba(255,255,255,0.14)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, h * 0.15, w, h * 0.53)
    ctx.save()
    ctx.translate(0, h * 0.44)
    ctx.transform(1, -0.14, 0, 1, 0, 0)
    ctx.fillStyle = '#c8102e'
    ctx.fillRect(-w * 0.05, -h * 0.1, w * 0.62, h * 0.2)
    ctx.restore()
    ctx.fillStyle = '#c8102e'
    ctx.fillRect(w * 0.05, h * 0.76, w * 0.27, h * 0.14)
    ctx.fillStyle = 'rgba(243,244,244,0.12)'
    ctx.fillRect(w * 0.345, h * 0.76, w * 0.3, h * 0.14)
    ctx.fillRect(w * 0.67, h * 0.76, w * 0.28, h * 0.14)
    logo(ctx, 'F45', '#f3f4f4', w, h)
  },

  // 02 TCHAIKIM — 밝은 fashion editorial 화면.
  tchaikim: (ctx, w, h) => {
    ctx.fillStyle = '#e7e3dc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = linearV(ctx, h * 0.15, h * 0.92, [[0, '#bdb6ac'], [0.6, '#8a837a'], [1, '#6a645c']])
    ctx.fillRect(w * 0.05, h * 0.16, w * 0.42, h * 0.76)
    ctx.fillStyle = linearV(ctx, h * 0.16, h * 0.56, [[0, '#d2ccc3'], [1, '#a29b91']])
    ctx.fillRect(w * 0.53, h * 0.16, w * 0.42, h * 0.4)
    rows(ctx, w * 0.53, h * 0.64, w * 0.3, h * 0.28, h * 0.045, h * 0.012, 'rgba(27,26,25,0.55)')
    logo(ctx, 'TCHAIKIM', '#1b1a19', w, h)
  },

  // 03 JADUYA — mobile UI 화면. 폰 화면 세 개.
  jaduya: (ctx, w, h) => {
    ctx.fillStyle = '#121a24'
    ctx.fillRect(0, 0, w, h)
    const pw = w * 0.2
    const ph = h * 0.7
    for (const [i, dy] of [[0, 0.06], [1, 0], [2, 0.06]] as const) {
      const x = w * (0.14 + i * 0.26)
      const y = h * (0.19 + dy)
      phone(ctx, x, y, pw, ph, 'rgba(230,237,245,0.3)', '#1a2432')
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, pw, ph, pw * 0.14)
      ctx.clip()
      ctx.fillStyle = '#5fbf9a'
      ctx.fillRect(x, y, pw, ph * 0.14)
      rows(ctx, x + pw * 0.1, y + ph * 0.2, pw * 0.8, ph * 0.74, ph * 0.09, ph * 0.05, 'rgba(230,237,245,0.14)')
      ctx.restore()
    }
    logo(ctx, 'JADUYA', '#e6edf5', w, h)
  },

  // 04 T100 — mobile web app 화면. 가운데 앱 한 장.
  t100: (ctx, w, h) => {
    ctx.fillStyle = '#0f1411'
    ctx.fillRect(0, 0, w, h)
    const pw = w * 0.3
    const ph = h * 0.76
    const x = w * 0.35
    const y = h * 0.16
    phone(ctx, x, y, pw, ph, 'rgba(238,242,236,0.28)', '#18201b')
    ctx.fillStyle = '#b9c8a4'
    ctx.beginPath()
    ctx.arc(x + pw / 2, y + ph * 0.22, pw * 0.16, 0, Math.PI * 2)
    ctx.fill()
    rows(ctx, x + pw * 0.08, y + ph * 0.48, pw * 0.84, ph * 0.46, ph * 0.1, ph * 0.075, 'rgba(238,242,236,0.13)')
    rows(ctx, w * 0.06, h * 0.3, w * 0.18, h * 0.4, h * 0.05, h * 0.014, 'rgba(238,242,236,0.18)')
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.arc(w * 0.86, h * 0.36, w * 0.06, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    logo(ctx, 'T100', '#eef2ec', w, h)
  },
}

/** 프로젝트 화면을 주어진 canvas에 그린다(크기는 canvas의 픽셀 크기). */
export function paintFaceVisual(canvas: HTMLCanvasElement, project: FaceProject) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const paint = PAINTERS[project.id]
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  paint?.(ctx, canvas.width, canvas.height)
}

/** 새 canvas에 프로젝트 화면을 그려 돌려준다. */
export function createFaceVisual(project: FaceProject, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(width / FACE_ASPECT)
  paintFaceVisual(canvas, project)
  return canvas
}
