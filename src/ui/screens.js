// The table's content for each phase: cover, blind select, round, cash-out, shop, star pack, game over, win.
import { BLIND_NAMES, BOSSES, DECKS, HANDS, JD, PLANETS, REWARD, STAKES, TAGS, curBoss, targetFor } from '../core/index.js';
import { $, fmt } from './dom.js';
import { DECK_MARK, JICON, STAKE_MARK, cardHTML, glyph, jokerFace, planetFace, tarotFace } from './components.js';
import { Sfx } from './sfx.js';
import { records, state, storage, ui } from './store.js';

function blindCard(i) {
  const b = i === 2 ? BOSSES[state.bossKey] : null, cur = i === state.blindIdx, done = i < state.blindIdx;
  const S = STAKES[state.stake];
  const rw = S.noSmall && i === 0 ? 0 : REWARD[i];
  const tag = i < 2 ? TAGS[state.tags[i]] : null;
  return `<div class="bc ${cur ? 'cur' : ''} ${done ? 'done' : ''} ${b ? 'boss' : ''}">
    <span class="lbl">${b ? 'Boss 盲注' : '盲注'}</span>
    <h3>${b ? b.n : BLIND_NAMES[i]}</h3>
    <span class="t">${fmt(targetFor(state, i))}</span>
    <p>${b ? b.d : '没有特殊规则'} · 奖励 ${rw ? '$' + rw : '无'}</p>
    ${tag && !done ? `<div class="tagbox">跳过可得 <b>${tag.n}</b>：${tag.d}</div>` : ''}
    <div class="st">${cur ? `<button class="btn gold" data-act="start">开始</button>${i < 2 ? '<button class="chip" data-act="skip">跳过</button>' : ''}` : done ? '已完成' : '即将到来'}</div></div>`;
}

function summaryHTML() {
  const s = state.stats;
  const top = Object.entries(s.types || {}).sort((a, b) => b[1] - a[1])[0];
  const lineup = state.jokers.map((j) => JD[j.key].name).join('、') || '没有';
  return `<div class="sumgrid">
    <div><span class="lbl">牌组 · 难度</span><b>${DECKS[state.deckKey].n.replace('牌组', '')} · ${STAKES[state.stake].n}</b></div>
    <div><span class="lbl">总得分</span><b>${fmt(s.total)}</b></div>
    <div><span class="lbl">最高单手</span><b>${fmt(s.best)}${s.bestType ? ' · ' + HANDS[s.bestType].n : ''}</b></div>
    <div><span class="lbl">最常打的牌型</span><b>${top ? HANDS[top[0]].n + ' ×' + top[1] : '—'}</b></div>
    <div><span class="lbl">出牌手数</span><b>${s.handsPlayed}</b></div>
    <div><span class="lbl">赚到的钱</span><b>$${s.earned}</b></div>
    <div><span class="lbl">用掉的塔罗 / 星图</span><b>${s.tarots} / ${s.planets}</b></div>
    <div><span class="lbl">跳过的盲注</span><b>${s.skipped}</b></div>
  </div><p class="panel-s">最终阵容：${lineup}<br><span class="seed">本局种子 ${state.seed}（反馈问题时附上，可以重现这一局）</span></p>`;
}

function bossBar() {
  const b = curBoss(state);
  return b ? `<div class="bossbar"><b>BOSS · ${b.n}</b><span>${b.d}</span></div>` : '';
}

// one-time tips, each shown the first time its situation comes up
function coachTip() {
  const p = state.phase, b = curBoss(state);
  if (p === 'play' && b && b.deb) return ['boss', `这一关是 Boss「${b.n}」：${b.d}。被它禁掉的牌盖着红叉、写着「不计分」，打出去也拿不到分，适合先弃掉。`];
  if (p === 'play' && state.cons.length) return ['tarot', '你有塔罗牌了：先点一下塔罗，再在手牌里选中要改造的牌，最后点「使用」。塔罗用一次就没了。'];
  if (p === 'shop') return ['shop', '星图让一种牌型永久升 1 级，没有上限，越升基础分越高，主力牌型最值得买。塔罗是一次性的改牌道具，买下后放进塔罗栏，下一关开打时使用。'];
  if (p === 'play' && state.jokers.length) return ['joker', '小丑从左往右依次触发。拖动小丑可以换顺序，「×倍率」的放在最右边，最后乘，分数最高。'];
  return null;
}
function coachHTML(inline) {
  const t = coachTip();
  if (!t || ui.tipsSeen.includes(t[0])) return '';
  return `<div class="coach${inline ? ' inline' : ''}" role="note"><b>小提示</b><p>${t[1]}</p><button class="chip" data-act="tipok" data-k="${t[0]}">知道了</button></div>`;
}

function menuHTML() {
  const rec = records();
  const last = storage.get('last', null);
  const fan = [[10, 'S'], [11, 'H'], [12, 'D'], [13, 'C'], [14, 'H']].map(([r, s], i) => cardHTML({ id: 'hf' + i, r, s, enh: null, seal: null }, 'none')).join('');
  const lastHTML = last
    ? `<div class="lastrun"><span class="lbl">上一局</span>
      <b>${last.win ? '通关！' : `止步底注 ${last.ante} · ${last.blind === 2 ? 'Boss' : BLIND_NAMES[last.blind]}`}</b>
      <span>${DECKS[last.deck] ? DECKS[last.deck].n : ''} · ${STAKES[last.stake] ? STAKES[last.stake].n : ''} · 最高单手 ${fmt(last.best || 0)}${last.bestType ? '（' + HANDS[last.bestType].n + '）' : ''}</span>
      <span class="lr-j">${(last.jokers || []).filter((k) => JD[k]).map((k) => `<i title="${JD[k].name}">${glyph(JICON[k] || '★')}</i>`).join('') || '没带小丑'}</span></div>`
    : '<div class="lastrun"><span class="lbl">上一局</span><b>还没有记录</b><span>打完第一局，这里会记下你走到了哪一关。</span></div>';
  return `<div class="cv">
    <aside class="cv-side l">
      <div class="cvp"><span class="cvp-k">HOW TO PLAY<small>三步上手</small></span>
        <div class="how"><em>1</em><b>选牌出牌</b><span>凑出对子、同花、顺子这些牌型</span></div>
        <div class="how"><em>2</em><b>筹码 × 倍率</b><span>牌型定基础分，计分牌再加点数</span></div>
        <div class="how"><em>3</em><b>买小丑叠效果</b><span>过关去商店，小丑效果层层叠加</span></div>
        <div class="cv-tools"><button class="chip" data-act="help">玩法</button><button class="chip" data-act="guide">牌型图鉴</button><button class="chip" data-act="sound">音效 ${Sfx.on ? '开' : '关'}</button></div>
      </div>
    </aside>
    <section class="cv-main">
      <div class="cv-title"><div class="cv-fan" aria-hidden="true">${fan}</div>
        <h1 class="cv-logo">鬼牌夜场</h1><div class="cv-en">DEAL · STACK · KA-BOOM!</div><div class="cv-zh">凑牌型 · 叠倍率 · 炸翻全场</div></div>
      <div class="cv-eb">CHOOSE YOUR DECK<small>选牌组</small></div>
      <div class="cv-decks" role="group" aria-label="选牌组">${Object.entries(DECKS).map(([k, d]) => `<button class="cvdk ${state.menuDeck === k ? 'on' : ''}" data-act="mdeck" data-v="${k}" aria-pressed="${state.menuDeck === k}">
        <span class="dback d-${k}"><i>${glyph(DECK_MARK[k])}</i></span><b>${d.n.replace('牌组', '')}</b><span class="dd">${d.d}</span></button>`).join('')}</div>
      <div class="cv-eb">DIFFICULTY<small>选难度</small></div>
      <div class="cv-stakes" role="group" aria-label="选难度">${STAKES.map((s, i) => `<button class="skp ${state.menuStake === i ? 'on' : ''}" data-act="mstake" data-v="${i}" aria-pressed="${state.menuStake === i}"><b><i>${STAKE_MARK[i]}</i>${s.n}</b><span>${s.d}</span></button>`).join('')}</div>
      <button class="btn cv-start" data-act="begin">开始游戏<span class="en">LET'S PLAY</span></button>
    </section>
    <aside class="cv-side r">
      <div class="cvp"><span class="cvp-k">RECORDS<small>战绩板</small></span>
        ${STAKES.map((s, i) => {
          const a = rec[i] || 0;
          return `<div class="recrow"><span>${s.n}</span><i class="pips">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<b class="${n <= Math.min(a, 8) ? 'on' : ''} ${a > 8 ? 'win' : ''}"></b>`).join('')}</i><em>${a ? (a > 8 ? '通关' : '底注 ' + a) : '—'}</em></div>`;
        }).join('')}
        ${lastHTML}
      </div>
    </aside>
  </div>`;
}

function roundHTML() {
  const n = state.selected.length, busy = state.phase === 'scoring', tip = coachHTML();
  const hand = state.hand;
  return `${bossBar()}${tip}
    <div class="played-wrap">${state.played.length
      ? `<div class="played" style="--n:${state.played.length}">${state.played.map((c) => cardHTML(c, 'none')).join('')}</div>`
      : tip ? '' : '<p class="mat-hint">点牌选中，凑出牌型后出牌<br>不想要的牌可以弃掉换新的</p>'}</div>
    <div class="hand" style="--n:${Math.max(hand.length, 1)}">${hand.map((c, i) => cardHTML(c, 'card', { o: i - (hand.length - 1) / 2 })).join('')}</div>
    <div class="actions">
      <button class="btn danger" data-act="discard" ${busy || !n || state.discards <= 0 ? 'disabled' : ''}>弃牌<small>${state.discards}</small></button>
      <div class="sorts"><span>排序</span>
        <button class="chip ${state.sort === 'rank' ? 'on' : ''}" data-act="sort" data-v="rank" ${busy ? 'disabled' : ''}>点数</button>
        <button class="chip ${state.sort === 'suit' ? 'on' : ''}" data-act="sort" data-v="suit" ${busy ? 'disabled' : ''}>花色</button></div>
      <button class="btn primary" data-act="play" ${busy || !n ? 'disabled' : ''}>出牌<small>${state.hands}</small></button>
    </div>
    <div class="foot"><span class="keys"><kbd>1</kbd>–<kbd>8</kbd> 选牌 · <kbd>Enter</kbd> 出牌 · <kbd>D</kbd> 弃牌 · <kbd>S</kbd> 换排序</span></div>`;
}

function cashoutHTML() {
  const total = state.cash.reduce((a, l) => a + l.v, 0);
  // what comes next: this ante's next blind, or a fresh ante whose boss is not rolled yet
  const nb = state.blindIdx < 2 ? { ante: state.ante, i: state.blindIdx + 1 } : { ante: state.ante + 1, i: 0 };
  const nbBoss = nb.i === 2 && nb.ante === state.ante ? BOSSES[state.bossKey] : null;
  const nbTarget = targetFor({ ...state, ante: nb.ante }, nb.i);
  const nbNote = nbBoss ? nbBoss.d + '。提前在商店里做好准备。'
    : nb.ante !== state.ante ? '进入新的底注，目标分数会明显变高，Boss 到时揭晓。' : '没有特殊规则，可以跳过它换奖励券。';
  return `<h2 class="panel-t" data-en="CASH OUT">过关！得分 ${fmt(state.roundScore)}</h2>
    <div class="cash2">
      <div class="cashcol"><div class="ledger">${state.cash.map((l) => `<div><span>${l.t}</span><b>+$${l.v}</b></div>`).join('') || '<div><span>这一关没有收入</span><b>$0</b></div>'}
        <div class="ledger-sum"><span>合计</span><b>$${total}</b></div></div>
        <button class="btn gold" data-act="cashout">领取 $${total}，去商店</button></div>
      <div class="nextcard ${nbBoss ? 'boss' : ''}">
        <span class="nc-k">下一关</span>
        <h3>${nbBoss ? 'Boss · ' + nbBoss.n : BLIND_NAMES[nb.i]}${nb.ante !== state.ante ? ` <small>底注 ${nb.ante}</small>` : ''}</h3>
        <div class="nc-t">${fmt(nbTarget)}<small>目标分数</small></div>
        <p>${nbNote}</p>
        <div class="nc-shop"><b>商店里有</b>2 张小丑 · 1 张星图 · 1 张塔罗 · 1 个星图包</div>
      </div>
    </div>`;
}

function packHTML() {
  return `<h2 class="panel-t" data-en="STAR PACK">星图包 · 挑一张</h2>
    <p class="panel-s">选中的牌型立刻升 1 级。数字是升级后的基础筹码和倍率。</p>
    <div class="shopgrid">${state.pack.map((k) => {
      const h = HANDS[k], l = state.levels[k];
      return `<div class="item">${planetFace(PLANETS[k], `${h.n} ${l}→${l + 1} 级<br>${h.c + h.dc * l} 筹码 × ${h.m + h.dm * l} 倍率<br>本局打过 ${(state.stats.types || {})[k] || 0} 次`)}
        <button class="btn gold buy" data-act="pickpack" data-v="${k}">选这张</button></div>`;
    }).join('')}</div>`;
}

function shopHTML() {
  const items = state.shop.map((it, i) => {
    const can = state.money >= it.price && !it.sold;
    let face;
    if (it.kind === 'joker') face = jokerFace(JD[it.key], null);
    else if (it.kind === 'pack') face = planetFace('三选一', '打开后从 3 张星图里挑 1 张，让对应牌型升 1 级', '星图包');
    else if (it.kind === 'planet') {
      const h = HANDS[it.key], l = state.levels[it.key];
      face = planetFace(PLANETS[it.key], `${h.n} ${l}→${l + 1} 级<br>+${h.dc} 筹码 +${h.dm} 倍率`);
    } else {
      const own = state.cons.filter((c) => c.key === it.key).length;
      face = tarotFace(it.key, 'div', 'style="cursor:default"') + (own ? `<span class="owned">已有 ${own} 张</span>` : '');
    }
    return `<div class="item ${it.sold ? 'sold' : ''}">${face}<span class="price">$${it.price}</span>
      <button class="btn gold buy" data-act="buy" data-i="${i}" ${can ? '' : 'disabled'}>${it.sold ? '已买' : '购买'}</button></div>`;
  }).join('');
  return `<h2 class="panel-t" data-en="THE SHOP">商店</h2>
    ${coachHTML(true) || '<p class="panel-s"><b>星图</b>：一种牌型永久升 1 级，可以一直叠加。<b>塔罗</b>：一次性道具，下一关里对手牌使用。</p>'}
    <div class="shopgrid">${items}</div>
    <div class="shopbar">
      <button class="btn ghost" data-act="reroll" ${state.money >= state.rerollCost ? '' : 'disabled'}>刷新 $${state.rerollCost}</button>
      <button class="btn primary" data-act="next">下一个盲注</button></div>`;
}

export function renderStage() {
  const st = $('stage'), p = state.phase;
  st.classList.toggle('busy', p === 'scoring');
  if (p === 'play' || p === 'scoring') st.innerHTML = roundHTML();
  else if (p === 'menu') st.innerHTML = menuHTML();
  else if (p === 'select') {
    st.innerHTML = `<h2 class="panel-t" data-en="CHOOSE YOUR BLIND">底注 ${state.ante} / 8</h2>
      <p class="panel-s">每个底注有三个盲注，得分达到目标就过关。小盲注和大盲注可以跳过，换一张奖励券，但也拿不到这一关的钱和商店。</p>
      <div class="blinds">${[0, 1, 2].map(blindCard).join('')}</div>`;
  } else if (p === 'cashout') st.innerHTML = cashoutHTML();
  else if (p === 'shop') st.innerHTML = state.pack ? packHTML() : shopHTML();
  else if (p === 'over') {
    const where = state.blindIdx === 2 ? 'Boss 盲注「' + BOSSES[state.bossKey].n + '」' : BLIND_NAMES[state.blindIdx];
    st.innerHTML = `<div class="center"><h2 class="panel-t" data-en="GAME OVER">牌局结束</h2>
      <p class="panel-s">止步于底注 ${state.ante} 的${where}，还差 ${fmt(state.target - state.roundScore)} 分。</p>
      ${summaryHTML()}<button class="btn gold" data-act="restart">回到开局</button></div>`;
  } else if (p === 'win') {
    st.innerHTML = `<div class="center"><h2 class="panel-t" data-en="YOU WIN!">通关！八个底注全部拿下</h2>
      ${summaryHTML()}<button class="btn gold" data-act="restart">回到开局</button></div>`;
  }
}
