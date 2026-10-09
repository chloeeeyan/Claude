// The audience: every show (blind) seats three spectators. Each has a taste (喜欢) and a pet hate (讨厌), and the
// tastes clash: every crowd has at least one pair where pleasing one annoys the other.
// - A spectator whose taste a hand meets for the first time is won over and tips right away (money, or ×mult).
// - Heat (热度, 0–3) is the room's mood, starting at 1 each show. After every hand it goes up 1 if the hand pleased
//   anyone (won over or already won), down 1 if it pleased nobody, and down 1 more per spectator it annoyed.
//   (A spectator who likes the hand never boos it.) The hand is then multiplied by the new heat: 冷场 ×0.5 … 沸腾 ×2.
// - Win over all three for a standing ovation (全场起立): $2 and the room boils over (heat 3).
// Crowds for the episode's three shows are rolled when it starts, so the player can plan from the show-select screen.
import { isFace, isRed } from './cards.js';
import { rint, shuffle } from './rng.js';

const has = (c, t) => c.contains.has(t);
const black = (k) => k.enh === 'wild' || !isRed(k.s);
const red = (k) => k.enh === 'wild' || isRed(k.s);
const allOf = (c, f) => c.live.length > 0 && c.live.every(f);
const faces = (c) => c.live.filter((k) => isFace(k.r)).length;
const weak = (c) => c.total < c.target / 10;
const high = (c) => c.type === 'high';

// tier 1 easy, 2 takes some aim, 3 a real ask. tip: { money } or { xmult }. ok = taste, no = pet hate (nd says it),
// foe = spectators whose taste this one hates (used to seat clashing crowds). say = [won over, booing].
export const SPECTATORS = [
  { key: 'pairfan', n: '成双控', d: '出牌含对子', nd: '出高牌', tier: 1, tip: { money: 1 }, ok: (c) => has(c, 'pair'), no: high, foe: ['solo'],
    say: ['成双成对，看着就踏实。', '一张一张地出？你在点名吗？'] },
  { key: 'twofan', n: '双双对对', d: '出牌含两对', nd: '出三条', tier: 1, tip: { money: 1 }, ok: (c) => has(c, 'two'), no: (c) => has(c, 'three'), foe: ['threefan'],
    say: ['两对！对称就是美德。', '三个一样的？挤得我难受。'] },
  { key: 'acefan', n: '王牌迷', d: '有 A 计分', nd: '≥2 张人头牌计分', tier: 1, tip: { money: 1 }, ok: (c) => c.live.some((k) => k.r === 14), no: (c) => faces(c) >= 2, foe: ['facefan'],
    say: ['A 出场，全场安静。', '又是国王王后，宫斗剧看腻了。'] },
  { key: 'fivefan', n: '排场控', d: '一次打满 5 张', nd: '只打 1–2 张', tier: 1, tip: { money: 1 }, ok: (c) => c.played.length === 5, no: (c) => c.played.length <= 2, foe: ['solo'],
    say: ['五张齐上，这才叫排场！', '就这？我票价都比这多。'] },
  { key: 'redfan', n: '红衣客', d: '计分牌全是红色', nd: '计分牌全是黑色', tier: 1, tip: { money: 1 }, ok: (c) => allOf(c, red), no: (c) => allOf(c, black), foe: ['blackfan'],
    say: ['红得正好，跟我的西装一个色。', '一片漆黑，像停电。'] },
  { key: 'blackfan', n: '黑衣客', d: '计分牌全是黑色', nd: '计分牌全是红色', tier: 1, tip: { money: 1 }, ok: (c) => allOf(c, black), no: (c) => allOf(c, red), foe: ['redfan'],
    say: ['黑色，永不过时。', '红彤彤的，过年吗？'] },
  { key: 'threefan', n: '三人成众', d: '出牌含三条', nd: '出两对', tier: 2, tip: { money: 2 }, ok: (c) => has(c, 'three'), no: (c) => has(c, 'two') && !has(c, 'three'), foe: ['twofan'],
    say: ['三个！这才热闹。', '两对两对的，凑不齐一桌麻将。'] },
  { key: 'facefan', n: '宫廷粉', d: '≥2 张人头牌计分', nd: '计分牌全是 2–6', tier: 2, tip: { money: 1 }, ok: (c) => faces(c) >= 2, no: (c) => allOf(c, (k) => k.r <= 6), foe: ['lowfan', 'acefan'],
    say: ['陛下驾到！', '一群小喽啰，叫你们老板出来。'] },
  { key: 'lowfan', n: '小人物', d: '计分牌全是 2–6', nd: '有人头牌计分', tier: 2, tip: { money: 2 }, ok: (c) => allOf(c, (k) => k.r <= 6), no: (c) => faces(c) >= 1, foe: ['facefan'],
    say: ['小牌也有春天！', '又是那帮穿金戴银的。'] },
  { key: 'enhfan', n: '行家', d: '有增强牌计分', nd: '出高牌', tier: 2, tip: { money: 1 }, ok: (c) => c.live.some((k) => k.enh), no: high, foe: ['solo'],
    say: ['有点东西。', '外行看热闹，这连热闹都没有。'] },
  { key: 'opener', n: '急性子', d: '第一手拿到目标 1/4', nd: '一手不到目标 1/10', tier: 2, tip: { money: 2 }, ok: (c) => c.first && c.total >= c.target / 4, no: weak, foe: ['solo'],
    say: ['开门见山，我喜欢！', '快点快点，我车要停到点了。'] },
  { key: 'flushfan', n: '同花迷', d: '出牌含同花', nd: '出顺子', tier: 2, tip: { xmult: 1.25 }, ok: (c) => has(c, 'flush'), no: (c) => has(c, 'straight'), foe: ['strfan'],
    say: ['清一色，赏心悦目。', '顺子？花里胡哨，颜色都不搭。'] },
  { key: 'strfan', n: '顺子迷', d: '出牌含顺子', nd: '出同花', tier: 2, tip: { xmult: 1.25 }, ok: (c) => has(c, 'straight'), no: (c) => has(c, 'flush'), foe: ['flushfan'],
    say: ['一条龙！丝滑。', '同一个颜色排一排，没想象力。'] },
  { key: 'solo', n: '极简派', d: '只打出 1 张牌', nd: '一次打满 5 张', tier: 2, tip: { xmult: 1.25 }, ok: (c) => c.played.length === 1, no: (c) => c.played.length === 5, foe: ['fivefan', 'pairfan'],
    say: ['少即是多。', '堆这么多，信息过载了。'] },
  { key: 'variety', n: '求新鲜', d: '本场第 3 种牌型', nd: '和上一手牌型相同', tier: 3, tip: { money: 3 }, ok: (c) => new Set([...c.roundTypes, c.type]).size >= 3, no: (c) => c.type === c.lastType,
    foe: ['pairfan', 'twofan', 'threefan', 'flushfan', 'strfan'],
    say: ['新花样！再来！', '这招刚才用过了。'] },
  { key: 'fullfan', n: '满堂彩', d: '出牌含葫芦', nd: '出顺子或同花', tier: 3, tip: { xmult: 1.5 }, ok: (c) => has(c, 'full'),
    no: (c) => has(c, 'straight') || has(c, 'flush'), foe: ['flushfan', 'strfan'],
    say: ['满堂红！这才是黄金档！', '花里胡哨，不如一家团圆。'] },
  { key: 'big', n: '大场面', d: '一手拿到目标一半', nd: '一手不到目标 1/10', tier: 3, tip: { xmult: 1.5 }, ok: (c) => c.total >= c.target / 2, no: weak, foe: ['solo', 'lowfan'],
    say: ['炸了！这就是我要的！', '小打小闹，换台了。'] },
];
export const SPEC = Object.fromEntries(SPECTATORS.map((s) => [s.key, s]));
export const OVATION_TIP = 2; // $ for a standing ovation

// heat 0–3: the room's mood, multiplies every hand
export const HEAT = [
  { n: '冷场', x: 0.5 },
  { n: '暖场', x: 1 },
  { n: '热烈', x: 1.5 },
  { n: '沸腾', x: 2 },
];
export const HEAT_START = 1;
const clashes = (a, b) => SPEC[a].foe.includes(b) || SPEC[b].foe.includes(a);
export const hasClash = (keys) => keys.some((a, i) => keys.some((b, j) => j > i && clashes(a, b)));

// warm-up shows sit easy crowds, the headline (boss) show the hardest
const TIERS = [[1, 1, 2], [1, 2, 3], [2, 3, 3]];

function rollOne(st, tiers) {
  const pick = [];
  for (const t of tiers) {
    const pool = SPECTATORS.filter((s) => s.tier === t && !pick.includes(s.key));
    pick.push(pool[rint(st, pool.length)].key);
  }
  return pick;
}

// every crowd seats at least one clashing pair (re-rolled until it does; every tier mix has some)
export function rollCrowds(st) {
  return TIERS.map((tiers) => {
    let pick = rollOne(st, tiers);
    for (let i = 0; i < 50 && !hasClash(pick); i++) pick = rollOne(st, tiers);
    return shuffle(st, pick);
  });
}

export const seatCrowd = (st) => {
  st.audience = ((st.crowds && st.crowds[st.blindIdx]) || []).map((key) => ({ key, ok: false }));
  st.heat = HEAT_START; st.lastType = null;
};
export const tipText = (s) => (s.tip.money ? `打赏 $${s.tip.money}` : `收视 ×${s.tip.xmult}`);
