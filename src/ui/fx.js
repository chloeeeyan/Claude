// Game-feel effects shared by the scoring animation and the renderer: screen shake, number pulses, phase transitions.
// Everything scales with the speed setting and is skipped for prefers-reduced-motion.
import { ui } from './store.js';

export const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const still = () => reducedMotion || document.hidden;

// a short decaying jolt; px is the first swing
export function shake(el, px) {
  if (!el || still() || px <= 0) return;
  const f = [1, -0.8, 0.6, -0.4, 0.2, 0].map((k, i) => ({ translate: `${(k * px).toFixed(1)}px ${((i % 2 ? 1 : -1) * k * px * 0.5).toFixed(1)}px` }));
  el.animate(f, { duration: (90 + px * 14) / ui.speed, easing: 'ease-out' });
}

// a number box swells; k (0..1) is how hard
export function pulse(el, k = 0) {
  if (!el || still()) return;
  const s = 1.08 + 0.3 * Math.min(1, k);
  el.animate([{ scale: 1 }, { scale: s, rotate: `${(Math.random() - 0.5) * 6 * (1 + k)}deg` }, { scale: 1 }],
    { duration: 240 / ui.speed, easing: 'cubic-bezier(.2, 1.6, .4, 1)' });
}

// a show starts: the channel flips with a burst of static over el
export function channelFlip(el) {
  if (!el || still()) return;
  const s = document.createElement('div');
  s.className = 'static';
  el.appendChild(s);
  setTimeout(() => s.remove(), 450 / ui.speed);
}

// new phase on the table: the panel slaps in like the next comic frame
export function panelIn(el) {
  if (!el || still()) return;
  el.animate([
    { opacity: 0, transform: 'translate(46px, 10px) rotate(1.6deg) scale(.97)', clipPath: 'polygon(0 0, 0 0, -20% 100%, 0 100%)' },
    { opacity: 1, transform: 'none', clipPath: 'polygon(0 0, 120% 0, 100% 100%, 0 100%)' },
  ], { duration: 340 / ui.speed, easing: 'cubic-bezier(.2, .9, .3, 1)' });
}
