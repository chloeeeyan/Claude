// Modal dialogs: how-to-play, the hand guide (four tabs) and the deck viewer.
import { BOSSES, ENH, HANDS, RL, SEALS, SNAME, SUITS, SYM, TAROTS, VS, chipVal, curBoss, evaluate, handBase, isRed } from '../core/index.js';
import { $, fmt } from './dom.js';
import { cardTitle, miniCard, parseCards } from './components.js';
import { inRound, state } from './store.js';

// [hand, example cards, rule, tip]; 'hidden' is the note that introduces the secret hands
const HAND_EX = [
  ['sflush', '10S 9S 8S 7S 6S', '五张点数连续，而且是同一种花色。', '最难凑，但一手就能拿到大分。'],
  ['four', '6S 6H 6C 6D AH', '四张点数相同的牌。', '第五张不计分，所以也可以只打这四张。'],
  ['full', 'JS JH JC 4D 4S', '三张同点数，再加两张同点数。', '五张全部计分。'],
  ['flush', 'KH 10H 7H 4H 2H', '五张同一种花色，点数随意。', '用弃牌把同花色的牌留下来，这是最容易凑的大牌型。'],
  ['straight', '9C 8H 7S 6D 5C', '五张点数连续，花色随意。', 'A 既可以当最大（10 J Q K A），也可以当最小（A 2 3 4 5）。'],
  ['three', '8S 8H 8D KC 3S', '三张点数相同的牌。', '只有那三张计分，旁边两张不加分。'],
  ['two', 'QS QD 7C 7H 4S', '两组不同的对子。', '四张计分，第五张不计分。'],
  ['pair', 'KH KC 9S 6D 2H', '两张点数相同的牌。', '只有那一对计分。好牌不想浪费的话，可以只打这两张。'],
  ['high', 'AS JH 8C 5D 3S', '五张牌什么牌型都没凑成。', '只有点数最大的那一张计分，得分最低，尽量避免。'],
  ['hidden', '', '上面三种是隐藏牌型：普通 52 张牌里凑不出来，需要用「复刻」塔罗把牌复制出相同的，才有机会打出。打出过一次之后，商店里才会出现它们的星图。'],
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
    <p class="hint">每手牌的得分 = 筹码 × 倍率。下面用一手「对子」走一遍。</p>
    <ol class="steps">
      <li><div><b>认牌型。</b>打出这 5 张，系统认出是「对子」。亮起来的两张是计分牌，其余三张不计分。
        <div class="minis">${ex.map((c) => miniCard(c, r.on.has(c) ? 'on' : 'dim')).join('')}</div></div></li>
      <li><div><b>拿基础分。</b>对子现在是 ${state.levels.pair} 级：<span class="badge c">${r.base.c} 筹码</span> × <span class="badge m">${r.base.m} 倍率</span>。</div></li>
      <li><div><b>计分牌加筹码。</b>两张 K 各加 10 筹码。点数筹码：A 是 11，J、Q、K 是 10，2 到 10 按牌面。</div></li>
      <li><div><b>小丑生效。</b>小丑按从左到右的顺序触发。比如带着「小丑」（+4 倍率），倍率就从 ${r.base.m} 变成 ${r.base.m + 4}。</div></li>
      <li><div><b>相乘。</b>没有小丑时：<div class="calc">${r.html}</div></div></li>
    </ol>
    <div class="gx"><div class="gx-h"><b>为什么「×倍率」要放右边</b></div>
      <p>同样两张小丑，「二重奏」（×2）和「小丑」（+4），基础倍率 2：</p>
      <div class="calc">二重奏在左：2 <span class="m">×2</span> = 4，再 <span class="m">+4</span> = <span class="t">8 倍率</span></div>
      <div class="calc">二重奏在右：2 <span class="m">+4</span> = 6，再 <span class="m">×2</span> = <span class="t">12 倍率</span></div>
      <p>先加后乘更划算。拖动小丑就能调整顺序。</p></div>
    <div class="gx"><div class="gx-h"><b>三个省事的习惯</b></div>
      <p>选好牌先别急着出，看计分面板的「预计」分数，够过关会变绿。<br>星图让牌型升级，基础筹码和倍率一起涨，主力牌型优先升。<br>手里的牌凑不出好牌型时，先弃牌换牌，出牌次数比弃牌次数更值钱。</p></div>
  </div>`;
}

function cardsTab() {
  const q = parseCards('QH')[0];
  return `<div class="gsec">
    <p class="hint">增强效果和印都加在具体某张牌上，会一直跟着这张牌。主要通过塔罗牌获得，彩绘牌组开局就带几张。</p>
    ${Object.entries(ENH).map(([k, e]) => `<div class="gx"><div class="gx-h">${miniCard({ ...q, enh: k })}<b>${e.n}</b><span class="hint">增强</span></div><p>${e.d}。</p></div>`).join('')}
    ${Object.entries(SEALS).map(([k, e]) => `<div class="gx"><div class="gx-h">${miniCard(q)}<span class="badge seal-${k}">印</span><b>${e.n}</b></div><p>${e.d}。一张牌可以同时有增强和印。</p></div>`).join('')}
    <div class="gx"><div class="gx-h"><b>塔罗一览</b></div><p>${TAROTS.map((t) => `<b>${t.name}</b>：${t.desc.replace(/<\/?b>/g, '')}`).join('<br>')}</p></div>
  </div>`;
}

function bossTab() {
  return `<div class="gsec">
    <p class="hint">每个底注的第三关是 Boss 盲注，目标分数是小盲注的 2 倍，还带一个限制。开局选盲注时就能看到是哪一个。</p>
    ${Object.values(BOSSES).map((b) => `<div class="gx"><div class="gx-h"><b>${b.n}</b></div><p>${b.d}。</p></div>`).join('')}
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

export function guideHTML(tab) {
  const tabs = [['hands', '牌型'], ['score', '怎么算分'], ['cards', '增强与印'], ['boss', 'Boss']];
  const head = `<h2>牌型图鉴<button class="chip" data-act="close">关闭</button></h2>
    <div class="gtabs">${tabs.map(([k, n]) => `<button class="chip ${tab === k ? 'on' : ''}" data-act="gtab" data-tab="${k}">${n}</button>`).join('')}</div>`;
  const body = tab === 'score' ? scoreTab() : tab === 'cards' ? cardsTab() : tab === 'boss' ? bossTab() : handsTab();
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
    <p class="hint">${inRound() ? `牌堆还剩 ${state.deck.length} 张没抽，暗色是已经在手里或用掉的牌。` : '每个盲注开始时整副牌重新洗匀。'}底部有蓝线的牌带增强效果或印。</p>
    <div class="deckwrap"><div class="deckgrid"><span class="sh"></span>${ranks.map((r) => `<span class="sh">${RL(r)}</span>`).join('')}
    ${SUITS.map((s) => `<span class="sh">${SYM[s] + VS}</span>` + ranks.map((r) => cell(s, r)).join('')).join('')}</div></div>
    ${special.length ? `<p class="hint">特殊牌：${special.map((c) => SNAME[c.s] + RL(c.r) + (c.enh ? '「' + ENH[c.enh].n + '」' : '') + (c.seal ? '「' + SEALS[c.seal].n + '」' : '')).join('、')}</p>` : ''}`;
}

const HELP = `<h2>玩法<button class="chip" data-act="close">知道了</button></h2>
  <ol>
    <li>每个盲注有一个<b>目标分数</b>。你有几次<b>出牌</b>机会，每次最多打 5 张牌，累计得分达到目标就过关。</li>
    <li>每手牌的得分 = <b>筹码 × 倍率</b>。牌型决定基础筹码和倍率（同花顺最高），真正计分的牌再把自己的点数加进筹码。</li>
    <li>不想要的牌可以<b>弃掉</b>换新牌。弃牌次数有限，用来凑同花、顺子很关键。</li>
    <li>过关拿钱，去商店买<b>小丑</b>。小丑从左到右依次触发，所以「×倍率」的小丑放右边，最后乘，分数更高。可以直接拖动排序。</li>
    <li><b>星图</b>让一个牌型永久升级；<b>塔罗</b>可以改造牌组里的牌：改花色、加增强、盖印。</li>
    <li>每存 $5 回合结束多给 $1 利息，最多 $5，攒钱也是策略。第三个盲注是 <b>Boss</b>，有特殊限制，开局前就能看到。</li>
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
