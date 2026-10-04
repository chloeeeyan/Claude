// Joker catalogue. Hooks receive the scoring context `c` (see computeHand):
//   card(c, card, j)  per scoring card    hand(c, j)  once per hand     before(c, j)  before scoring
//   discard(cards, j) on discard          money(j, st) at cash-out
// Effects are objects with chips / mult / xmult / money.
import { SUITS, SNAME, suitIs, isFace } from './cards.js';
import { rint } from './rng.js';

const has = (c, t) => c.contains.has(t);
const SUIT_JOKER = { S: '黑桃骑士', H: '红桃情人', C: '梅花园丁', D: '方片商人' };

export const JOKERS = [
  { key: 'joker', name: '小丑', r: 1, price: 2, desc: '<b>+4</b> 倍率', hand: () => ({ mult: 4 }) },
  ...SUITS.map((s) => ({
    key: 'suit' + s, name: SUIT_JOKER[s], r: 1, price: 5,
    desc: `每张计分的${SNAME[s]}牌 <b>+3</b> 倍率`, card: (c, k) => suitIs(k, s) && { mult: 3 },
  })),
  { key: 'pairM', name: '双生', r: 1, price: 4, desc: '出牌含<b>对子</b>时 +8 倍率', hand: (c) => has(c, 'pair') && { mult: 8 } },
  { key: 'twoM', name: '双城记', r: 1, price: 4, desc: '出牌含<b>两对</b>时 +10 倍率', hand: (c) => has(c, 'two') && { mult: 10 } },
  { key: 'threeM', name: '三叉戟', r: 1, price: 5, desc: '出牌含<b>三条</b>时 +12 倍率', hand: (c) => has(c, 'three') && { mult: 12 } },
  { key: 'strM', name: '长龙', r: 1, price: 4, desc: '出牌含<b>顺子</b>时 +12 倍率', hand: (c) => has(c, 'straight') && { mult: 12 } },
  { key: 'flM', name: '同色', r: 1, price: 4, desc: '出牌含<b>同花</b>时 +10 倍率', hand: (c) => has(c, 'flush') && { mult: 10 } },
  { key: 'pairC', name: '机灵鬼', r: 1, price: 4, desc: '出牌含<b>对子</b>时 +50 筹码', hand: (c) => has(c, 'pair') && { chips: 50 } },
  { key: 'even', name: '偶数派', r: 1, price: 4, desc: '每张计分的 10、8、6、4、2 <b>+4</b> 倍率', card: (c, k) => k.r <= 10 && k.r % 2 === 0 && { mult: 4 } },
  { key: 'odd', name: '奇数派', r: 1, price: 4, desc: '每张计分的 A、9、7、5、3 <b>+31</b> 筹码', card: (c, k) => (k.r === 14 || (k.r <= 9 && k.r % 2 === 1)) && { chips: 31 } },
  { key: 'face', name: '宫廷画师', r: 1, price: 5, desc: '每张计分的人头牌 <b>+30</b> 筹码', card: (c, k) => isFace(k.r) && { chips: 30 } },
  { key: 'ace', name: '王牌飞行员', r: 1, price: 5, desc: '每张计分的 A <b>+20</b> 筹码、<b>+4</b> 倍率', card: (c, k) => k.r === 14 && { chips: 20, mult: 4 } },
  { key: 'half', name: '半副牌', r: 1, price: 5, desc: '出牌不超过 3 张时 <b>+20</b> 倍率', hand: (c) => c.played.length <= 3 && { mult: 20 } },
  { key: 'flag', name: '弃牌旗', r: 1, price: 5, desc: '每剩 1 次弃牌 <b>+30</b> 筹码', hand: (c) => c.discards > 0 && { chips: 30 * c.discards } },
  // previews show the average so the "预计" number stays stable
  { key: 'misprint', name: '印错的牌', r: 1, price: 4, desc: '随机 <b>+0 ~ 23</b> 倍率', hand: (c) => ({ mult: c.preview ? 11 : rint(c.st, 24) }) },
  { key: 'piggy', name: '存钱罐', r: 1, price: 5, desc: '每回合结束时得 <b>$4</b>', money: () => 4 },
  { key: 'abacus', name: '算盘', r: 1, price: 5, desc: '回合结束时每剩 1 次弃牌得 <b>$2</b>', money: (j, st) => 2 * st.discards },
  {
    key: 'sweeper', name: '清道夫', r: 1, price: 5,
    desc: (j) => `每弃掉 1 张牌，永久 +4 筹码<br>（当前 <b>+${j ? j.data.n || 0 : 0}</b>）`,
    discard: (cards, j) => { j.data.n = (j.data.n || 0) + 4 * cards.length; },
    hand: (c, j) => j.data.n > 0 && { chips: j.data.n },
  },
  {
    key: 'snow', name: '雪球', r: 2, price: 6,
    desc: (j) => `每出一手牌，倍率永久 +1<br>（当前 <b>+${j ? j.data.n || 0 : 0}</b>）`,
    before: (c, j) => { j.data.n = (j.data.n || 0) + 1; },
    hand: (c, j) => ({ mult: j.data.n }),
  },
  { key: 'collector', name: '收藏家', r: 2, price: 6, desc: '每拥有 1 张小丑 <b>+3</b> 倍率', hand: (c) => ({ mult: 3 * c.jokerCount }) },
  { key: 'hoard', name: '守财奴', r: 2, price: 6, desc: '每持有 $1 <b>+2</b> 筹码', hand: (c) => c.money > 0 && { chips: 2 * c.money } },
  { key: 'deep', name: '深牌库', r: 2, price: 6, desc: '牌堆里每剩 1 张 <b>+2</b> 筹码', hand: (c) => c.deckLen > 0 && { chips: 2 * c.deckLen } },
  { key: 'gem', name: '宝石匠', r: 2, price: 6, desc: '每张计分的增强牌 <b>+5</b> 倍率', card: (c, k) => k.enh && { mult: 5 } },
  { key: 'first', name: '开门红', r: 2, price: 6, desc: '每回合第一手牌 <b>×2</b> 倍率', hand: (c) => c.first && { xmult: 2 } },
  { key: 'fullseat', name: '满座', r: 2, price: 6, desc: '出牌恰好 5 张时 <b>×1.5</b> 倍率', hand: (c) => c.played.length === 5 && { xmult: 1.5 } },
  { key: 'splash', name: '泼墨', r: 2, price: 5, desc: '打出的每一张牌都计分' },
  { key: 'fourf', name: '四指', r: 2, price: 6, desc: '同花和顺子只需 <b>4 张</b>' },
  {
    key: 'smith', name: '铁匠', r: 2, price: 7, desc: '牌组里每张铁心牌 <b>×0.25</b> 倍率',
    hand: (c) => { const n = c.deckList.filter((k) => k.enh === 'steel').length; return n > 0 && { xmult: 1 + 0.25 * n }; },
  },
  { key: 'last', name: '末班车', r: 2, price: 7, desc: '本回合最后一手牌 <b>×3</b> 倍率', hand: (c) => c.handsAfter === 0 && { xmult: 3 } },
  { key: 'family', name: '全家福', r: 3, price: 8, desc: '计分牌集齐 ♠♥♣♦ 时 <b>×3</b> 倍率', hand: (c) => SUITS.every((s) => c.live.some((k) => suitIs(k, s))) && { xmult: 3 } },
  { key: 'royal', name: '国王与王后', r: 3, price: 8, desc: '每张计分的 K、Q <b>×1.5</b> 倍率', card: (c, k) => (k.r === 12 || k.r === 13) && { xmult: 1.5 } },
  { key: 'duo', name: '二重奏', r: 3, price: 8, desc: '出牌含<b>对子</b>时 ×2 倍率', hand: (c) => has(c, 'pair') && { xmult: 2 } },
  { key: 'trio', name: '三人行', r: 3, price: 8, desc: '出牌含<b>三条</b>时 ×3 倍率', hand: (c) => has(c, 'three') && { xmult: 3 } },
  { key: 'palette', name: '调色盘', r: 3, price: 8, desc: '出牌含<b>同花</b>时 ×2 倍率', hand: (c) => has(c, 'flush') && { xmult: 2 } },
  { key: 'mirror', name: '镜中人', r: 3, price: 8, desc: '计分的人头牌<b>额外触发 1 次</b>' },
  { key: 'blueprint', name: '蓝图', r: 3, price: 9, desc: '复制<b>右边相邻</b>小丑的效果' },
];

export const JD = Object.fromEntries(JOKERS.map((j) => [j.key, j]));
export const descOf = (d, j) => (typeof d.desc === 'function' ? d.desc(j) : d.desc);
export const sellOf = (d) => Math.max(1, Math.floor(d.price / 2));
export const hasJ = (st, key) => st.jokers.some((j) => j.key === key);
