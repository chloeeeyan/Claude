// Lists every Chinese string the content tables can put on screen, as i18n keys (numbers → {#}).
// Usage: node tools/i18n-content.mjs > keys.txt
import * as G from '../src/core/index.js';
const out = new Set();
const NUM = /\$?\d+(?:\.\d+)?/g;
const CJK = /[㐀-鿿！-～]/;
const add = (s) => { if (typeof s === 'string' && CJK.test(s)) out.add(s.trim().replace(NUM, '{#}')); };
for (const j of G.JOKERS) { add(j.name); add(typeof j.desc === 'function' ? j.desc({ data: { n: 3 } }) : j.desc); add(typeof j.desc === 'function' ? j.desc(null) : ''); }
for (const s of G.SPECTATORS) { add(s.n); add(s.d); add(s.nd); s.say.forEach(add); }
for (const b of Object.values(G.BOSSES)) { add(b.n); add(b.d); }
for (const t of G.TAROTS) { add(t.name); add(t.desc); }
for (const o of [G.VOUCHERS, G.EDITIONS, G.ENH, G.SEALS, G.DECKS, G.TAGS]) for (const v of Object.values(o)) { add(v.n); add(v.d); }
for (const v of G.STAKES) { add(v.n); add(v.d); }
for (const h of Object.values(G.HANDS)) add(h.n);
for (const p of Object.values(G.PLANETS)) add(p);
for (const u of G.UNLOCKS) { add(u.n); add(u.need); }
G.HEAT.forEach((h) => add(h.n));
G.BLIND_NAMES.forEach(add);
Object.values(G.RARITY || {}).forEach(add);
Object.values(G.SNAME || {}).forEach(add);
add(G.VIP.say);
console.log([...out].join('\n'));
