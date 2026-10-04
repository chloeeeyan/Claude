import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION, beginHand, buy, cashOut, finishHand, freshState, packSave, startBlind, unpackSave, useTarot,
} from '../src/core/index.js';

const snapshot = (st) => ({
  boss: st.bossKey, tags: st.tags, deck: st.deckList.map((c) => c.id + (c.enh || '')),
  hand: st.hand.map((c) => c.id), shop: st.shop && st.shop.map((i) => i.key || i.kind),
});

function playToShop(seed) {
  const st = freshState('paint', 0, seed);
  startBlind(st);
  st.target = 1; // guarantee the first hand clears the blind
  const res = beginHand(st, [st.hand[0].id]);
  finishHand(st, res);
  cashOut(st);
  return st;
}

describe('seeded runs', () => {
  it('replays the same run from the same seed', () => {
    expect(snapshot(playToShop(42))).toEqual(snapshot(playToShop(42)));
  });

  it('differs between seeds', () => {
    expect(snapshot(playToShop(1))).not.toEqual(snapshot(playToShop(2)));
  });
});

describe('run flow', () => {
  it('goes select → play → cashout → shop', () => {
    const st = playToShop(7);
    expect(st.phase).toBe('shop');
    expect(st.shop.length).toBeGreaterThanOrEqual(4);
  });

  it('refuses a purchase without enough money', () => {
    const st = playToShop(7);
    st.money = 0;
    expect(buy(st, 0).err).toBe('钱不够');
  });

  it('applies an enhancement tarot to the selected card and spends the tarot', () => {
    const st = freshState('red', 0, 3);
    startBlind(st);
    st.cons = [{ key: 'tSteel', uid: 9 }];
    const id = st.hand[0].id;
    expect(useTarot(st, 9, [id]).msg).toContain('铁心');
    expect(st.deckList.find((c) => c.id === id).enh).toBe('steel');
    expect(st.cons).toHaveLength(0);
  });
});

describe('save format', () => {
  it('round-trips a run', () => {
    const st = playToShop(11);
    const back = unpackSave(packSave(st));
    expect(back).toEqual(st);
  });

  it('puts a hand caught mid-animation back into the hand', () => {
    const st = freshState('red', 0, 5);
    startBlind(st);
    const hands = st.hands;
    beginHand(st, [st.hand[0].id]);
    const back = unpackSave(packSave(st));
    expect(back.phase).toBe('play');
    expect(back.hand).toHaveLength(8);
    expect(back.hands).toBe(hands);
  });

  it('rejects saves from a newer version and garbage', () => {
    expect(unpackSave(JSON.stringify({ v: SAVE_VERSION + 1, state: {} }))).toBeNull();
    expect(unpackSave('not json')).toBeNull();
  });
});
