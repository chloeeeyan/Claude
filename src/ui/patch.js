// Keyed redraw: like `root.innerHTML = html`, but elements carrying a `data-key` that exist both before and after
// are kept (moved into their new place, attributes and contents synced) instead of rebuilt. Kept elements that changed
// zone, order or neighbour count glide from where they were to where they are now (FLIP), so a card can travel from
// the hand to the play area. New keyed elements can fly in from a point of the caller's choosing (`opts.enter`).
// Everything without a key is rebuilt exactly as before.
import { reducedMotion } from './fx.js';
import { ui } from './store.js';

// where an element sits: its container's class, its position among keyed siblings and how many there are
function slot(el) {
  const sibs = [...el.parentElement.children].filter((x) => x.dataset.key);
  return { zone: el.parentElement.className, i: sibs.indexOf(el), n: sibs.length };
}

function box(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth || r.width, rot: parseFloat(getComputedStyle(el).rotate) || 0 };
}

const measure = (el) => ({ ...box(el), ...slot(el) });

function syncAttrs(el, fresh) {
  for (const { name } of [...el.attributes]) if (!fresh.hasAttribute(name)) el.removeAttribute(name);
  for (const { name, value } of fresh.attributes) if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

// opts.enter(el) → an element new keyed elements should fly out of (or null to just appear)
export function patch(root, html, opts = {}) {
  const old = new Map([...root.querySelectorAll('[data-key]')].map((el) => [el.dataset.key, el]));
  if (!old.size && !opts.enter) { root.innerHTML = html; return; }
  const animate = !reducedMotion && !document.hidden;
  const before = new Map();
  if (animate) old.forEach((el, k) => before.set(k, measure(el)));

  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const kept = [], born = [];
  for (const fresh of tpl.content.querySelectorAll('[data-key]')) {
    if (!tpl.content.contains(fresh)) continue;
    const el = old.get(fresh.dataset.key);
    if (!el) { born.push(fresh); continue; }
    old.delete(fresh.dataset.key);
    syncAttrs(el, fresh);
    if (el.innerHTML !== fresh.innerHTML) el.innerHTML = fresh.innerHTML;
    fresh.replaceWith(el);
    kept.push(el);
  }
  root.replaceChildren(tpl.content);
  if (!animate) return;
  kept.forEach((el) => flip(el, before.get(el.dataset.key)));
  if (opts.enter) {
    let k = 0;
    for (const el of born) {
      const src = opts.enter(el);
      if (src && src.offsetWidth) flyIn(el, box(src), k++);
    }
  }
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

// dealt from a pile: starts on top of `a`, face-down sized, then flips face-up as it lands, one after another
function flyIn(el, a, k) {
  const b = box(el), dx = a.x - b.x, dy = a.y - b.y, s = b.w ? a.w / b.w : 1;
  el.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(${-8 - b.rot}deg) scale(${s}) rotateY(90deg)`, opacity: 0, zIndex: 5 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 30}px) rotate(${-4 - b.rot / 2}deg) scale(${(s + 1) / 2}) rotateY(60deg)`, opacity: 1, zIndex: 5, offset: 0.4 },
    { transform: 'none', opacity: 1, zIndex: 5 },
  ], { duration: 420 / ui.speed, delay: (k * 70) / ui.speed, easing: 'cubic-bezier(.25, .9, .35, 1.05)', fill: 'backwards' });
}
