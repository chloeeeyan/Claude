// Balance simulator: a greedy bot plays N seeded runs and reports how far it gets.
// Usage: npm run sim -- n=400 deck=red stake=0 tarot=1 aud=1 read=1 tip=0.1 hw=0.5 heat=0.5,1,1.5,2 ante=300,700,...
import * as G from '../src/core/index.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const N = Number(args.n || 300);
const deck = args.deck || 'red';
const stake = Number(args.stake || 0);
const useTarots = args.tarot !== '0';
const discardBias = Number(args.agg || 1.15); // discard when best × hands left < need × bias
const audience = args.aud !== '0'; // aud=0: empty seats, to measure what the audience adds
const readRoom = args.read !== '0'; // read=0: ignore cash tips when picking a hand (the old bot)
const tipWeight = Number(args.tip || 0.1); // $1 is worth this share of the score still needed per hand
const heatWeight = Number(args.hw || 0.5); // one step of heat is worth this share of it (it scales the hands to come)
if (args.ante) args.ante.split(',').map(Number).forEach((v, i) => { G.ANTE[i] = v; });
if (args.heat) args.heat.split(',').map(Number).forEach((v, i) => { G.HEAT[i].x = v; }); // e.g. heat=0.5,1,1.5,2

// all 1–5 card subsets of an n-card hand, cached by n
const SUBSETS = {};
function subsets(n) {
  if (SUBSETS[n]) return SUBSETS[n];
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push(cur.slice());
    if (cur.length === 5) return;
    for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return (SUBSETS[n] = out);
}

// Reads the room: a hand's value is its score plus the cash it brings (spectator tips, ovation, gold seals),
// with $1 worth a slice of the score still needed per hand, plus the heat it leaves for the hands to come.
// A hand that clears the show takes the most cash.
function bestPlay(st) {
  const need = st.target - st.roundScore, perHand = need / Math.max(1, st.hands);
  let top = null, pick = null;
  for (const s of subsets(st.hand.length)) {
    const played = s.map((i) => st.hand[i]);
    const held = st.hand.filter((_, i) => !s.includes(i));
    const r = G.computeHand(st, played, held, { preview: true });
    const c = { total: r.total, money: r.money, heat: r.heat, ids: played.map((k) => k.id), scoring: new Set(r.scoring.map((k) => k.id)) };
    c.u = !readRoom ? c.total : c.total >= need ? need * 10 + c.money * need + c.total / 1e6 : c.total + (c.money * tipWeight + (c.heat - st.heat) * heatWeight) * perHand;
    if (!top || c.total > top.total) top = c;
    if (!pick || c.u > pick.u) pick = c;
  }
  return { ...pick, max: top.total, maxScoring: top.scoring };
}

function chooseDiscard(st, best) {
  for (const s of G.SUITS) { // chase a flush when four of a suit are in hand
    const m = st.hand.filter((c) => G.suitIs(c, s));
    if (m.length === 4) return st.hand.filter((c) => !G.suitIs(c, s)).sort((a, b) => a.r - b.r).slice(0, 5).map((c) => c.id);
  }
  return st.hand.filter((c) => !best.maxScoring.has(c.id)).sort((a, b) => a.r - b.r).slice(0, 5).map((c) => c.id);
}

const XMULT = new Set(['last', 'family', 'royal', 'duo', 'trio', 'palette', 'first', 'fullseat', 'smith', 'mono', 'rainbow', 'crown', 'regent',
  'solo', 'glassblow', 'blush', 'quad', 'tower', 'twin', 'gambler', 'claque']);
const orderJokers = (st) => st.jokers.sort((a, b) => (XMULT.has(a.key) ? 1 : 0) - (XMULT.has(b.key) ? 1 : 0));

function useTarotsGreedy(st) {
  if (!useTarots) return;
  for (const c of st.cons.slice()) {
    const d = G.TD[c.key];
    if (d.money) { G.useTarot(st, c.uid, []); continue; }
    if (st.phase !== 'play' || d.copy) continue;
    const byRank = [...st.hand].sort((a, b) => b.r - a.r);
    let pick;
    if (d.destroy) pick = [...st.hand].sort((a, b) => a.r - b.r);
    else if (/^t[HSCD]$/.test(c.key)) pick = st.hand.filter((k) => k.s !== c.key[1]);
    else pick = byRank.filter((k) => !k.enh && !k.seal);
    pick = pick.slice(0, d.max);
    if (pick.length >= d.min) G.useTarot(st, c.uid, pick.map((k) => k.id));
  }
}

function shop(st) {
  let fav = Object.entries(st.stats.types).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  if (!fav.length) fav = ['pair', 'two'];
  for (let pass = 0; pass < 2; pass++) {
    st.shop.forEach((it, i) => {
      if (it.sold || st.money < it.price) return;
      if (it.kind === 'joker') {
        const d = G.JD[it.key];
        if (it.ed !== 'negative' && G.usedSlots(st) >= st.maxJokers) {
          const worst = st.jokers.map((j, k) => [G.JD[j.key], k, j]).filter((x) => x[2].ed !== 'negative')
            .sort((a, b) => a[0].r - b[0].r || a[0].price - b[0].price)[0];
          if (!worst || worst[0].r >= d.r || st.money + G.sellJ(worst[2]) < it.price) return;
          st.money += G.sellJ(worst[2]);
          st.jokers.splice(worst[1], 1);
        }
        G.buy(st, i);
      } else if (it.kind === 'planet') {
        if (fav.slice(0, 2).includes(it.key) && st.money >= it.price + 2) G.buy(st, i);
      } else if (it.kind === 'pack') {
        if (st.money >= it.price + 2) {
          G.buy(st, i);
          const o = st.pack.opts;
          G.choosePack(st, o.find((x) => fav.slice(0, 2).includes(x)) || o.find((x) => fav.includes(x)) || o[0]);
        }
      } else if (it.kind === 'voucher') {
        if (pass === 1 && st.money >= it.price + 5) G.buy(st, i);
      } else if (it.kind === 'tpack') {
        // keep the first tarot the in-round greedy logic knows how to use
        if (!useTarots || st.money < it.price + 4 || st.cons.length >= st.maxCons) return;
        G.buy(st, i);
        const k = st.pack.opts.find((x) => G.TD[x].money) || st.pack.opts.find((x) => !G.TD[x].copy);
        if (k && G.TD[k].money) G.packPick(st, k); else if (k) { G.packPick(st, k); G.packKeep(st); }
        G.packClose(st);
      }
    });
  }
  orderJokers(st);
}

function runOne(seed) {
  const st = G.freshState(deck, stake, seed);
  for (let guard = 0; guard < 5000; guard++) {
    if (st.phase === 'select') { G.startBlind(st); if (!audience) st.audience = []; }
    else if (st.phase === 'play') {
      useTarotsGreedy(st);
      const best = bestPlay(st), need = st.target - st.roundScore;
      if (best.max < need && st.discards > 0 && best.max * st.hands < need * discardBias) {
        const ids = chooseDiscard(st, best);
        if (ids.length) { G.discardCards(st, ids); continue; }
      }
      G.finishHand(st, G.beginHand(st, best.ids));
      if (st.audience.length) { crowd.hands++; crowd.heat += st.heat; if (st.heat === 0) crowd.cold++; }
    } else if (st.phase === 'cashout') {
      const won = st.audience.filter((a) => a.ok).length;
      if (st.audience.length) { crowd.shows++; crowd.won += won; if (won === st.audience.length) crowd.ovations++; }
      G.cashOut(st); shop(st);
    }
    else if (st.phase === 'shop') G.nextBlind(st);
    else break;
  }
  return st;
}

const crowd = { shows: 0, won: 0, ovations: 0, hands: 0, heat: 0, cold: 0 }; // shows: cleared only; hands: every hand played
const died = Array(10).fill(0);
let wins = 0;
const t0 = Date.now();
for (let i = 1; i <= N; i++) {
  const st = runOne(i);
  if (st.phase === 'win') wins++; else died[st.ante]++;
}
console.log(`deck=${deck} stake=${stake} tarot=${useTarots} aud=${audience} read=${readRoom} n=${N} ante=[${G.ANTE}] heat=[${G.HEAT.map((h) => h.x)}] ${((Date.now() - t0) / 1000).toFixed(1)}s`);
let alive = N;
for (let a = 1; a <= 8; a++) {
  console.log(`  ante ${a}: entered ${((alive / N) * 100).toFixed(0)}%  lost here ${died[a]}`);
  alive -= died[a];
}
if (crowd.shows) console.log(`  crowd: ${(crowd.won / crowd.shows).toFixed(2)}/3 won per cleared show, ovation ${((crowd.ovations / crowd.shows) * 100).toFixed(0)}%, heat after a hand ${(crowd.heat / crowd.hands).toFixed(2)}, 冷场 ${((crowd.cold / crowd.hands) * 100).toFixed(0)}%`);
console.log(`  WIN ${((wins / N) * 100).toFixed(1)}%`);
