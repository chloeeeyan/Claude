// Local playtest log. Nothing leaves the device: runs and blinds are summarised into localStorage (jn.tele, last 100
// runs) and a playtester exports them as a JSON file from the collection page to send back by hand.
import { BOSSES, JD } from '../core/index.js';
import { meta, state, storage } from './store.js';

const MAX_RUNS = 100;
const load = () => {
  const t = storage.get('tele', null);
  return t && Array.isArray(t.runs) ? t : { v: 1, runs: [], cur: null };
};
const save = (t) => storage.set('tele', t);

export function teleStart() {
  const t = load();
  t.cur = { t0: Date.now(), seed: state.seed, blinds: [] };
  save(t);
}

// a blind ended: cleared (cashout / win) or lost
export function teleBlind() {
  const t = load();
  if (!t.cur || t.cur.seed !== state.seed) return;
  t.cur.blinds.push({
    ante: state.ante, blind: state.blindIdx, boss: state.blindIdx === 2 ? state.bossKey : null, cleared: state.phase !== 'over',
    score: state.roundScore, target: state.target, hands: state.roundHands, jokers: state.jokers.length,
  });
  save(t);
}

// the run is over (won, lost, or abandoned from 重开)
export function teleEnd() {
  const t = load(), s = state.stats || {};
  if (!t.cur || t.cur.seed !== state.seed) return;
  const result = state.phase === 'win' ? 'win' : state.phase === 'over' ? 'lost' : 'quit';
  t.runs.push({
    at: new Date(t.cur.t0).toISOString(), mins: Math.round((Date.now() - t.cur.t0) / 600) / 100,
    seed: state.seed, deck: state.deckKey, stake: state.stake, daily: state.daily || null, result,
    ante: state.ante, blind: state.blindIdx, killer: result === 'lost' && state.blindIdx === 2 ? (BOSSES[state.bossKey] || {}).n : null,
    total: s.total || 0, best: s.best || 0, bestType: s.bestType || null, handsPlayed: s.handsPlayed || 0, types: s.types || {},
    tarots: s.tarots || 0, planets: s.planets || 0, skipped: s.skipped || 0, money: state.money,
    jokers: state.jokers.map((j) => (j.ed ? j.ed + ':' : '') + j.key), vouchers: state.vouchers || [],
    tutor: storage.get('tutor', 0), blinds: t.cur.blinds,
  });
  if (t.runs.length > MAX_RUNS) t.runs.splice(0, t.runs.length - MAX_RUNS);
  t.cur = null;
  save(t);
}

export const teleCount = () => load().runs.length;

function payload() {
  const t = load();
  return JSON.stringify({
    game: 'joker-night', exported: new Date().toISOString(), screen: `${screen.width}x${screen.height}`, ua: navigator.userAgent,
    meta: { runs: meta.runs, wins: meta.wins, bestAnte: meta.bestAnte, unlocked: meta.unlocked, seenJokers: meta.seenJ.length, jokerNames: Object.keys(JD).length },
    runs: t.runs,
  }, null, 1);
}

export function teleExport() {
  const blob = new Blob([payload()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `joker-night-playtest-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function teleCopy() {
  try { await navigator.clipboard.writeText(payload()); return true; } catch (e) { return false; }
}
