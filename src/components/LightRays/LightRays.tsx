import { useEffect, useRef, useState } from 'react'
import './LightRays.css'

/*
 * React Bits — Light Rays(https://reactbits.dev/backgrounds/light-rays)를 이 프로젝트로 옮긴 것.
 * 원본은 OGL(Renderer / Program / Triangle / Mesh)로 화면을 덮는 삼각형 하나에 fragment shader를 그린다.
 * 여기서는 의존성을 늘리지 않으려고 같은 일을 WebGL API로 직접 한다 — shader / uniform / 기본값 / 구조는 원본 그대로다.
 *   IntersectionObserver  화면에 보일 때만 rAF를 돌린다(원본과 같은 threshold 0.1)
 *   rAF cleanup           안 보이거나(paused 포함) unmount되면 멈춘다
 *   WebGL cleanup         unmount 때 buffer / program을 지우고 context를 놓는다(WEBGL_lose_context)
 * 원본과 다른 점은 둘이다. context를 처음 보일 때 한 번만 만들고 안 보이는 동안에는 그리기만 멈춘다
 * (다시 보일 때마다 새로 만드느라 한 frame 비는 일이 없다). reduced motion이면 한 장만 그리고 멈춘다.
 */

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'

type LightRaysProps = {
  raysOrigin?: RaysOrigin
  raysColor?: string
  raysSpeed?: number
  lightSpread?: number
  rayLength?: number
  pulsating?: boolean
  fadeDistance?: number
  saturation?: number
  followMouse?: boolean
  mouseInfluence?: number
  noiseAmount?: number
  distortion?: number
  className?: string
  /** true면 보이는 중이어도 그리지 않는다(위를 다른 화면이 완전히 덮고 있을 때). */
  paused?: boolean
}

const DEFAULT_COLOR = '#ffffff'

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1]
}

const getAnchorAndDir = (origin: RaysOrigin, w: number, h: number) => {
  const outside = 0.2
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] }
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] }
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] }
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] }
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] }
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] }
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] }
    default: // 'top-center'
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] }
  }
}

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const FRAG = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`

type Uniforms = Record<string, WebGLUniformLocation | null>

type GLState = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  buffer: WebGLBuffer
  uniforms: Uniforms
  resolution: [number, number]
}

function createGL(canvas: HTMLCanvasElement): GLState | null {
  // OGL Renderer({ alpha: true })와 같은 설정(premultipliedAlpha false).
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false })
  if (!gl) return null
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('LightRays: shader link failed', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  gl.useProgram(program)
  // OGL Triangle: 화면을 덮는 삼각형 하나.
  const buffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const names = [
    'iTime', 'iResolution', 'rayPos', 'rayDir', 'raysColor', 'raysSpeed', 'lightSpread', 'rayLength', 'pulsating',
    'fadeDistance', 'saturation', 'mousePos', 'mouseInfluence', 'noiseAmount', 'distortion',
  ]
  const uniforms: Uniforms = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]))
  gl.clearColor(0, 0, 0, 0)
  return { gl, program, buffer, uniforms, resolution: [1, 1] }
}

export default function LightRays({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = '',
  paused = false,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<GLState | null>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 })
  const [isVisible, setIsVisible] = useState(false)

  // 화면에 들어왔는지(원본과 같은 threshold 0.1).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // WebGL cleanup: unmount 때만 context를 놓는다.
  useEffect(() => {
    return () => {
      const state = glRef.current
      if (!state) return
      const { gl, program, buffer } = state
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      glRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!isVisible || paused || !container || !canvas) return
    if (!glRef.current) glRef.current = createGL(canvas)
    const state = glRef.current
    if (!state) return
    const { gl, uniforms: u } = state
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    gl.useProgram(state.program)
    const [r, g, b] = hexToRgb(raysColor)
    gl.uniform3f(u.raysColor, r, g, b)
    gl.uniform1f(u.raysSpeed, raysSpeed)
    gl.uniform1f(u.lightSpread, lightSpread)
    gl.uniform1f(u.rayLength, rayLength)
    gl.uniform1f(u.pulsating, pulsating ? 1 : 0)
    gl.uniform1f(u.fadeDistance, fadeDistance)
    gl.uniform1f(u.saturation, saturation)
    gl.uniform1f(u.mouseInfluence, mouseInfluence)
    gl.uniform1f(u.noiseAmount, noiseAmount)
    gl.uniform1f(u.distortion, distortion)
    gl.uniform2f(u.mousePos, smoothMouseRef.current.x, smoothMouseRef.current.y)

    const updatePlacement = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(container.clientWidth * dpr))
      const h = Math.max(1, Math.round(container.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      state.resolution = [w, h]
      gl.uniform2f(u.iResolution, w, h)
      const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h)
      gl.uniform2f(u.rayPos, anchor[0], anchor[1])
      gl.uniform2f(u.rayDir, dir[0], dir[1])
    }

    const draw = (t: number) => {
      gl.uniform1f(u.iTime, t * 0.001)
      if (followMouse && mouseInfluence > 0) {
        const smoothing = 0.92
        const s = smoothMouseRef.current
        s.x = s.x * smoothing + mouseRef.current.x * (1 - smoothing)
        s.y = s.y * smoothing + mouseRef.current.y * (1 - smoothing)
        gl.uniform2f(u.mousePos, s.x, s.y)
      }
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resizeObserver = new ResizeObserver(() => {
      updatePlacement()
      if (reduced) draw(0)
    })
    resizeObserver.observe(container)
    updatePlacement()

    let raf = 0
    if (reduced) {
      draw(0)
    } else {
      const loop = (t: number) => {
        draw(t)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
    }
    if (followMouse) window.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [
    isVisible,
    paused,
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion,
  ])

  return (
    <div ref={containerRef} className={`light-rays-container ${className}`.trim()}>
      <canvas ref={canvasRef} className="light-rays-canvas" />
    </div>
  )
}
