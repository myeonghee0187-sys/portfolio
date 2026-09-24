import * as THREE from 'three'
import gsap from 'gsap'
import { FACE_PROJECTS } from './facesData'

/**
 * FACES의 WebGL visual field.
 *
 *   1. gallery pass    project 영상 plane을 원본 비율 그대로 offscreen render target에 그린다.
 *                      gallery 전체가 처음부터 하나의 wave / ribbon 위에 놓여 있다(Watch와 무관하다).
 *   2. composite pass  그 texture와 같은 VideoTexture를 source로 화면 전체를 다시 그린다.
 *                      Watch 모양(rounded rect SDF 두 개: case 외곽 / display)에 따라
 *                        OUTSIDE   wave gallery 그대로
 *                        APPROACH  wave 위에 Watch 쪽으로 굴절이 더해진다
 *                        RIM       가장 강한 굴절 + 둘레 방향 stretch + Blue / Ice / Titanium glass
 *                        DISPLAY   같은 영상을 display에 cover로 꽉 채운다
 *                      가 하나의 연속된 sampling field로 이어진다.
 *
 * 변형은 네 층이고 순서가 정해져 있다.
 *   1. GLOBAL WAVE      모든 plane 중심이 하나의 wave 경로(높이 + 깊이) 위에 있고, 그 기울기를 따라 돌아 있다.
 *   2. BASE CURVE       plane 자체가 아주 조금 휜 면이다. 멈춰 있어도 있다.
 *   3. WATCH FIELD      Watch 주변에서만 더해지는 굴절(composite).
 *   4. VELOCITY         빠르게 움직일 때만 더해지는 bend. 멈추면 0.
 * Watch가 project를 처음 휘게 만드는 것이 아니다. 1·2는 Watch를 가려도 그대로 보인다.
 *
 * DISPLAY는 바깥 gallery를 그대로 들여다보지 않는다. 같은 slider 위치를 쓰지만 project 사이 간격을
 * 없앤 "display strip"을 읽는다 — project마다 display를 cover로 채우는 크기로 이어 붙이고,
 * 이음매는 양쪽 가장자리 pixel을 늘여 부드럽게 잇는다. 그래서 display 안에는 검은 간격이 없고,
 * 두 project 사이에서도 F45 -> F45 | TCHAIKIM -> TCHAIKIM으로 공간적으로 이어진다(교체 / crossfade 없음).
 *
 * RIM의 색은 project luminance만 받아 Portfolio material 팔레트로 칠한다 — 어떤 영상이 지나가도
 * Watch의 hue는 바뀌지 않고, 영상의 명암·선·움직임만 굴절된 detail로 비친다.
 */

/* ---------------- gallery pass ---------------- */

const PLANE_VERTEX = /* glsl */ `
uniform float uFreq;       // wave 주파수(rad / px)
uniform float uAmpY;       // wave 높이(px)
uniform float uAmpZ;       // wave 깊이(px). 가운데가 가장 가깝고 양옆으로 물러난다.
uniform float uFocal;      // 원근 초점 거리(px)
uniform float uYawGain;    // wave 깊이 기울기를 plane 방향(rotateY)으로 옮기는 비율
uniform float uYawMax;
uniform float uRollGain;   // wave 높이 기울기를 rotateZ로 옮기는 비율(아주 작게)
uniform vec2 uRollFade;    // 가운데 active 구간에서는 rotateZ를 0으로 둔다
uniform float uSag;        // plane 자체의 휨(px). 폭이 넓을수록 크다.
uniform float uBend;       // velocity: plane 세로 가운데가 뒤로 처지는 양(px)
uniform float uVelCurve;   // velocity: 휨이 조금 더 깊어지는 양(px)
varying vec2 vUv;
varying float vShade;

const float PI = 3.141592653589793;

void main() {
  vUv = uv;
  // plane 중심의 wave 위 가로 위치(= project 논리 위치 - slider 위치)와 plane 안의 좌표(px).
  float cx = modelMatrix[3][0];
  vec2 local = vec2(position.x * modelMatrix[0][0], position.y * modelMatrix[1][1]);

  // 1. GLOBAL WAVE: 모든 plane이 같은 곡선 위에 있다. 화면에 고정된 곡선이고 plane이 그 위를 지나간다.
  float ph = cx * uFreq;
  vec3 center = vec3(cx, uAmpY * sin(ph), uAmpZ * (cos(ph) - 1.0));
  float dzdx = -uAmpZ * uFreq * sin(ph);
  float dydx = uAmpY * uFreq * cos(ph);
  float yaw = clamp(atan(dzdx) * uYawGain, -uYawMax, uYawMax);
  float roll = atan(dydx) * uRollGain * smoothstep(uRollFade.x, uRollFade.y, abs(cx));

  // 2. BASE CURVE (+ 4. VELOCITY): 가운데가 앞으로 나온 아주 얕은 원통 면.
  vec3 v = vec3(local, (uSag + uVelCurve) * sin(uv.x * PI));

  float cr = cos(roll);
  float sr = sin(roll);
  v.xy = vec2(v.x * cr - v.y * sr, v.x * sr + v.y * cr);
  float cy = cos(yaw);
  float sy = sin(yaw);
  v.xz = vec2(v.x * cy - v.z * sy, v.x * sy + v.z * cy);

  vec3 world = center + v;
  // 4. VELOCITY: 움직이는 동안 세로 가운데가 뒤로 처진다. 위·아래 끝은 제자리다.
  world.x += sin(uv.y * PI) * uBend;

  // 원근. w로 나누게 두어 texture도 원근에 맞게 보간된다.
  float w = (uFocal - world.z) / uFocal;
  vec4 clip = projectionMatrix * viewMatrix * vec4(world.xy, 0.0, 1.0);
  gl_Position = vec4(clip.xy, 0.0, w);

  // 멀리 물러난 plane은 Carbon 쪽으로 조금 가라앉는다(깊이감).
  vShade = 1.0 - 0.2 * clamp(-center.z / (2.0 * uAmpZ), 0.0, 1.0);
}
`

const PLANE_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec2 vUv;
varying float vShade;

const vec3 CARBON = vec3(0.031, 0.035, 0.039);

void main() {
  vec3 c = texture2D(uMap, vUv).rgb * vShade;
  // 기울어진 가장자리의 계단을 1px 안에서 Carbon으로 녹인다.
  vec2 edge = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-5));
  float a = clamp(min(edge.x, edge.y), 0.0, 1.0);
  gl_FragColor = vec4(mix(CARBON, c, a), 1.0);
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

// display strip: project를 간격 없이 cover 크기로 이어 붙인 띠(px).
uniform vec4 uStrip[4];       // project마다 중심 x, 반폭, cover 배율, -
uniform float uStripStart;    // 띠의 왼쪽 끝
uniform float uStripLen;      // 띠 한 바퀴
uniform float uStripPos;      // display 가운데에 오는 띠 위의 위치
uniform float uRowY;          // project 줄의 세로 중심(canvas px)
uniform float uPlaneH;        // project 공통 높이(px)

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

/** display strip 이음매에서 양쪽 가장자리를 늘여 섞는 폭(Watch 단위). */
const float BRIDGE = 16.0;

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

/* project j의 display strip 위 한 점(띠 좌표 x, canvas y). 가로는 띠 안에서 늘어나지 않게 clamp한다. */
vec3 stripProject(int j, float x, float y) {
  vec4 s = uStrip[j];
  float u = clamp(0.5 + (x - s.x) / (2.0 * s.y), 0.001, 0.999);
  float v = 0.5 - (y - uRowY) / (uPlaneH * s.z);
  return sampleVideo(j, vec2(u, clamp(v, 0.001, 0.999)));
}

/*
 * display strip. 간격이 없어서 어디를 읽어도 영상이다.
 * 이음매 양쪽 BRIDGE 안에서는 이웃 project의 가장자리 pixel을 늘여 섞는다 — 경계에서 정확히 반반이라
 * 양쪽에서 계산한 색이 이어지고, 검은 선도 딱딱한 선도 없다.
 */
vec3 stripAt(float x, float y) {
  float xr = uStripStart + mod(x - uStripStart, uStripLen);
  int j = 3;
  for (int i = 0; i < 4; i++) {
    if (xr < uStrip[i].x + uStrip[i].y) { j = i; break; }
  }
  vec4 s = uStrip[j];
  vec3 c = stripProject(j, xr, y);
  float bridge = BRIDGE * uUnit;
  float toLeft = xr - (s.x - s.y);
  float toRight = (s.x + s.y) - xr;
  if (toLeft < bridge) {
    int k = j == 0 ? 3 : j - 1;
    // 왼쪽 이웃의 오른쪽 끝. 띠 한 바퀴를 넘는 경우(0 <- 3)도 가장자리만 읽으므로 좌표만 맞추면 된다.
    vec3 n = stripProject(k, uStrip[k].x + uStrip[k].y, y);
    c = mix(c, n, 0.5 * (1.0 - smoothstep(0.0, bridge, toLeft)));
  } else if (toRight < bridge) {
    int k = j == 3 ? 0 : j + 1;
    vec3 n = stripProject(k, uStrip[k].x - uStrip[k].y, y);
    c = mix(c, n, 0.5 * (1.0 - smoothstep(0.0, bridge, toRight)));
  }
  return c;
}

/* display 좌표계의 한 점이 보여줄 영상. */
vec3 displayMedia(vec2 p) {
  return stripAt(uStripPos + (p.x - uDisplay.x), p.y);
}

/* ---------- D. DISPLAY : 같은 영상을 cover로 꽉 채워 선명하게 ---------- */
vec3 displayColor(vec2 p, float dDisp) {
  vec3 c = displayMedia(p);
  // 영상 색은 그대로, 대비·밝기만 조금 올린다.
  c = clamp((c - 0.5) * 1.06 + 0.5, 0.0, 1.0) * 1.04;
  // 화면 가장자리는 유리 아래로 아주 조금 가라앉는다(검은 여백은 없다).
  float edge = smoothstep(0.0, 16.0 * uUnit, -dDisp);
  c *= mix(0.88, 1.0, edge);
  // 위쪽 왼쪽에서 비스듬히 비치는 아주 얇은 유리 반사. 멈춰 있어도 있다.
  vec2 local = (p - uDisplay.xy) / uDisplay.zw;
  float band = smoothstep(0.32, 0.0, abs(local.x + local.y + 1.05));
  c += mix(ICE, FROST, 0.5) * 0.05 * band;
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
   * 굴절 + 둘레 방향 stretch.
   *   안쪽 절반: display strip을 가장자리 너머로 끌어내 늘인다(display가 유리 곡면으로 이어진다).
   *   바깥 절반: wave gallery를 Watch 쪽에서 끌어온다(APPROACH가 이어진다).
   * 두 쪽 모두 둘레(tangent) 방향으로 길게 늘어나고, 움직이는 방향으로 조금 더 흐른다.
   */
  float pullIn = (10.0 + 14.0 * s) * uUnit;
  float pullOut = reach + 0.1 * rimW * lens;
  vec2 flow = vec2(-uVelocity * 46.0 * uUnit * lens, 0.0);
  vec2 qIn = p - n * pullIn + flow;
  vec2 qOut = p - n * pullOut + flow;
  float spread = (2.5 + 7.0 * lens + 16.0 * uSpeed) * uUnit;
  float Lin = 0.0;
  float Lout = 0.0;
  for (int k = -3; k <= 3; k++) {
    float fk = float(k);
    float wk = 1.0 - abs(fk) * 0.22;
    vec2 o = t * spread * fk / 3.0;
    Lin += luma(displayMedia(qIn + o)) * wk;
    Lout += luma(sceneAt(qOut + o)) * wk;
  }
  Lin /= 4.36;
  Lout /= 4.36;
  float L = mix(Lin, Lout, smoothstep(0.25, 0.8, s));

  // 차가운 분산: 가장자리 luminance 차이만 Ice / Electric Ice로 남긴다(0.5 ~ 1.5px, 무지개 없음).
  float dispersion = 0.6 + 0.9 * uSpeed;
  float fringe = luma(sceneAt(qOut + n * dispersion)) - luma(sceneAt(qOut - n * dispersion));

  // 유리 곡면의 가짜 3D normal: 안쪽 가장자리는 안으로, 바깥 가장자리는 밖으로 기운다.
  float tilt = s * 2.0 - 1.0;
  vec3 N = normalize(vec3(n * tilt * 1.25, 1.0));
  float fresnel = pow(1.0 - N.z, 2.8);

  // 위쪽 왼쪽의 차가운 studio light(canvas는 y가 아래로 +). Watch가 고정이라 반사 모양이 흔들리지 않는다.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.55, -0.7, 0.6));
  vec3 L2 = normalize(vec3(0.6, 0.7, 0.5));
  float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 70.0);
  float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 36.0);
  float key = max(dot(n, normalize(vec2(-0.66, -0.75))), 0.0);   // 빛을 받는 쪽(위쪽 왼쪽)
  float away = max(dot(n, normalize(vec2(0.6, 0.8))), 0.0);      // 반대편(오른쪽 아래)
  // 넓고 부드러운 studio reflection: 위쪽 왼쪽 면 가운데에 큰 빛 한 덩어리.
  float broad = pow(key, 1.2) * exp(-pow((s - 0.42) / 0.26, 2.0));

  /*
   * 몸체: 깊은 dark titanium glass. 영상은 유리를 통과한 명암으로만 비친다(hue는 항상 material 팔레트).
   * 안쪽(display 쪽)은 투명하게 많이 비치고, 바깥 titanium 쪽으로 갈수록 적게 비친다.
   */
  float Ld = pow(clamp(L, 0.0, 1.0), 1.15);
  float trans = mix(0.52, 0.14, smoothstep(0.2, 0.95, s)) * (1.0 + 0.2 * uSpeed);
  vec3 body = mix(CARBON, TITANIUM, 0.05 + 0.1 * key * lens) * (1.0 - 0.5 * away);
  vec3 glass = body + mix(ICE, TITANIUM, 0.3) * Ld * trans;
  glass += mix(ICE, FROST, 0.5) * fresnel * (0.26 + 0.2 * uSpeed);
  glass += mix(ICE, FROST, 0.6) * broad * 0.2;
  glass += FROST * spec1 * (0.95 + 0.3 * uSpeed);
  glass += ICE * spec2 * 0.1 + ELECTRIC * spec2 * 0.1;
  glass += (ICE * 0.35 + ELECTRIC * 0.65) * max(fringe, 0.0) * (0.55 + 0.7 * uSpeed);
  // 오른쪽 아래의 Ice 반사(보조광 쪽 유리 안).
  glass += ICE * away * lens * 0.06;

  // 바깥 가장자리 쪽은 어두운 titanium 금속 띠. 빛을 받는 곳에만 가는 광택이 선다.
  float metal = smoothstep(0.72, 0.97, s);
  vec3 titanium = mix(CARBON, TITANIUM, 0.22 + 0.34 * key) * (1.0 - 0.45 * away);
  glass = mix(glass, titanium, metal * 0.6);

  // 얇은 선 세 개: display 가장자리 바로 바깥의 안쪽 유리 반사, case 외곽의 Frost edge,
  // 그 바로 안쪽의 아주 얇은 Electric Ice 보조 edge(오른쪽 아래 쪽으로만).
  float innerLine = 1.0 - smoothstep(0.0, 1.1, abs(dDisp - 2.2));
  float outerLine = 1.0 - smoothstep(0.0, 1.2, abs(dOut + 0.9));
  float iceLine = 1.0 - smoothstep(0.0, 1.0, abs(dOut + 2.9));
  glass += mix(ICE, FROST, key) * innerLine * (0.18 + 0.3 * key);
  glass += mix(TITANIUM, FROST, 0.35 + 0.65 * key) * outerLine * 0.6;
  glass += ELECTRIC * iceLine * (0.12 + 0.28 * away + 0.2 * uSpeed);

  // display 가장자리에서 검은 선 없이 화면으로 녹아든다.
  return mix(displayColor(p, dDisp), glass, smoothstep(0.0, 0.12, s));
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

/** display 밖 project의 treatment: opacity, brightness, saturate. Watch와 따로 떨어져 보이지 않을 만큼만 누른다. */
const OUTER_TREATMENT = new THREE.Vector3(0.86, 0.88, 0.9)

/** Carbon Black (#08090a). canvas 배경이자 gallery pass의 바탕. */
const CARBON = new THREE.Color(0x08090a)

/*
 * GLOBAL WAVE. 길이는 stage 폭, 높이는 stage 높이에 비례한다(1920 x 1080 값은 괄호).
 *   wave 한 주기          stage 폭 x 1.4        (2688px)
 *   높이(진폭)            stage 높이 x 0.045    (49px)   왼쪽은 내려가고 오른쪽은 올라간다
 *   깊이(진폭)            stage 폭 x 0.085      (163px)  가운데가 가장 가깝고 양옆으로 물러난다
 *   원근 초점 거리        stage 폭 x 0.85       (1632px)
 *   plane 방향            wave 깊이 기울기 x 0.32, 최대 8°(rotateY)
 *                         wave 높이 기울기 x 0.35(rotateZ). 가운데 active 구간에서는 0
 *   plane 자체의 휨       반지름 stage 폭 x 1.8인 원통의 sagitta: 폭² / (8 x 반지름)
 */
const WAVE_LENGTH = 1.4
const WAVE_HEIGHT = 0.045
const WAVE_DEPTH = 0.085
const FOCAL = 0.85
const YAW_GAIN = 0.32
const YAW_MAX = (8 * Math.PI) / 180
const ROLL_GAIN = 0.35
const ROLL_FADE = [0.08, 0.34] as const
const CURVE_RADIUS = 1.8

/** velocity가 1일 때 plane의 휨이 더 깊어지는 양(stage 폭 비율). */
const VELOCITY_CURVE = 0.018

/** display strip 계산에서 display 중심과 project 줄 중심의 차이를 반영하는 한계(display 높이 비율). */
const ROW_OFFSET_LIMIT = 0.04

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

/** display strip 하나. 바깥 gallery의 간격을 없애고 project마다 display를 cover로 채우는 크기로 이어 붙인다. */
type Strip = {
  /** project마다 띠 위의 중심, 폭, cover 배율. */
  centers: number[]
  widths: number[]
  scales: number[]
  start: number
  length: number
  /** 바깥 논리 위치 -> 띠 위치의 대응점(한 주기). */
  anchors: [number, number][]
}

export default class FacesScene {
  private renderer: THREE.WebGLRenderer
  private target: THREE.WebGLRenderTarget
  private planesScene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  private geometry = new THREE.PlaneGeometry(1, 1, 48, 24)
  private planeMaterials: THREE.ShaderMaterial[] = []
  private meshes: THREE.Mesh[] = []
  private textures: THREE.VideoTexture[] = []

  private compositeScene = new THREE.Scene()
  private compositeGeometry = new THREE.PlaneGeometry(2, 2)
  private composite: THREE.ShaderMaterial

  private shared = {
    uFreq: { value: 0 },
    uAmpY: { value: 0 },
    uAmpZ: { value: 1 },
    uFocal: { value: 1600 },
    uYawGain: { value: YAW_GAIN },
    uYawMax: { value: YAW_MAX },
    uRollGain: { value: ROLL_GAIN },
    uRollFade: { value: new THREE.Vector2() },
    uBend: { value: 0 },
    uVelCurve: { value: 0 },
  }

  private width = 1
  private height = 1
  private strip: Strip | null = null
  private stripKey = ''

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
  /** 마지막으로 그린 display strip 위치(QA용). */
  stripPosition = 0

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
        uniforms: { ...this.shared, uMap: { value: texture }, uSag: { value: 0 } },
      })
      for (let copy = 0; copy < 2; copy++) {
        const mesh = new THREE.Mesh(this.geometry, material)
        mesh.frustumCulled = false
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
        uSize: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uWatch: { value: 0 },
        uOuter: { value: new THREE.Vector4() },
        uOuterR: { value: 0 },
        uDisplay: { value: new THREE.Vector4() },
        uDisplayR: { value: 0 },
        uUnit: { value: 1 },
        uStrip: { value: FACE_PROJECTS.map(() => new THREE.Vector4()) },
        uStripStart: { value: 0 },
        uStripLen: { value: 1 },
        uStripPos: { value: 0 },
        uRowY: { value: 0 },
        uPlaneH: { value: 1 },
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
    this.height = height
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
    this.shared.uRollFade.value.set(width * ROLL_FADE[0], width * ROLL_FADE[1])

    const u = this.composite.uniforms
    u.uSize.value.set(width, height)
    u.uPixelRatio.value = pixelRatio
    u.uRowY.value = height / 2
    this.stripKey = ''
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
    // plane 자체의 휨: 같은 반지름의 원통이라 넓은 영상일수록 더 휜다.
    const radius = this.width * CURVE_RADIUS
    this.planeMaterials.forEach((m, i) => (m.uniforms.uSag.value = this.widths[i] ** 2 / (8 * radius)))
    this.composite.uniforms.uPlaneH.value = planeHeight
    this.stripKey = ''
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
   * display strip을 display 크기에 맞춰 만든다(크기가 바뀔 때만).
   *   cover 배율   max(1, display 폭 / project 폭, display 높이 / project 높이)
   *                가로 영상은 1(바깥과 같은 크기), 세로 영상은 display 폭을 채우는 배율(약 1.6)
   *   대응점       project 안에서 display가 그 project만 보는 구간은 바깥과 같은 속도로,
   *                바깥 간격의 가운데는 띠의 이음매로 간다. 그 사이는 직선으로 잇는다.
   */
  private buildStrip(display: FacesBox): Strip {
    const displayW = display.hx * 2
    const displayH = display.hy * 2
    const rowOffset = Math.min(Math.abs(display.cy - this.height / 2), displayH * ROW_OFFSET_LIMIT)
    const scales = this.widths.map((w) =>
      Math.max(1, displayW / w, (displayH + 2 * rowOffset) / this.planeHeight),
    )
    const widths = this.widths.map((w, i) => w * scales[i])
    const centers: number[] = []
    let c = 0
    widths.forEach((w, i) => {
      if (i > 0) c += widths[i - 1] / 2 + w / 2
      centers.push(c)
    })
    const length = widths.reduce((sum, w) => sum + w, 0)
    const start = -widths[0] / 2

    const anchors: [number, number][] = [[-(this.widths[0] / 2 + this.gap / 2), start]]
    this.widths.forEach((w, i) => {
      const a = Math.max(0, w / 2 - displayW / 2)
      const b = Math.max(0, widths[i] / 2 - displayW / 2)
      anchors.push([this.centers[i] - a, centers[i] - b])
      anchors.push([this.centers[i] + a, centers[i] + b])
      anchors.push([this.centers[i] + w / 2 + this.gap / 2, centers[i] + widths[i] / 2])
    })
    return { centers, widths, scales, start, length, anchors }
  }

  /** 바깥 논리 위치 -> display strip 위치. 한 주기 안에서 대응점 사이를 직선으로 잇고, 주기는 그대로 이어 붙인다. */
  private stripAt(strip: Strip, position: number) {
    const p0 = strip.anchors[0][0]
    const turns = Math.floor((position - p0) / this.loopWidth)
    const p = position - turns * this.loopWidth
    const a = strip.anchors
    for (let i = 1; i < a.length; i++) {
      if (p <= a[i][0]) {
        const span = a[i][0] - a[i - 1][0]
        const f = span > 1e-6 ? (p - a[i - 1][0]) / span : 1
        return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * f + turns * strip.length
      }
    }
    return a[a.length - 1][1] + turns * strip.length
  }

  render(state: FacesRenderState) {
    // 1. gallery pass -> offscreen. project마다 wrap된 자리와 한 바퀴 옆자리에 한 장씩.
    FACE_PROJECTS.forEach((_, i) => {
      const x = this.planeX(i, state.position)
      this.meshes[i * 2].position.x = x
      this.meshes[i * 2 + 1].position.x = x + (x < 0 ? this.loopWidth : -this.loopWidth)
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

      const key = `${w.display.hx.toFixed(2)} ${w.display.hy.toFixed(2)} ${w.display.cy.toFixed(1)}`
      if (!this.strip || key !== this.stripKey) {
        this.strip = this.buildStrip(w.display)
        this.stripKey = key
        const strip = this.strip
        ;(u.uStrip.value as THREE.Vector4[]).forEach((v, i) =>
          v.set(strip.centers[i], strip.widths[i] / 2, strip.scales[i], 0),
        )
        u.uStripStart.value = strip.start
        u.uStripLen.value = strip.length
      }
      this.stripPosition = this.stripAt(this.strip, state.position)
      // 띠는 한 바퀴마다 반복되므로 shader에는 한 바퀴 안의 값만 넘긴다(float 정밀도).
      u.uStripPos.value = gsap.utils.wrap(this.strip.start, this.strip.start + this.strip.length, this.stripPosition)
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
    this.compositeGeometry.dispose()
    for (const m of this.planeMaterials) m.dispose()
    this.composite.dispose()
    for (const t of this.textures) t.dispose()
    this.target.dispose()
    this.renderer.dispose()
  }
}
