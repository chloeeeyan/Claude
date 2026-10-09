// Blind targets, hand levels and the scoring pipeline.
import { chipVal, isFace } from './cards.js';
import { ANTE, BLIND_X, BOSSES, EDITIONS, HANDS, STAKES } from './rules.js';
import { JD, hasJ } from './jokers.js';
import { evaluate } from './evaluate.js';
import { HEAT, HEAT_START, OVATION_TIP, SPEC, VIP, isRegular, tipOf } from './audience.js';
import { rand } from './rng.js';

export const curBoss = (st) => (st.blindIdx === 2 ? BOSSES[st.bossKey] : null);
// the guest's rule while it still holds: winning the VIP over lifts it
export const vipWon = (st) => (st.audience || []).some((a) => a.vip && a.ok);
export const bossRule = (st) => (vipWon(st) ? null : curBoss(st));
export const debuffed = (st, c) => { const b = bossRule(st); return !!(b && b.deb && b.deb(c)); };

export function targetFor(st, i) {
  const b = i === 2 ? BOSSES[st.bossKey] : null;
  return Math.round((ANTE[st.ante - 1] * BLIND_X[i] * ((b && b.targetMult) || 1) * STAKES[st.stake].tm) / 10) * 10;
}

export function handBase(st, t) {
  const h = HANDS[t], l = st.levels[t];
  let c = h.c + h.dc * (l - 1), m = h.m + h.dm * (l - 1);
  const b = bossRule(st);
  if (b && b.halve && ['play', 'scoring'].includes(st.phase)) { c = Math.ceil(c / 2); m = Math.max(1, Math.ceil(m / 2)); }
  return { c, m };
}

// Scores a hand. Call before the hand leaves st.hand and before st.hands is decremented.
// With {preview:true} nothing in state changes and no randomness is consumed.
// Returns the ordered `steps` the UI animates, plus totals and any glass cards that broke.
export function computeHand(st, played, held, opt = {}) {
  const preview = !!opt.preview;
  const ev = evaluate(played, { four: hasJ(st, 'fourf') });
  const base = handBase(st, ev.type);
  // bosses that void a whole hand: it scores nothing, but still costs the hand
  const boss = bossRule(st), seen = st.roundTypes || [];
  const voidWhy = !boss ? '' : boss.min5 && played.length < 5 ? '要 5 张' : boss.noRepeat && seen.includes(ev.type) ? '牌型重复'
    : boss.oneType && seen.length && !seen.includes(ev.type) ? '不是第一种牌型' : '';
  if (voidWhy) {
    return { type: ev.type, scoring: ev.scoring, base, steps: [{ at: 'card', id: played[0].id, text: voidWhy, cls: 'dead' }], chips: 0, mult: 0, money: 0, total: 0, broken: [], sat: [], ovation: false, voided: voidWhy, heat: st.heat ?? HEAT_START, boos: [] };
  }
  const S = { chips: base.c, mult: base.m, money: 0 };
  const steps = [];
  const jokers = st.jokers.map((j) => (preview ? { ...j, data: { ...j.data } } : j));
  const ctx = {
    st, type: ev.type, contains: ev.contains, played, scoring: ev.scoring,
    live: ev.scoring.filter((c) => !debuffed(st, c)), held,
    handsAfter: st.hands - 1, discards: st.discards, money: st.money, deckLen: st.deck.length,
    jokerCount: st.jokers.length, deckList: st.deckList, first: st.roundHands === 0, preview,
    audOk: (st.audience || []).filter((a) => a.ok && !a.vip).length, audN: (st.audience || []).filter((a) => !a.vip).length,
    heat: st.heat ?? HEAT_START,
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

  // the audience: every spectator this hand wins over tips now (経纪人 doubles cash tips, 返场 repeats ×mult tips)
  const aud = st.audience || [], sat = [], boos = [];
  let ovation = false, heat = st.heat ?? HEAT_START;
  if (aud.length) {
    const actx = { ...ctx, total: Math.floor(S.chips * S.mult), target: st.target, roundTypes: st.roundTypes || [], lastType: st.lastType || null };
    const agent = hasJ(st, 'agent') ? 2 : 1, encore = hasJ(st, 'encore') ? 2 : 1;
    let fans = 0, won = 0;
    aud.forEach((a, i) => {
      const sp = SPEC[a.key];
      if (!sp) return;
      const likes = sp.ok(actx);
      // the VIP stands apart from the room's mood: no heat, no boos, not needed for the ovation
      if (likes && !a.vip) fans++;
      else if (!likes && !a.vip && sp.no(actx)) boos.push(i);
      if (a.ok || !likes) return;
      sat.push(i);
      if (!a.vip) won++;
      if (a.vip) { push({ at: 'aud', i, money: VIP.tip * agent, say: VIP.say, lift: true }); return; }
      const tip = tipOf(st, sp);
      if (tip.money) push({ at: 'aud', i, money: tip.money * agent, say: sp.say[0] });
      for (let t = 0; tip.xmult && t < encore; t++) push({ at: 'aud', i, xmult: tip.xmult, say: t ? '' : sp.say[0] });
    });
    if (sat.some((i) => !aud[i].vip) && aud.every((a, i) => a.vip || a.ok || sat.includes(i))) {
      ovation = true;
      push({ at: 'aud', i: -1, money: OVATION_TIP * agent, ovation: true });
    }
    // heat: up if anyone liked the hand, down if nobody did, down again per boo; then the whole hand is scaled by it.
    // Cast members bend it: 罐头笑声 (nobody liking it costs nothing), 保镖 (boos cost nothing), 暖场歌手 (+1 on the show's
    // first hand), 暖场主持 (never below 暖场)
    for (const i of boos) steps.push({ at: 'aud', i, text: '嘘！', cls: 'boo', say: SPEC[aud[i].key].say[1] });
    const top = HEAT.length - 1, before = heat;
    let d = fans ? 1 : hasJ(st, 'twoM') ? 0 : -1;
    if (!hasJ(st, 'splash')) d -= boos.length;
    if (ctx.first && hasJ(st, 'twoC')) d += 1;
    heat = ovation ? top : Math.max(hasJ(st, 'pairM') ? 1 : 0, Math.min(top, heat + d));
    // cast members that play off the room's reaction
    const cctx = { ...ctx, fans, boos: boos.length, won, heat: before, newHeat: heat, regulars: aud.filter((a) => !a.vip && isRegular(st, a.key)).length };
    jokers.forEach((j, i) => {
      const s = src(i); if (!s) return;
      const dj = JD[s.key];
      if (dj.crowd) { const e = dj.crowd(cctx, s); if (e) push({ at: 'joker', uid: j.uid, ...e }); }
    });
    push({ at: 'heat', heat, xmult: HEAT[heat].x });
  }

  const broken = preview ? [] : ctx.live.filter((c) => c.enh === 'glass' && rand(st) < 0.25).map((c) => c.id);
  return { type: ev.type, scoring: ev.scoring, base, steps, chips: S.chips, mult: S.mult, money: S.money, total: Math.floor(S.chips * S.mult), broken, sat, ovation, heat, boos };
}
