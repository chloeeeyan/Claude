// Static rule tables: hand types, blinds, bosses, enhancements, decks, stakes, skip tags.
import { isFace, suitIs } from './cards.js';

// c/m = base chips/mult at level 1, dc/dm = gain per level
export const HANDS = {
  high: { n: '高牌', c: 5, m: 1, dc: 10, dm: 1 },
  pair: { n: '对子', c: 10, m: 2, dc: 15, dm: 1 },
  two: { n: '两对', c: 20, m: 2, dc: 20, dm: 1 },
  three: { n: '三条', c: 30, m: 3, dc: 20, dm: 2 },
  straight: { n: '顺子', c: 30, m: 4, dc: 30, dm: 3 },
  flush: { n: '同花', c: 35, m: 4, dc: 15, dm: 2 },
  full: { n: '葫芦', c: 40, m: 4, dc: 25, dm: 2 },
  four: { n: '四条', c: 60, m: 7, dc: 30, dm: 3 },
  sflush: { n: '同花顺', c: 100, m: 8, dc: 40, dm: 4 },
  // hidden hands need duplicated cards (the 复刻 tarot); their planets only appear once played
  five: { n: '五条', c: 120, m: 12, dc: 35, dm: 3, secret: true },
  flushfull: { n: '同花葫芦', c: 140, m: 14, dc: 40, dm: 4, secret: true },
  flush5: { n: '同花五条', c: 160, m: 16, dc: 50, dm: 3, secret: true },
};

export const PLANETS = {
  high: '月相', pair: '双子座', two: '天秤座', three: '三角座', straight: '天龙座', flush: '孔雀座',
  full: '天鹅座', four: '南十字', sflush: '猎户座', five: '北斗', flushfull: '仙后座', flush5: '银河',
};

// Tuned with tools/sim.js: about 8% bot win rate on 普通, steady drop-off from ante 3 on.
export const ANTE = [300, 700, 1500, 3000, 6000, 11000, 18000, 28000];
export const TUNE = { shopJokers: 2, pack: true };
export const REWARD = [3, 4, 5];
export const BLIND_NAMES = ['小盲注', '大盲注'];

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
  black: { n: '黑色牌组', d: '小丑栏 +1，每回合出牌 −1', slots: 1, hands: -1 },
  paint: { n: '彩绘牌组', d: '开局随机 6 张牌带增强效果', enhStart: 6 },
};

export const STAKES = [
  { n: '普通', d: '标准规则', tm: 1 },
  { n: '困难', d: '目标分数 ×1.25，小盲注没有奖励', tm: 1.25, noSmall: true },
  { n: '噩梦', d: '目标分数 ×1.6，小盲注没有奖励，利息最多 $3', tm: 1.6, noSmall: true, intCap: 3 },
];

export const TAGS = {
  cash: { n: '现金券', d: '立即获得 $8' },
  rare: { n: '稀有券', d: '下个商店多出一张稀有小丑' },
  planet: { n: '星图券', d: '随机两个牌型各升 1 级' },
  tarot: { n: '塔罗券', d: '获得 2 张随机塔罗牌' },
};

export const RARITY = { 1: '普通', 2: '罕见', 3: '稀有' };
