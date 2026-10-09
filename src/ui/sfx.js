// Sound effects through Web Audio. Recorded clips live in public/sfx/ (CC0, see docs/credits.md) and load on the
// first sound; until a clip has loaded, or if it fails, the synthesised fallback plays instead. Audio starts on the first user gesture.
import { storage } from './store.js';

let ctx = null;
let on = storage.get('sound', true);

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
    load();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// recorded clips: crowd reactions (freesound, CC0) and card / chip sounds (Kenney Casino Audio, CC0)
const CLIPS = ['boo', 'laugh1', 'laugh2', 'laugh3', 'applause', 'cheer', 'crickets', 'static', 'deal', 'chip', 'cash', 'pack'];
const buf = {};
function load() {
  for (const k of CLIPS) {
    fetch(`sfx/${k}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
      .then((b) => { buf[k] = b; }).catch(() => {});
  }
}

// plays a clip; false when sound is off or the clip isn't ready, so the caller can fall back to a synth tone
function clip(k, vol = 0.5, rate = 1) {
  if (!on) return true;
  const c = ac();
  if (!c || !buf[k]) return false;
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = buf[k]; s.playbackRate.value = rate; g.gain.value = vol;
  s.connect(g).connect(c.destination);
  s.start();
  return true;
}

function tone(f, dur = 0.09, type = 'sine', vol = 0.14, when = 0) {
  if (!on) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// rising pitch for consecutive scoring steps
const semi = (base, n) => base * Math.pow(2, Math.min(n, 16) / 12);

export const Sfx = {
  get on() { return on; },
  toggle() { on = !on; storage.set('sound', on); if (on) tone(660, 0.08, 'triangle'); },
  select() { tone(540, 0.045, 'triangle', 0.07); },
  deal() { clip('deal', 0.35, 0.95 + Math.random() * 0.1) || tone(260, 0.05, 'triangle', 0.05); },
  // chips climb in pitch as the hand goes on
  chips(n) { clip('chip', 0.3, Math.pow(2, Math.min(n, 12) / 12)) || tone(semi(440, n), 0.08, 'triangle', 0.12); },
  mult(n) { tone(semi(330, n), 0.1, 'square', 0.05); },
  xmult() { tone(392, 0.12, 'sawtooth', 0.06); tone(784, 0.18, 'sawtooth', 0.06, 0.08); },
  cash() { clip('cash', 0.45) || [784, 988, 1175].forEach((f, i) => tone(f, 0.09, 'triangle', 0.1, i * 0.06)); },
  dead() { tone(150, 0.14, 'sine', 0.12); },
  retrig() { tone(700, 0.06, 'triangle', 0.08); tone(940, 0.06, 'triangle', 0.08, 0.05); },
  shatter() { tone(1500, 0.05, 'square', 0.04); tone(950, 0.09, 'square', 0.04, 0.04); },
  score() { tone(880, 0.16, 'triangle', 0.12); },
  // the audience: a laugh when someone is won over, boos, and the room's heat
  laugh() { clip('laugh' + (1 + Math.floor(Math.random() * 3)), 0.5) || tone(660, 0.1, 'triangle', 0.08); },
  boo() { clip('boo', 0.5) || (tone(180, 0.28, 'sawtooth', 0.05), tone(140, 0.32, 'sawtooth', 0.05, 0.12)); },
  // the room after a hand: crickets when it goes cold, applause / cheers when it warms up, a sigh when it cools
  heat(h, prev = h) {
    if (h === 0) { clip('crickets', 0.55) || [300, 220].forEach((f, i) => tone(f, 0.2, 'sine', 0.1, i * 0.12)); return; }
    if (h > prev && h === 3 && clip('cheer', 0.4)) return;
    if (h >= prev && h >= 2 && clip('applause', h > prev ? 0.35 : 0.2)) return;
    if (h < prev) { [440, 349].forEach((f, i) => tone(f, 0.14, 'sine', 0.08, i * 0.1)); return; }
    [523, 659, 784, 1047].slice(0, h + 1).forEach((f, i) => tone(f, 0.1, 'triangle', 0.09, i * 0.05));
  },
  ovation() { clip('cheer', 0.6); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.09)); },
  // a show starts: the channel flips over
  channel() { clip('static', 0.18) || tone(1200, 0.05, 'square', 0.03); },
  pack() { clip('pack', 0.45) || tone(540, 0.06, 'triangle', 0.08); },
  win() { clip('applause', 0.55); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, i * 0.09)); },
  lose() { clip('crickets', 0.6); [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'sine', 0.12, i * 0.15)); },
};
