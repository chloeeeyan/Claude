// Modal dialogs: how-to-play, the hand guide (four tabs) and the deck viewer.
import {
  BOSSES, ENH, HANDS, HEAT, JOKERS, REGULAR, SPEC, VIP, OVATION_TIP, SPECTATORS, tipText, RL, SEALS, SNAME, SUITS, SYM, TAROTS, UNLOCKS, VS, chipVal, curBoss, evaluate, handBase, isRed, isUnlocked,
} from '../core/index.js';
import { $, fmt } from './dom.js';
import { cardTitle, jokerFace, miniCard, parseCards } from './components.js';
import { inRound, meta, state } from './store.js';
import { teleCount } from './tele.js';

// [hand, example cards, rule, tip]; 'hidden' is the note that introduces the secret hands
const HAND_EX = [
  ['sflush', '10S 9S 8S 7S 6S', '五张点数连续，而且是同一种花色。', '最难凑，但一手就能拿到大分。'],
  ['four', '6S 6H 6C 6D AH', '四张点数相同的牌。', '第五张不计分，所以也可以只打这四张。'],
  ['full', 'JS JH JC 4D 4S', '三张同点数，再加两张同点数。', '五张全部计分。'],
  ['straight', '9C 8H 7S 6D 5C', '五张点数连续，花色随意。', 'A 既可以当最大（10 J Q K A），也可以当最小（A 2 3 4 5）。比同花难凑，所以分更高。'],
  ['flush', 'KH 10H 7H 4H 2H', '五张同一种花色，点数随意。', '用弃牌把同花色的牌留下来，这是最容易凑的大牌型。'],
  ['three', '8S 8H 8D KC 3S', '三张点数相同的牌。', '只有那三张计分，旁边两张不加分。'],
  ['two', 'QS QD 7C 7H 4S', '两组不同的对子。', '四张计分，第五张不计分。'],
  ['pair', 'KH KC 9S 6D 2H', '两张点数相同的牌。', '只有那一对计分。好牌不想浪费的话，可以只打这两张。'],
  ['high', 'AS JH 8C 5D 3S', '五张牌什么牌型都没凑成。', '只有点数最大的那一张计分，得分最低，尽量避免。'],
  ['hidden', '', '上面三种是隐藏牌型：普通 52 张牌里凑不出来，需要用「复刻」道具把牌复制出相同的，才有机会打出。打出过一次之后，后台才会出现它们的赞助广告。'],
  ['flush5', 'AS AS AS AS AS', '五张完全相同的牌：同点数又同花色。', '最强牌型。'],
  ['flushfull', 'QH QH QH 5H 5H', '葫芦，而且五张同一种花色。', ''],
  ['five', 'KS KS KH KD KC', '五张点数相同的牌。', ''],
];
export { HAND_EX };

function exampleCalc(cards) {
  const ev = evaluate(cards), base = handBase(state, ev.type), on = new Set(ev.scoring);
  const vals = ev.scoring.map((c) => chipVal(c.r));
  const chips = base.c + vals.reduce((a, v) => a + v, 0);
  return { ev, base, on, html: `(<span class="c">${base.c}</span> + ${vals.join(' + ')}) × <span class="m">${base.m}</span> = <span class="t">${fmt(chips * base.m)}</span>` };
}

function scoreTab() {
  const ex = parseCards('KH KC 9S 6D 2H'), r = exampleCalc(ex);
  return `<div class="gsec">
    <p class="hint">每手牌的收视 = 筹码 × 倍率。下面用一手「对子」走一遍。</p>
    <ol class="steps">
      <li><div><b>认牌型。</b>打出这 5 张，系统认出是「对子」。亮起来的两张是计分牌，其余三张不计分。
        <div class="minis">${ex.map((c) => miniCard(c, r.on.has(c) ? 'on' : 'dim')).join('')}</div></div></li>
      <li><div><b>拿基础分。</b>对子现在是 ${state.levels.pair} 级：<span class="badge c">${r.base.c} 筹码</span> × <span class="badge m">${r.base.m} 倍率</span>。</div></li>
      <li><div><b>计分牌加筹码。</b>两张 K 各加 10 筹码。点数筹码：A 是 11，J、Q、K 是 10，2 到 10 按牌面。</div></li>
      <li><div><b>艺人生效。</b>艺人按从左到右的顺序触发。比如带着「谐星」（+4 倍率），倍率就从 ${r.base.m} 变成 ${r.base.m + 4}。</div></li>
      <li><div><b>相乘。</b>没有艺人时：<div class="calc">${r.html}</div></div></li>
    </ol>
    <div class="gx"><div class="gx-h"><b>为什么「×倍率」要放右边</b></div>
      <p>同样两位艺人，「二重奏」（×2）和「谐星」（+4），基础倍率 2：</p>
      <div class="calc">二重奏在左：2 <span class="m">×2</span> = 4，再 <span class="m">+4</span> = <span class="t">8 倍率</span></div>
      <div class="calc">二重奏在右：2 <span class="m">+4</span> = 6，再 <span class="m">×2</span> = <span class="t">12 倍率</span></div>
      <p>先加后乘更划算。拖动艺人就能调整顺序。</p></div>
    <div class="gx"><div class="gx-h"><b>三个省事的习惯</b></div>
      <p>选好牌先别急着出，看计分面板的「预计」分数，够收工会变绿。<br>赞助广告让牌型升级，基础筹码和倍率一起涨，主力牌型优先升。<br>手里的牌凑不出好牌型时，先弃牌换牌，出牌次数比弃牌次数更值钱。</p></div>
  </div>`;
}

function cardsTab() {
  const q = parseCards('QH')[0];
  return `<div class="gsec">
    <p class="hint">增强效果和印都加在具体某张牌上，会一直跟着这张牌。主要通过道具获得，彩绘牌组开局就带几张。</p>
    ${Object.entries(ENH).map(([k, e]) => `<div class="gx"><div class="gx-h">${miniCard({ ...q, enh: k })}<b>${e.n}</b><span class="hint">增强</span></div><p>${e.d}。</p></div>`).join('')}
    ${Object.entries(SEALS).map(([k, e]) => `<div class="gx"><div class="gx-h">${miniCard(q)}<span class="badge seal-${k}">印</span><b>${e.n}</b></div><p>${e.d}。一张牌可以同时有增强和印。</p></div>`).join('')}
    <div class="gx"><div class="gx-h"><b>道具一览</b></div><p>${TAROTS.map((t) => `<b>${t.name}</b>：${t.desc.replace(/<\/?b>/g, '')}`).join('<br>')}</p></div>
  </div>`;
}

function bossTab() {
  return `<div class="gsec">
    <p class="hint">每一期的第三场是黄金档，目标收视是热场的 2.5 倍，黄金档嘉宾还带一个刁难规则。嘉宾坐在前排，也有自己的喜好：一手牌合了嘉宾的口味，规则当场作废（开场扣掉的弃牌、出牌次数和税钱也还给你），再赏 $${VIP.tip}。嘉宾不嘘人，也不影响热度。</p>
    ${Object.values(BOSSES).map((b) => `<div class="gx"><div class="gx-h"><b>${b.n}</b></div><p>${b.d}。${b.vip ? `喜欢：${SPEC[b.vip].d}。` : ''}</p></div>`).join('')}
  </div>`;
}

function handsTab() {
  const b = inRound() ? curBoss(state) : null;
  return `<div class="gsec">
    <p class="hint">从大到小排列。亮起来的牌会计分，暗的不计分。下面的算式用的是你当前的牌型等级。${b && b.halve ? '当前 Boss「燧石」生效中，数值已经减半。' : ''}</p>
    ${HAND_EX.map(([k, str, rule, tip]) => {
      if (k === 'hidden') return `<div class="gx gx-secret"><div class="gx-h"><b>隐藏牌型</b></div><p>${rule}</p></div>`;
      const cards = parseCards(str), r = exampleCalc(cards);
      return `<div class="gx"><div class="gx-h"><b>${HANDS[k].n}</b><span class="badge c">${r.base.c} 筹码</span><span class="badge m">× ${r.base.m}</span>
          <span class="hint">${state.levels[k]} 级 · 本局打过 ${(state.stats.types || {})[k] || 0} 次</span></div>
        <div class="minis">${cards.map((c) => miniCard(c, r.on.has(c) ? 'on' : 'dim')).join('')}</div>
        <p>${rule}${tip}</p><div class="calc">${r.html}</div></div>`;
    }).join('')}
  </div>`;
}

function crowdTab() {
  const tiers = [[1, '好说话'], [2, '要用点心'], [3, '很挑剔']];
  return `<div class="gsec">
    <p class="hint"><b>候场</b>：每一场有 5 位观众排队，只有 3 个座位。选场时点观众换人入场；默认的三位里总有两位口味打架。每请进一位<b>很挑剔</b>的观众，收工时多给 $1。</p>
    <p class="hint">每位观众有一样<b>喜欢</b>（♥）和一样<b>讨厌</b>（✕）：讨好一个，可能惹恼另一个。</p>
    <p class="hint"><b>熟客</b>：这一局里征服过 ${REGULAR.after} 次的挑剔观众（第 2、3 档）会记住你。以后再坐进来，名字前有「熟」字，打赏多 $${REGULAR.money}（或倍率多 ×${REGULAR.xmult}）。</p>
    <p class="hint"><b>热度</b>：每场从「${HEAT[1].n}」开始。一手牌只要有人喜欢（包括已经被征服的），热度 +1；谁都不喜欢，热度 −1；每有一位观众喝倒彩（嘘），再 −1。这手牌的收视按新的热度乘：${HEAT.map((h) => `${h.n} ×${h.x}`).join(' · ')}。<b>别冷场！</b></p>
    <p class="hint">第一次合了谁的口味，谁就被征服，当场打赏（给钱或给这手牌乘倍率）。三位都征服是<b>全场起立</b>：再给 $${OVATION_TIP}，热度直接到「${HEAT[3].n}」。选牌时，会被征服的观众亮黄，会喝倒彩的观众变红，热度表会显示这手打出去会变成多少。</p>
    ${tiers.map(([t, n]) => `<div class="gx"><div class="gx-h"><b>${n}</b></div>
      <p>${SPECTATORS.filter((x) => x.tier === t).map((x) => `<b>${x.n}</b>：♥ ${x.d}（${tipText(x)}）　✕ ${x.nd}`).join('<br>')}</p></div>`).join('')}
  </div>`;
}

// collection: every joker ever seen in a shop, tarots used, bosses beaten, and what is still locked
function collectTab() {
  const seen = new Set(meta.seenJ), owned = new Set(meta.ownedJ), used = new Set(meta.usedT), beat = new Set(meta.bossesBeat);
  return `<div class="gsec">
    <p class="hint">在后台见过的艺人会记在这里，买下过的打勾。一共 ${meta.runs} 局，赢了 ${meta.wins} 局，最远撑到第 ${meta.bestAnte} 期。</p>
    <div class="gx"><div class="gx-h"><b>解锁</b><span class="hint">${UNLOCKS.filter((u) => isUnlocked(meta, u.id)).length}/${UNLOCKS.length}</span></div>
      <p>${UNLOCKS.map((u) => `${isUnlocked(meta, u.id) ? '✔' : '🔒'} <b>${u.n}</b>：${u.need}`).join('<br>')}</p></div>
    <div class="gx"><div class="gx-h"><b>艺人</b><span class="hint">见过 ${seen.size}/${JOKERS.length} · 买过 ${owned.size}</span></div>
      <div class="coll">${JOKERS.map((d) => (seen.has(d.key)
        ? `<div class="coll-i ${owned.has(d.key) ? 'own' : ''}">${jokerFace(d, null)}</div>`
        : '<div class="coll-i"><div class="jk unknown"><span class="ji" aria-hidden="true">?</span><span class="jn">？？？</span><span class="jd">在后台见到后记录</span></div></div>')).join('')}</div></div>
    <div class="gx"><div class="gx-h"><b>道具</b><span class="hint">用过 ${TAROTS.filter((t) => used.has(t.key)).length}/${TAROTS.length}</span></div>
      <p>${TAROTS.map((t) => (used.has(t.key) ? `<b>${t.name}</b>` : `<span class="dim">${t.name}</span>`)).join('　')}</p></div>
    <div class="gx"><div class="gx-h"><b>黄金档嘉宾</b><span class="hint">征服过 ${Object.keys(BOSSES).filter((k) => beat.has(k)).length}/${Object.keys(BOSSES).length}</span></div>
      <p>${Object.entries(BOSSES).map(([k, b]) => (beat.has(k) ? `<b>${b.n}</b>` : `<span class="dim">${b.n}</span>`)).join('　')}</p></div>
    <div class="gx"><div class="gx-h"><b>试玩数据</b><span class="hint">本机记录了 ${teleCount()} 局</span></div>
      <p>每局的牌组、播到第几期、被哪位黄金档嘉宾难倒、用了哪些艺人，只存在这台设备上。参加试玩时，点下面导出发给开发者。</p>
      <div class="cv-tools" style="justify-content:flex-start"><button class="chip on" data-act="teleexport">导出文件</button><button class="chip" data-act="telecopy">复制文本</button></div></div>
  </div>`;
}

export function guideHTML(tab) {
  const tabs = [['hands', '牌型'], ['score', '怎么算分'], ['crowd', '观众'], ['cards', '增强与印'], ['boss', '黄金档嘉宾'], ['collect', '收藏']];
  const head = `<h2>牌型图鉴<button class="chip" data-act="close">关闭</button></h2>
    <div class="gtabs">${tabs.map(([k, n]) => `<button class="chip ${tab === k ? 'on' : ''}" data-act="gtab" data-tab="${k}">${n}</button>`).join('')}</div>`;
  const body = tab === 'score' ? scoreTab() : tab === 'cards' ? cardsTab() : tab === 'boss' ? bossTab() : tab === 'collect' ? collectTab() : tab === 'crowd' ? crowdTab() : handsTab();
  return head + body;
}

function deckHTML() {
  const left = new Set(state.deck.map((c) => c.id));
  const ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const cell = (s, r) => {
    const cs = state.deckList.filter((c) => c.s === s && c.r === r);
    if (!cs.length) return '<span class="x">·</span>';
    const gone = inRound() && cs.every((c) => !left.has(c.id));
    return `<span class="${isRed(s) ? 'red' : ''} ${gone ? 'gone' : ''} ${cs.some((c) => c.enh || c.seal) ? 'enh' : ''}" title="${cs.map(cardTitle).join('\n\n')}">${RL(r)}${cs.length > 1 ? '×' + cs.length : ''}</span>`;
  };
  const special = state.deckList.filter((c) => c.enh || c.seal);
  return `<h2>牌组 · ${state.deckList.length} 张<button class="chip" data-act="close">关闭</button></h2>
    <p class="hint">${inRound() ? `牌堆还剩 ${state.deck.length} 张没抽，暗色是已经在手里或用掉的牌。` : '每场开始时整副牌重新洗匀。'}底部有蓝线的牌带增强效果或印。</p>
    <div class="deckwrap"><div class="deckgrid"><span class="sh"></span>${ranks.map((r) => `<span class="sh">${RL(r)}</span>`).join('')}
    ${SUITS.map((s) => `<span class="sh">${SYM[s] + VS}</span>` + ranks.map((r) => cell(s, r)).join('')).join('')}</div></div>
    ${special.length ? `<p class="hint">特殊牌：${special.map((c) => SNAME[c.s] + RL(c.r) + (c.enh ? '「' + ENH[c.enh].n + '」' : '') + (c.seal ? '「' + SEALS[c.seal].n + '」' : '')).join('、')}</p>` : ''}`;
}

const HELP = `<h2>玩法<button class="chip" data-act="close">知道了</button></h2>
  <ol>
    <li>每一场有一个<b>目标收视</b>。你有几次<b>出牌</b>机会，每次最多打 5 张牌，累计收视达到目标就成功收工。</li>
    <li>每手牌的收视 = <b>筹码 × 倍率</b>。牌型决定基础筹码和倍率（同花顺最高），真正计分的牌再把自己的点数加进筹码。</li>
    <li>不想要的牌可以<b>弃掉</b>换新牌。弃牌次数有限，用来凑同花、顺子很关键。</li>
    <li>收工拿钱，去后台签<b>艺人</b>。艺人从左到右依次触发，所以「×倍率」的艺人放右边，最后乘，收视更高。可以直接拖动排序。</li>
    <li><b>赞助广告</b>让一个牌型永久升级；<b>道具</b>可以改造牌组里的牌：改花色、加增强、盖印。</li>
    <li>每存 $5 回合结束多给 $1 利息，最多 $5，攒钱也是策略。每期第三场是<b>黄金档</b>，黄金档嘉宾有刁难规则，选场时就能看到。台下还有 3 位<b>观众</b>：合他们口味会打赏、热度上升；没人喜欢或有人喝倒彩，热度下降，冷场时收视减半。</li>
  </ol>
  <div class="actions" style="margin-top:16px"><button class="btn gold" data-act="guide" data-tab="hands">看牌型图鉴和示例</button></div>`;

export function openModal(kind, tab) {
  const sh = $('sheet');
  sh.innerHTML = kind === 'guide' ? guideHTML(tab || 'hands') : kind === 'deck' ? deckHTML() : HELP;
  $('modal').hidden = false;
  const btn = sh.querySelector('[data-act="close"]');
  if (btn) btn.focus();
}

export function switchGuideTab(tab) {
  const sh = $('sheet');
  sh.innerHTML = guideHTML(tab);
  sh.scrollTop = 0;
  const t = sh.querySelector(`[data-tab="${tab}"]`);
  if (t) t.focus();
}

export const closeModal = () => { $('modal').hidden = true; };
