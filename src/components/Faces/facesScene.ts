import * as THREE from 'three'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'

/**
 * FACES의 WebGL visual field.
 *
 *   1. gallery pass    project 영상 plane과 그 사이의 optical bridge를 offscreen render target에 그린다.
 *                      gallery 전체가 처음부터 하나의 wave / ribbon 위에 놓여 있다(Watch와 무관하다).
 *   2. composite pass  그 texture와 같은 VideoTexture를 source로 화면 전체를 다시 그린다.
 *                      Watch 모양(rounded rect SDF 두 개: case 외곽 / display)에 따라
 *                        OUTSIDE   wave gallery 그대로
 *                        APPROACH  wave 위에 Watch 쪽으로 굴절이 더해진다
 *                        RIM       gallery를 가장 강하게 굴절 + 둘레 방향 stretch + Titanium / Ice glass
 *                        DISPLAY   같은 영상을 display 자체의 비율로 cover해서 꽉 채운다
 *                      가 하나의 연속된 sampling field로 이어진다.
 *
 * 변형은 다섯 층이고 순서가 정해져 있다.
 *   1. GLOBAL WAVE      모든 plane이 하나의 wave 경로(높이 + 깊이) 위에 있고, 그 기울기를 따라 돌아 있다.
 *   2. BASE CURVE       plane 자체가 아주 조금 휜 면이다. 멈춰 있어도 있다.
 *   3. OPTICAL BRIDGE   project 사이 간격을 양쪽 가장자리 영상을 늘여 잇는 면. 같은 wave 위에 있다.
 *   4. WATCH FIELD      Watch 주변에서만 더해지는 굴절(composite).
 *   5. VELOCITY         빠르게 움직일 때만 더해지는 bend. 멈추면 0.
 * Watch가 gallery를 처음 휘게 만드는 것이 아니다. 1·2·3은 Watch를 가려도 그대로 보인다.
 *
 * DISPLAY는 바깥 gallery를 들여다보는 창이 아니다. 같은 VideoTexture를 display rect 기준의
 * local UV(0~1)로 다시 읽어 object-fit: cover로 채운다 — 가로 영상은 좌우를, 세로 영상은 위아래를 잘라낸다.
 * project마다 display 폭 하나씩의 자리를 차지하는 띠 위에 있고, 바깥에서 두 project 사이 간격이
 * Watch를 지나가는 동안에만 그 경계가 display 안을 지나간다(교체 / crossfade 없음, 검은 간격 없음).
 * display용 영상은 display SDF 안에만 있다. RIM은 바깥 gallery만 굴절시켜 보여준다.
 *
 * RIM의 색은 project luminance만 받아 Portfolio material 팔레트로 칠한다 — 어떤 영상이 지나가도
 * Watch의 hue는 바뀌지 않고, 영상의 명암·선·움직임만 굴절된 detail로 비친다.
 */

/* ---------------- gallery pass ---------------- */

/**
 * plane과 bridge가 함께 쓰는 wave. 모든 점(vertex)이 자기 가로 위치에서 같은 곡선을 따른다.
 * 그래서 plane 가장자리와 bridge가 같은 곡선 위에 있고, 이음매에서 위치·기울기·깊이가 같다.
 */
const WAVE_CHUNK = /* glsl */ `
uniform float uFreq;       // wave 주파수(rad / px)
uniform float uAmpY;       // wave 높이(px)
uniform float uAmpZ;       // wave 깊이(px). 가운데가 가장 가깝고 양옆으로 물러난다.
uniform vec2 uFlat;        // 가운데 active 구간에서 wave 높이를 줄이는 범위(px)
uniform float uFlatLevel;  // 그 구간의 wave 높이 비율
uniform float uFocal;      // 원근 초점 거리(px)
uniform float uBend;       // velocity: 세로 가운데가 뒤로 처지는 양(px)
uniform float uVelCurve;   // velocity: plane 휨이 조금 더 깊어지는 양(px)
uniform float uShadeDepth; // 멀리 물러난 곳이 Carbon 쪽으로 가라앉는 정도

const float PI = 3.141592653589793;

/*
 * 1. GLOBAL WAVE. 가로 위치 x(= 논리 위치 - slider 위치)의 곡선 위 높이와 깊이.
 * 화면에 고정된 곡선이고 gallery가 그 위를 지나간다. 가운데 active 구간은 높이 변화만 줄여
 * 가운데 project가 거의 정면·수평으로 선다(깊이 곡선은 그대로라 휜 면은 남는다).
 */
float waveY(float x) {
  float flatten = mix(uFlatLevel, 1.0, smoothstep(uFlat.x, uFlat.y, abs(x)));
  return uAmpY * sin(x * uFreq) * flatten;
}
float waveZ(float x) {
  return uAmpZ * (cos(x * uFreq) - 1.0);
}

float waveShade(float x) {
  return 1.0 - uShadeDepth * clamp(-waveZ(x) / (2.0 * uAmpZ), 0.0, 1.0);
}

/* 원근. w로 나누게 두어 texture도 원근에 맞게 보간된다. */
vec4 projectWave(vec3 world) {
  float w = (uFocal - world.z) / uFocal;
  vec4 clip = projectionMatrix * viewMatrix * vec4(world.xy, 0.0, 1.0);
  return vec4(clip.xy, 0.0, w);
}
`

const PLANE_VERTEX = /* glsl */ `
${WAVE_CHUNK}
uniform float uSag;        // plane 자체의 휨(px). 폭이 넓을수록 크다.
varying vec2 vUv;
varying float vShade;

void main() {
  vUv = uv;
  // 이 점의 wave 위 가로 위치(= project 논리 위치 - slider 위치 + plane 안의 x)와 세로 위치(px).
  float x = modelMatrix[3][0] + position.x * modelMatrix[0][0];
  float y = position.y * modelMatrix[1][1];
  // 1. GLOBAL WAVE + 2. BASE CURVE(+ 5. VELOCITY): 가운데가 앞으로 나온 아주 얕은 원통 면이 wave에 얹힌다.
  vec3 world = vec3(x, y + waveY(x), waveZ(x) + (uSag + uVelCurve) * sin(uv.x * PI));
  // 5. VELOCITY: 움직이는 동안 세로 가운데가 뒤로 처진다. 위·아래 끝은 제자리다.
  world.x += sin(uv.y * PI) * uBend;
  gl_Position = projectWave(world);
  vShade = waveShade(x);
}
`

const PLANE_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uFeather;    // 좌우 가장자리에서 영상이 bridge 쪽으로 늘어나기 시작하는 폭(plane 폭 비율)
varying vec2 vUv;
varying float vShade;

const vec3 CARBON = vec3(0.031, 0.035, 0.039);

void main() {
  /*
   * EDGE FEATHER. 좌우 끝 uFeather 안에서는 가장자리로 갈수록 영상이 점점 더 늘어난다
   * (d -> f * (2x² - x³), x = d / f). 끝에서는 가장자리 한 줄이 되어 bridge의 시작과 같은 pixel이고,
   * feather 시작점에서는 기울기가 1이라 영상 본문과 이음매가 없다. 검은 fade가 아니다.
   */
  float u = vUv.x;
  float d = min(u, 1.0 - u);
  if (d < uFeather) {
    float x = d / uFeather;
    float d2 = uFeather * (2.0 * x * x - x * x * x);
    u = u < 0.5 ? d2 : 1.0 - d2;
  }
  vec3 c = texture2D(uMap, vec2(u, vUv.y)).rgb * vShade;
  // 위·아래 가장자리의 계단만 1px 안에서 Carbon으로 녹인다. 좌우는 bridge와 이어진다.
  float a = clamp(min(vUv.y, 1.0 - vUv.y) / max(fwidth(vUv.y), 1e-5), 0.0, 1.0);
  gl_FragColor = vec4(mix(CARBON, c, a), 1.0);
}
`

const BRIDGE_VERTEX = /* glsl */ `
${WAVE_CHUNK}
uniform float uGap;        // 바깥 gallery의 간격(px)
uniform float uWA;         // 왼쪽 project(A) 폭
uniform float uWB;         // 오른쪽 project(B) 폭
uniform float uSagA;       // A의 휨(px)
uniform float uSagB;       // B의 휨(px)
varying float vT;
varying float vV;
varying float vShade;

void main() {
  /*
   * 3. OPTICAL BRIDGE. A의 오른쪽 가장자리에서 B의 왼쪽 가장자리까지 같은 wave 위에 놓인 면.
   * 양쪽 plane의 휨(base curve)이 가장자리에서 가진 기울기를 cubic Hermite로 이어 받아,
   * 두 휜 면 사이에서 살짝 들어갔다 나온다. 위치·기울기·깊이 모두 이음매에서 같다.
   * 양쪽 plane 밑으로 2%씩 겹쳐 그려 머리카락 같은 틈이 생기지 않게 한다.
   */
  float t = mix(-0.02, 1.02, uv.x);
  float x = modelMatrix[3][0] - uGap * 0.5 + t * uGap;
  float y = position.y * modelMatrix[1][1];
  // 가장자리에서 휨의 기울기: A 오른쪽은 뒤로(-), B 왼쪽은 앞으로(+) 기운다.
  float slopeA = -PI * (uSagA + uVelCurve) / uWA;
  float slopeB = PI * (uSagB + uVelCurve) / uWB;
  float t2 = t * t;
  float t3 = t2 * t;
  float dip = ((t3 - 2.0 * t2 + t) * slopeA + (t3 - t2) * slopeB) * uGap;
  vec3 world = vec3(x, y + waveY(x), waveZ(x) + dip);
  world.x += sin(uv.y * PI) * uBend;
  gl_Position = projectWave(world);

  vT = clamp(t, 0.0, 1.0);
  vV = uv.y;
  vShade = waveShade(x);
}
`

const BRIDGE_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMapA;
uniform sampler2D uMapB;
uniform float uBridgeDim;  // bridge 가운데가 가라앉는 정도(공간감은 남긴다)
varying float vT;
varying float vV;
varying float vShade;

const vec3 CARBON = vec3(0.031, 0.035, 0.039);
const float PI = 3.141592653589793;

void main() {
  float t = vT;
  float mid = sin(PI * t);
  /*
   * OPTICAL BRIDGE. blur가 아니라 가장자리 영상 자체를 늘인다.
   *   A 쪽: A 오른쪽 가장자리의 좁은 띠(끝 2.5%)를 bridge 폭만큼 늘인다. t = 0에서는 A의 마지막 한 줄이다.
   *   B 쪽: B 왼쪽 가장자리의 좁은 띠를 같은 방식으로 늘인다.
   * 가운데로 갈수록 세로로 아주 조금 부풀어(렌즈) 선들이 휘며 넘어간다.
   */
  float lensV = (vV - 0.5) * (1.0 - 0.06 * mid) + 0.5;
  float ripple = 0.012 * mid * sin(vV * 11.0 + t * 3.0);
  vec3 a = texture2D(uMapA, vec2(1.0 - 0.025 * t, lensV + ripple)).rgb;
  vec3 b = texture2D(uMapB, vec2(0.025 * (1.0 - t), lensV - ripple)).rgb;

  // 공간적으로 섞는다. 섞이는 경계가 세로 직선이 아니라 영상을 따라 휘어 opacity crossfade처럼 보이지 않는다.
  float warp = 0.14 * mid * (dot(a - b, vec3(0.33)) + 0.35 * sin(vV * 7.0 - t * 2.0));
  float w = smoothstep(0.08, 0.92, t + warp);
  vec3 c = mix(a, b, w);

  // bridge 가운데는 조금 가라앉는다. 검은 구멍이 아니라 project 사이의 숨 쉬는 간격이다.
  c *= mix(1.0, 1.0 - uBridgeDim, pow(mid, 1.4)) * vShade;
  float edge = clamp(min(vV, 1.0 - vV) / max(fwidth(vV), 1e-5), 0.0, 1.0);
  gl_FragColor = vec4(mix(CARBON, c, edge), 1.0);
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

uniform sampler2D uScene;     // gallery pass 결과
uniform sampler2D uVideo0;    // project 영상. gallery pass와 같은 VideoTexture다.
uniform sampler2D uVideo1;
uniform sampler2D uVideo2;
uniform sampler2D uVideo3;

uniform vec2 uSize;           // canvas CSS px
uniform float uPixelRatio;

uniform float uWatch;         // 1 = Watch 있음, 0 = 없음(전부 OUTSIDE)
uniform vec4 uOuter;          // case 외곽: 중심 xy, 반폭·반높이 zw
uniform float uOuterR;
uniform vec4 uDisplay;        // display
uniform float uDisplayR;
uniform float uUnit;          // Watch 좌표계 1단위의 px

// display: project마다 display 폭 하나씩의 자리를 차지하는 띠.
uniform float uSlotW;         // display 폭(px) = 자리 하나
uniform float uStripPos;      // display 가운데에 오는 띠 위의 위치(0 = F45 자리 가운데)
uniform float uMediaAspect[4];

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

/** display 안에서 두 project 자리의 경계를 양쪽 가장자리 pixel을 늘여 잇는 폭(Watch 단위). */
const float SEAM = 22.0;

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

vec3 sampleVideo(int index, vec2 uv) {
  if (index == 0) return texture2D(uVideo0, uv).rgb;
  if (index == 1) return texture2D(uVideo1, uv).rgb;
  if (index == 2) return texture2D(uVideo2, uv).rgb;
  return texture2D(uVideo3, uv).rgb;
}

/*
 * WATCH-LOCAL COVER. display rect 기준 local UV(0~1)를 object-fit: cover로 영상 UV로 바꾼다.
 *   영상이 display보다 가로로 길면(F45, TCHAIKIM)   가로만 display / 영상 비율로 좁혀 좌우를 잘라낸다.
 *   영상이 display보다 세로로 길면(JADUYA, T100)    세로만 좁혀 위아래를 잘라낸다.
 * 늘이지 않는다.
 */
vec3 coverProject(int j, vec2 local) {
  float displayAspect = uDisplay.z / uDisplay.w;
  float mediaAspect = uMediaAspect[j];
  vec2 uv = clamp(local, 0.0, 1.0);
  if (mediaAspect > displayAspect) uv.x = 0.5 + (uv.x - 0.5) * displayAspect / mediaAspect;
  else uv.y = 0.5 + (uv.y - 0.5) * mediaAspect / displayAspect;
  return sampleVideo(j, vec2(uv.x, 1.0 - uv.y));
}

/*
 * display가 보여줄 영상. 띠 위에서 project j의 자리는 [j - 0.5, j + 0.5] x 자리 폭이고,
 * 자리 경계 양쪽 SEAM 안에서는 이웃 project의 가장자리 pixel을 늘여 섞는다(경계에서 정확히 반반).
 */
vec3 displayMedia(vec2 p) {
  float x = uStripPos + (p.x - uDisplay.x);
  float len = 4.0 * uSlotW;
  float start = -0.5 * uSlotW;
  float xr = start + mod(x - start, len);
  int j = int(clamp(floor((xr - start) / uSlotW), 0.0, 3.0));
  float slot = float(j) * uSlotW;
  float lv = (p.y - (uDisplay.y - uDisplay.w)) / (2.0 * uDisplay.w);
  vec3 c = coverProject(j, vec2((xr - slot) / uSlotW + 0.5, lv));

  float seam = SEAM * uUnit;
  float toLeft = xr - (slot - 0.5 * uSlotW);
  float toRight = (slot + 0.5 * uSlotW) - xr;
  if (toLeft < seam) {
    int k = j == 0 ? 3 : j - 1;
    c = mix(c, coverProject(k, vec2(1.0, lv)), 0.5 * (1.0 - smoothstep(0.0, seam, toLeft)));
  } else if (toRight < seam) {
    int k = j == 3 ? 0 : j + 1;
    c = mix(c, coverProject(k, vec2(0.0, lv)), 0.5 * (1.0 - smoothstep(0.0, seam, toRight)));
  }
  return c;
}

/* ---------- D. DISPLAY : display rect 기준 cover로 꽉 채워 선명하게 ---------- */
vec3 displayColor(vec2 p, float dDisp) {
  vec3 c = displayMedia(p);
  // 영상 색은 그대로, 대비·밝기만 조금 올린다. 바깥 gallery보다 항상 선명하다.
  c = clamp((c - 0.5) * 1.06 + 0.5, 0.0, 1.0) * 1.04;
  // 화면 가장자리는 유리 아래 검은 테두리 쪽으로 아주 조금 가라앉는다(검은 여백은 없다).
  float edge = smoothstep(0.0, 14.0 * uUnit, -dDisp);
  c *= mix(0.84, 1.0, edge);
  // 위쪽 왼쪽에서 비스듬히 비치는 아주 얇은 유리 반사. 멈춰 있어도 있다.
  vec2 local = (p - uDisplay.xy) / uDisplay.zw;
  float band = smoothstep(0.32, 0.0, abs(local.x + local.y + 1.05));
  c += mix(ICE, FROST, 0.5) * 0.045 * band;
  return c;
}

/* ---------- A / B. OUTSIDE + APPROACH ---------- */
vec3 outsideColor(vec2 p, float dOut, float reach) {
  // wave gallery 위에 Watch 쪽 굴절이 더해진다. case 외곽(dOut = 0)에서 rim과 같은 reach로 이어지고,
  // 200단위(1920 x 1080에서 약 200px) 밖에서 0이 된다.
  float f = 1.0 - smoothstep(0.0, 200.0 * uUnit, max(dOut, 0.0));
  vec2 n = normalOuter(p);
  vec2 t = vec2(-n.y, n.x);
  float w = pow(f, 1.4);
  vec2 q = p - n * reach * w;
  // Watch 가까이에서는 둘레를 따라 조금 늘어난다(rim의 stretch가 바깥으로 이어지는 부분).
  float spread = (5.0 + 10.0 * uSpeed) * uUnit * w * w;
  vec3 c = sceneAt(q) * 0.4 + (sceneAt(q + t * spread) + sceneAt(q - t * spread)) * 0.3;
  c = outsideTreat(c);
  // case 바로 바깥의 아주 얕은 접촉 그림자.
  return c * (1.0 - 0.3 * exp(-max(dOut, 0.0) / (5.0 * uUnit)));
}

/* ---------- C. GLASS / TITANIUM RIM ---------- */
vec3 rimColor(vec2 p, float dOut, float dDisp, float reach) {
  float rimW = max(dDisp - dOut, 1.0);          // 이 자리의 rim 두께
  float s = clamp(dDisp / rimW, 0.0, 1.0);      // 0 = display 가장자리, 1 = case 외곽
  vec2 n = normalDisplay(p);
  vec2 t = vec2(-n.y, n.x);
  float lens = sin(PI * s);

  /*
   * 굴절 + 둘레 방향 stretch. rim은 바깥 gallery(global mapping)만 굴절시켜 보여준다.
   * display용 cover 영상은 여기로 나오지 않는다. 외곽(s = 1)에서는 APPROACH와 같은 reach로 이어진다.
   */
  float pull = reach * (0.35 + 0.65 * s) + 0.12 * rimW * lens;
  vec2 flow = vec2(-uVelocity * 46.0 * uUnit * lens, 0.0);
  vec2 q = p - n * pull + flow;
  float spread = (2.5 + 7.0 * lens + 16.0 * uSpeed) * uUnit;
  float L = 0.0;
  for (int k = -3; k <= 3; k++) {
    float fk = float(k);
    L += luma(sceneAt(q + t * spread * fk / 3.0)) * (1.0 - abs(fk) * 0.22);
  }
  L /= 4.36;

  // 차가운 분산: 가장자리 luminance 차이만 Ice / Electric Ice로 남긴다(0.5 ~ 1.5px, 무지개 없음).
  float dispersion = 0.6 + 0.9 * uSpeed;
  float fringe = luma(sceneAt(q + n * dispersion)) - luma(sceneAt(q - n * dispersion));

  /*
   * 단면: 가운데는 평평한 black glass, 바깥은 둥글게 넘어가는 titanium 가장자리, 안쪽은 아주 작은 bevel.
   * 단면 전체가 둥근 tube가 아니라서 부풀린 금속관처럼 보이지 않는다.
   */
  float outerRound = smoothstep(0.66, 1.0, s);
  float innerBevel = 1.0 - smoothstep(0.0, 0.14, s);
  vec3 N = normalize(vec3(n * (outerRound - 0.55 * innerBevel) * 1.5, 1.0));
  float fresnel = pow(1.0 - N.z, 3.0);

  // 위쪽 왼쪽의 차가운 studio light(canvas는 y가 아래로 +). Watch가 고정이라 반사 모양이 흔들리지 않는다.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.55, -0.7, 0.6));
  vec3 L2 = normalize(vec3(0.6, 0.7, 0.5));
  float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 90.0);
  float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 40.0);
  float key = max(dot(n, normalize(vec2(-0.66, -0.75))), 0.0);   // 빛을 받는 쪽(위쪽 왼쪽)
  float away = max(dot(n, normalize(vec2(0.6, 0.8))), 0.0);      // 반대편(오른쪽 아래)

  // black glass: 영상은 유리를 통과한 명암으로만 비친다(hue는 항상 material 팔레트).
  float Ld = pow(clamp(L, 0.0, 1.0), 1.2);
  float trans = mix(0.34, 0.12, smoothstep(0.3, 0.9, s)) * (1.0 + 0.2 * uSpeed);
  vec3 glass = CARBON * 0.9 + mix(ICE, TITANIUM, 0.35) * Ld * trans;
  // display 바로 바깥은 더 어둡다(화면과 유리 사이의 검은 테두리).
  glass *= mix(0.42, 1.0, smoothstep(0.03, 0.24, s));
  // 바깥 가장자리: dark titanium. 빛의 반대편으로 갈수록 깊게 가라앉는다.
  vec3 titanium = mix(CARBON, TITANIUM, 0.16 + 0.4 * key) * (1.0 - 0.55 * away);
  glass = mix(glass, titanium, outerRound * 0.78);

  // 넓은 반사는 약하게, 위쪽 왼쪽 면에만.
  float broad = pow(key, 1.4) * exp(-pow((s - 0.45) / 0.22, 2.0));
  glass += mix(ICE, FROST, 0.6) * broad * 0.09;
  glass += mix(ICE, FROST, 0.5) * fresnel * (0.2 + 0.16 * uSpeed);
  glass += FROST * spec1 * (1.0 + 0.3 * uSpeed);
  glass += ICE * spec2 * 0.08;
  glass += (ICE * 0.35 + ELECTRIC * 0.65) * max(fringe, 0.0) * (0.45 + 0.7 * uSpeed);

  // 얇고 정확한 선 세 개:
  //   case 외곽의 Frost White edge(빛을 받는 쪽이 밝다),
  //   display 바로 바깥의 얇은 Ice 반사,
  //   외곽 바로 안쪽의 Electric Ice 보조 edge(오른쪽 아래 쪽에만).
  float outerLine = 1.0 - smoothstep(0.0, 1.0, abs(dOut + 0.8));
  float iceLine = 1.0 - smoothstep(0.0, 0.9, abs(dDisp - 2.0));
  float electricLine = 1.0 - smoothstep(0.0, 0.9, abs(dOut + 2.6));
  glass += mix(TITANIUM, FROST, 0.3 + 0.7 * key) * outerLine * 0.8;
  glass += ICE * iceLine * (0.08 + 0.3 * key);
  glass += ELECTRIC * electricLine * (0.08 + 0.3 * away + 0.2 * uSpeed);

  // 안쪽 transition band: display 가장자리에서 rim의 굴절 영상으로 검은 선 없이 넘어간다.
  return mix(displayColor(p, dDisp), glass, smoothstep(0.0, 0.1, s));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;

  if (uWatch < 0.5) {
    gl_FragColor = vec4(outsideTreat(sceneAt(p)), 1.0);
    return;
  }

  float dOut = sdOuter(p);       // > 0 : Watch 밖
  float dDisp = sdDisplay(p);    // < 0 : display 안
  // 굴절 거리(Watch 좌표계 26). 움직일수록 조금 강해진다 — 색이 아니라 intensity만.
  float reach = 26.0 * uUnit * (1.0 + 0.5 * uSpeed);

  // 세 영역을 경계 ±0.75px에서 섞는다(모서리 계단 없음). display 영상은 display SDF 안에만 있다.
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

/**
 * display 밖 gallery의 treatment: opacity, brightness, saturate.
 * 옆 project 내용을 충분히 알아볼 수 있을 만큼 밝히되, display보다는 조금 가라앉힌다.
 */
const OUTER_TREATMENT = new THREE.Vector3(0.9, 0.95, 0.92)

/** Carbon Black (#08090a). canvas 배경이자 gallery pass의 바탕. */
const CARBON = new THREE.Color(0x08090a)

/*
 * GLOBAL WAVE. 길이는 stage 폭, 높이는 stage 높이에 비례한다(1920 x 1080 값은 괄호).
 * 모든 점이 자기 가로 위치 x에서 같은 곡선을 따른다(plane 중심만이 아니라 plane 전체와 bridge까지).
 *   wave 한 주기          stage 폭 x 1.4        (2688px)
 *   높이(진폭)            stage 높이 x 0.05     (54px)   왼쪽은 내려가고 오른쪽은 올라간다
 *                         가운데 stage 폭 x 0.06 ~ 0.36 구간은 높이만 30%까지 줄여 가운데 project가 수평에 가깝다
 *   깊이(진폭)            stage 폭 x 0.075      (144px)  가운데가 가장 가깝고 양옆으로 물러난다
 *   원근 초점 거리        stage 폭 x 0.85       (1632px)
 *   plane 자체의 휨       반지름 stage 폭 x 1.8인 원통의 sagitta: 폭² / (8 x 반지름)
 */
const WAVE_LENGTH = 1.4
const WAVE_HEIGHT = 0.05
const WAVE_DEPTH = 0.075
const WAVE_FLAT = [0.06, 0.36] as const
const WAVE_FLAT_LEVEL = 0.3
const FOCAL = 0.85
const CURVE_RADIUS = 1.8

/** 멀리 물러난 plane이 Carbon 쪽으로 가라앉는 정도(가장 먼 곳에서). */
const SHADE_DEPTH = 0.16

/** 좌우 가장자리에서 영상이 bridge 쪽으로 늘어나는 폭(plane 폭의 6%). */
const EDGE_FEATHER = 0.06

/** bridge 가운데가 가라앉는 정도. 0이면 양쪽 영상 밝기 그대로, 1이면 검정. */
const BRIDGE_DIM = 0.4

/** velocity가 1일 때 plane의 휨이 더 깊어지는 양(stage 폭 비율). */
const VELOCITY_CURVE = 0.018

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
}

const smoothstep = (t: number) => t * t * (3 - 2 * t)

export default class FacesScene {
  private renderer: THREE.WebGLRenderer
  private target: THREE.WebGLRenderTarget
  private planesScene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  private geometry = new THREE.PlaneGeometry(1, 1, 48, 24)
  private bridgeGeometry = new THREE.PlaneGeometry(1, 1, 16, 24)
  private planeMaterials: THREE.ShaderMaterial[] = []
  private bridgeMaterials: THREE.ShaderMaterial[] = []
  private meshes: THREE.Mesh[] = []
  private bridges: THREE.Mesh[] = []
  private textures: THREE.VideoTexture[] = []

  private compositeScene = new THREE.Scene()
  private compositeGeometry = new THREE.PlaneGeometry(2, 2)
  private composite: THREE.ShaderMaterial

  /** plane과 bridge가 같은 uniform object를 나눠 쓴다. */
  private shared = {
    uFreq: { value: 0 },
    uAmpY: { value: 0 },
    uAmpZ: { value: 1 },
    uFocal: { value: 1600 },
    uFlat: { value: new THREE.Vector2() },
    uFlatLevel: { value: WAVE_FLAT_LEVEL },
    uBend: { value: 0 },
    uVelCurve: { value: 0 },
    uShadeDepth: { value: SHADE_DEPTH },
    uGap: { value: 0 },
  }

  private width = 1

  /** project마다 하나씩. 같은 영상이 바깥 plane / bridge / 굴절 / display 전부에 쓰인다. */
  readonly videos: HTMLVideoElement[] = []
  /** 원본 비율(가로 / 세로). loadedmetadata에서 실제 값으로 바뀐다. */
  readonly aspects = FACE_PROJECTS.map((p) => p.aspect)

  /** plane 공통 높이, 사이 간격, project별 폭과 중심(F45 중심 = 0), 한 바퀴 거리. */
  planeHeight = 1
  gap = 0
  widths: number[] = []
  centers: number[] = []
  loopWidth = 1
  /** 마지막으로 그린 display 띠 위치(자리 단위, 0 = F45, 1 = TCHAIKIM ...). QA용. */
  displaySlot = 0

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
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping

      // 같은 영상의 plane 두 장이 material 하나를 같이 쓴다.
      const material = new THREE.ShaderMaterial({
        vertexShader: PLANE_VERTEX,
        fragmentShader: PLANE_FRAGMENT,
        uniforms: { ...this.shared, uMap: { value: texture }, uSag: { value: 0 }, uFeather: { value: EDGE_FEATHER } },
      })
      for (let copy = 0; copy < 2; copy++) {
        const mesh = new THREE.Mesh(this.geometry, material)
        mesh.frustumCulled = false
        mesh.renderOrder = 1
        this.planesScene.add(mesh)
        this.meshes.push(mesh)
      }

      this.videos.push(video)
      this.textures.push(texture)
      this.planeMaterials.push(material)
    })

    // project i의 오른쪽과 다음 project의 왼쪽을 잇는 bridge. T100 -> F45(다음 바퀴)도 같은 방식이다.
    // 새 texture를 만들지 않고 양쪽 project의 VideoTexture를 그대로 읽는다. plane보다 먼저 그려 plane 밑으로 겹친다.
    FACE_PROJECTS.forEach((_, i) => {
      const next = (i + 1) % FACE_PROJECTS.length
      const material = new THREE.ShaderMaterial({
        vertexShader: BRIDGE_VERTEX,
        fragmentShader: BRIDGE_FRAGMENT,
        uniforms: {
          ...this.shared,
          uMapA: { value: this.textures[i] },
          uMapB: { value: this.textures[next] },
          uWA: { value: 1 },
          uWB: { value: 1 },
          uSagA: { value: 0 },
          uSagB: { value: 0 },
          uBridgeDim: { value: BRIDGE_DIM },
        },
      })
      for (let copy = 0; copy < 2; copy++) {
        const mesh = new THREE.Mesh(this.bridgeGeometry, material)
        mesh.frustumCulled = false
        mesh.renderOrder = 0
        this.planesScene.add(mesh)
        this.bridges.push(mesh)
      }
      this.bridgeMaterials.push(material)
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
        uSize: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uWatch: { value: 0 },
        uOuter: { value: new THREE.Vector4() },
        uOuterR: { value: 0 },
        uDisplay: { value: new THREE.Vector4() },
        uDisplayR: { value: 0 },
        uUnit: { value: 1 },
        uSlotW: { value: 1 },
        uStripPos: { value: 0 },
        uMediaAspect: { value: [...this.aspects] },
        uVelocity: { value: 0 },
        uSpeed: { value: 0 },
        uOuterTreat: { value: OUTER_TREATMENT },
      },
    })
    const quad = new THREE.Mesh(this.compositeGeometry, this.composite)
    quad.frustumCulled = false
    this.compositeScene.add(quad)
  }

  /** canvas 크기가 바뀔 때(refresh). wave도 stage 크기에 맞춰 다시 정한다. */
  resize(width: number, height: number, pixelRatio: number) {
    this.width = width
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio))
    this.camera.left = -width / 2
    this.camera.right = width / 2
    this.camera.top = height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()

    this.shared.uFreq.value = (2 * Math.PI) / (width * WAVE_LENGTH)
    this.shared.uAmpY.value = height * WAVE_HEIGHT
    this.shared.uAmpZ.value = width * WAVE_DEPTH
    this.shared.uFocal.value = width * FOCAL
    this.shared.uFlat.value.set(width * WAVE_FLAT[0], width * WAVE_FLAT[1])

    const u = this.composite.uniforms
    u.uSize.value.set(width, height)
    u.uPixelRatio.value = pixelRatio
  }

  /**
   * project를 원본 비율로 놓는다. 높이는 모두 같고 폭은 영상마다 다르다.
   * 다음 중심 = 지금 중심 + 지금 폭 / 2 + 간격 + 다음 폭 / 2. 한 바퀴 = 모든 폭 + 모든 간격.
   * 간격에는 bridge가 놓인다.
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
    this.bridges.forEach((mesh) => mesh.scale.set(1, planeHeight, 1))

    // plane 자체의 휨: 같은 반지름의 원통이라 넓은 영상일수록 더 휜다.
    const radius = this.width * CURVE_RADIUS
    const sags = this.widths.map((w) => w ** 2 / (8 * radius))
    this.planeMaterials.forEach((m, i) => (m.uniforms.uSag.value = sags[i]))
    this.bridgeMaterials.forEach((m, i) => {
      const next = (i + 1) % this.widths.length
      m.uniforms.uWA.value = this.widths[i]
      m.uniforms.uWB.value = this.widths[next]
      m.uniforms.uSagA.value = sags[i]
      m.uniforms.uSagB.value = sags[next]
    })
    this.shared.uGap.value = gap
    this.composite.uniforms.uMediaAspect.value = [...this.aspects]
  }

  /**
   * project i가 논리 위치 position에서 놓이는 wave 위 가로 위치(Watch 중심 기준 px, 원근 전).
   * 한 바퀴 폭 안에서 wrap되므로 어느 방향으로 얼마나 가도 gallery가 끝나지 않는다.
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

  /**
   * 바깥 논리 위치 -> display 띠 위치(자리 단위).
   *   HOLD        바깥에서 project i만 display 뒤에 있는 동안(|position - 중심| < 폭 / 2 - display 폭 / 2)
   *               display는 project i의 cover 화면에 그대로 머문다.
   *   TRANSITION  그 다음 project의 HOLD가 시작될 때까지 한 자리를 smoothstep으로 옮겨 간다.
   *               바깥에서 두 project 사이 간격이 Watch를 지나가는 구간과 겹친다.
   * 세로 영상은 display보다 좁아서 HOLD가 없고 가운데에서 잠깐 멈췄다 넘어간다.
   */
  private slotAt(position: number, displayW: number) {
    const n = this.widths.length
    const hold = this.widths.map((w) => Math.max(0, w / 2 - displayW / 2))
    const start = this.centers[0] - hold[0]
    const turns = Math.floor((position - start) / this.loopWidth)
    const p = position - turns * this.loopWidth
    for (let i = 0; i < n; i++) {
      const holdEnd = this.centers[i] + hold[i]
      if (p <= holdEnd) return i + turns * n
      const next = i + 1 < n ? this.centers[i + 1] : this.centers[0] + this.loopWidth
      const nextStart = next - hold[(i + 1) % n]
      if (p <= nextStart) return i + smoothstep((p - holdEnd) / Math.max(nextStart - holdEnd, 1e-6)) + turns * n
    }
    return n + turns * n
  }

  render(state: FacesRenderState) {
    // 1. gallery pass -> offscreen. project와 bridge마다 wrap된 자리와 한 바퀴 옆자리에 한 장씩.
    const place = (mesh: THREE.Mesh, twin: THREE.Mesh, x: number) => {
      mesh.position.x = x
      twin.position.x = x + (x < 0 ? this.loopWidth : -this.loopWidth)
    }
    const half = this.loopWidth / 2
    FACE_PROJECTS.forEach((_, i) => {
      place(this.meshes[i * 2], this.meshes[i * 2 + 1], this.planeX(i, state.position))
      const bridgeCenter = this.centers[i] + this.widths[i] / 2 + this.gap / 2
      place(this.bridges[i * 2], this.bridges[i * 2 + 1], gsap.utils.wrap(-half, half, bridgeCenter - state.position))
    })
    this.shared.uBend.value = state.bend
    this.shared.uVelCurve.value = this.width * VELOCITY_CURVE * state.speed
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
      const displayW = w.display.hx * 2
      this.displaySlot = this.slotAt(state.position, displayW)
      // 띠는 네 자리마다 반복되므로 shader에는 한 바퀴 안의 값만 넘긴다(float 정밀도).
      const n = this.widths.length
      u.uSlotW.value = displayW
      u.uStripPos.value = gsap.utils.wrap(-0.5, n - 0.5, this.displaySlot) * displayW
    }
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
    this.bridgeGeometry.dispose()
    this.compositeGeometry.dispose()
    for (const m of this.planeMaterials) m.dispose()
    for (const m of this.bridgeMaterials) m.dispose()
    this.composite.dispose()
    for (const t of this.textures) t.dispose()
    this.target.dispose()
    this.renderer.dispose()
  }
}
