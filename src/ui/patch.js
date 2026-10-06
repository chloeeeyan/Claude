// Keyed redraw: like `root.innerHTML = html`, but elements carrying a `data-key` that exist both before and after
// are kept (moved into their new place, attributes and contents synced) instead of rebuilt. Kept elements that changed
// zone, order or neighbour count glide from where they were to where they are now (FLIP), so a card can travel from
// the hand to the play area. Everything without a key is rebuilt exactly as before.
import { ui } from './store.js';

const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// where an element sits: its container's class, its position among keyed siblings and how many there are
function slot(el) {
  const sibs = [...el.parentElement.children].filter((x) => x.dataset.key);
  return { zone: el.parentElement.className, i: sibs.indexOf(el), n: sibs.length };
}

function measure(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth, rot: parseFloat(getComputedStyle(el).rotate) || 0, ...slot(el) };
}

function syncAttrs(el, fresh) {
  for (const { name } of [...el.attributes]) if (!fresh.hasAttribute(name)) el.removeAttribute(name);
  for (const { name, value } of fresh.attributes) if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function patch(root, html) {
  const old = new Map([...root.querySelectorAll('[data-key]')].map((el) => [el.dataset.key, el]));
  if (!old.size) { root.innerHTML = html; return; }
  const animate = !reducedMotion && !document.hidden;
  const before = new Map();
  if (animate) old.forEach((el, k) => before.set(k, measure(el)));

  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const kept = [];
  for (const fresh of tpl.content.querySelectorAll('[data-key]')) {
    const el = old.get(fresh.dataset.key);
    if (!el || !tpl.content.contains(fresh)) continue;
    old.delete(fresh.dataset.key);
    syncAttrs(el, fresh);
    if (el.innerHTML !== fresh.innerHTML) el.innerHTML = fresh.innerHTML;
    fresh.replaceWith(el);
    kept.push(el);
  }
  root.replaceChildren(tpl.content);
  if (animate) kept.forEach((el) => flip(el, before.get(el.dataset.key)));
}

function flip(el, a) {
  if (!a) return;
  const b = measure(el);
  if (a.zone === b.zone && a.i === b.i && a.n === b.n) return; // same spot: CSS transitions handle state changes
  const dx = a.x - b.x, dy = a.y - b.y;
  if (Math.abs(dx) + Math.abs(dy) < 1) return;
  const s = b.w ? a.w / b.w : 1;
  el.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(${a.rot - b.rot}deg) scale(${s})`, zIndex: 5 },
    { transform: 'none', zIndex: 5 },
  ], { duration: 320 / ui.speed, easing: 'cubic-bezier(.2, .8, .3, 1)' });
}
