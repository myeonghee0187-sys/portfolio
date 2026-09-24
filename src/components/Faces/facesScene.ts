import * as THREE from 'three'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'

/**
 * FACES의 WebGL visual field.
 *
 *   1. project pass    project 영상 plane을 원본 비율 그대로 offscreen render target에 그린다.
 *   2. composite pass  그 texture와 같은 VideoTexture를 source로 화면 전체를 다시 그린다.
 *                      Watch 모양(rounded rect SDF 두 개: case 외곽 / display)에 따라
 *                        OUTSIDE   muted project
 *                        APPROACH  Watch에 가까워질수록 project pixel이 휘기 시작
 *                        RIM       굴절된 project + Blue / Ice / Titanium glass material
 *                        DISPLAY   같은 영상을 display 비율에 맞춰 cover로 꽉 채워서
 *                      가 하나의 연속된 sampling field로 이어진다.
 *
 * DISPLAY는 가운데로 오는 project를 object-fit: cover 배율로 확대해 보여준다(가로 영상 ≈ 1배, 세로 영상 ≈ 1.6배).
 * 배율은 slider 위치를 따라 두 project 사이에서 부드럽게 바뀌고, RIM이 그 배율에서 바깥의 원래 배율로
 * 이어 주므로 display 가장자리에 seam이 없다. project 경계는 그대로 display를 지나간다.
 *
 * RIM의 색은 project luminance만 받아 Portfolio material 팔레트로 칠한다 — 어떤 영상이 지나가도
 * Watch의 hue는 바뀌지 않고, 움직임에 따라 intensity만 바뀐다.
 */

/** 영상 plane의 instance 수. project마다 두 장(wrap된 자리와 한 바퀴 옆)이라 어떤 화면 폭에서도 끝이 비지 않는다. */
const INSTANCES = FACE_PROJECTS.length * 2

/* ---------------- project pass ---------------- */

const PLANE_VERTEX = /* glsl */ `
uniform float uBend;
uniform float uHalfView;   // stage 반폭(px)
uniform float uTilt;       // 옆 plane의 최대 기울기(rad)
uniform float uFocal;      // 가짜 원근의 초점 거리(px)
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 center = vec2(modelMatrix[3][0], modelMatrix[3][1]);

  // 옆으로 비켜난 plane은 가운데를 향해 아주 조금 돌아간다(왼쪽 +, 오른쪽 -, 가운데 0).
  float theta = -clamp(center.x / uHalfView, -1.0, 1.0) * uTilt;
  vec2 local = world.xy - center;
  float z = -local.x * sin(theta);
  float k = uFocal / (uFocal - z);
  world.x = center.x + local.x * cos(theta) * k;
  world.y = center.y + local.y * k;

  // 움직이는 속도만큼 plane의 세로 가운데가 뒤로 처진다. 위·아래 끝은 제자리다.
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
uniform sampler2D uVideo0;    // project 영상. project pass와 같은 VideoTexture다.
uniform sampler2D uVideo1;
uniform sampler2D uVideo2;
uniform sampler2D uVideo3;
uniform vec4 uPlanes[${INSTANCES}];      // 영상 plane: 중심 xy, 반폭·반높이 zw (canvas CSS px, 위가 0)
uniform float uPlaneVideo[${INSTANCES}]; // 그 plane의 영상 번호

uniform vec2 uSize;           // canvas CSS px
uniform float uPixelRatio;

uniform float uWatch;         // 1 = Watch 있음, 0 = 없음(전부 OUTSIDE)
uniform vec4 uOuter;          // case 외곽: 중심 xy, 반폭·반높이 zw
uniform float uOuterR;
uniform vec4 uDisplay;        // display
uniform float uDisplayR;
uniform float uUnit;          // Watch 좌표계 1단위의 px
uniform vec2 uMagCenter;      // display cover 배율의 중심
uniform float uMag;           // display cover 배율

uniform float uVelocity;      // 부호 있는 속도(stage 폭 기준)
uniform float uSpeed;         // 0 ~ 1, 움직임의 세기

uniform vec3 uOuterTreat;     // OUTSIDE: opacity, brightness, saturate

// Apple Watch Portfolio material. project가 무엇이든 이 색만 쓴다.
const vec3 CARBON = vec3(0.031, 0.035, 0.039);     // #08090A
const vec3 ELECTRIC = vec3(0.094, 0.427, 0.898);   // #186DE5
const vec3 ICE = vec3(0.831, 0.898, 0.937);        // #D4E5EF
const vec3 TITANIUM = vec3(0.467, 0.490, 0.510);   // #777D82
const vec3 FROST = vec3(0.953, 0.957, 0.957);      // #F3F4F4
const float PI = 3.141592653589793;

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

/* display 안의 한 점이 보여줄 scene 좌표. cover 배율로 확대한다. */
vec2 displayMap(vec2 p) {
  return uMagCenter + (p - uMagCenter) / uMag;
}

vec3 sampleVideo(float index, vec2 uv) {
  if (index < 0.5) return texture2D(uVideo0, uv).rgb;
  if (index < 1.5) return texture2D(uVideo1, uv).rgb;
  if (index < 2.5) return texture2D(uVideo2, uv).rgb;
  return texture2D(uVideo3, uv).rgb;
}

/* scene 좌표 q에 있는 영상 pixel. render target이 아니라 원본 VideoTexture에서 바로 읽어 display가 선명하다. */
vec3 videoAt(vec2 q) {
  for (int i = 0; i < ${INSTANCES}; i++) {
    vec4 r = uPlanes[i];
    vec2 d = q - r.xy;
    if (abs(d.x) <= r.z && abs(d.y) <= r.w) {
      return sampleVideo(uPlaneVideo[i], vec2(0.5 + d.x / (2.0 * r.z), 0.5 - d.y / (2.0 * r.w)));
    }
  }
  return CARBON;
}

/* ---------- D. DISPLAY : 같은 영상을 cover로 꽉 채워 선명하게 ---------- */
vec3 displayColor(vec2 p, float dDisp) {
  vec3 c = videoAt(displayMap(p));
  // 영상 색은 그대로, 대비·밝기만 조금 올린다.
  c = clamp((c - 0.5) * 1.07 + 0.5, 0.0, 1.0) * 1.06;
  // 화면 가장자리는 유리 아래로 아주 조금 가라앉는다(검은 여백은 없다).
  float edge = smoothstep(0.0, 18.0 * uUnit, -dDisp);
  c *= mix(0.86, 1.0, edge);
  // 위쪽 왼쪽에서 비스듬히 비치는 아주 얇은 유리 반사.
  vec2 local = (p - uDisplay.xy) / uDisplay.zw;
  float band = smoothstep(0.35, 0.0, abs(local.x + local.y + 1.05));
  c += mix(ICE, FROST, 0.5) * 0.045 * band;
  return c;
}

/* ---------- A / B. OUTSIDE + APPROACH ---------- */
vec3 outsideColor(vec2 p, float dOut, float reach) {
  // Watch에 가까울수록 Watch 쪽 pixel을 끌어와 보여준다 -> 선이 Watch를 감싸듯 휘어 들어간다.
  // case 외곽(dOut = 0)에서 rim과 같은 reach로 이어지고, 160단위 밖에서 0이 된다.
  float f = 1.0 - smoothstep(0.0, 160.0 * uUnit, max(dOut, 0.0));
  vec2 q = p - normalOuter(p) * reach * pow(f, 1.5);
  vec3 c = outsideTreat(sceneAt(q));
  // case 바로 바깥의 아주 얕은 접촉 그림자.
  return c * (1.0 - 0.34 * exp(-max(dOut, 0.0) / (6.0 * uUnit)));
}

/* ---------- C. GLASS / TITANIUM RIM ---------- */
vec3 rimColor(vec2 p, float dOut, float dDisp, float reach) {
  float rimW = max(dDisp - dOut, 1.0);          // 이 자리의 rim 두께
  float s = clamp(dDisp / rimW, 0.0, 1.0);      // 0 = display 가장자리, 1 = case 외곽
  vec2 n = normalDisplay(p);
  vec2 t = vec2(-n.y, n.x);

  // 굴절: 안쪽은 display의 cover 배율, 바깥쪽은 원래 배율에서 시작해 이어지고,
  // 그 위에 display 가장자리(0) -> 외곽(reach)의 displacement와 가운데가 부푼 lens가 얹힌다.
  float bulge = 0.08 * rimW * (1.0 + 0.5 * uSpeed);
  float delta = reach * s + bulge * sin(PI * s);
  vec2 base = mix(displayMap(p), p, smoothstep(0.0, 1.0, s)) - n * delta;
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
  // 넓고 부드러운 highlight: rim의 위쪽 왼쪽 면 전체가 빛을 받는다.
  float broad = pow(max(dot(n, normalize(vec2(-0.7, -0.75))), 0.0), 1.6) * sin(PI * s);
  // titanium depth: 빛의 반대편(오른쪽 아래)으로 갈수록 깊게 어두워진다.
  float away = max(dot(n, normalize(vec2(0.6, 0.8))), 0.0);

  // 몸체: 어두운 titanium glass. project는 luminance로만 비치고, hue는 항상 material 팔레트다.
  // 밝은 영상이 지나가도 rim이 우윳빛으로 뜨지 않도록 luminance를 눌러 받는다.
  float Lc = L / (L + 0.55);
  vec3 body = mix(CARBON, TITANIUM, 0.1 + 0.14 * (1.0 - abs(tilt))) * (1.0 - 0.3 * away);
  vec3 glass = body + ICE * Lc * (0.26 + 0.1 * uSpeed);
  glass += mix(ICE, FROST, 0.5) * fresnel * (0.34 + 0.22 * uSpeed);
  glass += mix(ICE, FROST, 0.4) * broad * 0.16;

  // 바깥쪽 1/3은 어두운 titanium 금속 띠. 위쪽 왼쪽 빛을 받는 곳에만 가는 광택이 선다.
  float metal = smoothstep(0.6, 0.92, s);
  vec3 titanium = mix(CARBON, TITANIUM, 0.3) * (1.0 - 0.35 * away) + FROST * spec1 * 0.9;
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
  // 굴절 거리(Watch 좌표계 18). 움직일수록 조금 강해진다 — 색이 아니라 intensity만.
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
const OUTER_TREATMENT = new THREE.Vector3(0.7, 0.76, 0.8)

/** Carbon Black (#08090a). canvas 배경이자 project pass의 바탕. */
const CARBON = new THREE.Color(0x08090a)

/** 옆 plane의 최대 기울기(rotateY, 5°)와 가짜 원근 거리. 3D carousel처럼 보이지 않을 만큼만. */
const SIDE_TILT = (5 * Math.PI) / 180
const FOCAL = 1600

/** Watch 모양 하나(rounded rect). canvas CSS px, 위가 0. */
export type FacesBox = { cx: number; cy: number; hx: number; hy: number; r: number }

export type FacesWatchGeometry = {
  /** case 외곽 실루엣. */
  outer: FacesBox
  /** display(화면). */
  display: FacesBox
  /** Watch 좌표계 1단위의 px. rim 두께·굴절 거리가 Watch 크기에 맞춰 바뀐다. */
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
  /** display cover 배율. */
  magnification: number
}

export default class FacesScene {
  private renderer: THREE.WebGLRenderer
  private target: THREE.WebGLRenderTarget
  private planesScene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  private geometry = new THREE.PlaneGeometry(1, 1, 16, 24)
  private planeMaterials: THREE.ShaderMaterial[] = []
  private meshes: THREE.Mesh[] = []
  private textures: THREE.VideoTexture[] = []

  private compositeScene = new THREE.Scene()
  private compositeGeometry = new THREE.PlaneGeometry(2, 2)
  private composite: THREE.ShaderMaterial

  private shared = {
    uBend: { value: 0 },
    uHalfView: { value: 1 },
    uTilt: { value: SIDE_TILT },
    uFocal: { value: FOCAL },
  }

  private width = 1
  private height = 1

  /** project마다 하나씩. 같은 영상이 바깥 plane / 굴절 / display 전부에 쓰인다. */
  readonly videos: HTMLVideoElement[] = []
  /** 원본 비율(가로 / 세로). loadedmetadata에서 실제 값으로 바뀐다. */
  readonly aspects = FACE_PROJECTS.map((p) => p.aspect)

  /** plane 공통 높이, 사이 간격, project별 폭과 중심(F45 중심 = 0), 한 바퀴 거리. */
  planeHeight = 1
  gap = 0
  widths: number[] = []
  centers: number[] = []
  loopWidth = 1

  constructor(canvas: HTMLCanvasElement, onMetadata: () => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(CARBON, 1)
    this.camera.position.z = 5

    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
    this.target.texture.minFilter = THREE.LinearFilter
    this.target.texture.magFilter = THREE.LinearFilter
    this.target.texture.generateMipmaps = false

    FACE_PROJECTS.forEach((project, i) => {
      const video = document.createElement('video')
      video.src = project.video
      video.muted = true
      video.defaultMuted = true
      video.loop = true
      video.playsInline = true
      video.preload = 'metadata'
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.addEventListener('loadedmetadata', () => {
        if (!video.videoWidth || !video.videoHeight) return
        const aspect = video.videoWidth / video.videoHeight
        if (Math.abs(aspect - this.aspects[i]) > 1e-3) {
          this.aspects[i] = aspect
          onMetadata()
        }
      })

      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false

      // 같은 영상의 plane 두 장이 material 하나를 같이 쓴다.
      const material = new THREE.ShaderMaterial({
        vertexShader: PLANE_VERTEX,
        fragmentShader: PLANE_FRAGMENT,
        uniforms: { ...this.shared, uMap: { value: texture } },
      })
      for (let copy = 0; copy < 2; copy++) {
        const mesh = new THREE.Mesh(this.geometry, material)
        this.planesScene.add(mesh)
        this.meshes.push(mesh)
      }

      this.videos.push(video)
      this.textures.push(texture)
      this.planeMaterials.push(material)
    })

    this.composite = new THREE.ShaderMaterial({
      vertexShader: COMPOSITE_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uScene: { value: this.target.texture },
        uVideo0: { value: this.textures[0] },
        uVideo1: { value: this.textures[1] },
        uVideo2: { value: this.textures[2] },
        uVideo3: { value: this.textures[3] },
        uPlanes: { value: Array.from({ length: INSTANCES }, () => new THREE.Vector4()) },
        uPlaneVideo: { value: Array.from({ length: INSTANCES }, (_, k) => Math.floor(k / 2)) },
        uSize: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uWatch: { value: 0 },
        uOuter: { value: new THREE.Vector4() },
        uOuterR: { value: 0 },
        uDisplay: { value: new THREE.Vector4() },
        uDisplayR: { value: 0 },
        uUnit: { value: 1 },
        uMagCenter: { value: new THREE.Vector2() },
        uMag: { value: 1 },
        uVelocity: { value: 0 },
        uSpeed: { value: 0 },
        uOuterTreat: { value: OUTER_TREATMENT },
      },
    })
    const quad = new THREE.Mesh(this.compositeGeometry, this.composite)
    quad.frustumCulled = false
    this.compositeScene.add(quad)
  }

  /** canvas 크기가 바뀔 때(refresh). */
  resize(width: number, height: number, pixelRatio: number) {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio))
    this.camera.left = -width / 2
    this.camera.right = width / 2
    this.camera.top = height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()
    this.shared.uHalfView.value = width / 2
    this.composite.uniforms.uSize.value.set(width, height)
    this.composite.uniforms.uPixelRatio.value = pixelRatio
  }

  /**
   * project를 원본 비율로 놓는다. 높이는 모두 같고 폭은 영상마다 다르다.
   * 다음 중심 = 지금 중심 + 지금 폭 / 2 + 간격 + 다음 폭 / 2. 한 바퀴 = 모든 폭 + 모든 간격.
   */
  layout(planeHeight: number, gap: number) {
    this.planeHeight = planeHeight
    this.gap = gap
    this.widths = this.aspects.map((a) => planeHeight * a)
    this.centers = []
    let center = 0
    this.widths.forEach((w, i) => {
      if (i > 0) center += this.widths[i - 1] / 2 + gap + w / 2
      this.centers.push(center)
    })
    this.loopWidth = this.widths.reduce((sum, w) => sum + w + gap, 0)
    this.meshes.forEach((mesh, k) => mesh.scale.set(this.widths[Math.floor(k / 2)], planeHeight, 1))
  }

  /**
   * project i가 논리 위치 position에서 놓이는 화면 x(Watch 중심 기준 px).
   * 한 바퀴 폭 안에서 wrap되므로 어느 방향으로 얼마나 가도 rail이 끝나지 않는다.
   */
  planeX(index: number, position: number) {
    const half = this.loopWidth / 2
    return gsap.utils.wrap(-half, half, this.centers[index] - position)
  }

  /** project i의 두 instance 중 하나라도 화면(또는 그 근처)에 걸리는지. 안 보이는 영상은 재생을 멈춘다. */
  isNearView(index: number, position: number, margin: number) {
    const x = this.planeX(index, position)
    const reach = this.width / 2 + this.widths[index] / 2 + margin
    return Math.abs(x) < reach || Math.abs(x + (x < 0 ? this.loopWidth : -this.loopWidth)) < reach
  }

  render(state: FacesRenderState) {
    // 1. project pass -> offscreen. project마다 wrap된 자리와 한 바퀴 옆자리에 한 장씩.
    const planes = this.composite.uniforms.uPlanes.value as THREE.Vector4[]
    FACE_PROJECTS.forEach((_, i) => {
      const x = this.planeX(i, state.position)
      const twin = x + (x < 0 ? this.loopWidth : -this.loopWidth)
      this.meshes[i * 2].position.x = x
      this.meshes[i * 2 + 1].position.x = twin
      const hw = this.widths[i] / 2
      const hh = this.planeHeight / 2
      planes[i * 2].set(this.width / 2 + x, this.height / 2, hw, hh)
      planes[i * 2 + 1].set(this.width / 2 + twin, this.height / 2, hw, hh)
    })
    this.shared.uBend.value = state.bend
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
      // cover 배율의 중심: display의 가로 중심, plane 줄의 세로 중심.
      u.uMagCenter.value.set(w.display.cx, this.height / 2)
    }
    u.uMag.value = state.magnification
    u.uVelocity.value = state.velocity
    u.uSpeed.value = state.speed
    this.renderer.render(this.compositeScene, this.camera)
  }

  dispose() {
    for (const video of this.videos) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    this.geometry.dispose()
    this.compositeGeometry.dispose()
    for (const m of this.planeMaterials) m.dispose()
    this.composite.dispose()
    for (const t of this.textures) t.dispose()
    this.target.dispose()
    this.renderer.dispose()
  }
}
