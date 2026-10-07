import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION, SPEC, beginHand, buy, cashOut, finishHand, freshState, nextBlind, packApply, packCards, packKeep, packPick, packSave, startBlind,
  unpackSave, useTarot,
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

describe('vouchers, editions and bosses', () => {
  it('offers a voucher each ante and applies it for good', () => {
    const st = playToShop(31);
    st.money = 50;
    const i = st.shop.findIndex((it) => it.kind === 'voucher');
    st.shop[i].key = 'slot';
    const max = st.maxJokers;
    expect(buy(st, i).msg).toContain('加座');
    expect(st.maxJokers).toBe(max + 1);
    expect(st.voucherOffer).toBeNull();
    for (let k = 0; k < 3; k++) nextBlind(st);
    expect(st.ante).toBe(2);
    expect(st.voucherOffer).not.toBe('slot');
  });

  it('lets a negative joker in even when the slots are full', () => {
    const st = playToShop(32);
    st.money = 99;
    st.jokers = Array.from({ length: st.maxJokers }, (_, k) => ({ key: 'joker', uid: 50 + k, data: {} }));
    st.shop[0] = { kind: 'joker', key: 'misprint', price: 4, ed: null };
    expect(buy(st, 0).err).toBeTruthy();
    st.shop[0] = { kind: 'joker', key: 'misprint', price: 9, ed: 'negative' };
    expect(buy(st, 0).msg).toContain('负片');
  });

  it('gives 针眼 a single hand and 镣铐 a smaller hand', () => {
    const st = freshState('red', 0, 4);
    st.blindIdx = 2; st.bossKey = 'needle';
    startBlind(st);
    expect(st.hands).toBe(1);
    const st2 = freshState('red', 0, 4);
    st2.blindIdx = 2; st2.bossKey = 'manacle';
    startBlind(st2);
    expect(st2.hand).toHaveLength(7);
  });
});

describe('tarot pack', () => {
  const openPack = (seed) => {
    const st = playToShop(seed);
    st.money = 50;
    const i = st.shop.findIndex((it) => it.kind === 'tpack');
    expect(buy(st, i).msg).toBe('打开了道具箱');
    return st;
  };

  it('opens with three tarots and six cards from the deck', () => {
    const st = openPack(21);
    expect(st.pack.opts).toHaveLength(3);
    expect(packCards(st)).toHaveLength(6);
    expect(buy(st, st.shop.findIndex((it) => it.kind === 'pack')).err).toBe('先处理打开的卡包');
  });

  it('applies the picked tarot to the selected sample cards for good', () => {
    const st = openPack(21);
    st.pack.opts[0] = 'tSteel';
    packPick(st, 'tSteel');
    const id = st.pack.cards[2];
    expect(packApply(st).err).toBeTruthy(); // nothing selected yet
    st.selected = [id];
    expect(packApply(st).msg).toContain('铁心');
    expect(st.deckList.find((c) => c.id === id).enh).toBe('steel');
    expect(st.pack.done).toBe(true);
    expect(st.stats.tarots).toBe(1);
  });

  it('can keep the tarot for later instead', () => {
    const st = openPack(22);
    const k = st.pack.opts.find((x) => x !== 'tRich');
    packPick(st, k);
    expect(packKeep(st).msg).toContain('道具栏');
    expect(st.cons.map((c) => c.key)).toEqual([k]);
    expect(st.pack).toBeNull();
  });
});

describe('save format', () => {
  it('migrates a v1 star pack (bare array) to the v2 shape', () => {
    const st = playToShop(11);
    st.pack = ['pair', 'flush', 'two'];
    const back = unpackSave(JSON.stringify({ v: 1, state: st }));
    expect(back.pack).toEqual({ kind: 'star', opts: ['pair', 'flush', 'two'] });
  });

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

describe('audience across a run', () => {
  it('rolls three crowds per night, seats them per show and remembers who was won over', () => {
    const st = freshState('red', 0, 12);
    expect(st.crowds).toHaveLength(3);
    st.crowds.forEach((c) => expect(new Set(c).size).toBe(3));
    startBlind(st);
    expect(st.audience.map((a) => a.key)).toEqual(st.crowds[0]);
    st.audience = [{ key: 'pairfan', ok: false }, { key: 'fivefan', ok: false }, { key: 'solo', ok: false }];
    const [a, b] = st.hand; b.r = a.r;
    finishHand(st, beginHand(st, [a.id, b.id]));
    expect(st.audience[0].ok).toBe(true);
    expect(st.stats.wonOver).toBe(1);
  });

  it('gives the headline show a harder crowd than the warm-up', () => {
    const st = freshState('red', 0, 13);
    const tierSum = (crowd) => crowd.reduce((n, k) => n + SPEC[k].tier, 0);
    expect(tierSum(st.crowds[2])).toBeGreaterThan(tierSum(st.crowds[0]));
  });
});
