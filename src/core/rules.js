// Static rule tables: hand types, blinds, bosses, enhancements, decks, stakes, skip tags.
import { isFace, suitIs } from './cards.js';

// c/m = base chips/mult at level 1, dc/dm = gain per level. Our own table (2026-10-09, with heat): the mid hands
// (三条, 顺子, 葫芦) pay more, 两对 a little less, and 顺子 beats 同花 — with 8 cards and discards a flush is the easier chase.
export const HANDS = {
  high: { n: '高牌', c: 5, m: 1, dc: 10, dm: 1 },
  pair: { n: '对子', c: 10, m: 2, dc: 15, dm: 1 },
  two: { n: '两对', c: 18, m: 2, dc: 15, dm: 1 },
  three: { n: '三条', c: 35, m: 3, dc: 25, dm: 2 },
  straight: { n: '顺子', c: 35, m: 4, dc: 30, dm: 3 },
  flush: { n: '同花', c: 30, m: 4, dc: 15, dm: 2 },
  full: { n: '葫芦', c: 45, m: 4, dc: 25, dm: 2 },
  four: { n: '四条', c: 60, m: 7, dc: 30, dm: 3 },
  sflush: { n: '同花顺', c: 100, m: 8, dc: 40, dm: 4 },
  // hidden hands need duplicated cards (the 复刻 tarot); their planets only appear once played
  five: { n: '五条', c: 120, m: 12, dc: 35, dm: 3, secret: true },
  flushfull: { n: '同花葫芦', c: 140, m: 14, dc: 40, dm: 4, secret: true },
  flush5: { n: '同花五条', c: 160, m: 16, dc: 50, dm: 3, secret: true },
};

// sponsor spots (赞助广告) that level a hand type up, named after made-up 1980s brands
export const PLANETS = {
  high: '孤星可乐', pair: '双子泡泡糖', two: '双双冰淇淋', three: '三角录像带', straight: '一路顺航空', flush: '同色洗衣粉',
  full: '葫芦电视机', four: '四驱越野车', sflush: '彩虹超市', five: '五福微波炉', flushfull: '大团圆家具', flush5: '五彩金卡',
};

// Tuned with tools/sim.js (n=800): about 9% bot win rate on 普通 (red deck) with the audience and heat in play,
// ≈7% for a bot that ignores the crowd's tastes, ≈4% with empty seats: reading the room is the game.
export const ANTE = [250, 650, 1700, 3400, 6800, 13500, 23000, 36000];
export const TUNE = { shopJokers: 2, pack: true };
export const REWARD = [3, 4, 5];
export const BLIND_NAMES = ['热场', '正片'];

export const BOSSES = {
  spade: { n: '铁锹', d: '所有黑桃牌不计分', deb: (c) => suitIs(c, 'S') },
  heart: { n: '碎心', d: '所有红桃牌不计分', deb: (c) => suitIs(c, 'H') },
  club: { n: '枯枝', d: '所有梅花牌不计分', deb: (c) => suitIs(c, 'C') },
  diamond: { n: '失窃', d: '所有方片牌不计分', deb: (c) => suitIs(c, 'D') },
  mask: { n: '面具', d: '人头牌（J、Q、K）不计分', deb: (c) => isFace(c.r) },
  miser: { n: '吝啬鬼', d: '本回合不能弃牌', noDiscard: true },
  glass: { n: '沙漏', d: '出牌次数 −1', handsDelta: -1 },
  wall: { n: '高墙', d: '目标分数翻倍', targetMult: 2 },
  flint: { n: '燧石', d: '牌型的基础筹码和倍率减半', halve: true },
  odd: { n: '单行道', d: 'A、9、7、5、3 不计分', deb: (c) => c.r === 14 || (c.r <= 9 && c.r % 2 === 1) },
  even: { n: '双人床', d: '10、8、6、4、2 不计分', deb: (c) => c.r <= 10 && c.r % 2 === 0 },
  low: { n: '矮人', d: '2、3、4、5 不计分', deb: (c) => c.r <= 5 },
  needle: { n: '针眼', d: '只能出 1 手牌，目标分数减半', oneHand: true, targetMult: 0.5, minAnte: 2 },
  psychic: { n: '读心者', d: '必须打出 5 张牌，否则这手不得分', min5: true, minAnte: 2 },
  eye: { n: '独眼', d: '同一种牌型本回合只能得一次分', noRepeat: true },
  mouth: { n: '偏食', d: '本回合只有第一次打出的牌型能得分', oneType: true, minAnte: 2 },
  arm: { n: '断臂', d: '每打出一手，那个牌型降 1 级', arm: true, minAnte: 2 },
  hook: { n: '鱼钩', d: '每出一手牌，随机弃掉手里 2 张', hook: 2 },
  tooth: { n: '蛀牙', d: '每打出 1 张牌失去 $1', tooth: 1 },
  manacle: { n: '镣铐', d: '手牌上限 −1', handDelta: -1 },
  tax: { n: '税官', d: '开局收走一半的钱（最多 $10）', tax: true, minAnte: 2 },
};

// Permanent upgrades: one is offered in the shop each ante for $10.
export const VOUCHERS = {
  slot: { n: '加座', d: '班底栏 +1' },
  hand: { n: '多一手', d: '每回合出牌 +1' },
  disc: { n: '多一弃', d: '每回合弃牌 +1' },
  hsize: { n: '大手掌', d: '手牌上限 +1' },
  cons: { n: '道具袋', d: '道具栏 +1' },
  shelf: { n: '多货架', d: '后台多 1 位艺人' },
  reroll: { n: '刷新折扣', d: '后台刷新费 −$2' },
  interest: { n: '复利', d: '利息上限 +$5' },
};
export const VOUCHER_PRICE = 10;

// Joker editions: a rare shiny version of a joker. `add` is the extra price; chance is per shop joker.
export const EDITIONS = {
  foil: { n: '闪箔', d: '+50 筹码', chips: 50, add: 2, p: 0.04 },
  holo: { n: '镭射', d: '+10 倍率', mult: 10, add: 3, p: 0.03 },
  poly: { n: '彩虹', d: '×1.5 倍率', xmult: 1.5, add: 5, p: 0.015 },
  negative: { n: '负片', d: '不占班底栏', add: 5, p: 0.006 },
};

export const ENH = {
  bonus: { n: '加注', d: '计分时 +30 筹码' },
  mult: { n: '红晕', d: '计分时 +4 倍率' },
  glass: { n: '琉璃', d: '计分时 ×2 倍率，之后有 1/4 概率碎掉' },
  steel: { n: '铁心', d: '留在手里不打出时 ×1.5 倍率' },
  wild: { n: '百搭', d: '算作任意花色' },
};

export const SEALS = {
  red: { n: '回声印', d: '计分时额外触发 1 次' },
  gold: { n: '金箔印', d: '计分时得 $3' },
};

export const DECKS = {
  red: { n: '红色牌组', d: '每回合弃牌 +1', disc: 1 },
  blue: { n: '蓝色牌组', d: '每回合出牌 +1', hands: 1 },
  gold: { n: '金色牌组', d: '开局多 $10', money: 10 },
  black: { n: '黑色牌组', d: '班底栏 +1，每回合出牌 −1', slots: 1, hands: -1 },
  paint: { n: '彩绘牌组', d: '开局随机 6 张牌带增强效果', enhStart: 6 },
};

export const STAKES = [
  { n: '普通', d: '标准规则', tm: 1 },
  { n: '困难', d: '目标分数 ×1.25，热场没有奖励', tm: 1.25, noSmall: true },
  { n: '噩梦', d: '目标分数 ×1.6，热场没有奖励，利息最多 $3', tm: 1.6, noSmall: true, intCap: 3 },
];

export const TAGS = {
  cash: { n: '现金券', d: '立即获得 $8' },
  rare: { n: '稀有券', d: '下次后台多出一位稀有艺人' },
  planet: { n: '赞助券', d: '随机两个牌型各升 1 级' },
  tarot: { n: '道具券', d: '获得 2 件随机道具' },
};

export const RARITY = { 1: '普通', 2: '罕见', 3: '稀有' };
