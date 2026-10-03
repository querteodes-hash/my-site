import * as THREE from 'three';

/*
  Procedural $100 note, front and back, drawn on canvas.
  Proportions follow the real note (156 × 66.3 mm). Everything is drawn in code:
  engraved portrait bust, blue security ribbon, copper inkwell with bell,
  colour-shifting 100, seals, serials, Independence Hall on the back.
*/

export const NOTE_RATIO = 156 / 66.3;
const W = 2048;
const H = Math.round(W / NOTE_RATIO); // 870

const SERIF = '"Bodoni Moda", "Times New Roman", Georgia, serif';
const MONO = '"Martian Mono", ui-monospace, monospace';

const INK = '#1f3227';
const INK_SOFT = 'rgba(31, 60, 42, 0.6)';
const GREEN = '#22603d';

function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/* ---------- shared paper ---------- */
function paper(g, tintStops, seed) {
  const r = rand(seed);
  g.fillStyle = '#dbe2cf';
  g.fillRect(0, 0, W, H);

  const tint = g.createLinearGradient(0, 0, W, 0);
  tintStops.forEach(([o, c]) => tint.addColorStop(o, c));
  g.fillStyle = tint;
  g.fillRect(0, 0, W, H);

  // soft blotches of tint, the way offset background inks overlap
  for (let i = 0; i < 18; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 120 + r() * 320;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, i % 2 ? 'rgba(120, 175, 130, 0.22)' : 'rgba(200, 190, 140, 0.14)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // fine-line guilloche
  for (let k = 0; k < 90; k++) {
    g.strokeStyle = k % 3 ? 'rgba(30, 105, 60, 0.11)' : 'rgba(60, 120, 80, 0.08)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = H / 2 + Math.sin(x * 0.006 + k * 0.21) * (40 + k * 4.2) * Math.cos(x * 0.0017 + k * 0.035);
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }

  // red and blue security fibres
  for (let i = 0; i < 520; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = r() * Math.PI * 2;
    const len = 6 + r() * 14;
    g.strokeStyle = r() > 0.5 ? 'rgba(200, 40, 50, 0.55)' : 'rgba(40, 70, 190, 0.55)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 1) * len * 0.6, y + Math.sin(a + 1) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
}

function microBorder(g, color) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.strokeRect(26, 26, W - 52, H - 52);
  g.lineWidth = 1;
  g.strokeRect(36, 36, W - 72, H - 72);
  g.fillStyle = color;
  g.font = `600 11px ${MONO}`;
  g.textBaseline = 'middle';
  const strip = 'USA 100 · THE UNITED STATES OF AMERICA · 100 USA · ';
  let s = '';
  while (g.measureText(s).width < W) s += strip;
  g.fillText(s, 40, 31);
  g.fillText(s, 40, H - 31);
  g.restore();
}

/* ---------- engraved portrait bust ---------- */
function portrait(size, ghost = false) {
  const [c, g] = canvas(size, size);
  const s = size / 700;
  g.save();
  g.translate(size / 2, size * 0.42);
  g.scale(s, s);

  const base = ghost ? 'rgba(70,100,80,1)' : '#33433a';
  // coat
  g.fillStyle = ghost ? base : '#1f2e26';
  g.beginPath();
  g.moveTo(-330, 420);
  g.bezierCurveTo(-310, 260, -230, 190, -70, 150);
  g.lineTo(70, 150);
  g.bezierCurveTo(230, 190, 310, 260, 330, 420);
  g.closePath();
  g.fill();
  if (!ghost) {
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(210, 215, 205, 0.1)';
    g.lineWidth = 2;
    for (let k = -700; k < 700; k += 9) {
      g.beginPath();
      g.moveTo(k, 150);
      g.lineTo(k + 270, 420);
      g.stroke();
    }
    const fold = g.createLinearGradient(-330, 0, 330, 0);
    fold.addColorStop(0, 'rgba(255,255,255,0.12)');
    fold.addColorStop(0.5, 'rgba(0,0,0,0)');
    fold.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = fold;
    g.fillRect(-330, 150, 660, 270);
    g.restore();
  }
  // hair, long at the sides, receding on top
  g.fillStyle = ghost ? base : '#3c4f43';
  g.beginPath();
  g.ellipse(0, 70, 150, 120, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(-105, 40, 60, 125, 0.18, 0, Math.PI * 2);
  g.ellipse(105, 40, 60, 125, -0.18, 0, Math.PI * 2);
  g.fill();
  // neck
  g.fillStyle = ghost ? base : '#84927f';
  g.fillRect(-42, 80, 84, 80);
  // face
  const face = g.createRadialGradient(-30, -40, 10, 0, 0, 120);
  face.addColorStop(0, ghost ? base : '#c4cdb9');
  face.addColorStop(0.6, ghost ? base : '#93a08d');
  face.addColorStop(1, ghost ? base : '#55665a');
  g.fillStyle = face;
  g.beginPath();
  g.ellipse(0, -10, 80, 102, 0, 0, Math.PI * 2);
  g.fill();
  if (!ghost) {
    // shadow side (light comes from the left)
    const sh = g.createLinearGradient(-80, 0, 80, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(0.55, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(20,25,22,0.55)');
    g.fillStyle = sh;
    g.beginPath();
    g.ellipse(0, -10, 80, 102, 0, 0, Math.PI * 2);
    g.fill();
    // eye sockets, cheek and jaw modelling
    const soft = (x, y, rx, ry, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      gr.addColorStop(0, `rgba(25,30,28,${a})`);
      gr.addColorStop(1, 'rgba(25,30,28,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    };
    soft(-30, -16, 26, 16, 0.45);
    soft(30, -16, 26, 16, 0.55);
    soft(40, 30, 40, 50, 0.25);
    soft(0, 84, 70, 22, 0.35);
    soft(6, 26, 12, 14, 0.3);
    // features in thin engraved strokes
    g.strokeStyle = 'rgba(28, 33, 30, 0.8)';
    g.lineCap = 'round';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-42, -16);
    g.quadraticCurveTo(-30, -22, -18, -15);
    g.moveTo(18, -15);
    g.quadraticCurveTo(30, -22, 42, -16);
    g.stroke();
    g.fillStyle = 'rgba(28, 33, 30, 0.85)';
    g.beginPath();
    g.arc(-29, -16, 3.5, 0, Math.PI * 2);
    g.arc(29, -16, 3.5, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(28, 33, 30, 0.45)';
    g.beginPath();
    g.moveTo(-46, -34);
    g.quadraticCurveTo(-30, -40, -14, -33);
    g.moveTo(14, -33);
    g.quadraticCurveTo(30, -40, 46, -34);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(28, 33, 30, 0.55)';
    g.beginPath();
    g.moveTo(6, -10);
    g.quadraticCurveTo(10, 14, 12, 26);
    g.quadraticCurveTo(2, 34, -10, 28);
    g.stroke();
    g.beginPath();
    g.moveTo(-20, 52);
    g.quadraticCurveTo(0, 50, 20, 52);
    g.stroke();
    g.strokeStyle = 'rgba(28, 33, 30, 0.3)';
    g.beginPath();
    g.moveTo(-12, 62);
    g.quadraticCurveTo(0, 66, 12, 62);
    g.stroke();
    // forehead light
    const fh = g.createRadialGradient(-14, -62, 0, -14, -62, 50);
    fh.addColorStop(0, 'rgba(255,255,248,0.35)');
    fh.addColorStop(1, 'rgba(255,255,248,0)');
    g.fillStyle = fh;
    g.fillRect(-70, -112, 120, 100);
    // hair strands
    g.lineWidth = 1.6;
    for (let i = 0; i < 46; i++) {
      const side = i % 2 ? 1 : -1;
      const x0 = side * (70 + (i % 7) * 6);
      g.strokeStyle = i % 3 ? 'rgba(210,214,205,0.22)' : 'rgba(20,24,22,0.35)';
      g.beginPath();
      g.moveTo(x0, -60 + (i % 5) * 8);
      g.bezierCurveTo(x0 + side * 40, 0, x0 + side * 30, 80, x0 + side * (10 + (i % 4) * 8), 150);
      g.stroke();
    }
    // cravat
    g.fillStyle = '#e6e5d9';
    g.beginPath();
    g.moveTo(-60, 140);
    g.quadraticCurveTo(0, 125, 60, 140);
    g.lineTo(28, 260);
    g.quadraticCurveTo(0, 275, -28, 260);
    g.closePath();
    g.fill();
    // lapels
    g.strokeStyle = 'rgba(200,205,195,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-70, 150);
    g.lineTo(-150, 420);
    g.moveTo(70, 150);
    g.lineTo(150, 420);
    g.stroke();
  }
  g.restore();

  // engraving: line work only over the bust
  g.globalCompositeOperation = 'source-atop';
  g.lineWidth = Math.max(1, size / 420);
  for (let y = 0; y < size; y += size / 180) {
    g.strokeStyle = 'rgba(10, 30, 18, 0.3)';
    g.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin(x * 0.02 + y * 0.05) * 1.5;
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = 'rgba(255, 255, 250, 0.08)';
    g.beginPath();
    g.ellipse(size / 2, size * 0.41, i * 3 * (size / 700), i * 3.8 * (size / 700), 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, size * 0.62, 0, size * 0.95);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';
  return c;
}

function seal(g, x, y, r, color, inner) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const rr = i % 2 ? r : r * 0.9;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.fillStyle = '#dbe2cf';
  g.beginPath();
  g.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r * 0.56, 0, Math.PI * 2);
  g.stroke();
  // ring legend
  g.fillStyle = color;
  g.font = `700 ${Math.round(r * 0.13)}px ${SERIF}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const text = inner.ring;
  for (let i = 0; i < text.length; i++) {
    const a = -Math.PI * 0.95 + (i / text.length) * Math.PI * 1.9;
    g.save();
    g.rotate(a);
    g.translate(0, -r * 0.67);
    g.fillText(text[i], 0, 0);
    g.restore();
  }
  inner.draw(g, r);
  g.restore();
}

function signature(g, x, y, w, seed) {
  const r = rand(seed);
  g.save();
  g.strokeStyle = 'rgba(30, 34, 32, 0.85)';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  let px = x;
  for (let i = 0; i < 14; i++) {
    const nx = px + w / 14;
    g.bezierCurveTo(px + 6, y - 30 * r(), nx - 6, y + 22 * r(), nx, y - 6 + 12 * r());
    px = nx;
  }
  g.stroke();
  g.restore();
}

function feather(g, x, y, len, angle) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  const grd = g.createLinearGradient(0, 0, len, 0);
  grd.addColorStop(0, '#7a3d16');
  grd.addColorStop(1, '#d7884a');
  g.strokeStyle = grd;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -len * 0.08, len, -len * 0.04);
  g.stroke();
  g.lineWidth = 1.4;
  for (let i = 0.15; i < 1; i += 0.018) {
    const px = len * i;
    const py = -len * 0.08 * Math.sin(i * Math.PI) - len * 0.02 * i;
    const spread = Math.sin(i * Math.PI) * len * 0.12;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + spread * 0.5, py - spread);
    g.moveTo(px, py);
    g.lineTo(px + spread * 0.5, py + spread * 0.7);
    g.stroke();
  }
  g.restore();
}

function bellShape(g, x, y, s) {
  g.beginPath();
  g.moveTo(x - 0.5 * s, y + 0.45 * s);
  g.bezierCurveTo(x - 0.42 * s, y + 0.1 * s, x - 0.36 * s, y - 0.45 * s, x, y - 0.5 * s);
  g.bezierCurveTo(x + 0.36 * s, y - 0.45 * s, x + 0.42 * s, y + 0.1 * s, x + 0.5 * s, y + 0.45 * s);
  g.closePath();
}

/* ---------- front ---------- */
function drawFront() {
  const [c, g] = canvas(W, H);
  paper(
    g,
    [
      [0, 'rgba(150, 190, 150, 0.32)'],
      [0.3, 'rgba(170, 205, 185, 0.26)'],
      [0.62, 'rgba(160, 200, 175, 0.24)'],
      [1, 'rgba(205, 190, 135, 0.28)'],
    ],
    7
  );

  // faint large 100 in the left field
  g.save();
  g.font = `700 330px ${SERIF}`;
  g.fillStyle = 'rgba(40, 120, 70, 0.12)';
  g.textBaseline = 'middle';
  g.fillText('100', 60, H * 0.62);
  g.restore();

  // Declaration text, faint, to the right of the portrait
  g.save();
  g.font = `italic 400 16px ${SERIF}`;
  g.fillStyle = 'rgba(190, 130, 70, 0.6)';
  const decl = [
    'We hold these truths to be',
    'self-evident, that all men are',
    'created equal, that they are',
    'endowed by their Creator with',
    'certain unalienable Rights, that',
    'among these are Life, Liberty',
    'and the pursuit of Happiness.',
  ];
  decl.forEach((l, i) => g.fillText(l, 1035, 300 + i * 22));
  g.restore();

  microBorder(g, 'rgba(31, 80, 50, 0.85)');

  // portrait backdrop
  const px = W * 0.415;
  const py = H * 0.53;
  g.save();
  const halo = g.createRadialGradient(px, py - 40, 40, px, py, 420);
  halo.addColorStop(0, 'rgba(236, 242, 228, 0.8)');
  halo.addColorStop(1, 'rgba(236, 242, 228, 0)');
  g.fillStyle = halo;
  g.fillRect(px - 420, py - 420, 840, 840);
  const [lc, lg] = canvas(640, H);
  lg.strokeStyle = 'rgba(30, 90, 55, 0.22)';
  lg.lineWidth = 1;
  for (let y = 60; y < H - 60; y += 5) {
    lg.beginPath();
    lg.moveTo(0, y);
    lg.lineTo(640, y);
    lg.stroke();
  }
  lg.globalCompositeOperation = 'destination-in';
  const lm = lg.createRadialGradient(320, H * 0.5, 120, 320, H * 0.5, 360);
  lm.addColorStop(0, 'rgba(0,0,0,1)');
  lm.addColorStop(1, 'rgba(0,0,0,0)');
  lg.fillStyle = lm;
  lg.fillRect(0, 0, 640, H);
  g.drawImage(lc, px - 320, 0);
  g.restore();
  g.drawImage(portrait(720), px - 360, py - 300, 720, 720);

  // FEDERAL RESERVE NOTE / THE UNITED STATES OF AMERICA
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = INK;
  g.font = `700 28px ${SERIF}`;
  g.fillText('FEDERAL  RESERVE  NOTE', W * 0.365, 80);
  g.font = `700 52px ${SERIF}`;
  g.fillText('THE UNITED STATES OF AMERICA', W * 0.365, 130);

  // left: legal tender text, Federal Reserve seal, serial
  g.font = `700 17px ${SERIF}`;
  g.fillStyle = INK_SOFT;
  g.fillText('THIS NOTE IS LEGAL TENDER', W * 0.165, 250);
  g.fillText('FOR ALL DEBTS, PUBLIC AND PRIVATE', W * 0.165, 274);

  seal(g, W * 0.165, H * 0.56, 92, '#18241d', {
    ring: 'FEDERAL RESERVE SYSTEM',
    draw: (gg, r) => {
      gg.fillStyle = '#18241d';
      gg.font = `900 ${Math.round(r * 0.62)}px ${SERIF}`;
      gg.fillText('Q', 0, 4);
    },
  });

  g.fillStyle = GREEN;
  g.font = `600 40px ${MONO}`;
  g.textAlign = 'left';
  g.fillText('QT 13371337 Q', 96, 200);
  g.textAlign = 'right';
  g.font = `600 36px ${MONO}`;
  g.fillText('QT 13371337 Q', W - 96, H * 0.645);
  g.textAlign = 'center';

  // corner numerals
  g.font = `700 92px ${SERIF}`;
  g.fillStyle = 'rgba(31, 60, 42, 0.9)';
  g.textAlign = 'left';
  g.fillText('100', 64, 110);
  g.textAlign = 'right';
  g.fillText('100', W - 64, 110);
  g.textAlign = 'left';
  g.font = `700 70px ${SERIF}`;
  g.fillText('100', 64, H - 104);
  g.textAlign = 'center';

  // signatures
  signature(g, W * 0.1, H * 0.84, 240, 3);
  signature(g, W * 0.645, H * 0.84, 190, 11);
  g.font = `700 13px ${SERIF}`;
  g.fillStyle = INK_SOFT;
  g.fillText('TREASURER OF THE UNITED STATES', W * 0.16, H * 0.9);
  g.fillText('SECRETARY OF THE TREASURY', W * 0.69, H * 0.9);

  // blue 3D security ribbon with bells and 100s
  const rx = W * 0.615;
  const rw = 54;
  const rib = g.createLinearGradient(rx - rw / 2, 0, rx + rw / 2, 0);
  rib.addColorStop(0, '#1d4fb0');
  rib.addColorStop(0.5, '#3f86f0');
  rib.addColorStop(1, '#1d4fb0');
  g.fillStyle = rib;
  g.fillRect(rx - rw / 2, 0, rw, H);
  g.fillStyle = 'rgba(220, 235, 255, 0.92)';
  g.font = `700 20px ${SERIF}`;
  for (let y = 18, i = 0; y < H; y += 44, i++) {
    if (i % 2) {
      g.fillText('100', rx, y);
    } else {
      bellShape(g, rx, y, 26);
      g.fill();
    }
  }

  // copper inkwell + bell (colour-shifting ink in the shader)
  const ix = W * 0.71;
  const iy = H * 0.47;
  g.save();
  g.translate(ix, iy);
  g.scale(0.82, 0.82);
  g.translate(-ix, -iy);
  feather(g, ix - 20, iy + 40, 300, -1.95);
  const cu = g.createLinearGradient(ix - 90, iy - 100, ix + 90, iy + 100);
  cu.addColorStop(0, '#e19a5b');
  cu.addColorStop(0.5, '#a9561f');
  cu.addColorStop(1, '#6e3212');
  g.fillStyle = cu;
  g.beginPath();
  g.moveTo(ix - 70, iy + 95);
  g.lineTo(ix - 92, iy - 20);
  g.quadraticCurveTo(ix, iy - 70, ix + 92, iy - 20);
  g.lineTo(ix + 70, iy + 95);
  g.closePath();
  g.fill();
  g.fillRect(ix - 50, iy - 62, 100, 22);
  g.fillStyle = '#c87a3c';
  bellShape(g, ix, iy + 22, 92);
  g.fill();
  g.strokeStyle = 'rgba(60, 25, 8, 0.6)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();

  // Treasury seal (green)
  seal(g, W * 0.795, H * 0.3, 60, GREEN, {
    ring: 'THESAUR · AMER · SEPTENT · SIGIL',
    draw: (gg, r) => {
      gg.strokeStyle = GREEN;
      gg.lineWidth = 3;
      gg.beginPath();
      gg.moveTo(-r * 0.4, -r * 0.05);
      gg.lineTo(0, -r * 0.3);
      gg.lineTo(r * 0.4, -r * 0.05);
      gg.stroke();
      gg.fillStyle = GREEN;
      gg.fillRect(-r * 0.36, r * 0.05, r * 0.72, r * 0.08);
      gg.fillRect(-r * 0.04, r * 0.13, r * 0.08, r * 0.28);
    },
  });

  // watermark window with ghost portrait
  const wx = W * 0.9;
  const wy = H * 0.4;
  g.save();
  const wm = g.createRadialGradient(wx, wy, 10, wx, wy, 170);
  wm.addColorStop(0, 'rgba(250, 248, 240, 0.9)');
  wm.addColorStop(1, 'rgba(250, 248, 240, 0)');
  g.fillStyle = wm;
  g.fillRect(wx - 170, wy - 170, 340, 340);
  g.globalAlpha = 0.09;
  g.drawImage(portrait(300, true), wx - 150, wy - 140, 300, 300);
  g.restore();

  // big colour-shifting 100
  const big = g.createLinearGradient(W - 500, H - 260, W - 90, H - 80);
  big.addColorStop(0, '#d48a45');
  big.addColorStop(0.5, '#9a4b18');
  big.addColorStop(1, '#c4783a');
  g.fillStyle = big;
  g.font = `800 205px ${SERIF}`;
  g.textAlign = 'right';
  g.textBaseline = 'alphabetic';
  g.fillText('100', W - 76, H - 72);

  wear(g, 21);
  return c;
}

/* ---------- back ---------- */
function independenceHall(w, h) {
  const [c, g] = canvas(w, h);
  const s = w / 900;
  g.scale(s, s);
  const stone = '#4b6a55';
  const dark = '#22372a';

  // sky lines
  g.strokeStyle = 'rgba(30, 100, 60, 0.25)';
  g.lineWidth = 1;
  for (let y = 0; y < 500; y += 6) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(900, y);
    g.stroke();
  }
  // trees
  const tree = (x, y, r) => {
    g.fillStyle = '#2a4433';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(x + Math.cos(i * 1.7) * r * 0.6, y + Math.sin(i * 2.3) * r * 0.4, r * (0.45 + (i % 3) * 0.1), 0, Math.PI * 2);
      g.fill();
    }
  };
  tree(70, 400, 90);
  tree(830, 400, 90);
  // main block
  g.fillStyle = stone;
  g.fillRect(110, 290, 680, 210);
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(100, 292);
  g.lineTo(130, 266);
  g.lineTo(770, 266);
  g.lineTo(800, 292);
  g.closePath();
  g.fill();
  // chimneys
  g.fillRect(170, 236, 26, 34);
  g.fillRect(704, 236, 26, 34);
  // windows
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 10; i++) {
      const x = 140 + i * 64 + (i >= 5 ? 22 : 0);
      if (x > 360 && x < 520) continue;
      const y = row ? 410 : 318;
      g.fillStyle = '#e4e2d4';
      g.fillRect(x - 3, y - 3, 34, 58);
      g.fillStyle = dark;
      g.fillRect(x, y, 28, 52);
      g.strokeStyle = '#cfcdbd';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x + 14, y);
      g.lineTo(x + 14, y + 52);
      for (let k = 1; k < 4; k++) {
        g.moveTo(x, y + k * 13);
        g.lineTo(x + 28, y + k * 13);
      }
      g.stroke();
    }
  }
  // tower
  g.fillStyle = '#365443';
  g.fillRect(390, 170, 120, 330);
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(425, 500);
  g.lineTo(425, 450);
  g.arc(450, 450, 25, Math.PI, 0);
  g.lineTo(475, 500);
  g.fill();
  g.beginPath();
  g.moveTo(430, 400);
  g.lineTo(430, 330);
  g.arc(450, 330, 20, Math.PI, 0);
  g.lineTo(470, 400);
  g.fill();
  // clock stage
  g.fillStyle = '#4d6b58';
  g.fillRect(405, 110, 90, 64);
  g.fillStyle = '#e8e6d8';
  g.beginPath();
  g.arc(450, 142, 22, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = dark;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.moveTo(450, 142);
  g.lineTo(450, 126);
  g.moveTo(450, 142);
  g.lineTo(462, 146);
  g.stroke();
  // belfry with columns
  g.fillStyle = '#466452';
  g.fillRect(418, 62, 64, 50);
  g.strokeStyle = '#d9d7c8';
  g.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(424 + i * 13, 66);
    g.lineTo(424 + i * 13, 108);
    g.stroke();
  }
  // dome + spire
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(450, 62, 34, 20, 0, Math.PI, 0);
  g.fill();
  g.beginPath();
  g.moveTo(443, 46);
  g.lineTo(450, 0);
  g.lineTo(457, 46);
  g.fill();
  // ground
  g.fillStyle = '#2f4a3a';
  g.fillRect(0, 500, 900, 60);

  // engraving pass
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = 'rgba(10, 14, 12, 0.25)';
  g.lineWidth = 1;
  for (let y = 0; y < 560; y += 3) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(900, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(240, 240, 230, 0.12)';
  for (let x = -600; x < 900; x += 7) {
    g.beginPath();
    g.moveTo(x, 560);
    g.lineTo(x + 560, 0);
    g.stroke();
  }
  // dissolve the edges into the paper
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(w / 2, h * 0.55, w * 0.28, w / 2, h * 0.55, w * 0.52);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, w, h);
  return c;
}

function drawBack() {
  const [c, g] = canvas(W, H);
  paper(
    g,
    [
      [0, 'rgba(110, 165, 120, 0.42)'],
      [0.55, 'rgba(130, 180, 135, 0.34)'],
      [1, 'rgba(190, 185, 120, 0.34)'],
    ],
    13
  );
  microBorder(g, 'rgba(25, 85, 50, 0.9)');
  greenField(g);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = GREEN;
  g.font = `700 60px ${SERIF}`;
  g.fillText('THE UNITED STATES OF AMERICA', W * 0.42, 108);
  g.font = `700 30px ${SERIF}`;
  g.fillText('IN GOD WE TRUST', W * 0.42, 168);
  g.font = `700 50px ${SERIF}`;
  g.fillText('ONE HUNDRED DOLLARS', W * 0.42, H - 92);

  // oval-less vignette behind the hall
  const hx = W * 0.42;
  const hall = independenceHall(1000, 622);
  const vg = g.createRadialGradient(hx, H * 0.55, 60, hx, H * 0.55, 560);
  vg.addColorStop(0, 'rgba(232, 240, 226, 0.85)');
  vg.addColorStop(1, 'rgba(232, 240, 226, 0)');
  g.fillStyle = vg;
  g.fillRect(hx - 560, 0, 1120, H);
  g.drawImage(hall, hx - 500, 205, 1000, 622 * 0.78);

  // giant gold 100
  const gold = g.createLinearGradient(W * 0.72, 220, W * 0.95, 700);
  gold.addColorStop(0, '#f1d58c');
  gold.addColorStop(0.45, '#c9993f');
  gold.addColorStop(1, '#e8c26a');
  g.fillStyle = gold;
  g.font = `800 300px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText('100', W * 0.815, H * 0.5);
  g.strokeStyle = 'rgba(120, 80, 20, 0.5)';
  g.lineWidth = 3;
  g.strokeText('100', W * 0.815, H * 0.5);

  // corner numerals
  g.fillStyle = GREEN;
  g.font = `700 90px ${SERIF}`;
  g.textAlign = 'left';
  g.fillText('100', 64, 110);
  g.fillText('100', 64, H - 104);
  g.textAlign = 'right';
  g.font = `700 70px ${SERIF}`;
  g.fillText('100', W - 64, H - 104);

  g.font = `700 22px ${SERIF}`;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(47, 106, 76, 0.85)';
  g.fillText('USA', W * 0.815, H * 0.72);

  wear(g, 29);
  return c;
}

/* the back is a greenback: a dense field of green line work behind everything */
function greenField(g) {
  g.save();
  g.beginPath();
  g.rect(44, 44, W - 88, H - 88);
  g.clip();
  for (let k = 0; k < 140; k++) {
    g.strokeStyle = `rgba(25, 100, 55, ${0.05 + (k % 4) * 0.025})`;
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = (k / 140) * H + Math.sin(x * 0.012 + k * 0.4) * 22 + Math.sin(x * 0.0031 + k) * 30;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  // corner rosettes in green
  [[230, 300], [230, H - 260], [W - 210, 170], [W - 210, H - 170]].forEach(([cx, cy]) => {
    g.strokeStyle = 'rgba(25, 95, 55, 0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      g.beginPath();
      g.ellipse(cx, cy, 120, 42, (i / 28) * Math.PI, 0, Math.PI * 2);
      g.stroke();
    }
  });
  g.restore();
}

/* handling marks, edge grime */
function wear(g, seed) {
  const r = rand(seed);
  const edge = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(50, 80, 50, 0.2)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 20 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(60, 90, 55, 0.07)');
    gr.addColorStop(1, 'rgba(60, 90, 55, 0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // paper grain
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

export function makeBanknoteTextures(maxAnisotropy = 8) {
  const make = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { front: make(drawFront()), back: make(drawBack()), texel: new THREE.Vector2(1 / W, 1 / H) };
}
