// UI-side state: the current run plus per-player preferences kept in localStorage.
// `state` is a live binding — modules read it directly and replace it through setState().
import { HANDS, packSave, unpackSave } from '../core/index.js';

const KEYS = {
  run: 'jn.run', records: 'jn.records', last: 'jn.last', tips: 'jn.tips',
  prefs: 'jn.prefs', speed: 'jn.speed', sound: 'jn.sound', tutorial: 'jn.tutorial',
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
};

export const inRound = () => ['play', 'scoring'].includes(state.phase);

export const menuState = () => ({
  phase: 'menu', menuDeck: ui.prefs.deck || 'red', menuStake: ui.prefs.stake || 0, stake: ui.prefs.stake || 0,
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
