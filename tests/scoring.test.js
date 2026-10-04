import { describe, expect, it } from 'vitest';
import { computeHand, freshState, startBlind } from '../src/core/index.js';
import { cards } from './helpers.js';

function round(jokers = []) {
  const st = freshState('red', 0, 1);
  st.bossKey = 'wall'; // keep blind 0 boss-free and deterministic
  startBlind(st);
  st.jokers = jokers.map((key, i) => ({ key, uid: 100 + i, data: {} }));
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
    const st = round(['snow', 'misprint']);
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
});
