// Versioned save format. Bump SAVE_VERSION whenever the run state changes shape and
// add a migration from the previous version, so players keep their run across updates.
import { HANDS } from './rules.js';
import { JD } from './jokers.js';
import { TD } from './tarots.js';
import { makeSeed } from './rng.js';
import { rollCrowds } from './audience.js';

export const SAVE_VERSION = 5;

// MIGRATIONS[n] turns a version n-1 state into version n (return null to drop the save)
const MIGRATIONS = {
  // v2: st.pack became { kind, opts, … } (the star pack used to be a bare array of hand keys)
  2: (s) => { if (Array.isArray(s.pack)) s.pack = { kind: 'star', opts: s.pack }; return s; },
  // v3: daily-challenge date and whether the run was already folded into the cross-run progress
  3: (s) => ({ ...s, daily: s.daily || null, metaDone: !!s.metaDone }),
  // v4: vouchers, the ante's voucher on offer, and the hand types played this round (for bosses)
  4: (s) => ({ ...s, vouchers: s.vouchers || [], voucherOffer: s.voucherOffer || null, roundTypes: s.roundTypes || [] }),
  // v5: the audience — crowds for the night's three shows, and who is seated (and won over) in this one
  5: (s) => ({ ...s, crowds: s.crowds || (s.phase === 'menu' || typeof s.rng !== 'number' ? null : rollCrowds(s)), audience: s.audience || [] }),
};

export const packSave = (state) => JSON.stringify({ v: SAVE_VERSION, state });

export function unpackSave(raw) {
  let o;
  try { o = JSON.parse(raw); } catch (e) { return null; }
  if (!o || typeof o.v !== 'number' || o.v > SAVE_VERSION) return null;
  let s = o.state;
  for (let v = o.v + 1; v <= SAVE_VERSION && s; v++) s = MIGRATIONS[v] ? MIGRATIONS[v](s) : s;
  return normalize(s);
}

// Repairs what a reload can leave behind: a hand caught mid-animation, removed content, new hand types.
export function normalize(s) {
  if (!s || !s.phase) return null;
  if (s.phase === 'menu') return s;
  if (!s.levels || !Array.isArray(s.hand) || !Array.isArray(s.deckList)) return null;
  if (s.phase === 'scoring') {
    s.hand.push(...(s.played || []));
    s.played = []; s.hands++; s.roundHands = Math.max(0, s.roundHands - 1); s.phase = 'play';
  }
  s.jokers = (s.jokers || []).filter((j) => JD[j.key]);
  s.cons = (s.cons || []).filter((c) => TD[c.key]);
  Object.keys(HANDS).forEach((k) => { if (!s.levels[k]) s.levels[k] = 1; });
  if (typeof s.rng !== 'number') { s.seed = makeSeed(); s.rng = s.seed; }
  return s;
}
