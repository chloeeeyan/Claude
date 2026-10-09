// Joker catalogue. Hooks receive the scoring context `c` (see computeHand):
//   card(c, card, j)  per scoring card    held(c, card, j)  per card kept in hand    hand(c, j)  once per hand
//   before(c, j)  before scoring          discard(cards, j, st) on discard            money(j, st) at cash-out
//   broke(n, j)   when n glass cards shatter
//   crowd(c, j)   after the audience reacts, before heat scales the hand: c.fans (liked it), c.boos, c.won (newly won over),
//                 c.heat (before) and c.newHeat (after), c.regulars (熟客 seated)
// `arch` tags the build a joker belongs to (flush / face / discard / economy / single / deck / hand / scale / crowd / heat).
// Effects are objects with chips / mult / xmult / money.
import { SUITS, SNAME, suitIs, isFace } from './cards.js';
import { rand, rint } from './rng.js';
import { SPEC } from './audience.js';

const has = (c, t) => c.contains.has(t);
const SUIT_JOKER = { S: '黑桃骑士', H: '红桃情人', C: '梅花园丁', D: '方片商人' };

export const JOKERS = [
  { key: 'joker', name: '谐星', r: 1, price: 2, desc: '<b>+4</b> 倍率', hand: () => ({ mult: 4 }) },
  ...SUITS.map((s) => ({
    key: 'suit' + s, name: SUIT_JOKER[s], r: 1, price: 5,
    desc: `每张计分的${SNAME[s]}牌 <b>+3</b> 倍率`, card: (c, k) => suitIs(k, s) && { mult: 3 },
  })),
  { key: 'pairM', arch: 'heat', name: '暖场主持', r: 2, price: 6, desc: '热度最低停在<b>暖场</b>，永远不会冷场' },
  { key: 'twoM', arch: 'heat', name: '罐头笑声', r: 1, price: 4, desc: '一手牌<b>没人喜欢</b>时，热度不降（嘘声照样降）' },
  { key: 'threeM', arch: 'heat', name: '气氛组', r: 1, price: 5, desc: '这手牌后每档热度 <b>+5</b> 倍率（沸腾 +15）', crowd: (c) => c.newHeat > 0 && { mult: 5 * c.newHeat } },
  { key: 'strM', arch: 'heat', name: '烟火师', r: 2, price: 7, desc: '这手牌把场子带到<b>沸腾</b>时 ×2 倍率', crowd: (c) => c.newHeat === 3 && { xmult: 2 } },
  { key: 'flM', arch: 'heat', name: '冷面笑匠', r: 2, price: 6, desc: '这手牌后<b>冷场</b>时 ×3 倍率（抵掉冷场的 ×0.5 还有余）', crowd: (c) => c.newHeat === 0 && { xmult: 3 } },
  { key: 'pairC', arch: 'crowd', name: '嘘声收集者', r: 1, price: 4, desc: '这手牌每挨一声嘘 <b>+10</b> 倍率', crowd: (c) => c.boos > 0 && { mult: 10 * c.boos } },
  { key: 'even', name: '偶数派', r: 1, price: 4, desc: '每张计分的 10、8、6、4、2 <b>+4</b> 倍率', card: (c, k) => k.r <= 10 && k.r % 2 === 0 && { mult: 4 } },
  { key: 'odd', name: '奇数派', r: 1, price: 4, desc: '每张计分的 A、9、7、5、3 <b>+31</b> 筹码', card: (c, k) => (k.r === 14 || (k.r <= 9 && k.r % 2 === 1)) && { chips: 31 } },
  { key: 'face', name: '宫廷画师', r: 1, price: 5, desc: '每张计分的人头牌 <b>+30</b> 筹码', card: (c, k) => isFace(k.r) && { chips: 30 } },
  { key: 'ace', name: '王牌飞行员', r: 1, price: 5, desc: '每张计分的 A <b>+20</b> 筹码、<b>+4</b> 倍率', card: (c, k) => k.r === 14 && { chips: 20, mult: 4 } },
  { key: 'half', arch: 'crowd', name: '点歌台', r: 2, price: 7, desc: '每位<b>喜欢这手牌</b>的观众 ×1.2 倍率', crowd: (c) => c.fans > 0 && { xmult: Math.round(Math.pow(1.2, c.fans) * 100) / 100 } },
  { key: 'flag', name: '弃牌旗', r: 1, price: 5, desc: '每剩 1 次弃牌 <b>+30</b> 筹码', hand: (c) => c.discards > 0 && { chips: 30 * c.discards } },
  // previews show the average so the "预计" number stays stable
  { key: 'misprint', arch: 'heat', name: '即兴演员', r: 1, price: 4, desc: '这手牌让热度<b>上升</b>时得 $1', crowd: (c) => c.newHeat > c.heat && { money: 1 } },
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
  { key: 'collector', arch: 'crowd', name: '熟客经理', r: 2, price: 6, desc: '每位在座的<b>熟客</b> ×1.25 倍率', crowd: (c) => c.regulars > 0 && { xmult: Math.round(Math.pow(1.25, c.regulars) * 100) / 100 } },
  {
    key: 'hoard', arch: 'economy', name: '票贩子', r: 1, price: 5, desc: '每场结束时，每位在座的<b>很挑剔</b>观众（第 3 档）得 $2',
    money: (j, st) => 2 * (st.audience || []).filter((a) => !a.vip && SPEC[a.key] && SPEC[a.key].tier === 3).length,
  },
  { key: 'deep', name: '深牌库', r: 2, price: 6, desc: '牌堆里每剩 1 张 <b>+2</b> 筹码', hand: (c) => c.deckLen > 0 && { chips: 2 * c.deckLen } },
  { key: 'gem', name: '宝石匠', r: 2, price: 6, desc: '每张计分的增强牌 <b>+5</b> 倍率', card: (c, k) => k.enh && { mult: 5 } },
  { key: 'first', name: '开门红', r: 2, price: 6, desc: '每回合第一手牌 <b>×2</b> 倍率', hand: (c) => c.first && { xmult: 2 } },
  { key: 'fullseat', name: '满座', r: 2, price: 6, desc: '出牌恰好 5 张时 <b>×1.5</b> 倍率', hand: (c) => c.played.length === 5 && { xmult: 1.5 } },
  { key: 'splash', arch: 'heat', name: '保镖', r: 2, price: 6, desc: '<b>嘘声</b>不再让热度下降' },
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
  { key: 'blueprint', name: '蓝图', r: 3, price: 9, desc: '复制<b>右边相邻</b>艺人的效果' },

  // ---- flush builds
  { key: 'inkwell', arch: 'flush', name: '墨水瓶', r: 1, price: 4, desc: '出牌含<b>同花</b>时 +80 筹码', hand: (c) => has(c, 'flush') && { chips: 80 } },
  { key: 'mono', arch: 'flush', name: '单色调', r: 2, price: 6, desc: '出牌含<b>同花</b>时，每张计分牌 <b>×1.1</b> 倍率', card: (c) => has(c, 'flush') && { xmult: 1.1 } },
  { key: 'rainbow', arch: 'flush', name: '七彩', r: 2, price: 6, desc: '每张计分的<b>百搭牌</b> ×1.5 倍率', card: (c, k) => k.enh === 'wild' && { xmult: 1.5 } },
  {
    key: 'suitbank', arch: 'flush', name: '花色银行', r: 1, price: 5, desc: '留在手里、与第一张计分牌<b>同花色</b>的每张牌 +3 倍率',
    held: (c, k) => c.live[0] && suitIs(k, c.live[0].s) && { mult: 3 },
  },
  // ---- face cards
  { key: 'jester', arch: 'face', name: '弄臣', r: 1, price: 4, desc: '每张计分的人头牌 <b>+4</b> 倍率', card: (c, k) => isFace(k.r) && { mult: 4 } },
  { key: 'crown', arch: 'face', name: '王冠', r: 2, price: 7, desc: '计分牌<b>全是人头牌</b>时 ×2 倍率', hand: (c) => c.live.length > 0 && c.live.every((k) => isFace(k.r)) && { xmult: 2 } },
  { key: 'regent', arch: 'face', name: '摄政王', r: 3, price: 8, desc: '留在手里的每张 <b>K</b> ×1.5 倍率', held: (c, k) => k.r === 13 && { xmult: 1.5 } },
  { key: 'banquet', arch: 'face', name: '宫廷宴会', r: 1, price: 5, desc: '留在手里的每张人头牌 <b>+3</b> 倍率', held: (c, k) => isFace(k.r) && { mult: 3 } },
  // ---- discard builds
  {
    key: 'gale', arch: 'discard', name: '狂风', r: 2, price: 6,
    desc: (j) => `每弃一次牌，倍率永久 +2<br>（当前 <b>+${j ? j.data.n || 0 : 0}</b>）`,
    discard: (cards, j) => { j.data.n = (j.data.n || 0) + 2; },
    hand: (c, j) => j.data.n > 0 && { mult: j.data.n },
  },
  { key: 'lean', arch: 'discard', name: '轻装上阵', r: 1, price: 4, desc: '弃牌次数<b>用完</b>时 +15 倍率', hand: (c) => c.discards === 0 && { mult: 15 } },
  {
    key: 'recycle', arch: 'discard', name: '回收站', r: 1, price: 5, desc: '一次弃掉 <b>5 张</b>牌时得 $3',
    discard: (cards, j, st) => { if (cards.length === 5) { st.money += 3; st.stats.earned += 3; } },
  },
  {
    key: 'scav', arch: 'discard', name: '拾荒者', r: 1, price: 5, desc: '每弃掉 1 张<b>人头牌</b>得 $1',
    discard: (cards, j, st) => { const n = cards.filter((k) => isFace(k.r)).length; st.money += n; st.stats.earned += n; },
  },
  // ---- economy
  { key: 'cat', arch: 'economy', name: '招财猫', r: 1, price: 5, desc: '每打出一手牌得 <b>$1</b>', hand: () => ({ money: 1 }) },
  { key: 'bull', arch: 'economy', name: '牛市', r: 2, price: 6, desc: '每持有 $4 <b>+1</b> 倍率', hand: (c) => c.money >= 4 && { mult: Math.floor(c.money / 4) } },
  { key: 'golden', arch: 'economy', name: '金饭碗', r: 2, price: 7, desc: '每场结束时得 $1 × <b>当前是第几期</b>', money: (j, st) => st.ante },
  {
    key: 'rocket', arch: 'economy', name: '火箭', r: 2, price: 6,
    desc: (j) => `回合结束得 $1，每打过一个 Boss 再多 $2<br>（当前 <b>$${1 + 2 * (j ? j.data.n || 0 : 0)}</b>）`,
    money: (j, st) => { const v = 1 + 2 * (j.data.n || 0); if (st.blindIdx === 2) j.data.n = (j.data.n || 0) + 1; return v; },
  },
  // ---- single-card plays
  { key: 'solo', arch: 'single', name: '独奏', r: 3, price: 8, desc: '只打出 <b>1 张</b>牌时 ×3 倍率', hand: (c) => c.played.length === 1 && { xmult: 3 } },
  { key: 'sniper', arch: 'single', name: '狙击手', r: 1, price: 5, desc: '只打出 <b>1 张</b>牌时 +40 筹码、+8 倍率', hand: (c) => c.played.length === 1 && { chips: 40, mult: 8 } },
  { key: 'lonely', arch: 'single', name: '冷笑话', r: 1, price: 4, desc: '打出<b>没人喜欢</b>的牌时 +20 倍率', crowd: (c) => c.fans === 0 && { mult: 20 } },
  // ---- rewriting the deck
  { key: 'thin', arch: 'deck', name: '瘦身', r: 2, price: 6, desc: '牌组每比 52 张<b>少 1 张</b> +3 倍率', hand: (c) => c.deckList.length < 52 && { mult: 3 * (52 - c.deckList.length) } },
  {
    key: 'glassblow', arch: 'deck', name: '吹玻璃', r: 2, price: 7,
    desc: (j) => `每碎掉 1 张琉璃牌，永久 +×0.5 倍率<br>（当前 <b>×${1 + 0.5 * (j ? j.data.n || 0 : 0)}</b>）`,
    broke: (n, j) => { j.data.n = (j.data.n || 0) + n; },
    hand: (c, j) => j.data.n > 0 && { xmult: 1 + 0.5 * j.data.n },
  },
  { key: 'mason', arch: 'deck', name: '石匠', r: 1, price: 5, desc: '每张计分的<b>加注牌</b>再 +40 筹码', card: (c, k) => k.enh === 'bonus' && { chips: 40 } },
  { key: 'blush', arch: 'deck', name: '胭脂盒', r: 2, price: 6, desc: '每张计分的<b>红晕牌</b> ×1.3 倍率', card: (c, k) => k.enh === 'mult' && { xmult: 1.3 } },
  { key: 'sealer', arch: 'deck', name: '印章师', r: 1, price: 5, desc: '每张计分的<b>带印</b>牌 +8 倍率', card: (c, k) => k.seal && { mult: 8 } },
  {
    key: 'grower', arch: 'deck', name: '老树', r: 2, price: 6, desc: '每张计分牌<b>永久 +3 筹码</b>（写进这张牌）',
    card: (c, k) => { if (!c.preview) { const m = c.deckList.find((x) => x.id === k.id); if (m) m.pc = (m.pc || 0) + 3; } return null; },
  },
  { key: 'anvil', arch: 'deck', name: '铁砧', r: 1, price: 5, desc: '留在手里的每张<b>铁心牌</b> +30 筹码', held: (c, k) => k.enh === 'steel' && { chips: 30 } },
  // ---- hand types
  { key: 'twoC', arch: 'heat', name: '暖场歌手', r: 1, price: 5, desc: '每场<b>第一手</b>牌，热度额外 +1' },
  { key: 'strC', arch: 'crowd', name: '提词员', r: 1, price: 4, desc: '每位<b>喜欢这手牌</b>的观众 +40 筹码', crowd: (c) => c.fans > 0 && { chips: 40 * c.fans } },
  {
    key: 'threeC', arch: 'crowd', name: '现场导播', r: 2, price: 6,
    desc: (j) => `每征服一位观众，永久 +2 倍率<br>（当前 <b>+${2 * (j ? j.data.n || 0 : 0)}</b>）`,
    hand: (c, j) => (j.data.n || 0) > 0 && { mult: 2 * j.data.n },
    crowd: (c, j) => { if (!c.preview) j.data.n = (j.data.n || 0) + c.won; },
  },
  { key: 'quad', arch: 'hand', name: '四重奏', r: 3, price: 8, desc: '出牌含<b>四条</b>时 ×4 倍率', hand: (c) => has(c, 'four') && { xmult: 4 } },
  { key: 'tower', arch: 'hand', name: '长城', r: 3, price: 8, desc: '出牌含<b>顺子</b>时 ×3 倍率', hand: (c) => has(c, 'straight') && { xmult: 3 } },
  { key: 'twin', arch: 'hand', name: '双塔', r: 3, price: 8, desc: '出牌含<b>两对</b>时 ×2.5 倍率', hand: (c) => has(c, 'two') && { xmult: 2.5 } },
  // ---- scaling and odd ones
  {
    key: 'ladder', arch: 'scale', name: '天梯', r: 2, price: 6,
    desc: (j) => `每打出一次含<b>顺子</b>的牌，倍率永久 +4<br>（当前 <b>+${j ? j.data.n || 0 : 0}</b>）`,
    before: (c, j) => { if (has(c, 'straight')) j.data.n = (j.data.n || 0) + 4; },
    hand: (c, j) => j.data.n > 0 && { mult: j.data.n },
  },
  {
    key: 'ice', arch: 'scale', name: '冰柱', r: 1, price: 5,
    desc: (j) => `+100 筹码，每出一手牌少 5<br>（当前 <b>+${Math.max(0, 100 - 5 * (j ? j.data.n || 0 : 0))}</b>）`,
    hand: (c, j) => { const v = Math.max(0, 100 - 5 * (j.data.n || 0)); if (!c.preview) j.data.n = (j.data.n || 0) + 1; return v > 0 && { chips: v }; },
  },
  // previews leave the gamble out, so "预计" never promises a ×4 that may not come
  { key: 'gambler', arch: 'scale', name: '赌徒', r: 2, price: 6, desc: '<b>1/4</b> 概率 ×4 倍率', hand: (c) => !c.preview && rand(c.st) < 0.25 && { xmult: 4 } },
  { key: 'echo', arch: 'scale', name: '回音壁', r: 3, price: 9, desc: '<b>第一张</b>计分牌额外触发 2 次' },
  // ---- playing to the crowd
  { key: 'shill', arch: 'crowd', name: '托儿', r: 1, price: 4, desc: '每位<b>已被征服</b>的观众 +5 倍率', hand: (c) => c.audOk > 0 && { mult: 5 * c.audOk } },
  { key: 'heckler', arch: 'crowd', name: '刺头', r: 2, price: 6, desc: '每位<b>还没被征服</b>的观众 +6 倍率', hand: (c) => c.audN - c.audOk > 0 && { mult: 6 * (c.audN - c.audOk) } },
  { key: 'agent', arch: 'crowd', name: '经纪人', r: 1, price: 5, desc: '观众给的<b>打赏翻倍</b>（全场起立也算）' },
  {
    key: 'claque', arch: 'crowd', name: '领掌人', r: 2, price: 7, desc: '本场<b>全场起立</b>之后，每手 ×2 倍率',
    hand: (c) => c.audN > 0 && c.audOk === c.audN && { xmult: 2 },
  },
  { key: 'encore', arch: 'crowd', name: '返场', r: 3, price: 8, desc: '观众给的 <b>×倍率</b> 再乘一次' },
  {
    key: 'boxoffice', arch: 'crowd', name: '票房', r: 2, price: 6, desc: '每场结束时，每位被征服的观众得 <b>$2</b>',
    money: (j, st) => 2 * (st.audience || []).filter((a) => a.ok).length,
  },
];

export const JD = Object.fromEntries(JOKERS.map((j) => [j.key, j]));
export const descOf = (d, j) => (typeof d.desc === 'function' ? d.desc(j) : d.desc);
export const sellOf = (d) => Math.max(1, Math.floor(d.price / 2));
export const hasJ = (st, key) => st.jokers.some((j) => j.key === key);
