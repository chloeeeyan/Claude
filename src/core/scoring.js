// Blind targets, hand levels and the scoring pipeline.
import { chipVal, isFace } from './cards.js';
import { ANTE, BOSSES, EDITIONS, HANDS, STAKES } from './rules.js';
import { JD, hasJ } from './jokers.js';
import { evaluate } from './evaluate.js';
import { rand } from './rng.js';

export const curBoss = (st) => (st.blindIdx === 2 ? BOSSES[st.bossKey] : null);
export const debuffed = (st, c) => { const b = curBoss(st); return !!(b && b.deb && b.deb(c)); };

export function targetFor(st, i) {
  const b = i === 2 ? BOSSES[st.bossKey] : null;
  return Math.round((ANTE[st.ante - 1] * [1, 1.5, 2][i] * ((b && b.targetMult) || 1) * STAKES[st.stake].tm) / 10) * 10;
}

export function handBase(st, t) {
  const h = HANDS[t], l = st.levels[t];
  let c = h.c + h.dc * (l - 1), m = h.m + h.dm * (l - 1);
  const b = curBoss(st);
  if (b && b.halve && ['play', 'scoring'].includes(st.phase)) { c = Math.ceil(c / 2); m = Math.max(1, Math.ceil(m / 2)); }
  return { c, m };
}

// Scores a hand. Call before the hand leaves st.hand and before st.hands is decremented.
// With {preview:true} nothing in state changes and no randomness is consumed.
// Returns the ordered `steps` the UI animates, plus totals and any glass cards that broke.
export function computeHand(st, played, held, opt = {}) {
  const preview = !!opt.preview;
  const ev = evaluate(played, { four: hasJ(st, 'fourf'), splash: hasJ(st, 'splash') });
  const base = handBase(st, ev.type);
  // bosses that void a whole hand: it scores nothing, but still costs the hand
  const boss = curBoss(st), seen = st.roundTypes || [];
  const voidWhy = !boss ? '' : boss.min5 && played.length < 5 ? '要 5 张' : boss.noRepeat && seen.includes(ev.type) ? '牌型重复'
    : boss.oneType && seen.length && !seen.includes(ev.type) ? '不是第一种牌型' : '';
  if (voidWhy) {
    return { type: ev.type, scoring: ev.scoring, base, steps: [{ at: 'card', id: played[0].id, text: voidWhy, cls: 'dead' }], chips: 0, mult: 0, money: 0, total: 0, broken: [], voided: voidWhy };
  }
  const S = { chips: base.c, mult: base.m, money: 0 };
  const steps = [];
  const jokers = st.jokers.map((j) => (preview ? { ...j, data: { ...j.data } } : j));
  const ctx = {
    st, type: ev.type, contains: ev.contains, played, scoring: ev.scoring,
    live: ev.scoring.filter((c) => !debuffed(st, c)), held,
    handsAfter: st.hands - 1, discards: st.discards, money: st.money, deckLen: st.deck.length,
    jokerCount: st.jokers.length, deckList: st.deckList, first: st.roundHands === 0, preview,
  };
  for (const j of jokers) { const d = JD[j.key]; if (d.before) d.before(ctx, j); }

  // 蓝图 copies the first non-blueprint joker to its right
  const src = (i) => { let k = i, g = 0; while (jokers[k] && jokers[k].key === 'blueprint') { k++; if (++g > 8) return null; } return jokers[k] || null; };
  const push = (s) => {
    if (s.chips) S.chips += s.chips;
    if (s.mult) S.mult += s.mult;
    if (s.xmult) S.mult *= s.xmult;
    if (s.money) S.money += s.money;
    s.after = { chips: S.chips, mult: S.mult };
    steps.push(s);
  };
  const mirrors = jokers.filter((j) => j.key === 'mirror').length;
  const echoes = 2 * jokers.filter((j) => j.key === 'echo').length;
  const firstLive = ctx.live[0];

  for (const c of ev.scoring) {
    if (debuffed(st, c)) { steps.push({ at: 'card', id: c.id, text: '失效', cls: 'dead' }); continue; }
    const times = 1 + (c.seal === 'red' ? 1 : 0) + (isFace(c.r) ? mirrors : 0) + (c === firstLive ? echoes : 0);
    for (let t = 0; t < times; t++) {
      if (t > 0) steps.push({ at: 'card', id: c.id, text: '再触发', cls: 'retrig' });
      push({ at: 'card', id: c.id, chips: chipVal(c.r) + (c.enh === 'bonus' ? 30 : 0) + (c.pc || 0) });
      if (c.enh === 'mult') push({ at: 'card', id: c.id, mult: 4 });
      if (c.enh === 'glass') push({ at: 'card', id: c.id, xmult: 2 });
      if (c.seal === 'gold') push({ at: 'card', id: c.id, money: 3 });
      jokers.forEach((j, i) => {
        const s = src(i); if (!s) return;
        const d = JD[s.key];
        if (d.card) { const e = d.card(ctx, c, s); if (e) push({ at: 'joker', uid: j.uid, card: c.id, ...e }); }
      });
    }
  }
  for (const c of held) {
    if (debuffed(st, c)) continue;
    if (c.enh === 'steel') push({ at: 'held', id: c.id, xmult: 1.5 });
    jokers.forEach((j, i) => {
      const s = src(i); if (!s) return;
      const d = JD[s.key];
      if (d.held) { const e = d.held(ctx, c, s); if (e) push({ at: 'held', id: c.id, ...e }); }
    });
  }
  // per joker, left to right: foil / holo edition, its own effect, then a polychrome ×1.5
  jokers.forEach((j, i) => {
    const E = j.ed && EDITIONS[j.ed];
    if (E && (E.chips || E.mult)) push({ at: 'joker', uid: j.uid, chips: E.chips, mult: E.mult });
    const s = src(i);
    if (s) {
      const d = JD[s.key];
      if (d.hand) { const e = d.hand(ctx, s); if (e) push({ at: 'joker', uid: j.uid, ...e }); }
    }
    if (E && E.xmult) push({ at: 'joker', uid: j.uid, xmult: E.xmult });
  });

  const broken = preview ? [] : ctx.live.filter((c) => c.enh === 'glass' && rand(st) < 0.25).map((c) => c.id);
  return { type: ev.type, scoring: ev.scoring, base, steps, chips: S.chips, mult: S.mult, money: S.money, total: Math.floor(S.chips * S.mult), broken };
}
