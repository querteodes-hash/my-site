/*
  Soundtrack: "addiction" by LONOWN & Asenssia.
  Browsers only allow sound after a user gesture, so it starts on the first tap, click or key
  (unless the visitor muted it before) and the header button toggles it.
  The track is low-passed at the surface and opens up as you dive; an analyser exposes the bass
  level so the scene can pulse with it.
*/
const SRC = '/audio/addiction.mp3';
const KEY = 'querteo-sound';
const VOLUME = 0.8;

function readPref() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writePref(v) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: the preference just is not remembered */
  }
}

export function createSoundtrack({ button, bars }) {
  const el = new Audio();
  el.src = SRC;
  el.loop = true;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';

  let ctx = null;
  let gain = null;
  let filter = null;
  let analyser = null;
  let data = null;
  let on = false;
  let level = 0;
  const wantsOff = readPref() === 'off';

  function graph() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const src = ctx.createMediaElementSource(el);
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    data = new Uint8Array(analyser.frequencyBinCount);
    gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(analyser).connect(gain).connect(ctx.destination);
  }

  function fadeTo(v, seconds) {
    if (!gain) return;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(v, t + seconds);
  }

  async function start() {
    graph();
    try {
      if (ctx && ctx.state === 'suspended') await ctx.resume();
      await el.play();
    } catch {
      return; // not allowed yet: the next gesture will try again
    }
    on = true;
    fadeTo(VOLUME, 2.5);
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
  }

  function stop() {
    on = false;
    fadeTo(0, 0.6);
    setTimeout(() => !on && el.pause(), 700);
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (on) {
      stop();
      writePref('off');
    } else {
      start();
      writePref('on');
    }
  });

  // first real gesture anywhere starts the music (scrolling does not count as one)
  if (!wantsOff) {
    const kick = () => {
      if (!on) start();
      ['pointerup', 'keydown'].forEach((t) => window.removeEventListener(t, kick, true));
    };
    ['pointerup', 'keydown'].forEach((t) => window.addEventListener(t, kick, true));
  }

  // pause with the tab hidden, resume when back
  document.addEventListener('visibilitychange', () => {
    if (!on) return;
    if (document.hidden) el.pause();
    else el.play().catch(() => {});
  });

  return {
    /** depth: dive position 0..1; returns the smoothed bass level 0..1 */
    update(depth) {
      if (!analyser || !on) {
        level *= 0.9;
        bars.forEach((b) => (b.style.transform = `scaleY(${0.25 + level * 0.3})`));
        return level;
      }
      // muffled at the surface, fully open by the first section
      const k = Math.min(1, depth / 0.18);
      filter.frequency.setTargetAtTime(700 * Math.pow(20000 / 700, k), ctx.currentTime, 0.08);

      analyser.getByteFrequencyData(data);
      let bass = 0;
      for (let i = 1; i < 6; i++) bass += data[i];
      bass /= 5 * 255;
      level += (bass - level) * 0.35;
      const bands = [2, 8, 20, 40];
      bars.forEach((b, i) => {
        const v = data[bands[i]] / 255;
        b.style.transform = `scaleY(${0.2 + v * 0.95})`;
      });
      return level;
    },
  };
}
