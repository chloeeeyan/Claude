// A run's state machine: select → play ⇄ scoring → cashout → shop → select … → over / win.
// Every function takes the run state `st` and mutates it; nothing here touches the DOM.
import { SUITS, SO } from './cards.js';
import { BOSSES, DECKS, EDITIONS, ENH, HANDS, REWARD, STAKES, TAGS, TUNE, VOUCHERS, VOUCHER_PRICE } from './rules.js';
import { JD, JOKERS } from './jokers.js';
import { TAROTS, TD } from './tarots.js';
import { computeHand, curBoss, targetFor } from './scoring.js';
import { makeSeed, rand, rint, shuffle } from './rng.js';
import { rollCrowds, seatCrowd } from './audience.js';

export function pickBoss(st, prev, ante) {
  // the target-doubling wall waits until ante 3; the first ante gets no hand penalty
  const ks = Object.keys(BOSSES).filter((k) => k !== prev && !(k === 'wall' && ante < 3) && !(k === 'glass' && ante < 2) && !(BOSSES[k].minAnte > ante));
  return ks[rint(st, ks.length)];
}
export const rollTag = (st) => { const ks = Object.keys(TAGS); return ks[rint(st, ks.length)]; };

// ---- vouchers: one permanent upgrade on offer per ante
export const hasV = (st, k) => (st.vouchers || []).includes(k);
export function rollVoucher(st) {
  const ks = Object.keys(VOUCHERS).filter((k) => !hasV(st, k));
  return ks.length ? ks[rint(st, ks.length)] : null;
}
// jokers in the negative edition do not take a slot
export const usedSlots = (st) => st.jokers.filter((j) => j.ed !== 'negative').length;
export const sellJ = (j) => Math.max(1, Math.floor((JD[j.key].price + (j.ed ? EDITIONS[j.ed].add : 0)) / 2));
const handLimit = (st) => { const b = curBoss(st); return st.handSize + ((b && b.handDelta) || 0); };

export function newDeck(st, deckKey) {
  const d = [];
  let n = 0;
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ id: 'c' + n++, r, s, enh: null, seal: null });
  const k = DECKS[deckKey].enhStart;
  if (k) {
    const ks = Object.keys(ENH);
    shuffle(st, d.slice()).slice(0, k).forEach((c) => { c.enh = ks[rint(st, ks.length)]; });
  }
  return d;
}

export function freshState(deckKey = 'red', stake = 0, seed = makeSeed()) {
  if (!DECKS[deckKey]) deckKey = 'red';
  const D = DECKS[deckKey];
  const st = {
    seed, rng: seed >>> 0, phase: 'select', deckKey, stake, ante: 1, blindIdx: 0, bossKey: null, tags: [],
    money: 4 + (D.money || 0), hands: 4, discards: 3, handSize: 8, maxJokers: 5 + (D.slots || 0), maxCons: 2,
    roundScore: 0, target: 0, deckList: [], deck: [], hand: [], played: [], selected: [],
    jokers: [], cons: [], levels: Object.fromEntries(Object.keys(HANDS).map((k) => [k, 1])),
    daily: null, metaDone: false, vouchers: [], voucherOffer: null, roundTypes: [], crowds: null, audience: [], shop: null, pack: null, rerollCost: 5, pendingRare: false, sort: 'rank', inspect: null, cash: null, uid: 1, roundHands: 0,
    stats: { types: {}, total: 0, best: 0, bestType: null, earned: 0, tarots: 0, planets: 0, handsPlayed: 0, skipped: 0, wonOver: 0, ovations: 0 },
  };
  st.bossKey = pickBoss(st, null, 1);
  st.tags = [rollTag(st), rollTag(st)];
  st.deckList = newDeck(st, deckKey);
  st.voucherOffer = rollVoucher(st);
  st.crowds = rollCrowds(st);
  return st;
}

export function sortHand(st) {
  st.hand.sort(st.sort === 'suit' ? (a, b) => SO[a.s] - SO[b.s] || b.r - a.r : (a, b) => b.r - a.r || SO[a.s] - SO[b.s]);
}

// returns the ids of newly drawn cards (the UI animates them in)
export function draw(st) {
  const ids = [];
  while (st.hand.length < handLimit(st) && st.deck.length) { const c = st.deck.pop(); st.hand.push(c); ids.push(c.id); }
  sortHand(st);
  return ids;
}

export function startBlind(st) {
  const b = curBoss(st), D = DECKS[st.deckKey];
  st.target = targetFor(st, st.blindIdx);
  st.hands = b && b.oneHand ? 1 : Math.max(1, 4 + (D.hands || 0) + (hasV(st, 'hand') ? 1 : 0) + ((b && b.handsDelta) || 0));
  st.discards = b && b.noDiscard ? 0 : 3 + (D.disc || 0) + (hasV(st, 'disc') ? 1 : 0);
  if (b && b.tax) st.money -= Math.min(10, Math.floor(Math.max(0, st.money) / 2));
  st.deck = shuffle(st, st.deckList.map((c) => ({ ...c })));
  st.hand = []; st.played = []; st.selected = []; st.roundScore = 0; st.roundHands = 0; st.roundTypes = [];
  if (!st.crowds) st.crowds = rollCrowds(st);
  seatCrowd(st);
  st.phase = 'play';
  return draw(st);
}

// Moves the selected cards into play and scores them; the UI animates res.steps, then calls finishHand.
export function beginHand(st, ids) {
  const sel = new Set(ids);
  const played = st.hand.filter((c) => sel.has(c.id)), held = st.hand.filter((c) => !sel.has(c.id));
  const res = computeHand(st, played, held);
  st.hand = held; st.played = played; st.selected = []; st.hands--; st.roundHands++; st.phase = 'scoring';
  return res;
}

export function finishHand(st, res) {
  st.roundScore += res.total; st.money += res.money;
  const s = st.stats;
  s.handsPlayed++; s.total += res.total; s.earned += res.money; s.types[res.type] = (s.types[res.type] || 0) + 1;
  if (res.total > s.best) { s.best = res.total; s.bestType = res.type; }
  if (res.broken.length) {
    const b = new Set(res.broken); st.deckList = st.deckList.filter((c) => !b.has(c.id));
    for (const j of st.jokers) { const d = JD[j.key]; if (d.broke) d.broke(res.broken.length, j); }
  }
  // spectators won over stay won over for the rest of the show
  for (const i of res.sat || []) if (st.audience[i]) st.audience[i].ok = true;
  s.wonOver = (s.wonOver || 0) + (res.sat || []).length;
  if (res.ovation) s.ovations = (s.ovations || 0) + 1;
  // boss after-effects of a hand
  const boss = curBoss(st);
  if (!(st.roundTypes || (st.roundTypes = [])).includes(res.type)) st.roundTypes.push(res.type);
  if (boss && boss.arm) st.levels[res.type] = Math.max(1, st.levels[res.type] - 1);
  if (boss && boss.tooth) st.money = Math.max(0, st.money - boss.tooth * st.played.length);
  if (boss && boss.hook && st.hand.length) {
    shuffle(st, st.hand.map((c) => c.id)).slice(0, boss.hook).forEach((id) => { st.hand = st.hand.filter((c) => c.id !== id); });
  }
  st.played = [];
  let drawn = [];
  if (st.roundScore >= st.target) {
    if (st.ante === 8 && st.blindIdx === 2) st.phase = 'win';
    else { st.cash = cashLines(st); st.phase = 'cashout'; }
  } else if (st.hands <= 0 || (!st.hand.length && !st.deck.length)) st.phase = 'over';
  else { drawn = draw(st); st.phase = 'play'; }
  return drawn;
}

export function discardCards(st, ids) {
  const sel = new Set(ids);
  const gone = st.hand.filter((c) => sel.has(c.id));
  st.hand = st.hand.filter((c) => !sel.has(c.id)); st.selected = []; st.discards--;
  for (const j of st.jokers) { const d = JD[j.key]; if (d.discard) d.discard(gone, j, st); }
  return draw(st);
}

export function cashLines(st) {
  const S = STAKES[st.stake], lines = [];
  const rw = S.noSmall && st.blindIdx === 0 ? 0 : REWARD[st.blindIdx];
  if (rw) lines.push({ t: '演出成功', v: rw });
  if (st.hands > 0) lines.push({ t: `剩余出牌 ${st.hands} 次`, v: st.hands });
  const cap = (S.intCap != null ? S.intCap : 5) + (hasV(st, 'interest') ? 5 : 0), interest = Math.min(cap, Math.floor(st.money / 5));
  if (interest > 0) lines.push({ t: `利息（每 $5 得 $1，最多 $${cap}）`, v: interest });
  st.jokers.forEach((j, i) => {
    let k = i;
    while (st.jokers[k] && st.jokers[k].key === 'blueprint') k++;
    const s = st.jokers[k]; if (!s) return;
    const d = JD[s.key];
    if (d.money) { const v = d.money(s, st); if (v > 0) lines.push({ t: JD[j.key].name, v }); }
  });
  return lines;
}

export function cashOut(st) {
  const v = st.cash.reduce((a, l) => a + l.v, 0);
  st.money += v; st.stats.earned += v; st.cash = null; st.rerollCost = hasV(st, 'reroll') ? 3 : 5; st.shop = genShop(st); st.phase = 'shop';
  return v;
}

export const visibleHands = (st) => Object.keys(HANDS).filter((k) => !HANDS[k].secret || (st.stats.types || {})[k]);

export function genShop(st) {
  const owned = new Set(st.jokers.map((j) => j.key));
  const pool = JOKERS.filter((j) => !owned.has(j.key));
  const items = [];
  const take = (want) => {
    let cand = pool.filter((j) => j.r === want);
    if (!cand.length) cand = pool;
    if (!cand.length) return;
    const p = cand[rint(st, cand.length)];
    pool.splice(pool.indexOf(p), 1);
    // a small chance of a shiny edition, which costs a little more
    let ed = null, x = rand(st);
    for (const [k, E] of Object.entries(EDITIONS)) { if (x < E.p) { ed = k; break; } x -= E.p; }
    items.push({ kind: 'joker', key: p.key, price: p.price + (ed ? EDITIONS[ed].add : 0), ed });
  };
  for (let i = 0; i < TUNE.shopJokers + (hasV(st, 'shelf') ? 1 : 0); i++) { const r = rand(st); take(r < 0.08 ? 3 : r < 0.33 ? 2 : 1); }
  if (st.pendingRare) { take(3); st.pendingRare = false; }
  const hk = visibleHands(st);
  items.push({ kind: 'planet', key: hk[rint(st, hk.length)], price: 3 });
  items.push({ kind: 'tpack', price: 4, opts: shuffle(st, TAROTS.map((t) => t.key)).slice(0, 3) });
  if (TUNE.pack) items.push({ kind: 'pack', price: 4, opts: shuffle(st, hk.slice()).slice(0, 3) });
  if (st.voucherOffer) items.push({ kind: 'voucher', key: st.voucherOffer, price: VOUCHER_PRICE });
  return items;
}

// Star pack: st.pack = { kind: 'star', opts: [hand keys] } — pick one, it levels up.
export function choosePack(st, key) {
  if (!st.pack || st.pack.kind !== 'star' || !st.pack.opts.includes(key)) return '';
  st.levels[key]++; st.stats.planets++; st.pack = null;
  return `${HANDS[key].n}升到 ${st.levels[key]} 级`;
}

// Tarot pack: st.pack = { kind: 'tarot', opts: [3 tarot keys], cards: [6 deck card ids], pick, done }.
// Pick a tarot, then use it right away on the sample cards (selected in st.selected), or keep it for later.
export const PACK_CARDS = 6;
export const packCards = (st) => st.pack.cards.map((id) => st.deckList.find((c) => c.id === id)).filter(Boolean);

export function packPick(st, key) {
  const P = st.pack;
  if (!P || P.kind !== 'tarot' || P.done || !P.opts.includes(key)) return { err: '这张不能选' };
  P.pick = key; st.selected = [];
  if (TD[key].money) return packApply(st);
  return { msg: '' };
}

export function packApply(st) {
  const P = st.pack;
  if (!P || P.kind !== 'tarot' || P.done || !P.pick) return { err: '先挑一件道具' };
  const cards = packCards(st).filter((c) => st.selected.includes(c.id));
  const r = applyTarot(st, TD[P.pick], cards);
  if (r.err) return r;
  P.done = true; P.changed = cards.map((c) => c.id); st.selected = []; st.stats.tarots++;
  return r;
}

export function packKeep(st) {
  const P = st.pack;
  if (!P || P.kind !== 'tarot' || P.done || !P.pick) return { err: '先挑一件道具' };
  if (st.cons.length >= st.maxCons) return { err: '道具栏满了' };
  st.cons.push({ key: P.pick, uid: st.uid++ });
  const msg = `「${TD[P.pick].name}」收进了道具栏`;
  st.pack = null; st.selected = [];
  return { msg };
}

export function packClose(st) {
  if (!st.pack || st.pack.kind !== 'tarot') return false;
  st.pack = null; st.selected = [];
  return true;
}

export function buy(st, i) {
  const it = st.shop[i];
  if (!it || it.sold) return { err: '已经卖完了' };
  if (st.money < it.price) return { err: '钱不够' };
  let msg;
  if (it.kind === 'joker') {
    if (it.ed !== 'negative' && usedSlots(st) >= st.maxJokers) return { err: '演员栏满了，先请走一位' };
    st.jokers.push({ key: it.key, uid: st.uid++, data: {}, ...(it.ed ? { ed: it.ed } : {}) });
    msg = `招来了${it.ed ? EDITIONS[it.ed].n : ''}${JD[it.key].name}`;
  } else if (it.kind === 'voucher') {
    if (hasV(st, it.key)) return { err: '剧院已经做过这项改造了' };
    st.vouchers.push(it.key); st.voucherOffer = null;
    if (it.key === 'slot') st.maxJokers++;
    if (it.key === 'hsize') st.handSize++;
    if (it.key === 'cons') st.maxCons++;
    if (it.key === 'reroll') st.rerollCost = Math.max(1, st.rerollCost - 2);
    msg = `剧院改造「${VOUCHERS[it.key].n}」：${VOUCHERS[it.key].d}`;
  } else if (it.kind === 'planet') {
    st.levels[it.key]++; st.stats.planets++;
    msg = `${HANDS[it.key].n}升到 ${st.levels[it.key]} 级`;
  } else if (it.kind === 'pack') {
    if (st.pack) return { err: '先处理打开的卡包' };
    st.pack = { kind: 'star', opts: it.opts.slice() };
    msg = '打开了剧本包，选一本';
  } else if (it.kind === 'tpack') {
    if (st.pack) return { err: '先处理打开的卡包' };
    st.pack = { kind: 'tarot', opts: it.opts.slice(), cards: shuffle(st, st.deckList.map((c) => c.id)).slice(0, PACK_CARDS), pick: null, done: false };
    st.selected = [];
    msg = '打开了道具箱';
  } else {
    if (st.cons.length >= st.maxCons) return { err: '道具栏满了，先用掉或卖掉一件' };
    st.cons.push({ key: it.key, uid: st.uid++ });
    msg = `拿到道具「${TD[it.key].name}」`;
  }
  st.money -= it.price; it.sold = true;
  return { msg };
}

export function reroll(st) {
  if (st.money < st.rerollCost) return false;
  st.money -= st.rerollCost; st.rerollCost++; st.shop = genShop(st);
  return true;
}

export function nextBlind(st) {
  st.blindIdx++;
  if (st.blindIdx > 2) {
    st.blindIdx = 0; st.ante++;
    st.bossKey = pickBoss(st, st.bossKey, st.ante);
    st.tags = [rollTag(st), rollTag(st)];
    st.voucherOffer = rollVoucher(st);
    st.crowds = rollCrowds(st);
  }
  st.shop = null; st.phase = 'select';
}

function applyTag(st, key) {
  if (key === 'cash') { st.money += 8; st.stats.earned += 8; return '得到 $8'; }
  if (key === 'rare') { st.pendingRare = true; return '下次后台会多一位稀有演员'; }
  if (key === 'planet') {
    const ks = shuffle(st, visibleHands(st)).slice(0, 2);
    ks.forEach((k) => st.levels[k]++);
    return ks.map((k) => HANDS[k].n).join('、') + ' 各升 1 级';
  }
  if (key === 'tarot') {
    let n = 0;
    while (st.cons.length < st.maxCons && n < 2) { st.cons.push({ key: TAROTS[rint(st, TAROTS.length)].key, uid: st.uid++ }); n++; }
    return n ? `拿到 ${n} 件道具` : '道具栏已满，没有拿到';
  }
  return '';
}

export function skipBlind(st) {
  if (st.phase !== 'select' || st.blindIdx > 1) return '';
  const msg = applyTag(st, st.tags[st.blindIdx]);
  st.stats.skipped++; st.blindIdx++;
  return msg;
}

// Changes a card in the deck list and refreshes its copy in hand.
function mutate(st, id, fn) {
  const m = st.deckList.find((c) => c.id === id);
  if (!m) return;
  fn(m);
  const i = st.hand.findIndex((c) => c.id === id);
  if (i >= 0) st.hand[i] = { ...m };
}

// Applies tarot d to `cards` (copies from the hand or the deck list); shared by the tarot slot and the tarot pack.
function applyTarot(st, d, cards) {
  if (d.money) {
    const g = Math.min(20, st.money);
    st.money += g; st.stats.earned += g;
    return { msg: `得到 $${g}` };
  }
  if (cards.length < d.min || cards.length > d.max) return { err: `需要选中 ${d.min === d.max ? d.min : d.min + '–' + d.max} 张牌` };
  if (d.destroy) {
    const b = new Set(cards.map((c) => c.id));
    st.deckList = st.deckList.filter((c) => !b.has(c.id));
    st.hand = st.hand.filter((c) => !b.has(c.id));
    return { msg: `删除了 ${cards.length} 张牌` };
  }
  if (d.copy) {
    const [a, b] = cards;
    mutate(st, a.id, (c) => { c.r = b.r; c.s = b.s; c.enh = b.enh; c.seal = b.seal; });
    return { msg: '复制完成' };
  }
  const had = !!d.field && cards.some((c) => c[d.field]);
  cards.forEach((c) => mutate(st, c.id, d.apply));
  return { msg: `「${d.name}」已生效${had ? '，替换了原来的效果' : ''}` };
}

export function useTarot(st, uid, selIds) {
  const idx = st.cons.findIndex((c) => c.uid === uid);
  if (idx < 0) return { err: '找不到这张牌' };
  const d = TD[st.cons[idx].key];
  if (!d.money && st.phase !== 'play') return { err: '回合中才能对手牌使用' };
  const r = applyTarot(st, d, st.hand.filter((c) => selIds.includes(c.id)));
  if (r.err) return { err: r.err.replace('张牌', '张手牌') };
  if (!d.money) { st.selected = []; sortHand(st); }
  st.cons.splice(idx, 1); st.stats.tarots++;
  return r;
}
