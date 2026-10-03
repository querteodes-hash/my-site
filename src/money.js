import * as THREE from 'three';
import { NOTE_RATIO } from './banknote.js';

/*
  Solid 3D money: banded cash bricks (100 × $100 with a mustard $10,000 strap)
  and loose bent notes. Lit by the scene environment, so they read as real objects.
*/

const NOTE_W = 2.3;
const NOTE_H = NOTE_W / NOTE_RATIO;
const BRICK_T = 0.17; // 100 notes ≈ 11 mm on a 156 mm note

function edgeTexture() {
  // the side of a stack: hundreds of slightly uneven paper edges
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#cdd8c4';
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y += 1.25) {
    const shade = 150 + Math.random() * 80;
    g.strokeStyle = `rgba(${shade - 30}, ${shade}, ${shade - 30}, ${0.35 + Math.random() * 0.4})`;
    g.lineWidth = 0.6 + Math.random() * 0.6;
    g.beginPath();
    g.moveTo(0, y + Math.random());
    for (let x = 0; x <= c.width; x += 64) g.lineTo(x, y + (Math.random() - 0.5) * 0.8);
    g.stroke();
  }
  // a faint green cast where the ink bleeds to the edge
  const tint = g.createLinearGradient(0, 0, c.width, 0);
  tint.addColorStop(0, 'rgba(90, 130, 100, 0.12)');
  tint.addColorStop(0.5, 'rgba(90, 130, 100, 0)');
  tint.addColorStop(1, 'rgba(160, 120, 80, 0.12)');
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function strapTexture() {
  // ABA standard strap for a $10,000 bundle of $100 notes is mustard
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1024;
  const g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 256, 0);
  base.addColorStop(0, '#b88c22');
  base.addColorStop(0.5, '#d6aa3c');
  base.addColorStop(1, '#b88c22');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 1024);
  g.fillStyle = 'rgba(70, 45, 5, 0.85)';
  g.fillRect(14, 0, 4, 1024);
  g.fillRect(238, 0, 4, 1024);
  g.save();
  g.translate(128, 512);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#3b2604';
  g.font = '800 92px "Bodoni Moda", Georgia, serif';
  g.fillText('$10,000', 0, 6);
  g.font = '600 26px "Martian Mono", monospace';
  g.fillText('100 × $100', -330, 0);
  g.fillText('100 × $100', 330, 0);
  g.restore();
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 256, Math.random() * 1024, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mirrored(tex) {
  const t = tex.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = -1;
  t.offset.x = 1;
  t.needsUpdate = true;
  return t;
}

/*
  Burn for solid money: every material of one brick shares a uniform set. The fragment works in the
  brick's own space (uInv), so the fire front crosses the stack, the strap and the top note as one.
*/
const BURN_VERT_HEAD = /* glsl */ `
varying vec3 vBW;
`;
const BURN_FRAG_HEAD = /* glsl */ `
uniform float uBurn;
uniform float uTime;
uniform vec3 uOrigin;
uniform mat4 uInv;
varying vec3 vBW;
float bh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float bn(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float bGlow = 0.0;
`;
const BURN_FRAG_BODY = /* glsl */ `
{
  vec3 lp = (uInv * vec4(vBW, 1.0)).xyz;
  vec3 q = lp / vec3(NOTE_W_, 0.6, NOTE_H_) + 0.5;
  float n = bn(lp * 3.2 + uOrigin * 9.0) * 0.6 + bn(lp * 9.0 - uTime * 0.3) * 0.25;
  float d = length((q - uOrigin) * vec3(1.0, 0.5, 0.45)) + (n - 0.42) * 0.42;
  float e = d - (uBurn * 1.7 - 0.28);
  if (e < 0.0) discard;
  float on = step(0.001, uBurn);
  bGlow = (1.0 - smoothstep(0.0, 0.045, e)) * on;
  float charr = (1.0 - smoothstep(0.0, 0.2, e)) * on;
  float scorch = (1.0 - smoothstep(0.0, 0.34, e)) * on;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.36, 0.18), scorch * 0.8);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.014, 0.01), charr);
}
`;

function burnable(material, uniforms) {
  const m = material.clone();
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = BURN_VERT_HEAD + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vBW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );
    const body = BURN_FRAG_BODY.replace('NOTE_W_', NOTE_W.toFixed(3)).replace('NOTE_H_', NOTE_H.toFixed(3));
    shader.fragmentShader = BURN_FRAG_HEAD +
      shader.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\n' + body)
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  float flick = 0.75 + 0.25 * sin(uTime * 15.0 + vBW.x * 9.0 + vBW.y * 7.0);\n  totalEmissiveRadiance += mix(vec3(1.0, 0.16, 0.01), vec3(1.0, 0.62, 0.2), bGlow) * bGlow * 3.2 * flick;'
        );
  };
  m.customProgramCacheKey = () => 'money-burn';
  return m;
}

export function createMoneyKit(notes) {
  const edge = edgeTexture();
  const edgeEnd = edge.clone();
  edgeEnd.repeat.x = 0.42;
  const strap = strapTexture();

  // paper is matte and never pure white under the studio light
  const paper = (map, extra = {}) =>
    new THREE.MeshStandardMaterial({ map, color: 0xaab5a3, roughness: 0.86, metalness: 0, envMapIntensity: 0.5, ...extra });
  const topMat = paper(notes.front);
  const bottomMat = paper(mirrored(notes.back));
  const sideMat = paper(edge, { roughness: 0.95 });
  const endMat = paper(edgeEnd, { roughness: 0.95 });
  const strapMat = paper(strap, { color: 0xd0c8b0, roughness: 0.55, envMapIntensity: 0.7 });
  const noteFront = paper(notes.front, { side: THREE.FrontSide });
  const noteBack = paper(mirrored(notes.back), { side: THREE.BackSide });

  const brickGeo = new THREE.BoxGeometry(NOTE_W, BRICK_T, NOTE_H);
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  const brickMats = [endMat, endMat, topMat, bottomMat, sideMat, sideMat];
  const strapGeo = new THREE.BoxGeometry(0.5, BRICK_T + 0.016, NOTE_H + 0.016);

  // a loose note: gently bowed paper, printed on both sides
  function noteGeometry(bend = 0.12, seed = Math.random()) {
    const geo = new THREE.PlaneGeometry(NOTE_W, NOTE_H, 24, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, Math.sin((x / NOTE_W) * Math.PI + seed * 3) * bend + Math.sin(y * 3 + seed * 7) * bend * 0.25 - Math.abs(x) * bend * 0.3);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function note(bend, seed, front = noteFront, back = noteBack) {
    const g = new THREE.Group();
    const geo = noteGeometry(bend, seed);
    g.add(new THREE.Mesh(geo, front), new THREE.Mesh(geo, back));
    return g;
  }

  function brick({ burns = false } = {}) {
    const g = new THREE.Group();
    let mats = brickMats;
    let sMat = strapMat;
    let nF = noteFront;
    let nB = noteBack;
    if (burns) {
      const u = {
        uBurn: { value: 0 },
        uTime: { value: 0 },
        uOrigin: { value: new THREE.Vector3(Math.random() < 0.5 ? 0 : 1, 0.5, Math.random()) },
        uInv: { value: new THREE.Matrix4() },
      };
      const cache = new Map();
      const b = (m) => (cache.has(m) ? cache.get(m) : cache.set(m, burnable(m, u)).get(m));
      mats = brickMats.map(b);
      sMat = b(strapMat);
      nF = b(noteFront);
      nB = b(noteBack);
      g.userData.burn = u;
    }
    const body = new THREE.Mesh(brickGeo, mats);
    g.add(body);
    const band = new THREE.Mesh(strapGeo, sMat);
    band.position.x = (Math.random() - 0.5) * 0.12;
    g.add(band);
    // the top note never sits perfectly square
    const top = note(0.015, Math.random(), nF, nB);
    top.rotation.set(-Math.PI / 2, 0, (Math.random() - 0.5) * 0.08);
    top.position.set((Math.random() - 0.5) * 0.06, BRICK_T / 2 + 0.004, (Math.random() - 0.5) * 0.04);
    g.add(top);
    return g;
  }

  return { brick, note, NOTE_W, NOTE_H, BRICK_T };
}
