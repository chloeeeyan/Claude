import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION, dailyKey, dailySetup, emptyMeta, freshState, grandfather, isUnlocked, normalizeMeta, packSave, recordRun, unpackSave,
} from '../src/core/index.js';

const ended = (over) => {
  const st = freshState('red', 0, 9);
  st.phase = 'over';
  return Object.assign(st, over);
};

describe('cross-run progress', () => {
  it('starts with two decks and the first stake', () => {
    const m = emptyMeta();
    expect(isUnlocked(m, 'deck:red') && isUnlocked(m, 'deck:blue') && isUnlocked(m, 'stake:0')).toBe(true);
    expect(isUnlocked(m, 'deck:gold') || isUnlocked(m, 'stake:1')).toBe(false);
  });

  it('unlocks by reaching antes and only counts a run once', () => {
    const m = emptyMeta();
    const st = ended({ ante: 5 });
    expect(recordRun(m, st).map((u) => u.id)).toEqual(['deck:gold', 'stake:1']);
    expect(recordRun(m, st)).toEqual([]);
    expect(m.runs).toBe(1);
    expect(m.stakeBest[0]).toBe(5);
  });

  it('counts tarots across runs', () => {
    const m = emptyMeta();
    recordRun(m, ended({ ante: 1, stats: { ...ended({}).stats, tarots: 6 } }));
    expect(isUnlocked(m, 'deck:paint')).toBe(false);
    recordRun(m, ended({ ante: 1, stats: { ...ended({}).stats, tarots: 4 } }));
    expect(isUnlocked(m, 'deck:paint')).toBe(true);
  });

  it('keeps the best daily attempt and counts tries', () => {
    const m = emptyMeta();
    recordRun(m, ended({ ante: 4, daily: '2026-10-06' }));
    recordRun(m, ended({ ante: 2, daily: '2026-10-06' }));
    expect(m.daily['2026-10-06']).toMatchObject({ ante: 4, tries: 2 });
  });

  it('repairs broken storage and lets earlier players keep everything', () => {
    expect(normalizeMeta(null)).toEqual(emptyMeta());
    const m = normalizeMeta({ runs: 'x', unlocked: [] });
    expect(m.runs).toBe(0);
    expect(isUnlocked(m, 'deck:red')).toBe(true);
    expect(isUnlocked(grandfather(emptyMeta()), 'stake:2')).toBe(true);
  });
});

describe('daily challenge', () => {
  it('gives everyone the same seed and deck on a date, and a different one the next day', () => {
    expect(dailySetup('2026-10-06')).toEqual(dailySetup('2026-10-06'));
    expect(dailySetup('2026-10-06').seed).not.toBe(dailySetup('2026-10-07').seed);
    expect(dailySetup('2026-10-06').deck).not.toBe(dailySetup('2026-10-07').deck);
    expect(dailyKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('survives a save round-trip and migrates older saves', () => {
    const st = freshState('red', 0, 3);
    st.daily = '2026-10-06';
    expect(unpackSave(packSave(st)).daily).toBe('2026-10-06');
    const old = freshState('red', 0, 3);
    delete old.daily; delete old.metaDone;
    const back = unpackSave(JSON.stringify({ v: SAVE_VERSION - 1, state: old }));
    expect(back.daily).toBeNull();
    expect(back.metaDone).toBe(false);
  });
});
