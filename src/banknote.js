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

/* ---------- classic engraving helpers ---------- */
const ENG = '#2a2f2c'; // near-black engraving ink of the face
const ENG_GREEN = '#2f6a49'; // green ink: seals, serials, the whole back
const PAPER = '#d6d6c5'; // sampled from the scan so both faces are the same paper

function classicPaper(g, seed, tint) {
  const r = rand(seed);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.fillStyle = tint;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 380; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = r() * Math.PI * 2;
    const len = 5 + r() * 12;
    g.strokeStyle = r() > 0.5 ? 'rgba(190, 40, 50, 0.45)' : 'rgba(40, 70, 180, 0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 1) * len * 0.6, y + Math.sin(a + 1) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
}

// dense lathe work filling a rectangle (the "engraved" texture of borders and panels)
function lathe(g, x, y, w, h, color, density = 4, amp = 6) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(236, 235, 226, 0.55)';
  g.lineWidth = 1;
  for (let k = 0; k < h; k += density) {
    g.beginPath();
    for (let xx = x; xx <= x + w; xx += 4) {
      const yy = y + k + Math.sin((xx - x) * 0.09 + k * 0.7) * amp * 0.5 + Math.sin((xx - x) * 0.023 + k) * amp;
      xx === x ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
    }
    g.stroke();
  }
  g.restore();
}

// spirograph rosette, optionally carrying a numeral
function rosette(g, cx, cy, r, color, label, labelColor = PAPER) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(236, 235, 226, 0.5)';
  g.lineWidth = 1;
  for (let i = 0; i < 36; i++) {
    g.beginPath();
    g.ellipse(cx, cy, r * 0.92, r * 0.36, (i / 36) * Math.PI, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r + 5, 0, Math.PI * 2);
  g.stroke();
  if (label) {
    g.fillStyle = labelColor;
    g.strokeStyle = color;
    g.lineWidth = 8;
    g.font = `800 ${Math.round(r * (label.length > 2 ? 0.78 : 1.2))}px ${SERIF}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeText(label, cx, cy + r * 0.06);
    g.fillText(label, cx, cy + r * 0.06);
  }
  g.restore();
}

// white letters with a dark outline and drop shadow, like engraved banner lettering
function engraved(g, text, x, y, size, color, opts = {}) {
  g.save();
  g.font = `${opts.weight || 800} ${size}px ${SERIF}`;
  g.textAlign = opts.align || 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, x + size * 0.05, y + size * 0.05);
  g.lineWidth = Math.max(2, size * 0.06);
  g.strokeStyle = color;
  g.strokeText(text, x, y);
  g.fillStyle = PAPER;
  g.fillText(text, x, y);
  // horizontal hatching inside the letters
  g.globalCompositeOperation = 'source-atop';
  g.restore();
}

function ornateFrame(g, color) {
  const m = 26;
  const band = 46;
  lathe(g, m, m, W - m * 2, band, color, 4, 5);
  lathe(g, m, H - m - band, W - m * 2, band, color, 4, 5);
  lathe(g, m, m, band, H - m * 2, color, 4, 5);
  lathe(g, W - m - band, m, band, H - m * 2, color, 4, 5);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.strokeRect(m, m, W - m * 2, H - m * 2);
  g.lineWidth = 2;
  g.strokeRect(m + band + 6, m + band + 6, W - (m + band + 6) * 2, H - (m + band + 6) * 2);
  g.lineWidth = 1;
  g.strokeRect(m + band + 12, m + band + 12, W - (m + band + 12) * 2, H - (m + band + 12) * 2);
  // scalloped inner edge
  g.fillStyle = color;
  for (let x = m + band + 20; x < W - m - band - 20; x += 18) {
    g.beginPath();
    g.arc(x, m + band + 6, 5, 0, Math.PI);
    g.fill();
    g.beginPath();
    g.arc(x, H - m - band - 6, 5, Math.PI, 0);
    g.fill();
  }
}

/* ---------- front ---------- */
function drawFront() {
  const [c, g] = canvas(W, H);
  classicPaper(g, 7, 'rgba(120, 140, 125, 0.06)');

  // fine background web across the field
  g.save();
  for (let k = 0; k < 70; k++) {
    g.strokeStyle = 'rgba(40, 60, 50, 0.07)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = H / 2 + Math.sin(x * 0.007 + k * 0.23) * (30 + k * 4) * Math.cos(x * 0.002 + k * 0.04);
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();

  ornateFrame(g, ENG);

  // corner rosettes with 100
  rosette(g, 150, 150, 82, ENG, '100');
  rosette(g, W - 150, 150, 82, ENG, '100');
  rosette(g, 150, H - 150, 82, ENG, '100');
  rosette(g, W - 150, H - 150, 82, ENG, '100');

  // top banner
  lathe(g, W * 0.3, 92, W * 0.4, 58, ENG, 3, 3);
  g.font = `700 30px ${SERIF}`;
  g.fillStyle = PAPER;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('FEDERAL  RESERVE  NOTE', W / 2, 122);

  // big outlined 100 behind the treasury seal (the way TWO sits behind it on a $2)
  g.save();
  g.font = `800 300px ${SERIF}`;
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(42, 47, 44, 0.32)';
  g.fillStyle = 'rgba(42, 47, 44, 0.07)';
  g.fillText('100', W * 0.745, H * 0.5);
  g.strokeText('100', W * 0.745, H * 0.5);
  g.restore();

  // oval portrait with lathe ring
  const px = W / 2;
  const py = H * 0.42;
  g.save();
  g.beginPath();
  g.ellipse(px, py, 175, 212, 0, 0, Math.PI * 2);
  g.fillStyle = ENG;
  g.fill();
  g.strokeStyle = 'rgba(236,235,226,0.5)';
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    g.beginPath();
    g.ellipse(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 163, 200, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.ellipse(px, py, 150, 188, 0, 0, Math.PI * 2);
  g.fillStyle = '#e4e3d9';
  g.fill();
  g.clip();
  g.strokeStyle = 'rgba(40, 45, 42, 0.22)';
  g.lineWidth = 1;
  for (let y = py - 230; y < py + 230; y += 4) {
    g.beginPath();
    g.moveTo(px - 180, y);
    g.lineTo(px + 180, y);
    g.stroke();
  }
  g.drawImage(portrait(450), px - 225, py - 175, 450, 450);
  g.restore();
  g.font = `700 18px ${SERIF}`;
  g.fillStyle = ENG;
  g.fillText('FRANKLIN', px, py + 200);

  // engraved legends under the portrait
  engraved(g, 'THE UNITED STATES OF AMERICA', px, H * 0.79, 50, ENG);
  engraved(g, 'ONE HUNDRED DOLLARS', px, H * 0.87, 38, ENG);

  // left: legal tender text, black Federal Reserve seal, district numbers, serial
  g.fillStyle = ENG;
  g.font = `700 17px ${SERIF}`;
  g.fillText('THIS NOTE IS LEGAL TENDER', W * 0.25, 210);
  g.fillText('FOR ALL DEBTS, PUBLIC AND PRIVATE', W * 0.25, 234);
  seal(g, W * 0.25, H * 0.48, 78, '#1d211f', {
    ring: 'FEDERAL RESERVE BANK',
    draw: (gg, r) => {
      gg.fillStyle = '#1d211f';
      gg.font = `900 ${Math.round(r * 0.62)}px ${SERIF}`;
      gg.fillText('Q', 0, 4);
    },
  });
  g.font = `700 40px ${SERIF}`;
  g.fillStyle = ENG;
  g.fillText('17', W * 0.155, H * 0.48);
  g.fillText('17', W * 0.845, H * 0.3);

  g.fillStyle = ENG_GREEN;
  g.font = `600 40px ${MONO}`;
  g.fillText('Q 13371337 T', W * 0.255, H * 0.6);
  g.fillText('Q 13371337 T', W * 0.745, H * 0.24);

  // right: green Treasury seal over the outlined 100
  seal(g, W * 0.745, H * 0.5, 70, ENG_GREEN, {
    ring: 'THESAUR · AMER · SEPTENT · SIGIL',
    draw: (gg, r) => {
      gg.strokeStyle = ENG_GREEN;
      gg.lineWidth = 3;
      gg.beginPath();
      gg.moveTo(-r * 0.4, -r * 0.05);
      gg.lineTo(0, -r * 0.3);
      gg.lineTo(r * 0.4, -r * 0.05);
      gg.stroke();
      gg.fillStyle = ENG_GREEN;
      gg.fillRect(-r * 0.36, r * 0.05, r * 0.72, r * 0.08);
      gg.fillRect(-r * 0.04, r * 0.13, r * 0.08, r * 0.28);
    },
  });
  g.fillStyle = ENG;
  g.font = `700 16px ${SERIF}`;
  g.fillText('WASHINGTON, D.C.', W * 0.745, H * 0.17);
  g.font = `700 15px ${SERIF}`;
  g.fillText('SERIES', W * 0.585, H * 0.58);
  g.fillText('1990', W * 0.585, H * 0.61);

  // signatures
  signature(g, W * 0.17, H * 0.68, 200, 3);
  signature(g, W * 0.7, H * 0.68, 200, 11);
  g.font = `italic 400 14px ${SERIF}`;
  g.fillStyle = ENG;
  g.fillText('Treasurer of the United States.', W * 0.22, H * 0.72);
  g.fillText('Secretary of the Treasury.', W * 0.75, H * 0.72);

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
  classicPaper(g, 13, 'rgba(110, 140, 105, 0.08)');
  greenField(g);
  ornateFrame(g, ENG_GREEN);
  rosette(g, 150, 150, 82, ENG_GREEN, '100');
  rosette(g, W - 150, 150, 82, ENG_GREEN, '100');
  rosette(g, 150, H - 150, 82, ENG_GREEN, '100');
  rosette(g, W - 150, H - 150, 82, ENG_GREEN, '100');

  // side panels with big numerals
  lathe(g, 230, 250, 230, 370, ENG_GREEN, 4, 5);
  lathe(g, W - 460, 250, 230, 370, ENG_GREEN, 4, 5);
  g.font = `800 112px ${SERIF}`;
  g.fillStyle = PAPER;
  g.strokeStyle = ENG_GREEN;
  g.lineWidth = 8;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.strokeText('100', 345, H / 2);
  g.fillText('100', 345, H / 2);
  g.strokeText('100', W - 345, H / 2);
  g.fillText('100', W - 345, H / 2);

  engraved(g, 'THE UNITED STATES OF AMERICA', W / 2, 140, 54, ENG_GREEN);
  g.font = `700 26px ${SERIF}`;
  g.fillStyle = ENG_GREEN;
  g.fillText('IN GOD WE TRUST', W / 2, 200);
  engraved(g, 'ONE HUNDRED DOLLARS', W / 2, H - 120, 50, ENG_GREEN);

  // Independence Hall in an oval vignette
  const cx = W / 2;
  const cy = H * 0.53;
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, 440, 215, 0, 0, Math.PI * 2);
  g.fillStyle = ENG_GREEN;
  g.fill();
  g.beginPath();
  g.ellipse(cx, cy, 424, 200, 0, 0, Math.PI * 2);
  g.fillStyle = '#cfd3c1';
  g.fill();
  g.clip();
  g.drawImage(independenceHall(860, 535), cx - 430, cy - 250, 860, 535 * 0.9);
  g.restore();
  g.font = `700 18px ${SERIF}`;
  g.fillStyle = ENG_GREEN;
  g.fillText('INDEPENDENCE HALL', cx, cy + 238);

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

/** frontImage: a flat scan of the real note (public/notes/100-front.jpg); falls back to the drawn face */
export function makeBanknoteTextures(maxAnisotropy = 8, frontImage = null) {
  const make = (cv) => {
    const t = cv instanceof HTMLCanvasElement ? new THREE.CanvasTexture(cv) : new THREE.Texture(cv);
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const out = {
    front: make(frontImage || drawFront()),
    // with a real scan, both faces show it: a drawn back next to a photo reads as fake
    back: frontImage ? null : make(drawBack()),
    texel: new THREE.Vector2(1 / W, 1 / H),
  };
  if (!out.back) out.back = out.front;
  return out;
}
