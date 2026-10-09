import { describe, expect, it } from 'vitest';
import { OVATION_TIP, SPEC, computeHand, freshState, startBlind } from '../src/core/index.js';
import { HEAT, HEAT_START, REGULAR, VIP } from '../src/core/audience.js';
import { cards } from './helpers.js';

function round(jokers = []) {
  const st = freshState('red', 0, 1);
  st.bossKey = 'wall'; // keep blind 0 boss-free and deterministic
  startBlind(st);
  st.jokers = jokers.map((key, i) => ({ key, uid: 100 + i, data: {} }));
  st.audience = []; // the audience has its own tests; keep these totals about cards and jokers
  return st;
}

describe('computeHand', () => {
  it('scores a bare pair: (10 + 10 + 10) × 2', () => {
    const st = round();
    const res = computeHand(st, cards('KH KC 9S 6D 2H'), [], { preview: true });
    expect(res.type).toBe('pair');
    expect(res.total).toBe(60);
  });

  it('applies jokers left to right, so ×mult on the right pays more', () => {
    const left = computeHand(round(['duo', 'joker']), cards('KH KC'), [], { preview: true });
    const right = computeHand(round(['joker', 'duo']), cards('KH KC'), [], { preview: true });
    expect(left.mult).toBe(8);   // 2 ×2 +4
    expect(right.mult).toBe(12); // 2 +4 ×2
  });

  it('lets 蓝图 copy the joker to its right', () => {
    const res = computeHand(round(['blueprint', 'joker']), cards('KH KC'), [], { preview: true });
    expect(res.mult).toBe(2 + 4 + 4);
  });

  it('retriggers red-seal cards', () => {
    const hand = cards('KH KC');
    hand[0].seal = 'red';
    const res = computeHand(round(), hand, [], { preview: true });
    expect(res.chips).toBe(10 + 10 + 10 + 10);
  });

  it('multiplies by steel cards held in hand', () => {
    const held = cards('2S');
    held[0].enh = 'steel';
    const res = computeHand(round(), cards('KH KC'), held, { preview: true });
    expect(res.mult).toBe(3);
  });

  it('does not change jokers or consume randomness in a preview', () => {
    const st = round(['snow', 'gambler', 'threeC']);
    const rng = st.rng;
    computeHand(st, cards('KH KC'), [], { preview: true });
    expect(st.jokers[0].data.n).toBeUndefined();
    expect(st.rng).toBe(rng);
  });

  it('skips cards debuffed by the boss', () => {
    const st = round();
    st.blindIdx = 2; st.bossKey = 'heart';
    const res = computeHand(st, cards('KH KC'), [], { preview: true });
    expect(res.steps[0]).toMatchObject({ text: '失效' });
    expect(res.chips).toBe(10 + 10);
  });

  it('scores held cards through held() jokers: 摄政王 ×1.5 per K kept in hand', () => {
    const res = computeHand(round(['regent']), cards('2S 2H'), cards('KS KD'), { preview: true });
    expect(res.mult).toBeCloseTo(2 * 1.5 * 1.5);
  });

  it('retriggers the first scoring card twice with 回音壁', () => {
    const res = computeHand(round(['echo']), cards('KH KC'), [], { preview: true });
    expect(res.chips).toBe(10 + 10 * 3 + 10);
  });

  it('adds joker editions around the joker: foil before, polychrome after', () => {
    const st = round(['joker', 'joker']);
    st.jokers[0].ed = 'foil'; st.jokers[1].ed = 'poly';
    const res = computeHand(st, cards('KH KC'), [], { preview: true });
    expect(res.chips).toBe(30 + 50);
    expect(res.mult).toBe((2 + 4 + 4) * 1.5);
  });

  it('adds chips written onto a card', () => {
    const hand = cards('KH KC');
    hand[0].pc = 9;
    expect(computeHand(round(), hand, [], { preview: true }).chips).toBe(30 + 9);
  });

  it('writes 老树 chips into the deck only when the hand is really played', () => {
    const st = round(['grower']);
    const [a, b] = st.hand;
    a.r = 13; b.r = 13;
    computeHand(st, [a, b], [], { preview: true });
    expect(st.deckList.find((c) => c.id === a.id).pc).toBeUndefined();
    computeHand(st, [a, b], []);
    expect(st.deckList.find((c) => c.id === a.id).pc).toBe(3);
  });

  it('voids hands the boss forbids: 读心者 wants 5 cards, 独眼 no repeats', () => {
    const st = round();
    st.blindIdx = 2; st.bossKey = 'psychic';
    expect(computeHand(st, cards('KH KC'), [], { preview: true })).toMatchObject({ total: 0, voided: '要 5 张' });
    st.bossKey = 'eye'; st.roundTypes = ['pair'];
    expect(computeHand(st, cards('KH KC'), [], { preview: true }).total).toBe(0);
    expect(computeHand(st, cards('KH KC 9S 9D'), [], { preview: true }).total).toBeGreaterThan(0);
  });
});

describe('the audience', () => {
  const seat = (st, ...keys) => { st.audience = keys.map((key) => ({ key, ok: false })); return st; };

  it('tips a spectator whose taste the hand meets, once per show', () => {
    const st = seat(round(), 'pairfan', 'flushfan', 'solo');
    const res = computeHand(st, cards('KH KC'), [], { preview: true });
    expect(res.sat).toEqual([0]);
    expect(res.money).toBe(SPEC.pairfan.tip.money);
    st.audience[0].ok = true;
    expect(computeHand(st, cards('KH KC'), [], { preview: true }).sat).toEqual([]);
  });

  it('multiplies the hand for ×mult tastes and pays a standing ovation when the last one is won over', () => {
    const st = seat(round(), 'pairfan', 'solo', 'acefan');
    st.audience[0].ok = true; st.audience[2].ok = true;
    const res = computeHand(st, cards('9S'), [], { preview: true });
    expect(res.sat).toEqual([1]);
    expect(res.ovation).toBe(true);
    expect(res.heat).toBe(3); // the room boils over
    expect(res.mult).toBe(1 * SPEC.solo.tip.xmult * HEAT[3].x);
    expect(res.money).toBe(OVATION_TIP);
  });

  it('warms the room when a hand pleases anyone, even someone already won over', () => {
    const st = seat(round(), 'pairfan', 'flushfan', 'redfan');
    st.audience[0].ok = true;
    const res = computeHand(st, cards('KH KC'), [], { preview: true });
    expect(res.sat).toEqual([]);
    expect(res.boos).toEqual([]);
    expect(res.heat).toBe(HEAT_START + 1);
    expect(res.mult).toBe(2 * HEAT[HEAT_START + 1].x);
  });

  it('cools it when nobody likes the hand, and each boo cools it again', () => {
    const st = seat(round(), 'flushfan', 'twofan', 'variety');
    expect(computeHand(st, cards('KH KC'), [], { preview: true }).heat).toBe(HEAT_START - 1); // nobody cares: 冷场
    seat(st, 'pairfan', 'fivefan', 'acefan');
    st.heat = 3;
    const res = computeHand(st, cards('9S'), [], { preview: true }); // a lone black 9: 成双控 and 排场控 boo, nobody likes it
    expect(res.boos).toEqual([0, 1]);
    expect(res.heat).toBe(0);
    expect(res.mult).toBe(1 * HEAT[0].x);
    expect(res.steps.filter((x) => x.cls === 'boo')).toHaveLength(2);
  });

  it('pays the VIP guest more and never lets them boo', () => {
    const st = seat(round(), 'pairfan', 'fivefan', 'acefan');
    st.audience.unshift({ key: 'redfan', ok: false, vip: true });
    const res = computeHand(st, cards('KC'), [], { preview: true }); // all black: 红衣客 would boo, the VIP doesn't
    expect(res.boos).not.toContain(0);
    const won = computeHand(st, cards('KH KD'), [], { preview: true });
    expect(won.sat).toContain(0);
    expect(won.steps.find((x) => x.lift).money).toBe(VIP.tip);
  });

  it('lets picky regulars (won over twice) tip more', () => {
    const st = seat(round(), 'threefan', 'solo', 'flushfan');
    st.regulars = { threefan: 1, solo: 2, pairfan: 5 };
    expect(computeHand(st, cards('9S 9H 9C'), [], { preview: true }).money).toBe(SPEC.threefan.tip.money); // only once so far
    st.regulars.threefan = 2;
    expect(computeHand(st, cards('9S 9H 9C'), [], { preview: true }).money).toBe(SPEC.threefan.tip.money + REGULAR.money);
    expect(computeHand(st, cards('9S'), [], { preview: true }).mult).toBe(1 * (SPEC.solo.tip.xmult + REGULAR.xmult) * HEAT[2].x);
    seat(st, 'pairfan', 'flushfan', 'redfan');
    expect(computeHand(st, cards('KH KC'), [], { preview: true }).money).toBe(SPEC.pairfan.tip.money); // tier 1 never becomes a regular
  });

  it('lets heat cast members bend the room', () => {
    const lone = (jk, ...keys) => { const st = seat(round(jk), ...keys); st.heat = 1; return st; };
    // nobody likes a lone 9♠ in front of 双双对对 / 同花迷 / 求新鲜: 冷场 without help
    expect(computeHand(lone([], 'twofan', 'flushfan', 'variety'), cards('9S'), [], { preview: true }).heat).toBe(0);
    expect(computeHand(lone(['pairM'], 'twofan', 'flushfan', 'variety'), cards('9S'), [], { preview: true }).heat).toBe(1); // 暖场主持
    expect(computeHand(lone(['twoM'], 'twofan', 'flushfan', 'variety'), cards('9S'), [], { preview: true }).heat).toBe(1); // 罐头笑声
    // two boos (成双控, 排场控) and nobody liking it: 保镖 takes the boos out
    expect(computeHand(lone(['splash'], 'pairfan', 'fivefan', 'acefan'), cards('9S'), [], { preview: true }).heat).toBe(0);
    const g = lone(['splash'], 'pairfan', 'fivefan', 'acefan'); g.heat = 3;
    expect(computeHand(g, cards('9S'), [], { preview: true }).heat).toBe(2);
    // 暖场歌手: +1 on the show's first hand
    expect(computeHand(lone(['twoC'], 'pairfan', 'flushfan', 'redfan'), cards('KH KC'), [], { preview: true }).heat).toBe(3);
  });

  it('pays cast members off the room: 烟火师 at 沸腾, 冷面笑匠 at 冷场, 嘘声收集者 per boo', () => {
    const hot = seat(round(['strM']), 'pairfan', 'flushfan', 'redfan'); hot.heat = 2;
    expect(computeHand(hot, cards('KH KC'), [], { preview: true }).mult).toBe(2 * 2 * HEAT[3].x);
    const cold = seat(round(['flM']), 'twofan', 'flushfan', 'variety'); cold.heat = 1;
    expect(computeHand(cold, cards('9S'), [], { preview: true }).mult).toBe(1 * 3 * HEAT[0].x);
    const boo = seat(round(['pairC']), 'pairfan', 'fivefan', 'acefan'); boo.heat = 3;
    expect(computeHand(boo, cards('9S'), [], { preview: true }).mult).toBe((1 + 20) * HEAT[0].x);
  });

  it('lets 现场导播 grow by every spectator won over, outside previews', () => {
    const st = seat(round(['threeC']), 'pairfan', 'flushfan', 'redfan');
    computeHand(st, cards('KH KD'), [], { preview: true });
    expect(st.jokers[0].data.n).toBeUndefined();
    computeHand(st, cards('KH KD'), []); // 成双控 + 红衣客
    expect(st.jokers[0].data.n).toBe(2);
  });

  it('never lets a spectator boo a hand they like (a straight flush pleases both purists)', () => {
    const st = seat(round(), 'flushfan', 'strfan', 'pairfan');
    const res = computeHand(st, cards('5H 6H 7H 8H 9H'), [], { preview: true });
    expect(res.sat).toEqual([0, 1]);
    expect(res.boos).toEqual([]);
  });

  it('lets crowd jokers work the room: 经纪人 doubles tips, 返场 repeats ×mult, 托儿 counts the won-over', () => {
    const st = seat(round(['agent', 'encore', 'shill']), 'pairfan', 'solo', 'acefan');
    st.audience[0].ok = true;
    const res = computeHand(st, cards('9S'), [], { preview: true });
    const x = SPEC.solo.tip.xmult;
    expect(res.mult).toBe((1 + 5) * x * x);
    expect(res.money).toBe(0);
    const res2 = computeHand(st, cards('AS'), [], { preview: true });
    expect(res2.money).toBe(2 * SPEC.acefan.tip.money + 2 * OVATION_TIP); // 王牌迷 + ovation, both doubled
  });
});
