// Synthesised sound effects (Web Audio, no files). Audio starts on the first user gesture.
import { storage } from './store.js';

let ctx = null;
let on = storage.get('sound', true);

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
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
  deal() { tone(260, 0.05, 'triangle', 0.05); },
  chips(n) { tone(semi(440, n), 0.08, 'triangle', 0.12); },
  mult(n) { tone(semi(330, n), 0.1, 'square', 0.05); },
  xmult() { tone(392, 0.12, 'sawtooth', 0.06); tone(784, 0.18, 'sawtooth', 0.06, 0.08); },
  cash() { [784, 988, 1175].forEach((f, i) => tone(f, 0.09, 'triangle', 0.1, i * 0.06)); },
  dead() { tone(150, 0.14, 'sine', 0.12); },
  retrig() { tone(700, 0.06, 'triangle', 0.08); tone(940, 0.06, 'triangle', 0.08, 0.05); },
  shatter() { tone(1500, 0.05, 'square', 0.04); tone(950, 0.09, 'square', 0.04, 0.04); },
  score() { tone(880, 0.16, 'triangle', 0.12); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, i * 0.09)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'sine', 0.12, i * 0.15)); },
};
