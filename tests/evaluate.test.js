import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/index.js';
import { HAND_EX } from '../src/ui/guide.js';
import { cards } from './helpers.js';

const ranks = (ev) => ev.scoring.map((c) => c.r);

describe('evaluate', () => {
  it.each([
    ['high', 'AS JH 8C 5D 3S', [14]],
    ['pair', 'KH KC 9S 6D 2H', [13, 13]],
    ['two', 'QS QD 7C 7H 4S', [12, 12, 7, 7]],
    ['three', '8S 8H 8D KC 3S', [8, 8, 8]],
    ['straight', '9C 8H 7S 6D 5C', [9, 8, 7, 6, 5]],
    ['flush', 'KH 10H 7H 4H 2H', [13, 10, 7, 4, 2]],
    ['full', 'JS JH JC 4D 4S', [11, 11, 11, 4, 4]],
    ['four', '6S 6H 6C 6D AH', [6, 6, 6, 6]],
    ['sflush', '10S 9S 8S 7S 6S', [10, 9, 8, 7, 6]],
    ['five', 'KS KS KH KD KC', [13, 13, 13, 13, 13]],
    ['flushfull', 'QH QH QH 5H 5H', [12, 12, 12, 5, 5]],
    ['flush5', 'AS AS AS AS AS', [14, 14, 14, 14, 14]],
  ])('%s from %s', (type, hand, scoring) => {
    const ev = evaluate(cards(hand));
    expect(ev.type).toBe(type);
    expect(ranks(ev)).toEqual(scoring);
  });

  it('plays the ace low in A-2-3-4-5', () => {
    expect(evaluate(cards('AS 2H 3C 4D 5S')).type).toBe('straight');
  });

  it('does not wrap straights around the ace', () => {
    expect(evaluate(cards('QS KH AC 2D 3S')).type).toBe('high');
  });

  it('needs five cards for a flush unless 四指 is active', () => {
    expect(evaluate(cards('KH 10H 7H 4H')).type).toBe('high');
    expect(evaluate(cards('KH 10H 7H 4H'), { four: true }).type).toBe('flush');
    expect(evaluate(cards('9C 8H 7S 6D'), { four: true }).type).toBe('straight');
  });

  it('counts wild cards as every suit', () => {
    const hand = cards('KH 10H 7H 4H 2S');
    hand[4].enh = 'wild';
    expect(evaluate(hand).type).toBe('flush');
  });

  it('scores every played card with 泼墨', () => {
    expect(evaluate(cards('KH KC 9S'), { splash: true }).scoring).toHaveLength(3);
  });

  it('reports contained hand types for "contains a pair" jokers', () => {
    const ev = evaluate(cards('JS JH JC 4D 4S'));
    expect([...ev.contains].sort()).toEqual(['full', 'pair', 'three', 'two'].sort());
  });

  it('matches every example in the hand guide', () => {
    for (const [type, hand] of HAND_EX) {
      if (type === 'hidden') continue;
      expect(evaluate(cards(hand)).type, hand).toBe(type);
    }
  });
});
