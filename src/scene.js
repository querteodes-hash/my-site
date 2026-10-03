import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBills } from './bills.js';
import { makeBanknoteTextures } from './banknote.js';
import { createMoneyKit } from './money.js';

export const GAP = 30; // world units between sections along the dive axis
const BG = 0x040505;

const glass = (extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.06,
    transmission: 1,
    thickness: 1.6,
    ior: 1.5,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 480],
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.4,
    ...extra,
  });

// each letter of the name gets its own cell in one atlas, so the word can split into 3D pieces
const TITLE_H = 520;
const TITLE_UNIT = 1 / 2400; // atlas px → title units (the whole group is scaled to fit the screen)
function makeTitleAtlas(text) {
  const font = '900 360px Unbounded, "Arial Black", sans-serif';
  const pad = 56;
  const m = document.createElement('canvas').getContext('2d');
  m.font = font;
  const wordW = m.measureText(text).width;
  const letters = [...text].map((ch, i) => {
    const w = m.measureText(ch).width;
    const x = m.measureText(text.slice(0, i)).width;
    return { ch, w, cellW: Math.ceil(w + pad * 2), center: x + w / 2 - wordW / 2 };
  });
  const atlasW = letters.reduce((a, l) => a + l.cellW, 0);
  const c = document.createElement('canvas');
  c.width = atlasW;
  c.height = TITLE_H;
  const g = c.getContext('2d');
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const grad = g.createLinearGradient(0, 80, 0, 440);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#d9ddd6');
  grad.addColorStop(1, '#6f7a72');
  g.fillStyle = grad;
  let cx = 0;
  for (const l of letters) {
    g.fillText(l.ch, cx + l.cellW / 2, TITLE_H / 2 + 10);
    l.u0 = cx / atlasW;
    l.u1 = (cx + l.cellW) / atlasW;
    cx += l.cellW;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { texture: t, letters };
}

// the name burns away like the money when the dive begins
const titleVS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const titleFS = /* glsl */ `
uniform sampler2D uMap;
uniform float uBurn;
uniform float uTime;
uniform float uSeed;
uniform vec2 uCell;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * n2(p); p *= 2.1; a *= .5; } return v; }
void main(){
  vec4 tx = texture2D(uMap, vUv);
  float alpha = smoothstep(0.3, 0.62, tx.a);
  if (alpha < 0.01) discard;
  vec2 luv = vec2((vUv.x - uCell.x) / (uCell.y - uCell.x), vUv.y);
  // fire starts at a random point low on the letter and eats its way up
  vec2 origin = vec2(0.3 + uSeed * 0.4, -0.1);
  float d = length((luv - origin) * vec2(0.8, 1.0)) * 0.85 + (fbm(luv * vec2(5.0, 6.0) + uSeed * 9.0) - 0.5) * 0.4;
  float t = uBurn * 1.35 - 0.12;
  float e = d - t;
  if (e < 0.0) discard;
  float on = step(0.001, uBurn);
  float glow = (1.0 - smoothstep(0.0, 0.035, e)) * on;
  float charr = (1.0 - smoothstep(0.0, 0.16, e)) * on;
  float scorch = (1.0 - smoothstep(0.0, 0.3, e)) * on;
  vec3 col = tx.rgb;
  col = mix(col, col * vec3(0.6, 0.4, 0.22), scorch);
  col = mix(col, vec3(0.03, 0.02, 0.015), charr);
  float flick = 0.7 + 0.3 * sin(uTime * 16.0 + luv.x * 40.0 + uSeed * 10.0);
  col += mix(vec3(1.0, 0.16, 0.02), vec3(1.0, 0.58, 0.18), glow) * glow * 3.0 * flick;
  gl_FragColor = vec4(col, alpha);
}`;

const streakVS = /* glsl */ `
attribute float aEnd;
attribute float aTint;
uniform float uCamZ;
uniform float uTime;
uniform float uStretch;
varying float vA;
varying float vTint;
void main(){
  vec3 p = position;
  float rel = mod(p.z - uCamZ + uTime * 3.0, 90.0) - 80.0;
  p.z = uCamZ + rel + aEnd * (0.4 + uStretch);
  vA = smoothstep(-80.0, -40.0, rel) * (1.0 - smoothstep(2.0, 8.0, rel)) * mix(0.25, 1.0, aEnd);
  vTint = aTint;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const streakFS = /* glsl */ `
varying float vA;
varying float vTint;
void main(){
  vec3 c = mix(vec3(0.85, 0.95, 0.9), vec3(1.0, 0.55, 0.22), step(0.82, vTint));
  gl_FragColor = vec4(c * vA * 0.9, 1.0);
}`;

const dustVS = /* glsl */ `
attribute float aSeed;
uniform float uCamZ;
uniform float uTime;
uniform float uPR;
varying float vA;
void main(){
  vec3 p = position;
  float rel = mod(p.z - uCamZ + uTime * 0.6, 70.0) - 62.0;
  p.z = uCamZ + rel;
  p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.4;
  p.y += cos(uTime * 0.25 + aSeed * 20.0) * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (1.0 + aSeed * 2.5) * uPR * (12.0 / -mv.z);
  vA = smoothstep(-62.0, -30.0, rel) * (1.0 - smoothstep(3.0, 8.0, rel)) * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 50.0));
  gl_Position = projectionMatrix * mv;
}`;
const dustFS = /* glsl */ `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(vec3(0.9, 1.0, 0.95) * smoothstep(0.5, 0.0, d) * vA, 1.0);
}`;

const orbVS = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying float vD;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z);
}
void main(){
  float d = n3(normal * 2.2 + uTime * 0.6) * 0.6 + n3(normal * 5.0 - uTime * 0.9) * 0.25;
  vD = d;
  vN = normalize(normalMatrix * normal);
  vec3 p = position + normal * d * 0.45;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const orbFS = /* glsl */ `
varying vec3 vN;
varying float vD;
void main(){
  float f = pow(1.0 - abs(vN.z), 2.0);
  vec3 c = mix(vec3(1.0, 0.25, 0.03), vec3(1.0, 0.8, 0.45), vD);
  gl_FragColor = vec4(c * (0.35 + vD * 1.3) + f * vec3(1.0, 0.45, 0.15) * 0.9, 1.0);
}`;

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0015 },
    uVignette: { value: 1.1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAberration; uniform float uVignette;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r = dot(c, c);
      vec2 off = c * uAberration * (1.0 + r * 4.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col *= 1.0 - smoothstep(0.15, 0.75, r * uVignette);
      col += (rnd(vUv * 900.0) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createScene(canvas, { sections, isMobile, noteFront = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let pr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.03);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 0, 6);

  const sideObjects = []; // things with a base x that tuck in on narrow screens
  let knotY = 0.3;
  let knotScale = 1;
  const spinners = [];
  const timeUniforms = [];

  /* ---------- hero: the name behind a slab of iridescent glass ---------- */
  const heroGroup = new THREE.Group();
  scene.add(heroGroup);
  const atlas = makeTitleAtlas('QUERTEO');
  const title = new THREE.Group();
  title.position.set(0, 0.35, -5);
  heroGroup.add(title);
  const letters = atlas.letters.map((l, i, all) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: titleVS,
      fragmentShader: titleFS,
      uniforms: {
        uMap: { value: atlas.texture },
        uBurn: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: Math.random() },
        uCell: { value: new THREE.Vector2(l.u0, l.u1) },
      },
      alphaToCoverage: true,
    });
    timeUniforms.push(mat.uniforms.uTime);
    const geo = new THREE.PlaneGeometry(l.cellW * TITLE_UNIT, TITLE_H * TITLE_UNIT);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, l.u0 + uv.getX(k) * (l.u1 - l.u0));
    const mesh = new THREE.Mesh(geo, mat);
    const c = i - (all.length - 1) / 2;
    const rnd = () => Math.random() - 0.5;
    const home = new THREE.Vector3(l.center * TITLE_UNIT, 0, 0);
    mesh.position.copy(home);
    title.add(mesh);
    return {
      mesh,
      mat,
      home,
      halfW: l.cellW * TITLE_UNIT * 0.3,
      // where this letter flies when the word splits (in title units)
      to: new THREE.Vector3(
        c === 0 ? 0.04 : Math.sign(c) * (0.16 + Math.abs(c) * 0.085),
        c === 0 ? 0.22 : rnd() * 0.24,
        0.02 + Math.random() * 0.1
      ),
      rot: new THREE.Euler(rnd() * 0.9, c === 0 ? rnd() * 0.6 : -Math.sign(c) * (0.7 + Math.random() * 0.6), rnd() * 1.1),
      burnFrom: 0.1 + Math.random() * 0.08,
      burnTo: 0.42 + Math.random() * 0.12,
    };
  });

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.05, 0.34, 260, 40, 2, 3), glass({ thickness: 2.2 }));
  knot.position.set(0, 0.3, -1.4);
  heroGroup.add(knot);

  /* ---------- the money: printed notes + solid cash bricks ---------- */
  const notes = makeBanknoteTextures(Math.min(8, renderer.capabilities.getMaxAnisotropy()), noteFront);
  const money = createMoneyKit(notes);
  const tumblers = []; // bricks and notes that tumble in place

  // bundles drifting along the first leg of the dive, so the camera flies past solid cash
  [
    [-4.6, -1.8, -9, 1.1],
    [5.2, 1.9, -14, 1.3],
    [-3.6, 2.6, -21, 0.9],
    [4.1, -2.4, -27, 1.2],
    [-5.8, 0.4, -34, 1.4],
  ].forEach(([x, y, z, sc], i) => {
    const b = money.brick();
    b.position.set(x, y, z);
    b.scale.setScalar(sc);
    b.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    b.userData.baseX = x;
    sideObjects.push(b);
    tumblers.push({ obj: b, sx: 0.25 + i * 0.04, sy: 0.35 - i * 0.05, sz: 0.1, bob: i * 1.3 });
    scene.add(b);
  });

  /* ---------- 01 about: bundles of cash hanging around the card ---------- */
  const z1 = -GAP;
  [
    [-5.4, 1.5, z1 - 5, 1.5],
    [5.6, -1.3, z1 - 7, 1.8],
    [-4.4, -2.5, z1 - 10, 1.1],
    [4.6, 2.5, z1 - 3, 1.0],
  ].forEach(([x, y, z, sc], i) => {
    const b = money.brick();
    b.position.set(x, y, z);
    b.scale.setScalar(sc);
    b.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    b.userData.baseX = x;
    sideObjects.push(b);
    tumblers.push({ obj: b, sx: 0.18 + i * 0.03, sy: 0.26 - i * 0.02, sz: 0.06, bob: i });
    scene.add(b);
  });

  /* ---------- 02 playbook: a chess king on the board, copper pawns around it ---------- */
  const z2 = -GAP * 2;
  const lathe = (pts, mat) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64), mat);
  const obsidian = new THREE.MeshPhysicalMaterial({ color: 0x0d0f0e, roughness: 0.14, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
  const copperPiece = new THREE.MeshStandardMaterial({ color: 0xb87a40, metalness: 1, roughness: 0.34, envMapIntensity: 0.75 });

  const king = new THREE.Group();
  king.add(
    lathe(
      [[0, 0], [1.0, 0], [1.0, 0.12], [0.9, 0.2], [0.95, 0.3], [0.72, 0.42], [0.56, 0.56], [0.42, 1.3], [0.37, 1.9],
       [0.62, 2.0], [0.64, 2.1], [0.4, 2.16], [0.48, 2.55], [0.52, 2.7], [0.3, 2.86], [0, 2.9]],
      obsidian
    )
  );
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.035, 16, 96), copperPiece);
  band.rotation.x = Math.PI / 2;
  band.position.y = 2.05;
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), copperPiece);
  crossV.position.y = 3.18;
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.14), copperPiece);
  crossH.position.y = 3.26;
  king.add(band, crossV, crossH);

  const pawn = () => {
    const p = new THREE.Group();
    p.add(lathe([[0, 0], [0.6, 0], [0.6, 0.1], [0.5, 0.18], [0.46, 0.26], [0.3, 0.36], [0.22, 0.8], [0.4, 0.9], [0.4, 0.97], [0.18, 1.02], [0, 1.02]], copperPiece));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), copperPiece);
    head.position.y = 1.28;
    p.add(head);
    return p;
  };

  // board: dark lacquer squares with a copper inlay border
  const bc = document.createElement('canvas');
  bc.width = bc.height = 512;
  const bg = bc.getContext('2d');
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      bg.fillStyle = (x + y) % 2 ? '#0c0d0d' : '#232624';
      bg.fillRect(x * 64, y * 64, 64, 64);
    }
  bg.strokeStyle = '#c98a4b';
  bg.lineWidth = 6;
  bg.strokeRect(3, 3, 506, 506);
  const boardTex = new THREE.CanvasTexture(bc);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const boardTop = new THREE.MeshPhysicalMaterial({ map: boardTex, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.35 });
  const boardSide = new THREE.MeshStandardMaterial({ color: 0x0b0c0c, roughness: 0.4 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(6, 0.24, 6), [boardSide, boardSide, boardTop, boardSide, boardSide, boardSide]);
  board.position.y = -0.12;

  const chess = new THREE.Group();
  chess.add(board, king);
  king.position.set(0.375, 0, 0.375);
  [[-1.875, 1.125], [1.875, -1.125], [-1.125, -1.875], [1.125, 1.875]].forEach(([x, z]) => {
    const p = pawn();
    p.position.set(x, 0, z);
    chess.add(p);
  });
  // one pawn already knocked over
  const fallen = pawn();
  fallen.rotation.z = Math.PI / 2;
  fallen.position.set(-2.4, 0.3, -0.4);
  chess.add(fallen);

  chess.scale.setScalar(0.95);
  chess.position.set(5.6, -2.0, z2 - 9);
  chess.rotation.x = 0.32;
  chess.userData.baseX = 5.6;
  sideObjects.push(chess);
  scene.add(chess);

  /* ---------- 03 ventures: drifting glass slabs ---------- */
  const z3 = -GAP * 3;
  const slabMat = glass({ thickness: 0.6, iridescence: 0.5, roughness: 0.12 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.08), slabMat);
    const x = Math.cos(a) * 7.2;
    m.position.set(x, Math.sin(a) * 4.2, z3 - 6 - (i % 3) * 3);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.userData.baseX = x;
    sideObjects.push(m);
    spinners.push({ obj: m, sx: 0.15, sy: 0.25, bob: i * 1.7 });
    scene.add(m);
  }

  /* ---------- 04 principles: a copper gyroscope ---------- */
  const z4 = -GAP * 4;
  const gyro = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: 0xc98a4b, metalness: 1, roughness: 0.18 });
  const rings = [2.8, 2.3, 1.8].map((r) => new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 24, 180), copper));
  gyro.add(...rings);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.4) }));
  gyro.add(core);
  gyro.position.set(-5.2, 0.2, z4 - 8);
  gyro.userData.baseX = -5.2;
  sideObjects.push(gyro);
  scene.add(gyro);

  /* ---------- 05 contact: a burning core inside a glass sphere ---------- */
  const z5 = -GAP * (sections - 1);
  const orbMat = new THREE.ShaderMaterial({ vertexShader: orbVS, fragmentShader: orbFS, uniforms: { uTime: { value: 0 } } });
  timeUniforms.push(orbMat.uniforms.uTime);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 24), orbMat);
  orb.position.set(0, -0.4, z5 - 11);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(3.1, 96, 96), glass({ thickness: 3, iridescence: 0.8, roughness: 0.04 }));
  shell.position.copy(orb.position);
  scene.add(orb, shell);

  /* ---------- the tunnel ---------- */
  const tunnel = new THREE.Group();
  const ringCount = Math.ceil((GAP * (sections - 1) + 30) / 4.5);
  for (let i = 0; i < ringCount; i++) {
    const arc = i % 3 === 0 ? Math.PI * 2 : Math.PI * (0.4 + Math.random() * 1.1);
    const bright = i % 5 === 0 ? 1.8 : 0.9;
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(10 + Math.sin(i * 0.7) * 1.5, i % 5 === 0 ? 0.025 : 0.012, 6, 200, arc),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(bright, bright * 1.05, bright), transparent: true, opacity: 0.35, depthWrite: false })
    );
    m.position.z = 4 - i * 4.5;
    m.rotation.z = Math.random() * Math.PI * 2;
    m.userData.speed = (Math.random() - 0.5) * 0.3;
    tunnel.add(m);
  }
  scene.add(tunnel);

  // warp streaks
  const S = isMobile ? 160 : 380;
  const stPos = new Float32Array(S * 6);
  const stEnd = new Float32Array(S * 2);
  const stTint = new Float32Array(S * 2);
  for (let i = 0; i < S; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3.5 + Math.pow(Math.random(), 0.6) * 16;
    const z = -Math.random() * 90;
    const t = Math.random();
    for (let k = 0; k < 2; k++) {
      stPos.set([Math.cos(a) * r, Math.sin(a) * r, z], (i * 2 + k) * 3);
      stEnd[i * 2 + k] = k;
      stTint[i * 2 + k] = t;
    }
  }
  const stGeo = new THREE.BufferGeometry();
  stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  stGeo.setAttribute('aEnd', new THREE.BufferAttribute(stEnd, 1));
  stGeo.setAttribute('aTint', new THREE.BufferAttribute(stTint, 1));
  const stMat = new THREE.ShaderMaterial({
    vertexShader: streakVS,
    fragmentShader: streakFS,
    uniforms: { uCamZ: { value: 0 }, uTime: { value: 0 }, uStretch: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const streaks = new THREE.LineSegments(stGeo, stMat);
  streaks.frustumCulled = false;
  scene.add(streaks);

  // dust
  const D = isMobile ? 120 : 300;
  const dPos = new Float32Array(D * 3);
  const dSeed = new Float32Array(D);
  for (let i = 0; i < D; i++) {
    dPos.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, -Math.random() * 70], i * 3);
    dSeed[i] = Math.random();
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  const dMat = new THREE.ShaderMaterial({
    vertexShader: dustVS,
    fragmentShader: dustFS,
    uniforms: { uCamZ: { value: 0 }, uTime: { value: 0 }, uPR: { value: pr } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dGeo, dMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- the money ---------- */
  const bills = createBills(scene, {
    count: isMobile ? 48 : 96,
    depth: 46,
    gap: GAP,
    pixelRatio: pr,
    textures: notes,
  });

  /* ---------- post ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.55, 0.82);
  composer.addPass(bloom);
  const finalPass = new ShaderPass(FinalShader);
  composer.addPass(finalPass);
  composer.addPass(new OutputPass());

  let lastW = 0;
  let lastH = 0;
  // height of the large viewport (address bar hidden): stays constant while a phone scrolls
  const lvhProbe = document.createElement('div');
  lvhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
  document.body.appendChild(lvhProbe);
  function resize() {
    const w = window.innerWidth;
    const h = isMobile ? Math.max(lvhProbe.offsetHeight, window.innerHeight) : window.innerHeight;
    // mobile browsers resize the viewport whenever the address bar slides in or out;
    // ignore those height-only nudges so the scene does not jump while scrolling
    if (isMobile && w === lastW && Math.abs(h - lastH) < 180) return;
    lastW = w;
    lastH = h;
    pr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // fit the title to the visible width at its depth
    const dist = 6 - title.position.z;
    const visW = 2 * Math.tan(THREE.MathUtils.degToRad(25)) * dist * camera.aspect;
    title.scale.setScalar(Math.min(12.5, visW * 0.92));
    const squeeze = Math.min(1, camera.aspect / 1.3);
    // portrait screens: the knot floats above the name like an emblem instead of covering it
    const narrow = camera.aspect < 0.8;
    knotY = narrow ? 1.4 : 0.3;
    knotScale = narrow ? 0.42 : 0.4 + 0.24 * squeeze;
    knot.scale.setScalar(knotScale);
    for (const o of sideObjects) o.position.x = o.userData.baseX * (0.45 + 0.55 * squeeze);
    // phones: the board sits under the chips instead of off the right edge
    chess.position.x = narrow ? 0.6 : chess.userData.baseX * (0.45 + 0.55 * squeeze);
    chess.position.y = narrow ? -4.2 : -2.0;
    chess.scale.setScalar(narrow ? 0.62 : 0.95);
    dMat.uniforms.uPR.value = pr;
    bills.setPixelRatio(pr);
  }
  resize();
  window.addEventListener('resize', resize);

  // compile every shader and upload every texture now, behind the preloader,
  // so the first scroll (when notes ignite and new objects come into view) never hitches
  renderer.compile(scene, camera);
  for (const tex of [notes.front, notes.back]) renderer.initTexture(tex);

  const mouse = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  const tmpV = new THREE.Vector3();
  let vel = 0;

  return {
    debug: { scene, camera, title, letters, knot },
    setMouse(x, y) {
      mouse.set(x, y);
    },
    /** p: 0..1 scroll progress, v: scroll velocity (px/frame) */
    /** intro: 0 → camera parked far back, 1 → fly-in finished */
    /** level: bass level of the soundtrack 0..1 */
    update(time, dt, p, v, intro, level = 0) {
      vel += (THREE.MathUtils.clamp(v, -80, 80) - vel) * Math.min(1, dt * 5);
      smooth.lerp(mouse, Math.min(1, dt * 3));
      const s = p * (sections - 1);
      const camZ = 6 - s * GAP + (1 - intro) * 18;

      camera.position.set(smooth.x * 0.9, smooth.y * 0.55, camZ);
      camera.lookAt(smooth.x * 0.25, smooth.y * 0.15, camZ - 12);
      camera.rotateZ(THREE.MathUtils.clamp(vel * 0.0025, -0.12, 0.12) + Math.sin(time * 0.2) * 0.01);
      const fov = 50 + Math.min(Math.abs(vel) * 0.12, 14) + (1 - intro) * 25;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      // the glass knot drifts up and away instead of filling the lens
      const hs = THREE.MathUtils.smoothstep(s, 0, 0.38);
      knot.position.set(hs * 7, knotY + hs * 4.2, -1.4 - s * GAP * 0.8);
      knot.scale.setScalar(knotScale * (1 - hs * 0.45) * (1 + level * 0.06));
      knot.rotation.x = time * 0.25 + smooth.y * 0.6 + hs * 2.0;
      knot.rotation.y = time * 0.35 + smooth.x * 0.8 + hs * 3.0;
      knot.visible = s < 0.9;
      // the name splits into letters that swing open like doors while they burn
      title.position.x = -smooth.x * 0.35;
      title.visible = s < 0.75;
      if (title.visible) {
        const split = THREE.MathUtils.smoothstep(s, 0.0, 0.42);
        const ease = split * split * (3 - 2 * split);
        title.updateMatrixWorld();
        for (const L of letters) {
          const m = L.mesh;
          m.position.copy(L.home).addScaledVector(L.to, ease);
          m.position.y += Math.sin(time * 1.3 + L.burnFrom * 40) * 0.004 * (1 - ease);
          m.rotation.set(L.rot.x * ease, L.rot.y * ease, L.rot.z * ease);
          const burn = THREE.MathUtils.smoothstep(s, L.burnFrom, L.burnTo);
          L.mat.uniforms.uBurn.value = burn;
          m.visible = burn < 0.999;
          if (burn > 0.02 && burn < 0.97) {
            m.updateMatrixWorld();
            m.getWorldPosition(tmpV);
            bills.emitAt(tmpV, L.halfW * title.scale.x, 0.6, dt * 16);
          }
        }
      }

      for (const sObj of spinners) {
        sObj.obj.rotation.x += sObj.sx * dt;
        sObj.obj.rotation.y += sObj.sy * dt;
        sObj.obj.position.y += Math.sin(time + sObj.bob) * 0.0025;
      }
      for (const t of tumblers) {
        t.obj.rotation.x += t.sx * dt;
        t.obj.rotation.y += t.sy * dt;
        t.obj.rotation.z += t.sz * dt;
        t.obj.position.y += Math.sin(time * 0.8 + t.bob) * 0.003;
      }
      chess.rotation.y = time * 0.25;
      king.position.y = Math.sin(time * 1.2) * 0.06;
      rings[0].rotation.set(time * 0.6, time * 0.2, 0);
      rings[1].rotation.set(0, time * 0.8, time * 0.3);
      rings[2].rotation.set(time * 0.9, 0, time * 0.5);
      core.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      orb.rotation.y = time * 0.2;
      shell.rotation.y = -time * 0.1;
      tunnel.children.forEach((m, i) => {
        m.rotation.z += m.userData.speed * dt * (1 + Math.abs(vel) * 0.05);
        const wave = Math.sin(i * 0.5 - time * 2.2);
        m.material.opacity = 0.16 + 0.2 * Math.max(0, wave) + Math.min(Math.abs(vel) * 0.002, 0.14);
      });

      timeUniforms.forEach((u) => (u.value = time));
      stMat.uniforms.uCamZ.value = camZ;
      stMat.uniforms.uTime.value = time;
      stMat.uniforms.uStretch.value = Math.min(Math.abs(vel) * 0.1, 6);
      dMat.uniforms.uCamZ.value = camZ;
      dMat.uniforms.uTime.value = time;

      // money ignites as the camera flies through it
      const res = bills.update(time, dt, s);

      finalPass.uniforms.uTime.value = time;
      finalPass.uniforms.uAberration.value = 0.0012 + Math.min(Math.abs(vel) * 0.0001, 0.0045) + level * 0.0015;
      bloom.strength = 0.75 + level * 0.55;
      composer.render(dt);
      return res;
    },
  };
}
