// Progress kept across runs: unlocks, the collection and the daily challenge. Plain functions over a plain object;
// the UI loads and saves it (localStorage key jn.meta). No DOM, no Math.random.
import { DECKS } from './rules.js';
import { JOKERS } from './jokers.js';

export const META_VERSION = 1;

export const emptyMeta = () => ({
  v: META_VERSION, runs: 0, wins: 0, bestAnte: 0, stakeBest: {}, tarots: 0, hands: 0, bestHand: 0,
  seenJ: [], ownedJ: [], usedT: [], bossesBeat: [], unlocked: ['deck:red', 'deck:blue', 'stake:0'], daily: {},
});

// What a new player starts without, and what opens it. Checked whenever a run ends.
export const UNLOCKS = [
  { id: 'deck:gold', n: '金色牌组', need: '任意一局撑到第 3 期', ok: (m) => m.bestAnte >= 3 },
  { id: 'deck:paint', n: '彩绘牌组', need: '累计用掉 10 件道具', ok: (m) => m.tarots >= 10 },
  { id: 'deck:black', n: '黑色牌组', need: '任意一局撑到第 6 期', ok: (m) => m.bestAnte >= 6 },
  { id: 'stake:1', n: '困难难度', need: '普通难度撑到第 5 期', ok: (m) => (m.stakeBest[0] || 0) >= 5 },
  { id: 'stake:2', n: '噩梦难度', need: '困难难度撑到第 5 期', ok: (m) => (m.stakeBest[1] || 0) >= 5 },
];
export const UNLOCK = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));
export const isUnlocked = (m, id) => m.unlocked.includes(id);

export function checkUnlocks(m) {
  const fresh = UNLOCKS.filter((u) => !m.unlocked.includes(u.id) && u.ok(m));
  fresh.forEach((u) => m.unlocked.push(u.id));
  return fresh;
}

const addAll = (list, keys) => { for (const k of keys) if (k && !list.includes(k)) list.push(k); };
export const noteSeen = (m, keys) => addAll(m.seenJ, keys);
export const noteOwned = (m, key) => { addAll(m.seenJ, [key]); addAll(m.ownedJ, [key]); };
export const noteTarot = (m, key) => addAll(m.usedT, [key]);
export const noteBoss = (m, key) => addAll(m.bossesBeat, [key]);

// Folds a finished (or abandoned) run into the totals once; returns the unlocks it earned.
export function recordRun(m, st) {
  if (st.metaDone || st.phase === 'menu') return [];
  st.metaDone = true;
  const won = st.phase === 'win', reach = won ? 9 : st.ante;
  m.runs++; if (won) m.wins++;
  m.bestAnte = Math.max(m.bestAnte, Math.min(reach, 8));
  m.stakeBest[st.stake] = Math.max(m.stakeBest[st.stake] || 0, reach);
  m.tarots += st.stats.tarots || 0;
  m.hands += st.stats.handsPlayed || 0;
  m.bestHand = Math.max(m.bestHand, st.stats.best || 0);
  addAll(m.ownedJ, st.jokers.map((j) => j.key));
  if (st.daily) {
    const prev = m.daily[st.daily], cur = { ante: reach, score: st.stats.total || 0, deck: st.deckKey, tries: ((prev && prev.tries) || 0) + 1 };
    m.daily[st.daily] = prev && (prev.ante > cur.ante || (prev.ante === cur.ante && prev.score >= cur.score)) ? { ...prev, tries: cur.tries } : cur;
  }
  return checkUnlocks(m);
}

// Older saves and hand-edited storage: fill in whatever is missing.
export function normalizeMeta(m) {
  const base = emptyMeta();
  if (!m || typeof m !== 'object') return base;
  for (const k of Object.keys(base)) if (m[k] == null || typeof m[k] !== typeof base[k]) m[k] = base[k];
  for (const id of base.unlocked) if (!m.unlocked.includes(id)) m.unlocked.push(id);
  return m;
}

// Players from before unlocks existed had every deck and stake; keep it that way.
export const grandfather = (m) => { addAll(m.unlocked, UNLOCKS.map((u) => u.id)); return m; };

// ---- daily challenge: same seed, deck and rules for everyone on a given (local) date
export const dailyKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dailySetup(key) {
  let h = 2166136261;
  for (const ch of 'joker-night:' + key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const seed = h >>> 0, decks = Object.keys(DECKS);
  const day = Math.floor(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 864e5);
  return { seed, deck: decks[day % decks.length], stake: 0 };
}

export const JOKER_COUNT = JOKERS.length;
