// UI-side state: the current run plus per-player preferences kept in localStorage.
// `state` is a live binding — modules read it directly and replace it through setState().
import {
  HANDS, emptyMeta, grandfather, isUnlocked, noteBoss, noteOwned, noteSeen, normalizeMeta, packSave, recordRun, unpackSave,
} from '../core/index.js';

const KEYS = {
  run: 'jn.run', records: 'jn.records', last: 'jn.last', tips: 'jn.tips',
  prefs: 'jn.prefs', speed: 'jn.speed', sound: 'jn.sound', tutorial: 'jn.tutorial', tutor: 'jn.tutor', meta: 'jn.meta', tele: 'jn.tele',
};

// localStorage can be missing or throw (private mode, blocked storage); every access is guarded
export const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(KEYS[key]); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(KEYS[key], JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  },
  getRaw(key) { try { return localStorage.getItem(KEYS[key]); } catch (e) { return null; } },
  setRaw(key, value) { try { localStorage.setItem(KEYS[key], value); } catch (e) { /* storage unavailable */ } },
};

export let state = null;
export function setState(s) { state = s; }

const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ui = {
  speed: storage.get('speed', reducedMotion ? 4 : 1),
  justDrawn: new Set(),          // card ids that should play the deal-in animation on next render
  tipsSeen: storage.get('tips', []),
  prefs: storage.get('prefs', {}),
  newUnlocks: [],                // shown on the game-over / win screen of the run that earned them
};

// Cross-run progress (unlocks, collection, daily results). Players who were here before unlocks keep everything.
function loadMeta() {
  const m = storage.get('meta', null);
  if (m) return normalizeMeta(m);
  const fresh = emptyMeta();
  return storage.getRaw('records') || storage.getRaw('last') ? grandfather(fresh) : fresh;
}
export const meta = loadMeta();
export const saveMeta = () => storage.set('meta', meta);

// Folds the current run into the progress once (game over, win, or abandoning it); remembers what it unlocked.
export function endRun() {
  const fresh = recordRun(meta, state);
  if (fresh.length) ui.newUnlocks = fresh;
  saveMeta();
  return fresh;
}

// Collection bookkeeping from whatever is on screen: jokers seen in the shop or owned, bosses beaten.
export function noteProgress() {
  if (!state || state.phase === 'menu') return;
  const before = meta.seenJ.length + meta.ownedJ.length + meta.bossesBeat.length;
  if (state.shop) noteSeen(meta, state.shop.filter((it) => it.kind === 'joker').map((it) => it.key));
  state.jokers.forEach((j) => noteOwned(meta, j.key));
  if ((state.phase === 'cashout' || state.phase === 'win') && state.blindIdx === 2 && state.bossKey) noteBoss(meta, state.bossKey);
  if (meta.seenJ.length + meta.ownedJ.length + meta.bossesBeat.length !== before) saveMeta();
}

export const inRound = () => ['play', 'scoring'].includes(state.phase);

const prefDeck = () => (ui.prefs.deck && isUnlocked(meta, 'deck:' + ui.prefs.deck) ? ui.prefs.deck : 'red');
const prefStake = () => (ui.prefs.stake && isUnlocked(meta, 'stake:' + ui.prefs.stake) ? ui.prefs.stake : 0);
export const menuState = () => ({
  phase: 'menu', menuDeck: prefDeck(), menuStake: prefStake(), stake: prefStake(),
  jokers: [], cons: [], levels: Object.fromEntries(Object.keys(HANDS).map((k) => [k, 1])),
  money: 0, hands: 0, discards: 0, ante: 1, blindIdx: 0, maxJokers: 5, maxCons: 2,
  hand: [], played: [], selected: [], deck: [], deckList: [], stats: { best: 0 }, roundScore: 0,
});

export function saveRun() {
  if (state.phase === 'scoring') return; // mid-animation states are never written
  storage.setRaw('run', packSave(state));
}
export const loadRun = () => { const raw = storage.getRaw('run'); return raw ? unpackSave(raw) : null; };

export const records = () => storage.get('records', {});
export function saveRecord() {
  if (state.phase === 'menu') return;
  const r = records(), k = String(state.stake), reach = state.phase === 'win' ? 9 : state.ante;
  r[k] = Math.max(r[k] || 0, reach);
  storage.set('records', r);
}

export function saveLast() {
  const s = state.stats;
  storage.set('last', {
    win: state.phase === 'win', ante: state.ante, blind: state.blindIdx, deck: state.deckKey, stake: state.stake,
    best: s.best, bestType: s.bestType, total: s.total, jokers: state.jokers.map((j) => j.key), seed: state.seed,
  });
}
