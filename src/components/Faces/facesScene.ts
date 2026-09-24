import * as THREE from 'three'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'
import { createFaceVisual, paintFaceVisual } from './facePainter'

/**
 * FACES의 WebGL visual field.
 *
 *   1. project pass    project plane 4장을 offscreen render target에 그린다(slider 그대로, 보정 없음).
 *   2. composite pass  그 texture 한 장을 source로, 화면 전체를 다시 그린다.
 *                      Watch 모양(rounded rect SDF 두 개: case 외곽 / display)에 따라
 *                        OUTSIDE   muted project
 *                        APPROACH  Watch에 가까워질수록 project pixel이 휘기 시작
 *                        RIM       굴절된 project + Blue / Ice / Titanium glass material
 *                        DISPLAY   같은 project를 선명하게
 *                      가 하나의 연속된 displacement field로 이어진다.
 *
 * Watch display와 rim이 보는 것도 전부 같은 project texture라서, project 경계가 실제로 Watch를 통과한다.
 * Rim의 색은 project luminance만 받아 Portfolio material 팔레트로 칠하므로, 어떤 project가 지나가도
 * Watch의 hue는 바뀌지 않는다(바뀌는 것은 움직임에 따른 intensity뿐).
 */

/* ---------------- project pass ---------------- */

const PLANE_VERTEX = /* glsl */ `
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

const PLANE_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0);
}
`

/* ---------------- composite pass ---------------- */

const COMPOSITE_VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uScene;     // project pass 결과
uniform vec2 uSize;           // canvas CSS px
uniform float uPixelRatio;

uniform float uWatch;         // 1 = Watch 있음, 0 = 없음(전부 OUTSIDE)
uniform vec4 uOuter;          // case 외곽: 중심 xy, 반폭·반높이 zw (CSS px, 위가 0)
uniform float uOuterR;
uniform vec4 uDisplay;        // display
uniform float uDisplayR;
uniform float uUnit;          // Watch 좌표계 1단위의 px

uniform float uVelocity;      // 부호 있는 속도(stage 폭 기준)
uniform float uSpeed;         // 0 ~ 1, 움직임의 세기

uniform vec3 uOuterTreat;     // OUTSIDE: opacity, brightness, saturate

// Apple Watch Portfolio material. project가 무엇이든 이 색만 쓴다.
const vec3 CARBON = vec3(0.031, 0.035, 0.039);     // #08090A
const vec3 ELECTRIC = vec3(0.094, 0.427, 0.898);   // #186DE5
const vec3 ICE = vec3(0.831, 0.898, 0.937);        // #D4E5EF
const vec3 TITANIUM = vec3(0.467, 0.490, 0.510);   // #777D82
const vec3 FROST = vec3(0.953, 0.957, 0.957);      // #F3F4F4

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sdOuter(vec2 p) { return sdRoundedBox(p - uOuter.xy, uOuter.zw, uOuterR); }
float sdDisplay(vec2 p) { return sdRoundedBox(p - uDisplay.xy, uDisplay.zw, uDisplayR); }

vec2 normalOuter(vec2 p) {
  vec2 e = vec2(1.0, 0.0);
  vec2 g = vec2(sdOuter(p + e.xy) - sdOuter(p - e.xy), sdOuter(p + e.yx) - sdOuter(p - e.yx));
  return g / max(length(g), 1e-5);
}
vec2 normalDisplay(vec2 p) {
  vec2 e = vec2(1.0, 0.0);
  vec2 g = vec2(sdDisplay(p + e.xy) - sdDisplay(p - e.xy), sdDisplay(p + e.yx) - sdDisplay(p - e.yx));
  return g / max(length(g), 1e-5);
}

vec3 sceneAt(vec2 p) {
  return texture2D(uScene, vec2(p.x / uSize.x, 1.0 - p.y / uSize.y)).rgb;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 outsideTreat(vec3 c) {
  vec3 m = mix(vec3(luma(c)), c, uOuterTreat.z) * uOuterTreat.y;
  return mix(CARBON, m, uOuterTreat.x);
}

const float PI = 3.141592653589793;

/* ---------- D. DISPLAY : 같은 project를 선명하게 ---------- */
vec3 displayColor(vec2 p, float dDisp) {
  vec3 c = sceneAt(p);
  // project 색은 그대로, 대비·밝기만 조금 올린다.
  c = clamp((c - 0.5) * 1.07 + 0.5, 0.0, 1.0) * 1.06;
  // 화면 가장자리는 유리 아래로 살짝 가라앉는다(검은 선은 없다).
  float edge = smoothstep(0.0, 22.0 * uUnit, -dDisp);
  c *= mix(0.78, 1.0, edge);
  // 위쪽 왼쪽에서 오는 아주 얇은 유리 sheen.
  vec2 local = (p - uDisplay.xy) / uDisplay.zw;
  c += FROST * 0.035 * smoothstep(0.2, -1.0, local.x + local.y);
  return c;
}

/* ---------- A / B. OUTSIDE + APPROACH ---------- */
vec3 outsideColor(vec2 p, float dOut, float reach) {
  // Watch에 가까울수록 Watch 쪽 pixel을 끌어와 보여준다 -> 선이 Watch를 감싸듯 휘어 들어간다.
  // case 외곽(dOut = 0)에서 rim과 같은 reach로 이어지고, 120단위 밖에서 0이 된다.
  float f = 1.0 - smoothstep(0.0, 120.0 * uUnit, max(dOut, 0.0));
  vec2 q = p - normalOuter(p) * reach * pow(f, 1.5);
  vec3 c = outsideTreat(sceneAt(q));
  // case 바로 바깥의 아주 얕은 접촉 그림자.
  return c * (1.0 - 0.32 * exp(-max(dOut, 0.0) / (5.0 * uUnit)));
}

/* ---------- C. GLASS / TITANIUM RIM ---------- */
vec3 rimColor(vec2 p, float dOut, float dDisp, float reach) {
  float rimW = max(dDisp - dOut, 1.0);          // 이 자리의 rim 두께
  float s = clamp(dDisp / rimW, 0.0, 1.0);      // 0 = display 가장자리, 1 = case 외곽
  vec2 n = normalDisplay(p);
  vec2 t = vec2(-n.y, n.x);

  // 굴절: display 가장자리(0)에서 외곽(reach)까지 이어지는 displacement + 가운데가 부푼 lens.
  // display 쪽 내용이 유리를 따라 바깥으로 늘어나 보이고, 외곽에서는 APPROACH와 그대로 이어진다.
  float bulge = 0.08 * rimW * (1.0 + 0.5 * uSpeed);
  float delta = reach * s + bulge * sin(PI * s);
  vec2 base = p - n * delta;
  // 움직이는 방향으로 둘레를 따라 흐르는 stretch.
  base.x -= uVelocity * 40.0 * uUnit * sin(PI * s);

  // 둘레(tangent) 방향으로 늘어난 반사: 5 tap.
  float spread = (1.5 + 12.0 * uSpeed) * uUnit;
  float L = luma(sceneAt(base - t * spread * 2.0)) * 0.12
          + luma(sceneAt(base - t * spread)) * 0.22
          + luma(sceneAt(base)) * 0.32
          + luma(sceneAt(base + t * spread)) * 0.22
          + luma(sceneAt(base + t * spread * 2.0)) * 0.12;

  // 차가운 분산: 안/바깥 쪽 luminance 차이만 Ice / Electric Ice 가장자리로 남긴다(무지개 없음).
  float dispersion = (0.6 + 1.4 * uSpeed) * uUnit;
  float fringe = luma(sceneAt(base + n * dispersion)) - luma(sceneAt(base - n * dispersion));

  // 유리 tube의 가짜 3D normal: 안쪽 가장자리는 안으로, 바깥 가장자리는 밖으로 기운다.
  float tilt = (s - 0.5) * 2.0;
  vec3 N = normalize(vec3(n * tilt * 1.35, 1.0));
  float fresnel = pow(1.0 - N.z, 2.6);

  // 위쪽 왼쪽의 차가운 studio light + 오른쪽 아래의 약한 보조광. Watch가 고정이라 모양이 흔들리지 않는다.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.55, -0.7, 0.55));
  vec3 L2 = normalize(vec3(0.6, 0.65, 0.45));
  float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 38.0);
  float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 26.0);

  // 몸체: 어두운 titanium glass. project는 luminance로만 비치고, hue는 항상 material 팔레트다.
  // 밝은 project(TCHAIKIM 같은)가 지나가도 rim이 우윳빛으로 뜨지 않도록 luminance를 눌러 받는다.
  float Lc = L / (L + 0.55);
  vec3 body = mix(CARBON, TITANIUM, 0.1 + 0.14 * (1.0 - abs(tilt)));
  vec3 glass = body + ICE * Lc * (0.26 + 0.1 * uSpeed);
  glass += mix(ICE, FROST, 0.5) * fresnel * (0.34 + 0.22 * uSpeed);

  // 바깥쪽 1/3은 어두운 titanium 금속 띠. 위쪽 왼쪽 빛을 받는 곳에만 가는 광택이 선다.
  float metal = smoothstep(0.6, 0.92, s);
  vec3 titanium = mix(CARBON, TITANIUM, 0.3) + FROST * spec1 * 0.9;
  glass = mix(glass, titanium, metal * 0.6);

  glass += FROST * spec1 * (0.7 + 0.35 * uSpeed);
  glass += ELECTRIC * spec2 * 0.26;
  glass += (ICE * 0.35 + ELECTRIC * 0.65) * max(fringe, 0.0) * (0.6 + 0.8 * uSpeed);

  // case 외곽의 가는 titanium edge와, 그 바로 안쪽의 아주 얇은 Electric Ice 선.
  float outerLine = 1.0 - smoothstep(0.0, 1.4, abs(dOut + 0.9));
  float iceLine = 1.0 - smoothstep(0.0, 1.2, abs(dOut + 2.8));
  glass += mix(TITANIUM, FROST, 0.55 + 0.45 * spec1) * outerLine * 0.55;
  glass += ELECTRIC * iceLine * (0.22 + 0.25 * uSpeed);

  // display 가장자리에서 검은 선 없이 화면으로 녹아든다.
  return mix(displayColor(p, dDisp), glass, smoothstep(0.0, 0.14, s));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;

  if (uWatch < 0.5) {
    gl_FragColor = vec4(outsideTreat(sceneAt(p)), 1.0);
    return;
  }

  float dOut = sdOuter(p);       // > 0 : Watch 밖
  float dDisp = sdDisplay(p);    // < 0 : display 안
  // 굴절 거리(Watch 좌표계 18 = 1920에서 약 13px). 움직일수록 조금 강해진다 — 색이 아니라 intensity만.
  float reach = 18.0 * uUnit * (1.0 + 0.6 * uSpeed);

  // 세 영역을 경계 ±0.75px에서 섞는다(모서리 계단 없음).
  float wOut = smoothstep(-0.75, 0.75, dOut);
  float wDisp = 1.0 - smoothstep(-0.75, 0.75, dDisp);
  float wRim = clamp(1.0 - wOut - wDisp, 0.0, 1.0);

  vec3 color = vec3(0.0);
  if (wOut > 0.0) color += outsideColor(p, dOut, reach) * wOut;
  if (wDisp > 0.0) color += displayColor(p, dDisp) * wDisp;
  if (wRim > 0.0) color += rimColor(p, dOut, dDisp, reach) * wRim;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

/** display 밖 project의 treatment: opacity, brightness, saturate. blur는 쓰지 않는다. */
const OUTER_TREATMENT = new THREE.Vector3(0.66, 0.74, 0.74)

/** Carbon Black (#08090a). canvas 배경이자 project pass의 바탕. */
const CARBON = new THREE.Color(0x08090a)

/** texture 해상도(가로 px). placeholder라 이 정도면 충분하다. */
const TEXTURE_WIDTH = 1600

/** Watch 모양 하나(rounded rect). canvas CSS px, 위가 0. */
export type FacesBox = { cx: number; cy: number; hx: number; hy: number; r: number }

export type FacesWatchGeometry = {
  /** case 외곽 실루엣. */
  outer: FacesBox
  /** display(화면). */
  display: FacesBox
  /** Watch 좌표계 1단위의 px. rim 두께·굴절 거리가 Watch 크기에 맞춰 줄어든다. */
  unit: number
}

export type FacesRenderState = {
  /** 풀지 않은(unwrapped) 논리 위치(px). 커질수록 plane이 왼쪽으로 간다. */
  position: number
  /** project plane 자체의 휨(px). */
  bend: number
  /** 부호 있는 속도(stage 폭 기준)와 0~1 세기. */
  velocity: number
  speed: number
  watch: FacesWatchGeometry | null
}

export default class FacesScene {
  private renderer: THREE.WebGLRenderer
  private target: THREE.WebGLRenderTarget
  private planesScene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  private geometry = new THREE.PlaneGeometry(1, 1, 1, 24)
  private visuals: HTMLCanvasElement[] = []
  private textures: THREE.CanvasTexture[] = []
  private planeMaterials: THREE.ShaderMaterial[] = []
  private meshes: THREE.Mesh[] = []

  private compositeScene = new THREE.Scene()
  private compositeGeometry = new THREE.PlaneGeometry(2, 2)
  private composite: THREE.ShaderMaterial

  private bend = { value: 0 }

  /** plane 한 장의 폭 / 높이와 plane 중심 간격(px). */
  slideWidth = 1
  slideHeight = 1
  step = 1

  /** 한 바퀴(project 4개)의 논리 거리. */
  get loopWidth() {
    return this.step * FACE_PROJECTS.length
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(CARBON, 1)
    this.camera.position.z = 5

    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
    this.target.texture.minFilter = THREE.LinearFilter
    this.target.texture.magFilter = THREE.LinearFilter
    this.target.texture.generateMipmaps = false

    for (const project of FACE_PROJECTS) {
      const visual = createFaceVisual(project, TEXTURE_WIDTH)
      const texture = new THREE.CanvasTexture(visual)
      texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter

      const material = new THREE.ShaderMaterial({
        vertexShader: PLANE_VERTEX,
        fragmentShader: PLANE_FRAGMENT,
        uniforms: { uBend: this.bend, uMap: { value: texture } },
      })
      const mesh = new THREE.Mesh(this.geometry, material)
      this.planesScene.add(mesh)

      this.visuals.push(visual)
      this.textures.push(texture)
      this.planeMaterials.push(material)
      this.meshes.push(mesh)
    }

    this.composite = new THREE.ShaderMaterial({
      vertexShader: COMPOSITE_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uScene: { value: this.target.texture },
        uSize: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uWatch: { value: 0 },
        uOuter: { value: new THREE.Vector4() },
        uOuterR: { value: 0 },
        uDisplay: { value: new THREE.Vector4() },
        uDisplayR: { value: 0 },
        uUnit: { value: 1 },
        uVelocity: { value: 0 },
        uSpeed: { value: 0 },
        uOuterTreat: { value: OUTER_TREATMENT },
      },
    })
    const quad = new THREE.Mesh(this.compositeGeometry, this.composite)
    quad.frustumCulled = false
    this.compositeScene.add(quad)
  }

  /** stage 크기와 slide 크기가 바뀔 때(refresh). */
  resize(width: number, height: number, pixelRatio: number, slideWidth: number, slideHeight: number, step: number) {
    this.slideWidth = slideWidth
    this.slideHeight = slideHeight
    this.step = step
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio))
    this.camera.left = -width / 2
    this.camera.right = width / 2
    this.camera.top = height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()
    for (const mesh of this.meshes) mesh.scale.set(slideWidth, slideHeight, 1)
    this.composite.uniforms.uSize.value.set(width, height)
    this.composite.uniforms.uPixelRatio.value = pixelRatio
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
    // 1. project pass -> offscreen
    this.meshes.forEach((mesh, i) => {
      mesh.position.x = this.planeX(i, state.position)
    })
    this.bend.value = state.bend
    this.renderer.setRenderTarget(this.target)
    this.renderer.render(this.planesScene, this.camera)
    this.renderer.setRenderTarget(null)

    // 2. composite pass -> 화면
    const u = this.composite.uniforms
    const w = state.watch
    u.uWatch.value = w ? 1 : 0
    if (w) {
      u.uOuter.value.set(w.outer.cx, w.outer.cy, w.outer.hx, w.outer.hy)
      u.uOuterR.value = w.outer.r
      u.uDisplay.value.set(w.display.cx, w.display.cy, w.display.hx, w.display.hy)
      u.uDisplayR.value = w.display.r
      u.uUnit.value = w.unit
    }
    u.uVelocity.value = state.velocity
    u.uSpeed.value = state.speed
    this.renderer.render(this.compositeScene, this.camera)
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
    this.compositeGeometry.dispose()
    for (const m of this.planeMaterials) m.dispose()
    this.composite.dispose()
    for (const t of this.textures) t.dispose()
    this.target.dispose()
    this.renderer.dispose()
  }
}
