import * as THREE from 'three';
import { makeBanknoteTextures, NOTE_RATIO } from './banknote.js';

const BILL_W = 2.3;
const BILL_H = BILL_W / NOTE_RATIO;

const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=.5; } return v; }
`;

const vertexShader = /* glsl */ `
attribute float aSeed;
attribute float aBurn;
attribute vec2 aOrigin;
attribute float aFold;
uniform float uTime;
varying vec2 vUv;
varying float vBurn;
varying float vSeed;
varying vec2 vOrigin;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
varying vec3 vView;
varying float vDepth;
varying float vCrease;

float vh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vh(i), vh(i + vec2(1, 0)), f.x), mix(vh(i + vec2(0, 1)), vh(i + vec2(1, 1)), f.x), f.y);
}
// height of the sheet at local (x, y): flutter + crumples + centre fold + tri-fold + curl while burning
float sheet(vec2 q){
  float ph = uTime * (1.1 + aSeed) + aSeed * 20.0;
  float A = 0.09 + 0.05 * sin(uTime * 0.7 + aSeed * 9.0);
  float z = sin(q.x * 2.4 + ph) * A + sin(q.y * 3.0 + ph * 1.3) * 0.035;
  z += (vn(q * 3.2 + aSeed * 40.0) - 0.5) * 0.07 + (vn(q * 7.5 - aSeed * 17.0) - 0.5) * 0.025; // crumples
  z += -abs(q.x) * 0.12 * aFold;                                   // folded in half
  z += abs(q.x - 0.38) * 0.05 * (1.0 - aFold) * sin(aSeed * 13.0); // light tri-fold memory
  z += aBurn * aBurn * 0.55 * pow(abs(q.x) / 1.15, 2.0) * sign(sin(aSeed * 31.0));
  return z;
}

void main(){
  vUv = uv; vBurn = aBurn; vSeed = aSeed; vOrigin = aOrigin;
  vec3 p = position;
  float e = 0.01;
  float h = sheet(p.xy);
  float hx = sheet(p.xy + vec2(e, 0.0));
  float hy = sheet(p.xy + vec2(0.0, e));
  p.z += h;
  vec3 tx = normalize(vec3(e, 0.0, hx - h));
  vec3 ty = normalize(vec3(0.0, e, hy - h));
  vec3 n = normalize(cross(tx, ty));
  vCrease = (1.0 - smoothstep(0.0, 0.025, abs(p.x))) * aFold;

  mat4 mi = modelMatrix * instanceMatrix;
  mat3 nm = mat3(viewMatrix) * mat3(mi);
  vec4 mv = viewMatrix * mi * vec4(p, 1.0);
  vN = normalize(nm * n);
  vT = normalize(nm * tx);
  vB = normalize(nm * ty);
  vView = normalize(-mv.xyz);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform vec2 uTexel;
uniform float uTime;
varying vec2 vUv;
varying float vBurn;
varying float vSeed;
varying vec2 vOrigin;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
varying vec3 vView;
varying float vDepth;
varying float vCrease;
${NOISE}

vec3 sampleNote(vec2 uv, bool front){ return front ? texture2D(uFront, uv).rgb : texture2D(uBack, uv).rgb; }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(){
  bool front = gl_FrontFacing;
  vec2 uv = vUv;
  if (!front) uv.x = 1.0 - uv.x;

  // burn front
  vec2 q = (vUv - vOrigin) * vec2(1.0, 1.0 / ${NOTE_RATIO.toFixed(4)});
  float n = fbm(vUv * vec2(7.0, 3.0) + vSeed * 13.0 + vec2(0.0, uTime * 0.05));
  float d = length(q) + (n - 0.5) * 0.45;
  float t = vBurn * 1.75 - 0.3;
  float e = d - t;
  if (e < 0.0) discard;

  vec3 N = normalize(vN);
  vec3 T = normalize(vT);
  vec3 B = normalize(vB);
  if (!front) { N = -N; T = -T; }
  vec3 V = normalize(vView);

  // 3D security ribbon: the bells and 100s slide as the note tilts
  vec3 col;
  float ribbon = front ? 1.0 - smoothstep(0.0115, 0.0135, abs(uv.x - 0.615)) : 0.0;
  if (ribbon > 0.0) {
    vec2 ruv = vec2(uv.x, fract(uv.y + dot(V, T) * 0.35 + dot(V, B) * 0.15));
    col = mix(sampleNote(uv, front), sampleNote(ruv, front), ribbon);
  } else {
    col = sampleNote(uv, front);
  }

  // raised intaglio ink: bump from ink density
  float h0 = 1.0 - lum(col);
  float hu = 1.0 - lum(sampleNote(uv + vec2(uTexel.x * 1.5, 0.0), front));
  float hv = 1.0 - lum(sampleNote(uv + vec2(0.0, uTexel.y * 1.5), front));
  vec3 Np = normalize(N - (T * (hu - h0) + B * (hv - h0)) * 2.2);

  // colour-shifting copper ink (inkwell, bell, big 100): copper → green with angle
  float copper = front ? smoothstep(0.5, 0.3, col.g / max(col.r, 1e-3)) * step(0.06, col.r) : 0.0;
  float shift = smoothstep(0.15, 0.85, 1.0 - abs(dot(Np, V)));
  col = mix(col, vec3(0.12, 0.30, 0.16) * (0.6 + lum(col) * 2.0), copper * shift);

  // ribbon gleam
  col += ribbon * vec3(0.15, 0.3, 0.6) * pow(max(dot(reflect(-V, Np), normalize(vec3(0.2, 0.7, 0.6))), 0.0), 6.0);

  // paper lighting: warm key, cool rim, soft sheen
  vec3 L1 = normalize(vec3(-0.4, 0.7, 0.6));
  vec3 L2 = normalize(vec3(0.6, -0.2, 0.4));
  float diff = 0.32 + 0.6 * max(dot(Np, L1), 0.0) + 0.18 * max(dot(Np, L2), 0.0);
  float spec = pow(max(dot(reflect(-L1, Np), V), 0.0), 18.0) * 0.18;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12;
  col = col * 0.8 * diff + spec + fres * vec3(0.8, 0.9, 1.0);
  col *= 1.0 - vCrease * 0.35;

  // char and fire
  float on = step(0.001, vBurn);
  float glow = (1.0 - smoothstep(0.0, 0.04, e)) * on;
  float halo = (1.0 - smoothstep(0.0, 0.11, e)) * on;
  float charr = (1.0 - smoothstep(0.02, 0.22, e)) * on;
  float scorch = (1.0 - smoothstep(0.0, 0.36, e)) * on;
  col = mix(col, col * vec3(0.55, 0.36, 0.18), scorch * 0.75);
  col = mix(col, vec3(0.025, 0.016, 0.01), charr);
  float flick = 0.7 + 0.3 * sin(uTime * 14.0 + vUv.x * 30.0 + vSeed * 7.0) * sin(uTime * 9.0 + vUv.y * 20.0);
  float smoulder = smoothstep(0.55, 0.85, fbm(vUv * vec2(26.0, 11.0) + vec2(uTime * 0.4, -uTime * 0.3))) * charr * (1.0 - glow);
  vec3 fire = mix(vec3(0.9, 0.12, 0.01), vec3(1.0, 0.62, 0.18), glow * glow);
  col += fire * (glow * 2.8 + halo * 0.9) * flick;
  col += vec3(1.0, 0.3, 0.04) * smoulder * 2.4 * flick;

  float fog = exp(-vDepth * 0.035);
  col = mix(vec3(0.012, 0.014, 0.014), col, fog);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- embers ---------- */
const emberVS = /* glsl */ `
attribute float aLife;
attribute float aSize;
attribute float aHeat;
uniform float uPR;
varying float vLife;
varying float vHeat;
void main(){
  vLife = aLife;
  vHeat = aHeat;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float sz = aSize * (14.0 / -mv.z) * smoothstep(0.0, 0.15, aLife);
  gl_PointSize = min(sz, mix(42.0, 16.0, aHeat)) * uPR;
  gl_Position = projectionMatrix * mv;
}`;
const emberFS = /* glsl */ `
varying float vLife;
varying float vHeat;
void main(){
  if (vLife <= 0.0) discard;
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = mix(a * a, a, vHeat);
  vec3 c = mix(vec3(1.0, 0.16, 0.01), vec3(1.0, 0.72, 0.36), vLife * vLife * vHeat);
  gl_FragColor = vec4(c * mix(0.14, 1.9, vHeat) * a * vLife, 1.0);
}`;

export function createBills(scene, { count, pixelRatio, textures, depth = 46, gap = 30 }) {
  const geo = new THREE.PlaneGeometry(BILL_W, BILL_H, 48, 18);
  const tex = textures || makeBanknoteTextures();
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFront: { value: tex.front },
      uBack: { value: tex.back },
      uTexel: { value: tex.texel },
      uTime: { value: 0 },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const seeds = new Float32Array(count);
  const burns = new Float32Array(count);
  const origins = new Float32Array(count * 2);
  const folds = new Float32Array(count);

  const bills = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const seed = Math.random();
    seeds[i] = seed;
    folds[i] = Math.random() < 0.35 ? 0.6 + Math.random() * 0.8 : 0;
    // ignite from a random point along an edge
    const edge = Math.floor(Math.random() * 4);
    const r = Math.random();
    const o = [
      [r, 0],
      [r, 1],
      [0, r],
      [1, r],
    ][edge];
    origins[i * 2] = o[0];
    origins[i * 2 + 1] = o[1];
    // scatter the money along the whole dive corridor; near the title keep the centre clear,
    // deeper in, notes hang right on the camera path so you fly through them
    const z = 3 - Math.pow(Math.random(), 0.9) * depth;
    const minR = z > -8 ? 3.4 : 0.9;
    const radius = minR + Math.pow(Math.random(), 0.8) * (9.5 - minR);
    const angle = side > 0 ? (Math.random() - 0.5) * Math.PI * 1.2 : Math.PI + (Math.random() - 0.5) * Math.PI * 1.2;
    const reach = (6 - z) / gap; // scroll position (in sections) where the camera reaches this note
    bills.push({
      base: new THREE.Vector3(),
      z,
      radius,
      angle,
      orbit: (Math.random() - 0.5) * 0.12,
      start: Math.max(0.02 + Math.random() * 0.08, reach - 0.55 + (Math.random() - 0.5) * 0.2),
      dur: 0.45 + Math.random() * 0.2,
      rot: new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4),
      scale: 0.65 + Math.random() * 0.6,
      seed,
      origin: o,
      burn: 0,
      matrix: new THREE.Matrix4(),
    });
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const burnAttr = new THREE.InstancedBufferAttribute(burns, 1);
  burnAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aBurn', burnAttr);
  geo.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origins, 2));
  geo.setAttribute('aFold', new THREE.InstancedBufferAttribute(folds, 1));
  scene.add(mesh);

  // ember pool
  const EMBERS = count * 16;
  const ePos = new Float32Array(EMBERS * 3);
  const eLife = new Float32Array(EMBERS);
  const eSize = new Float32Array(EMBERS);
  const eVel = new Float32Array(EMBERS * 3);
  const eMax = new Float32Array(EMBERS);
  const eHeat = new Float32Array(EMBERS);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3).setUsage(THREE.DynamicDrawUsage));
  eGeo.setAttribute('aLife', new THREE.BufferAttribute(eLife, 1).setUsage(THREE.DynamicDrawUsage));
  eGeo.setAttribute('aSize', new THREE.BufferAttribute(eSize, 1).setUsage(THREE.DynamicDrawUsage));
  eGeo.setAttribute('aHeat', new THREE.BufferAttribute(eHeat, 1).setUsage(THREE.DynamicDrawUsage));
  const eMat = new THREE.ShaderMaterial({
    vertexShader: emberVS,
    fragmentShader: emberFS,
    uniforms: { uPR: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const embers = new THREE.Points(eGeo, eMat);
  embers.frustumCulled = false;
  scene.add(embers);
  let cursor = 0;

  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const p = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function spawn(b, threshold) {
    // pick a point on the burn front (in uv space)
    let u, v;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.max(0.02, threshold + (Math.random() - 0.5) * 0.12);
      u = b.origin[0] + Math.cos(a) * rr;
      v = b.origin[1] + Math.sin(a) * rr * NOTE_RATIO;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) break;
    }
    u = Math.min(1, Math.max(0, u));
    v = Math.min(1, Math.max(0, v));
    tmp.set((u - 0.5) * BILL_W, (v - 0.5) * BILL_H, 0).applyMatrix4(b.matrix);
    put(tmp.x, tmp.y, tmp.z);
  }

  function put(x, y, z) {
    const i = cursor;
    cursor = (cursor + 1) % EMBERS;
    ePos[i * 3] = x;
    ePos[i * 3 + 1] = y;
    ePos[i * 3 + 2] = z;
    eVel[i * 3] = (Math.random() - 0.5) * 0.6;
    eVel[i * 3 + 1] = 0.5 + Math.random() * 1.2;
    eVel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    const puff = Math.random() < 0.14;
    eMax[i] = puff ? 0.3 + Math.random() * 0.3 : 0.8 + Math.random() * 1.4;
    eLife[i] = 1;
    eSize[i] = puff ? 5 + Math.random() * 5 : 1.5 + Math.random() * 3.5;
    eHeat[i] = puff ? 0.0 : 1.0;
    if (puff) eVel[i * 3 + 1] = 0.9 + Math.random() * 0.8;
  }

  return {
    mesh,
    /** s: dive position in sections; each note ignites as the camera closes in on it */
    update(time, dt, s) {
      mat.uniforms.uTime.value = time;
      let burnt = 0;
      for (let i = 0; i < count; i++) {
        const b = bills[i];
        const target = Math.min(1, Math.max(0, (s - b.start) / b.dur));
        b.burn += (target - b.burn) * Math.min(1, dt * 6);
        burns[i] = b.burn;
        burnt += b.burn;

        b.rot.x += b.spin.x * dt;
        b.rot.y += b.spin.y * dt;
        b.rot.z += b.spin.z * dt;
        q.setFromEuler(b.rot);
        // slow vortex around the dive axis + drift; burning paper lifts on its own heat
        b.angle += b.orbit * dt;
        const ar = b.radius * (1 + b.burn * 0.15);
        p.set(Math.cos(b.angle) * ar * 1.25, Math.sin(b.angle) * ar * 0.72, b.z);
        p.y += Math.sin(time * 0.6 + b.seed * 10) * 0.25 + b.burn * 1.4;
        p.x += Math.cos(time * 0.4 + b.seed * 7) * 0.15;
        sc.setScalar(b.scale);
        b.matrix.compose(p, q, sc);
        mesh.setMatrixAt(i, b.matrix);

        if (b.burn > 0.01 && b.burn < 0.985) {
          const threshold = b.burn * 1.75 - 0.3;
          const n = Math.random() < (dt * 14) % 1 ? Math.ceil(dt * 14) : Math.floor(dt * 14);
          for (let k = 0; k < n; k++) spawn(b, threshold);
        }
      }
      burnAttr.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < EMBERS; i++) {
        if (eLife[i] <= 0) continue;
        eLife[i] -= dt / eMax[i];
        const j = i * 3;
        eVel[j] += Math.sin(time * 3 + i) * dt * 0.8;
        eVel[j + 2] += Math.cos(time * 2.3 + i * 1.7) * dt * 0.8;
        ePos[j] += eVel[j] * dt;
        ePos[j + 1] += eVel[j + 1] * dt;
        ePos[j + 2] += eVel[j + 2] * dt;
      }
      eGeo.attributes.position.needsUpdate = true;
      eGeo.attributes.aLife.needsUpdate = true;
      eGeo.attributes.aSize.needsUpdate = true;
      eGeo.attributes.aHeat.needsUpdate = true;

      return { burnt, total: count };
    },
    /** sprinkle n embers around a world position (used by the burning title) */
    emitAt(pos, spreadX, spreadY, n) {
      const count = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        put(pos.x + (Math.random() - 0.5) * 2 * spreadX, pos.y + (Math.random() - 0.5) * 2 * spreadY, pos.z + (Math.random() - 0.5) * 0.3);
      }
    },
    setPixelRatio(pr) {
      eMat.uniforms.uPR.value = pr;
    },
  };
}
