// Tarot catalogue: single-use cards that rewrite cards in the deck.
// min/max = how many hand cards must be selected; apply mutates one card.

export const TAROTS = [
  { key: 'tH', name: '胭脂', desc: '最多 3 张牌变成<b>红桃</b>', min: 1, max: 3, apply: (c) => { c.s = 'H'; } },
  { key: 'tS', name: '墨池', desc: '最多 3 张牌变成<b>黑桃</b>', min: 1, max: 3, apply: (c) => { c.s = 'S'; } },
  { key: 'tC', name: '青藤', desc: '最多 3 张牌变成<b>梅花</b>', min: 1, max: 3, apply: (c) => { c.s = 'C'; } },
  { key: 'tD', name: '金砖', desc: '最多 3 张牌变成<b>方片</b>', min: 1, max: 3, apply: (c) => { c.s = 'D'; } },
  { key: 'tUp', name: '攀升', desc: '最多 2 张牌<b>点数 +1</b>（A 变 2）', min: 1, max: 2, apply: (c) => { c.r = c.r === 14 ? 2 : c.r + 1; } },
  { key: 'tCut', name: '剪除', desc: '从牌组<b>永久删除</b>最多 2 张牌', min: 1, max: 2, destroy: true },
  { key: 'tCopy', name: '复刻', desc: '选 2 张牌，<b>左边</b>那张变成右边那张的复制', min: 2, max: 2, copy: true },
  { key: 'tBonus', name: '加注', desc: '最多 2 张牌获得「加注」：计分时 <b>+30 筹码</b>', min: 1, max: 2, field: 'enh', apply: (c) => { c.enh = 'bonus'; } },
  { key: 'tMult', name: '红晕', desc: '最多 2 张牌获得「红晕」：计分时 <b>+4 倍率</b>', min: 1, max: 2, field: 'enh', apply: (c) => { c.enh = 'mult'; } },
  { key: 'tGlass', name: '琉璃', desc: '1 张牌获得「琉璃」：计分时 <b>×2 倍率</b>，1/4 概率碎掉', min: 1, max: 1, field: 'enh', apply: (c) => { c.enh = 'glass'; } },
  { key: 'tSteel', name: '铁心', desc: '1 张牌获得「铁心」：留在手里时 <b>×1.5 倍率</b>', min: 1, max: 1, field: 'enh', apply: (c) => { c.enh = 'steel'; } },
  { key: 'tWild', name: '百搭', desc: '1 张牌获得「百搭」：<b>算作任意花色</b>', min: 1, max: 1, field: 'enh', apply: (c) => { c.enh = 'wild'; } },
  { key: 'tRed', name: '回声', desc: '1 张牌盖上「回声印」：计分时<b>额外触发 1 次</b>', min: 1, max: 1, field: 'seal', apply: (c) => { c.seal = 'red'; } },
  { key: 'tGold', name: '金箔', desc: '1 张牌盖上「金箔印」：计分时<b>得 $3</b>', min: 1, max: 1, field: 'seal', apply: (c) => { c.seal = 'gold'; } },
  { key: 'tRich', name: '聚财', desc: '金钱<b>翻倍</b>（最多 +$20）', min: 0, max: 0, money: true },
];

export const TD = Object.fromEntries(TAROTS.map((t) => [t.key, t]));
