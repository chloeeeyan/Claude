import { describe, expect, it } from 'vitest';
import * as G from '../src/core/index.js';
import { EN } from '../src/i18n/en.js';
import { tr } from '../src/i18n/index.js';

const NUM = /\$?\d+(?:\.\d+)?/g;
const key = (s) => s.trim().replace(NUM, '{#}');

describe('English', () => {
  it('has every content string the tables can show', () => {
    const missing = [];
    const need = (s) => { if (typeof s === 'string' && /[一-鿿]/.test(s) && EN[key(s)] == null) missing.push(s); };
    for (const j of G.JOKERS) { need(j.name); need(typeof j.desc === 'function' ? j.desc({ data: { n: 3 } }) : j.desc); }
    for (const s of G.SPECTATORS) { need(s.n); need(s.d); need(s.nd); s.say.forEach(need); }
    for (const b of Object.values(G.BOSSES)) { need(b.n); need(b.d); }
    for (const t of G.TAROTS) { need(t.name); need(t.desc); }
    for (const o of [G.VOUCHERS, G.EDITIONS, G.ENH, G.SEALS, G.DECKS, G.TAGS]) for (const v of Object.values(o)) { need(v.n); need(v.d); }
    for (const v of G.STAKES) { need(v.n); need(v.d); }
    Object.values(G.HANDS).forEach((h) => need(h.n));
    Object.values(G.PLANETS).forEach(need);
    G.HEAT.forEach((h) => need(h.n));
    expect(missing).toEqual([]);
  });

  it('translates numbers through placeholders, composites piece by piece, and card names by rule', () => {
    expect(tr('第 3 期 · 共 8 期')).toBe('Episode 3 of 8');
    expect(tr('♥ 出牌含对子')).toBe('♥ A Pair');
    expect(tr('黑桃Q')).toBe('Q of Spades');
    expect(tr('成双控　喜欢：出牌含对子（打赏 $1）　讨厌：出高牌')).toBe('Pair Fan  ·  Likes: A Pair (tip $1)  ·  Hates: High Card');
    expect(tr('no Chinese here')).toBeNull();
  });
});
