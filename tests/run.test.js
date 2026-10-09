import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION, SPEC, beginHand, buy, cashOut, finishHand, freshState, nextBlind, packApply, packCards, packKeep, packPick, packSave, startBlind,
  unpackSave, useTarot,
} from '../src/core/index.js';
import { cashLines } from '../src/core/run.js';
import { debuffed } from '../src/core/scoring.js';
import { hasClash, pickBonus, pickedKeys, togglePick } from '../src/core/audience.js';

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
  it('queues five per show, seats the three picked and remembers who was won over', () => {
    const st = freshState('red', 0, 12);
    expect(st.crowds).toHaveLength(3);
    st.crowds.forEach((c, i) => { expect(new Set(c).size).toBe(5); expect(st.picks[i]).toHaveLength(3); });
    startBlind(st);
    expect(st.audience.map((a) => a.key)).toEqual(pickedKeys(st, 0));
    st.audience = [{ key: 'pairfan', ok: false }, { key: 'fivefan', ok: false }, { key: 'solo', ok: false }];
    const [a, b] = st.hand; b.r = a.r;
    finishHand(st, beginHand(st, [a.id, b.id]));
    expect(st.audience[0].ok).toBe(true);
    expect(st.stats.wonOver).toBe(1);
    expect(st.regulars.pairfan).toBe(1); // 成双控 will remember you
  });

  it('seats a clash in every crowd and carries heat from hand to hand, resetting each show', () => {
    for (let seed = 1; seed <= 40; seed++) { const s = freshState('red', 0, seed); [0, 1, 2].forEach((i) => expect(hasClash(pickedKeys(s, i))).toBe(true)); }
    const st = freshState('red', 0, 12);
    startBlind(st);
    expect(st.heat).toBe(1);
    st.audience = [{ key: 'pairfan', ok: false }, { key: 'twofan', ok: false }, { key: 'acefan', ok: false }];
    const [a, b] = st.hand; a.r = 7; b.r = 7;
    const res = beginHand(st, [a.id, b.id]);
    finishHand(st, res);
    expect(st.heat).toBe(res.heat);
    expect(st.heat).toBe(2);
    expect(st.lastType).toBe(res.type);
  });

  it('lets the player swap who is seated before the show, three seats at most, and pays $1 per picky spectator', () => {
    const st = freshState('red', 0, 15);
    const out = [0, 1, 2, 3, 4].find((n) => !st.picks[0].includes(n));
    expect(togglePick(st, 0, out)).toMatch(/座位/); // full
    const gone = st.picks[0][0];
    expect(togglePick(st, 0, gone)).toBe('');
    expect(togglePick(st, 0, out)).toBe('');
    expect(st.picks[0]).toContain(out);
    expect(st.picks[0]).not.toContain(gone);
    expect(pickBonus(st, 0)).toBe(pickedKeys(st, 0).filter((k) => SPEC[k].tier >= 2).length);
    startBlind(st);
    expect(st.audience.map((a) => a.key)).toEqual(pickedKeys(st, 0));
    expect(togglePick(st, 0, gone)).not.toBe(''); // the show has started
    st.roundScore = st.target; st.cash = null;
    const lines = cashLines(st);
    const picky = lines.find((l) => l.t.startsWith('挑剔'));
    expect(picky ? picky.v : 0).toBe(pickBonus(st, 0));
  });

  it('fills empty seats when a show starts with fewer than three picked', () => {
    const st = freshState('red', 0, 16);
    st.picks[0] = [];
    startBlind(st);
    expect(st.audience).toHaveLength(3);
  });

  it('migrates a v6 save: the old three-person crowds become fully seated queues', () => {
    const st = freshState('red', 0, 17);
    st.crowds = st.crowds.map((c) => c.slice(0, 3)); delete st.picks;
    const back = unpackSave(JSON.stringify({ v: 6, state: st }));
    expect(back.picks).toEqual([[0, 1, 2], [0, 1, 2], [0, 1, 2]]);
  });

  it('migrates a v5 save: heat starts warm, no hand played yet', () => {
    const st = freshState('red', 0, 14);
    startBlind(st);
    delete st.heat; delete st.lastType;
    const back = unpackSave(JSON.stringify({ v: 5, state: st }));
    expect(back.heat).toBe(1);
    expect(back.lastType).toBeNull();
  });

  it('seats the 黄金档 guest as a VIP; winning them over lifts the rule and gives back what it took', () => {
    const st = freshState('red', 0, 18);
    st.blindIdx = 2; st.bossKey = 'wall'; st.money = 20;
    startBlind(st);
    expect(st.audience[0]).toMatchObject({ key: 'big', vip: true, ok: false });
    expect(st.audience).toHaveLength(4);
    const full = st.target;
    const res = beginHand(st, [st.hand[0].id]);
    res.sat = [0]; res.total = 0; // pretend this hand won the VIP over
    finishHand(st, res);
    expect(st.audience[0].ok).toBe(true);
    expect(st.target).toBe(full); // a doubled target stays doubled
    expect(st.stats.vips).toBe(1);
  });

  it('lifts card debuffs and gives the 税官 money back once the VIP is won', () => {
    const st = freshState('red', 0, 19);
    st.blindIdx = 2; st.bossKey = 'tax'; st.money = 20;
    startBlind(st);
    expect(st.money).toBe(10);
    const res = beginHand(st, [st.hand[0].id]);
    res.sat = [0]; res.total = 0;
    finishHand(st, res);
    expect(st.money).toBe(20 + res.money);
    const sp = freshState('red', 0, 20);
    sp.blindIdx = 2; sp.bossKey = 'spade';
    startBlind(sp);
    const spade = { id: 'x', s: 'S', r: 9, enh: null, seal: null };
    expect(debuffed(sp, spade)).toBe(true);
    sp.audience[0].ok = true;
    expect(debuffed(sp, spade)).toBe(false);
  });

  it('gives the headline show a harder crowd than the warm-up', () => {
    const st = freshState('red', 0, 13);
    const tierSum = (crowd) => crowd.reduce((n, k) => n + SPEC[k].tier, 0);
    expect(tierSum(st.crowds[2])).toBeGreaterThan(tierSum(st.crowds[0]));
    expect(tierSum(pickedKeys(st, 2))).toBeGreaterThan(tierSum(pickedKeys(st, 0)));
  });
});
