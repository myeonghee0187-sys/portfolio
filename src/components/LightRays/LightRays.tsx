import { useEffect, useRef, useState } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import './LightRays.css'

/**
 * React Bits — Light Rays (OGL / WebGL). 위쪽 한 점에서 퍼져 내려오는 빛줄기.
 *
 * 원본 구조를 그대로 따른다: IntersectionObserver로 화면에 보일 때만 WebGL을 만들고,
 * 사라지면 RAF / listener / WebGL context를 모두 정리한다. 여기서 더한 것은 세 가지다.
 *   - static  : reduced motion에서는 RAF를 돌리지 않고 크기가 바뀔 때만 한 장 그린다.
 *   - 탭이 가려져 있으면(document.hidden) 그리지 않는다.
 *   - 타입.
 */
export type RaysOrigin = 'top-center' | 'top-left' | 'top-right' | 'right' | 'left' | 'bottom-center' | 'bottom-right' | 'bottom-left'

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
  /** true면 움직이지 않는 한 장만 그린다(reduced motion). */
  static?: boolean
}

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
    default:
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] }
  }
}

const VERTEX = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
precision highp float;

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
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
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

  vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

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
  gl_FragColor = color;
}
`

export default function LightRays({
  raysOrigin = 'top-center',
  raysColor = '#ffffff',
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1,
  saturation = 1,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0,
  distortion = 0,
  className = '',
  static: isStatic = false,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const [isVisible, setIsVisible] = useState(false)

  // 화면에 들어올 때만 WebGL을 만든다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!isVisible || !container) return

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true })
    const gl = renderer.gl
    gl.canvas.style.width = '100%'
    gl.canvas.style.height = '100%'
    container.appendChild(gl.canvas)

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      rayPos: { value: [0, 0] },
      rayDir: { value: [0, 1] },
      raysColor: { value: hexToRgb(raysColor) },
      raysSpeed: { value: raysSpeed },
      lightSpread: { value: lightSpread },
      rayLength: { value: rayLength },
      pulsating: { value: pulsating ? 1 : 0 },
      fadeDistance: { value: fadeDistance },
      saturation: { value: saturation },
      mousePos: { value: [0.5, 0.5] },
      mouseInfluence: { value: followMouse ? mouseInfluence : 0 },
      noiseAmount: { value: noiseAmount },
      distortion: { value: distortion },
    }
    const geometry = new Triangle(gl)
    const program = new Program(gl, { vertex: VERTEX, fragment: FRAGMENT, uniforms })
    const mesh = new Mesh(gl, { geometry, program })

    const smoothMouse = { x: 0.5, y: 0.5 }
    let rafId = 0

    const draw = (t: number) => {
      uniforms.iTime.value = t * 0.001
      if (followMouse && mouseInfluence > 0) {
        const smoothing = 0.92
        smoothMouse.x = smoothMouse.x * smoothing + mouseRef.current.x * (1 - smoothing)
        smoothMouse.y = smoothMouse.y * smoothing + mouseRef.current.y * (1 - smoothing)
        uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y]
      }
      renderer.render({ scene: mesh })
    }

    const updatePlacement = () => {
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { clientWidth: wCSS, clientHeight: hCSS } = container
      renderer.setSize(wCSS, hCSS)
      const w = wCSS * renderer.dpr
      const h = hCSS * renderer.dpr
      uniforms.iResolution.value = [w, h]
      const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h)
      uniforms.rayPos.value = anchor
      uniforms.rayDir.value = dir
      if (isStatic) draw(0)
    }

    const loop = (t: number) => {
      rafId = requestAnimationFrame(loop)
      if (document.hidden) return
      draw(t)
    }

    const resizeObserver = new ResizeObserver(updatePlacement)
    resizeObserver.observe(container)
    updatePlacement()
    if (!isStatic) rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
    }
  }, [isVisible, isStatic, raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating, fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount, distortion])

  // 마우스는 section 좌표(0~1)로만 기록하고, 실제 반영은 그리기 루프에서 부드럽게 따라간다.
  useEffect(() => {
    const container = containerRef.current
    if (!followMouse || !container) return
    const onMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [followMouse])

  return <div ref={containerRef} className={`light-rays-container ${className}`.trim()} aria-hidden="true" />
}
