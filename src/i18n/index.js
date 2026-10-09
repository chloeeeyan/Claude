// English mode for the UI. The game writes Chinese everywhere (code, content tables, templates); in English mode a
// MutationObserver translates each piece of Chinese text and attribute as it lands in the page, so no call site changes.
// Lookup keys are the Chinese text with every number replaced by {#} (so 「第 3 期 · 共 8 期」 is one entry), and short
// rich-text chunks (only inline tags like <b>) are looked up as whole HTML so English word order can differ.
// Anything missing stays Chinese and is collected in window.__i18nMissing (see tools/i18n-scan.cjs).
import { EN, EN_RULES } from './en.js';

const KEY = 'jn.lang';
const CJK = /[㐀-鿿！-～]/;
const NUM = /\$?\d+(?:\.\d+)?/g;
const INLINE = new Set(['B', 'I', 'EM', 'SMALL', 'BR', 'STRONG', 'U']);
const ATTRS = ['title', 'aria-label', 'placeholder'];

function pick() {
  try { const v = localStorage.getItem(KEY); if (v === 'zh' || v === 'en') return v; } catch (e) { /* storage unavailable */ }
  const n = (typeof navigator !== 'undefined' && (navigator.language || '')) || '';
  return /^zh/i.test(n) ? 'zh' : 'en';
}
export const lang = pick();
export const isEN = lang === 'en';

export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch (e) { /* storage unavailable */ }
  location.reload();
}

const missing = new Set();
const MISS = Symbol('miss');
if (typeof window !== 'undefined') window.__i18nMissing = missing;

// numbers out, placeholders in: returns [key, numbers]
function norm(s) {
  const nums = [];
  const key = s.replace(NUM, (m) => { nums.push(m); return '{#}'; });
  return [key, nums];
}
const fill = (en, nums) => { let i = 0; return en.replace(/\{#\}/g, () => (i < nums.length ? nums[i++] : '')); };

// one piece of text (already trimmed): exact entry, then rules, then split at separators and leading/trailing marks
const SEPS = ['\n', ' · ', '\u3000', '，', '；'];
const MARK = /^([♥✕⚑★▼▲←→·✔•🔒+\-]+\s*)(.+)$|^(.+?)(\s*[→✔！!]+)$/u;
function trCore(core, quiet) {
  const [key, nums] = norm(core);
  if (EN[key] != null) return fill(EN[key], nums);
  if (EN[core] != null) return EN[core];
  // a rule only counts when every piece it hands back translates (or has no Chinese in it)
  const sub = (x) => { if (!CJK.test(x)) return x; const r = trCore(x.trim(), true); if (r == null) throw MISS; return r; };
  for (const [re, out] of EN_RULES) {
    const m = core.match(re);
    if (!m) continue;
    try { return typeof out === 'function' ? out(m, sub) : core.replace(re, out); } catch (e) { if (e !== MISS) throw e; }
  }
  const mk = core.match(MARK);
  if (mk) {
    const inner = trCore((mk[2] || mk[3]).trim(), true);
    if (inner != null) return mk[1] ? mk[1] + inner : inner + (mk[4] === '！' ? '!' : mk[4]);
  }
  for (const sep of SEPS) {
    if (!core.includes(sep)) continue;
    const parts = core.split(sep).map((x) => (CJK.test(x) ? trCore(x.trim(), true) : x));
    if (parts.every((x) => x != null)) return parts.join(sep === '\u3000' ? '  ·  ' : sep === '，' ? ', ' : sep === '；' ? '; ' : sep);
  }
  if (!quiet) missing.add(key);
  return null;
}

// translate one string; returns null when there is nothing to do
export function tr(s) {
  if (!s || !CJK.test(s)) return null;
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
  const out = trCore(s.trim());
  return out == null ? null : lead + out + tail;
}

// a chunk of inline-only markup (a joker description, a guide paragraph) is translated in one go: an exact entry,
// else line by line at <br> through the same rules as plain text. Returns true when handled (translated, or recorded
// as missing whole rather than in fragments).
function trHTML(el) {
  for (const c of el.children) if (!INLINE.has(c.tagName) || c.attributes.length) return false;
  const html = el.innerHTML.trim();
  if (!CJK.test(html) || html.length > 1600) return false;
  const [key, nums] = norm(html);
  let out = EN[key] != null ? fill(EN[key], nums) : null;
  if (out == null) {
    const lines = html.split('<br>').map((l) => (CJK.test(l) ? trCore(l.trim(), true) : l));
    if (lines.every((l) => l != null)) out = lines.join('<br>');
  }
  if (out != null) { if (out !== html) el.innerHTML = out; return true; }
  missing.add(key);
  return true;
}

// what we wrote last, per node: our own writes come back through the observer and must not be translated again
const done = new WeakMap();
function walk(root) {
  if (root.nodeType === 3) {
    if (done.get(root) === root.nodeValue) return;
    const t = tr(root.nodeValue);
    if (t != null && t !== root.nodeValue) root.nodeValue = t;
    done.set(root, root.nodeValue);
    return;
  }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  for (const a of ATTRS) { const v = root.getAttribute(a); const t = tr(v); if (t != null && t !== v) root.setAttribute(a, t); }
  if (root.children.length && trHTML(root)) return;
  for (const n of [...root.childNodes]) walk(n);
}

export function startEnglish() {
  if (!isEN) return;
  document.documentElement.lang = 'en';
  const t = tr(document.title); if (t) document.title = t;
  walk(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') walk(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
