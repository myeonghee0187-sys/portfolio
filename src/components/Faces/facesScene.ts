import * as THREE from 'three'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'
import { createFaceVisual, paintFaceVisual } from './facePainter'

/**
 * FACES의 WebGL slider.
 *
 * 카메라는 CSS px 단위의 orthographic이다(원점 = FACES stage 정중앙 = Watch 중심).
 * project plane 4장이 SLIDE_STEP 간격으로 놓이고, 위치는 wrap으로 순환해서 rail에 끝이 없다.
 *
 * Watch display는 이 canvas를 그대로 들여다보는 창이다(Watch case에 display 모양의 구멍이 있다).
 * 그래서 display 안과 밖이 같은 픽셀이고, shader가 display 안쪽만 원본 그대로, 바깥은 muted로 그린다.
 */

const VERTEX = /* glsl */ `
uniform float uBend;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  // 움직이는 속도만큼 plane의 세로 가운데가 뒤로 처진다. 위·아래 끝은 제자리라 아주 약하게 휜다.
  world.x += sin(uv.y * 3.141592653589793) * uBend;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uMap;
uniform float uRgb;           // 빠르게 움직일 때만 생기는 아주 작은 RGB 분리(px)
uniform float uTexelX;        // plane 1px의 uv 폭
uniform vec4 uDisplay;        // Watch display: 중심(xy), 반폭·반높이(zw). canvas CSS px, 위가 0
uniform float uDisplayRadius;
uniform float uPixelRatio;
uniform float uCanvasHeight;  // CSS px
uniform vec3 uBg;             // Carbon Black
uniform vec3 uOuter;          // display 밖: opacity, brightness, saturate
varying vec2 vUv;

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 shift = vec2(uRgb * uTexelX, 0.0);
  vec3 col = vec3(
    texture2D(uMap, vUv + shift).r,
    texture2D(uMap, vUv).g,
    texture2D(uMap, vUv - shift).b
  );

  // Watch display 안인지(화면 좌표). 안쪽은 원본, 바깥은 muted.
  vec2 frag = gl_FragCoord.xy / uPixelRatio;
  frag.y = uCanvasHeight - frag.y;
  float d = sdRoundRect(frag - uDisplay.xy, uDisplay.zw, uDisplayRadius);
  float inside = 1.0 - smoothstep(-1.0, 1.0, d);

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 muted = mix(vec3(lum), col, uOuter.z) * uOuter.y;
  muted = mix(uBg, muted, uOuter.x);

  gl_FragColor = vec4(mix(muted, col, inside), 1.0);
}
`

/** display 밖 project의 treatment: opacity, brightness, saturate. blur는 쓰지 않는다. */
const OUTER_TREATMENT = new THREE.Vector3(0.64, 0.72, 0.72)

/** Carbon Black (#08090a). canvas 배경이자 muted의 바탕. */
const CARBON = new THREE.Color(0x08090a)

/** texture 해상도(가로 px). placeholder라 이 정도면 1x·2x 모두 충분하다. */
const TEXTURE_WIDTH = 1600

export type FacesDisplayRect = {
  /** 중심 x, y와 반폭·반높이. canvas CSS px(위가 0). */
  cx: number
  cy: number
  hw: number
  hh: number
  radius: number
}

export type FacesRenderState = {
  /** 풀지 않은(unwrapped) 논리 위치(px). 커질수록 plane이 왼쪽으로 간다. */
  position: number
  bend: number
  rgb: number
  display: FacesDisplayRect | null
}

export default class FacesScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  private geometry = new THREE.PlaneGeometry(1, 1, 1, 32)
  private visuals: HTMLCanvasElement[] = []
  private textures: THREE.CanvasTexture[] = []
  private materials: THREE.ShaderMaterial[] = []
  private meshes: THREE.Mesh[] = []

  /** 모든 plane이 같은 값을 읽는 uniform. 객체를 공유하므로 한 번만 쓴다. */
  private shared = {
    uBend: { value: 0 },
    uRgb: { value: 0 },
    uTexelX: { value: 0 },
    uDisplay: { value: new THREE.Vector4(0, 0, 0, 0) },
    uDisplayRadius: { value: 0 },
    uPixelRatio: { value: 1 },
    uCanvasHeight: { value: 1 },
    uBg: { value: new THREE.Vector3(CARBON.r, CARBON.g, CARBON.b) },
    uOuter: { value: OUTER_TREATMENT },
  }

  /** plane 한 장의 폭 / 높이와 plane 중심 간격(px). */
  slideWidth = 1
  slideHeight = 1
  step = 1

  /** 한 바퀴(project 4개)의 논리 거리. */
  get loopWidth() {
    return this.step * FACE_PROJECTS.length
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(CARBON, 1)
    this.camera.position.z = 5

    for (const project of FACE_PROJECTS) {
      const visual = createFaceVisual(project, TEXTURE_WIDTH)
      const texture = new THREE.CanvasTexture(visual)
      texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter

      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { ...this.shared, uMap: { value: texture } },
      })
      const mesh = new THREE.Mesh(this.geometry, material)
      this.scene.add(mesh)

      this.visuals.push(visual)
      this.textures.push(texture)
      this.materials.push(material)
      this.meshes.push(mesh)
    }
  }

  /** stage 크기와 slide 크기가 바뀔 때(refresh). */
  resize(width: number, height: number, pixelRatio: number, slideWidth: number, slideHeight: number, step: number) {
    this.slideWidth = slideWidth
    this.slideHeight = slideHeight
    this.step = step
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.left = -width / 2
    this.camera.right = width / 2
    this.camera.top = height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()
    for (const mesh of this.meshes) mesh.scale.set(slideWidth, slideHeight, 1)
    this.shared.uTexelX.value = 1 / slideWidth
    this.shared.uPixelRatio.value = pixelRatio
    this.shared.uCanvasHeight.value = height
  }

  /**
   * project i가 논리 위치 position에서 놓이는 화면 x(Watch 중심 기준 px).
   * 한 바퀴 폭 안에서 wrap되므로 어느 방향으로 얼마나 가도 rail이 끝나지 않는다.
   */
  planeX(index: number, position: number) {
    const half = this.loopWidth / 2
    return gsap.utils.wrap(-half, half, index * this.step - position)
  }

  render(state: FacesRenderState) {
    this.meshes.forEach((mesh, i) => {
      mesh.position.x = this.planeX(i, state.position)
    })
    this.shared.uBend.value = state.bend
    this.shared.uRgb.value = state.rgb
    const d = state.display
    if (d) {
      this.shared.uDisplay.value.set(d.cx, d.cy, d.hw, d.hh)
      this.shared.uDisplayRadius.value = d.radius
    } else {
      // Watch가 없으면(fallback) 전부 display 밖으로 본다.
      this.shared.uDisplay.value.set(-1e5, -1e5, 0, 0)
      this.shared.uDisplayRadius.value = 0
    }
    this.renderer.render(this.scene, this.camera)
  }

  /** 웹폰트가 늦게 뜨면 placeholder의 글자를 다시 그린다. */
  repaint() {
    FACE_PROJECTS.forEach((project, i) => {
      paintFaceVisual(this.visuals[i], project)
      this.textures[i].needsUpdate = true
    })
  }

  dispose() {
    this.geometry.dispose()
    for (const m of this.materials) m.dispose()
    for (const t of this.textures) t.dispose()
    this.renderer.dispose()
  }
}
