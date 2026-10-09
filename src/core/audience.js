// The audience: every show (blind) seats three spectators, each with one taste. The target score is still the only
// thing that clears a show; a spectator whose taste a hand meets is won over once and tips right away — money, or a
// ×mult on that hand. Win over all three for a standing ovation (全场起立). Crowds for the night's three shows are
// rolled when the night starts, so the player can plan from the show-select screen.
import { isFace, isRed, suitIs } from './cards.js';
import { rint, shuffle } from './rng.js';

const has = (c, t) => c.contains.has(t);
const black = (k) => k.enh === 'wild' || !isRed(k.s);
const red = (k) => k.enh === 'wild' || isRed(k.s);

// tier 1 easy, 2 takes some aim, 3 a real ask. tip: { money } or { xmult }.
export const SPECTATORS = [
  { key: 'pairfan', n: '成双控', d: '出牌含对子', tier: 1, tip: { money: 1 }, ok: (c) => has(c, 'pair') },
  { key: 'twofan', n: '双双对对', d: '出牌含两对', tier: 1, tip: { money: 1 }, ok: (c) => has(c, 'two') },
  { key: 'acefan', n: '王牌迷', d: '有 A 计分', tier: 1, tip: { money: 1 }, ok: (c) => c.live.some((k) => k.r === 14) },
  { key: 'fivefan', n: '排场控', d: '一次打满 5 张', tier: 1, tip: { money: 1 }, ok: (c) => c.played.length === 5 },
  { key: 'redfan', n: '红衣客', d: '计分牌全是红色', tier: 1, tip: { money: 1 }, ok: (c) => c.live.length > 0 && c.live.every(red) },
  { key: 'blackfan', n: '黑衣客', d: '计分牌全是黑色', tier: 1, tip: { money: 1 }, ok: (c) => c.live.length > 0 && c.live.every(black) },
  { key: 'threefan', n: '三人成众', d: '出牌含三条', tier: 2, tip: { money: 2 }, ok: (c) => has(c, 'three') },
  { key: 'facefan', n: '宫廷粉', d: '2 张以上人头牌计分', tier: 2, tip: { money: 1 }, ok: (c) => c.live.filter((k) => isFace(k.r)).length >= 2 },
  { key: 'lowfan', n: '小人物', d: '计分牌全是 2–6', tier: 2, tip: { money: 2 }, ok: (c) => c.live.length > 0 && c.live.every((k) => k.r <= 6) },
  { key: 'enhfan', n: '行家', d: '有增强牌计分', tier: 2, tip: { money: 1 }, ok: (c) => c.live.some((k) => k.enh) },
  { key: 'opener', n: '急性子', d: '第一手就拿到目标的 1/4', tier: 2, tip: { money: 2 }, ok: (c) => c.first && c.total >= c.target / 4 },
  { key: 'flushfan', n: '同花迷', d: '出牌含同花', tier: 2, tip: { xmult: 1.25 }, ok: (c) => has(c, 'flush') },
  { key: 'strfan', n: '顺子迷', d: '出牌含顺子', tier: 2, tip: { xmult: 1.25 }, ok: (c) => has(c, 'straight') },
  { key: 'solo', n: '极简派', d: '只打出 1 张牌', tier: 2, tip: { xmult: 1.25 }, ok: (c) => c.played.length === 1 },
  { key: 'variety', n: '求新鲜', d: '本场打出第 3 种牌型', tier: 3, tip: { money: 3 }, ok: (c) => new Set([...c.roundTypes, c.type]).size >= 3 },
  { key: 'fullfan', n: '满堂彩', d: '出牌含葫芦', tier: 3, tip: { xmult: 1.5 }, ok: (c) => has(c, 'full') },
  { key: 'big', n: '大场面', d: '一手拿到目标的一半', tier: 3, tip: { xmult: 1.5 }, ok: (c) => c.total >= c.target / 2 },
];
export const SPEC = Object.fromEntries(SPECTATORS.map((s) => [s.key, s]));
export const OVATION_TIP = 2; // $ for a standing ovation

// warm-up shows sit easy crowds, the headline (boss) show the hardest
const TIERS = [[1, 1, 2], [1, 2, 3], [2, 3, 3]];

export function rollCrowds(st) {
  return TIERS.map((tiers) => {
    const pick = [];
    for (const t of tiers) {
      const pool = SPECTATORS.filter((s) => s.tier === t && !pick.includes(s.key));
      pick.push(pool[rint(st, pool.length)].key);
    }
    return shuffle(st, pick);
  });
}

export const seatCrowd = (st) => { st.audience = ((st.crowds && st.crowds[st.blindIdx]) || []).map((key) => ({ key, ok: false })); };
export const tipText = (s) => (s.tip.money ? `打赏 $${s.tip.money}` : `收视 ×${s.tip.xmult}`);
