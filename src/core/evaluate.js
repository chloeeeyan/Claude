// Poker hand recognition. Returns the best hand type, every hand type it contains
// (for "contains a pair" style jokers) and which played cards score.
import { SUITS, suitIs } from './cards.js';

// o.four: flushes/straights need only 4 cards (四指)   o.splash: every played card scores (泼墨)
export function evaluate(cards, o = {}) {
  const n = cards.length, need = o.four ? 4 : 5;
  const groups = Object.values(cards.reduce((g, c) => ((g[c.r] = g[c.r] || []).push(c), g), {}))
    .sort((a, b) => b.length - a.length || b[0].r - a[0].r);

  let flushCards = null;
  if (n >= need) {
    for (const s of SUITS) {
      const m = cards.filter((c) => suitIs(c, s));
      if (m.length >= need && (!flushCards || m.length > flushCards.length)) flushCards = m;
    }
  }

  let straightCards = null;
  if (n >= need) {
    const byR = {};
    cards.forEach((c) => { if (!byR[c.r]) byR[c.r] = c; });
    const at = (r) => byR[r === 1 ? 14 : r]; // ace plays low in A-2-3-4-5
    for (const len of need === 4 ? [5, 4] : [5]) {
      if (straightCards) break;
      for (let hi = 14; hi >= len; hi--) {
        const pick = [];
        let ok = true;
        for (let r = hi - len + 1; r <= hi; r++) { const c = at(r); if (!c) { ok = false; break; } pick.push(c); }
        if (ok) { straightCards = pick; break; }
      }
    }
  }

  const flush = !!flushCards, straight = !!straightCards;
  const g0 = groups[0] ? groups[0].length : 0, g1 = groups[1] ? groups[1].length : 0;
  let type, scoring;
  if (g0 === 5 && flush) { type = 'flush5'; scoring = cards; }
  else if (g0 === 3 && g1 >= 2 && flush) { type = 'flushfull'; scoring = cards; }
  else if (g0 === 5) { type = 'five'; scoring = groups[0]; }
  else if (straight && flush) { type = 'sflush'; scoring = [...new Set([...straightCards, ...flushCards])]; }
  else if (g0 === 4) { type = 'four'; scoring = groups[0]; }
  else if (g0 === 3 && g1 >= 2) { type = 'full'; scoring = [...groups[0], ...groups[1]]; }
  else if (flush) { type = 'flush'; scoring = flushCards; }
  else if (straight) { type = 'straight'; scoring = straightCards; }
  else if (g0 === 3) { type = 'three'; scoring = groups[0]; }
  else if (g0 === 2 && g1 === 2) { type = 'two'; scoring = [...groups[0], ...groups[1]]; }
  else if (g0 === 2) { type = 'pair'; scoring = groups[0]; }
  else { type = 'high'; scoring = [groups[0][0]]; }

  const contains = new Set([type]);
  if (g0 >= 2) contains.add('pair');
  if (g0 >= 3) contains.add('three');
  if (g0 >= 4) contains.add('four');
  if (g0 >= 3 && g1 >= 2) contains.add('full');
  if (g0 >= 2 && g1 >= 2) contains.add('two');
  if (straight) contains.add('straight');
  if (flush) contains.add('flush');
  if (o.splash) scoring = cards;

  const set = new Set(scoring);
  return { type, contains, scoring: cards.filter((c) => set.has(c)) }; // keep played order
}
