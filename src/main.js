import '@fontsource/unbounded/latin-300.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/unbounded/latin-900.css';
import '@fontsource/unbounded/cyrillic-300.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/cyrillic-700.css';
import '@fontsource/unbounded/cyrillic-900.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/cyrillic-400-italic.css';
import '@fontsource/bodoni-moda/latin-700.css';
import '@fontsource/bodoni-moda/latin-800.css';
import '@fontsource/martian-mono/latin-300.css';
import '@fontsource/martian-mono/cyrillic-300.css';
import '@fontsource/martian-mono/cyrillic-400.css';
import '@fontsource/martian-mono/cyrillic-600.css';
import '@fontsource/martian-mono/latin-400.css';
import '@fontsource/martian-mono/latin-600.css';
import './style.css';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { createSoundtrack } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const isTouch = matchMedia('(pointer: coarse)').matches;
const isMobile = isTouch || window.innerWidth < 768;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers = $$('.layer');
const N = layers.length;
const SCROLL_PER_SECTION = 1.6; // viewport heights per dive step

document.body.classList.add('is-loading');

/* ---------- split text into animated characters ---------- */
function split(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((word) => {
          if (!word) return;
          if (/^\s+$/.test(word)) return frag.append(' ');
          const w = document.createElement('span');
          w.className = 'w';
          for (const ch of word) {
            const c = document.createElement('span');
            c.className = 'c';
            c.style.setProperty('--i', i++);
            c.textContent = ch;
            w.append(c);
          }
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  el.setAttribute('aria-label', el.textContent);
  walk(el);
}
$$('[data-split]').forEach(split);
$$('.chips li').forEach((li, i) => li.style.setProperty('--n', i));

/* ---------- preloader ---------- */
const plNum = $('#pl-num');
const plBar = $('#pl-bar');
let plShown = 0;
let plTarget = 0;
let ready = false;
const loadStart = performance.now();
function tickLoader() {
  const elapsed = performance.now() - loadStart;
  plTarget = ready ? 100 : Math.min(92, (elapsed / 1600) * 92);
  plShown += (plTarget - plShown) * 0.12;
  if (ready && plShown > 99.5) plShown = 100;
  plNum.textContent = String(Math.round(plShown)).padStart(3, '0');
  plBar.style.transform = `scaleX(${plShown / 100})`;
  if (plShown < 100) requestAnimationFrame(tickLoader);
  else finishLoading();
}
requestAnimationFrame(tickLoader);

let introStart = 0;
function finishLoading() {
  $('#preloader').classList.add('done');
  document.body.classList.remove('is-loading');
  introStart = performance.now();
  setTimeout(() => $('#preloader').remove(), 1600);
}

/* ---------- scroll ---------- */
const space = $('#scroll-space');
space.style.height = `${((N - 1) * SCROLL_PER_SECTION + 1) * 100}vh`;
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- stops: one gesture moves one screen, and the page always settles on a screen ---------- */
let gestureFrom = 0; // section the current wheel gesture started on
let lastWheel = 0;
let lastWheelEvt = -1e9;
let lastMove = performance.now();
let touching = false;
let snapping = false;
let dir = 1;
const stepPx = () => lenis.limit / (N - 1);

const lenis = new Lenis({
  lerp: reduced ? 1 : 0.07,
  wheelMultiplier: 0.85,
  touchMultiplier: 1.4,
  autoRaf: false,
  // wheel and trackpad: never travel more than one screen per gesture
  virtualScroll: ({ deltaY, event }) => {
    if (event.type !== 'wheel') return true;
    // gesture boundaries use the event's own timestamp, so a slow frame cannot split one fling in two
    const t = event.timeStamp;
    if (t - lastWheelEvt > 260) gestureFrom = Math.round(lenis.targetScroll / stepPx());
    lastWheelEvt = t;
    lastWheel = performance.now();
    snapping = false;
    const lo = Math.max(0, gestureFrom - 1) * stepPx();
    const hi = Math.min(N - 1, gestureFrom + 1) * stepPx();
    const next = lenis.targetScroll + deltaY; // deltaY already carries wheelMultiplier
    if ((deltaY > 0 && next > hi) || (deltaY < 0 && next < lo)) {
      // park exactly on the neighbouring screen and swallow the rest of the fling;
      // Lenis does not cancel an event it was told to skip, so the native scroll is blocked here
      if (event.cancelable) event.preventDefault();
      const edge = deltaY > 0 ? hi : lo;
      if (Math.abs(lenis.targetScroll - edge) > 1) lenis.scrollTo(edge, { lerp: 0.07 });
      return false;
    }
    return true;
  },
});
window.addEventListener('touchstart', () => ((touching = true), (snapping = false)), { passive: true });
window.addEventListener('touchend', () => ((touching = false), (lastMove = performance.now())), { passive: true });

function settle(now) {
  if (!introStart || touching || snapping || reduced) return;
  if (lenis.isScrolling || now - lastMove < 220 || now - lastWheel < 260) return;
  const s = lenis.targetScroll / stepPx();
  // go on to the next screen once you are a fifth of the way there, otherwise fall back
  const k = clamp(dir > 0 ? Math.ceil(s - 0.2) : Math.floor(s + 0.2), 0, N - 1);
  const y = k * stepPx();
  if (Math.abs(lenis.scroll - y) < 2) return;
  snapping = true;
  lenis.scrollTo(y, {
    duration: 0.9,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    onComplete: () => (snapping = false),
  });
}
lenis.stop();
if (new URLSearchParams(location.search).has('debug')) window.__lenis = lenis;

const sectionY = (k) => (k / (N - 1)) * lenis.limit;
let prevScroll = 0;
lenis.on('scroll', () => {
  const d = lenis.scroll - prevScroll;
  if (Math.abs(d) > 0.5 && !snapping) {
    dir = Math.sign(d);
    lastMove = performance.now();
  }
  prevScroll = lenis.scroll;
});
$$('[data-goto]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(sectionY(+a.dataset.goto), { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  })
);
window.addEventListener('keydown', (e) => {
  const cur = Math.round((lenis.progress || 0) * (N - 1));
  if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
    e.preventDefault();
    lenis.scrollTo(sectionY(Math.min(N - 1, cur + 1)), { duration: 1.8 });
  } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
    e.preventDefault();
    lenis.scrollTo(sectionY(Math.max(0, cur - 1)), { duration: 1.8 });
  }
});

/* ---------- layers: each one flies out of the center toward you ---------- */
const navLinks = $$('.nav a');
const secNum = $('#secnum');
const secName = $('#secname');
const depthEl = $('#depth');
const progEl = $('#prog');
const burnedEl = $('#burned');
const footBurned = $('#foot-burned');
let lastSection = -1;

function updateLayers(p, vel) {
  const s = p * (N - 1);
  layers.forEach((el, k) => {
    const d = s - k;
    const last = k === N - 1;
    let z, o;
    if (d < 0) {
      z = d * 1500;
      o = smoothstep(-1.0, -0.3, d);
    } else {
      z = last ? 0 : d * 1100;
      o = last ? 1 : 1 - smoothstep(0.1, 0.38, d);
    }
    if (k === 0) o *= smoothstep(0.1, 0.9, introProgress);
    if (o <= 0.002) {
      if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      el.classList.remove('is-live');
      return;
    }
    el.style.visibility = 'visible';
    const rot = d * -7 + vel * 0.02;
    const skew = clamp(vel * 0.025, -3, 3);
    el.style.transform = `perspective(1000px) translate3d(0,0,${z.toFixed(1)}px) rotateZ(${rot.toFixed(2)}deg) skewY(${skew.toFixed(2)}deg)`;
    el.style.opacity = o.toFixed(3);
    const active = Math.abs(d) < 0.42;
    if (active && !el.classList.contains('is-active')) onEnter(el);
    el.classList.toggle('is-active', active || (k === 0 && d < 0.42 && introProgress > 0.3));
    el.classList.toggle('is-live', Math.abs(d) < 0.25);
  });

  const cur = Math.round(s);
  if (cur !== lastSection) {
    lastSection = cur;
    secNum.textContent = String(cur).padStart(2, '0');
    secName.textContent = layers[cur].dataset.name;
    navLinks.forEach((a) => a.classList.toggle('is-current', +a.dataset.goto === cur));
  }
  depthEl.textContent = String(Math.round(p * 4200)).padStart(4, '0');
  progEl.style.transform = `scaleX(${p})`;
}

/* count-up numbers on first visit */
function onEnter(el) {
  $$('[data-count]', el).forEach((b) => {
    if (b.dataset.done) return;
    b.dataset.done = 1;
    const to = +b.dataset.count;
    const suffix = b.dataset.suffix || '';
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / 1600, 0, 1);
      const e = 1 - Math.pow(1 - k, 4);
      b.textContent = Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- cursor, magnetic, tilt ---------- */
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const cursor = $('.cursor');
const dot = $('.cursor-dot');
const ring = $('.cursor-ring');
const label = $('.cursor-label');
const ringPos = { x: mouse.x, y: mouse.y };
if (!isTouch) document.documentElement.classList.add('has-cursor');

let hasPointer = false;
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  hasPointer = true;
});
document.addEventListener('pointerleave', () => (hasPointer = false));
document.addEventListener('pointerover', (e) => {
  const t = e.target.closest('a, button, .magnetic, [data-cursor]');
  cursor.classList.toggle('is-hover', !!t);
  label.textContent = t?.dataset.cursor || '';
});

const magnets = $$('.magnetic');
function updateMagnets() {
  if (isTouch || !hasPointer) return;
  for (const m of magnets) {
    const r = m.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.hypot(dx, dy);
    const reach = Math.max(r.width, r.height) * 0.9;
    const k = dist < reach ? 0.32 : 0;
    const tx = dx * k;
    const ty = dy * k;
    const cur = m._m || { x: 0, y: 0 };
    cur.x += (tx - cur.x) * 0.18;
    cur.y += (ty - cur.y) * 0.18;
    m._m = cur;
    m.style.translate = `${cur.x.toFixed(2)}px ${cur.y.toFixed(2)}px`;
  }
}

$$('.tilt').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    if (isTouch) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add('is-hover');
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('is-hover');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  });
});

/* ---------- boot ---------- */
let world = null;
const soundtrack = createSoundtrack({ button: $('.sound'), bars: $$('.sound .eq i') });
let introProgress = 0;

// flat scan of a real $100 (series 1969C), used as the face of every note
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function boot() {
  const notePromise = loadImage('/notes/100-front.jpg');
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('900 100px Unbounded'),
        document.fonts.load('700 26px Unbounded'),
        document.fonts.load('400 18px "Martian Mono"'),
        document.fonts.load('600 18px "Martian Mono"'),
        document.fonts.load('700 40px "Bodoni Moda"'),
        document.fonts.load('800 40px "Bodoni Moda"'),
        document.fonts.load('italic 400 20px "Bodoni Moda"'),
        document.fonts.load('italic 400 20px "Playfair Display"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const noteFront = await Promise.race([notePromise, new Promise((r) => setTimeout(() => r(null), 6000))]);
  try {
    world = createScene($('#webgl'), { sections: N, isMobile, noteFront });
  } catch (err) {
    console.error('WebGL unavailable', err);
    document.documentElement.classList.add('no-webgl');
  }
  if (window.__lenis) window.__world = world;
  ready = true;
  lenis.start();
  requestAnimationFrame(loop);
}

const fmt = new Intl.NumberFormat('en-US');
let lastT = performance.now();
let lastBurned = -1;
let smoothVel = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  lenis.raf(now);
  settle(now);

  // camera fly-in after the preloader: time-based, so it takes the same 2.4 s at any frame rate
  introProgress = introStart ? 1 - Math.pow(1 - clamp((now - introStart) / 2400, 0, 1), 3) : 0;
  const p = clamp(lenis.progress || 0, 0, 1);
  const vel = lenis.velocity || 0;
  smoothVel += (clamp(vel, -60, 60) - smoothVel) * Math.min(1, dt * 6);

  // touch scroll velocity is spiky; feeding it to zoom and skew makes the page pulse on phones
  const fxVel = isTouch ? 0 : smoothVel;
  updateLayers(p, fxVel);

  // cursor
  dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
  ringPos.x += (mouse.x - ringPos.x) * Math.min(1, dt * 12);
  ringPos.y += (mouse.y - ringPos.y) * Math.min(1, dt * 12);
  ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  updateMagnets();

  if (world) {
    // on touch screens a tap is not a pointer to follow: keep the scene centred
    if (!isTouch) world.setMouse((mouse.x / window.innerWidth) * 2 - 1, -((mouse.y / window.innerHeight) * 2 - 1));
    const level = soundtrack.update(p);
    const { burnt } = world.update(time, dt, p, isTouch ? 0 : vel, introProgress, level);
    const dollars = Math.round(burnt * 100);
    if (dollars !== lastBurned) {
      lastBurned = dollars;
      burnedEl.textContent = '$' + fmt.format(dollars);
      footBurned.textContent = '$' + fmt.format(dollars);
    }
  }
  requestAnimationFrame(loop);
}

boot();
