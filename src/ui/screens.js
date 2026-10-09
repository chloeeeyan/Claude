// The table's content for each phase: cover, blind select, round, cash-out, shop, star / tarot pack, game over, win.
import {
  BLIND_NAMES, BOSSES, DECKS, HANDS, JD, JOKER_COUNT, PLANETS, REWARD, STAKES, TAGS, TD, UNLOCK, VOUCHERS, curBoss, dailyKey, dailySetup, isUnlocked,
  computeHand, packCards, targetFor, SEATS, SPEC, VIP, pickBonus,
} from '../core/index.js';
import { $, fmt } from './dom.js';
import { DECK_MARK, JICON, STAKE_MARK, cardHTML, glyph, heatHTML, jokerFace, planetFace, seatHTML, tarotFace, voucherFace } from './components.js';
import { patch } from './patch.js';
import { Sfx } from './sfx.js';
import { isEN } from '../i18n/index.js';
import { inRound, meta, records, state, storage, ui } from './store.js';

function blindCard(i) {
  const b = i === 2 ? BOSSES[state.bossKey] : null, cur = i === state.blindIdx, done = i < state.blindIdx;
  const S = STAKES[state.stake];
  const rw = S.noSmall && i === 0 ? 0 : REWARD[i];
  const tag = i < 2 ? TAGS[state.tags[i]] : null;
  const seated = ((state.picks && state.picks[i]) || []).length;
  return `<div class="bc ${cur ? 'cur' : ''} ${done ? 'done' : ''} ${b ? 'boss' : ''}">
    <div class="bc-h"><div><span class="lbl">${b ? '黄金档嘉宾' : '节目'}</span><h3>${b ? b.n : BLIND_NAMES[i]}</h3></div><span class="t">${fmt(targetFor(state, i))}</span></div>
    <p>${b ? b.d : '没有刁难规则'} · 奖励 ${rw ? '$' + rw : '无'}</p>
    ${b && b.vip ? `<p class="vipnote">★ 嘉宾坐前排，喜欢「${SPEC[b.vip].d}」：征服他，规则作废，再赏 $${VIP.tip}</p>` : ''}
    ${crowdPicker(i, done)}
    ${tag && !done ? `<div class="tagbox">跳过可得 <b>${tag.n}</b>：${tag.d}</div>` : ''}
    <div class="st">${cur ? `<button class="btn gold" data-act="start" ${seated < SEATS ? 'disabled' : ''}>${seated < SEATS ? `再选 ${SEATS - seated} 位观众` : '开始'}</button>${i < 2 ? '<button class="chip" data-act="skip" title="跳过这场，换奖励券（没有这场的钱和后台）">跳过</button>' : ''}` : done ? '已完成' : '即将到来'}</div></div>`;
}

// 候场: the show's queue of five; tap to seat or unseat (three seats). Picky spectators (tier 2+) pay $1 each at the end.
function crowdPicker(i, done) {
  const q = state.crowds && state.crowds[i];
  if (!q) return '';
  const p = (state.picks && state.picks[i]) || [], live = !done && state.phase === 'select';
  return `<div class="bc-crowd ${live ? 'live' : ''}">
    <div class="bc-ck"><b>候场 · 入场 ${p.length}/${SEATS}</b>${pickBonus(state, i) ? `<span>挑剔观众 +$${pickBonus(state, i)}</span>` : ''}</div>
    ${q.map((k, n) => {
      const on = p.includes(n);
      return live ? `<div class="pickseat ${on ? 'on' : ''}" role="button" tabindex="0" aria-pressed="${on}" data-act="pick" data-v="${i}:${n}">${seatHTML(k, n, on ? '' : 'out')}</div>`
        : on ? seatHTML(k, n) : '';
    }).join('')}</div>`;
}

function summaryHTML() {
  const s = state.stats;
  const top = Object.entries(s.types || {}).sort((a, b) => b[1] - a[1])[0];
  const lineup = state.jokers.map((j) => JD[j.key].name).join('、') || '没有';
  return `<div class="sumgrid">
    <div><span class="lbl">牌组 · 难度</span><b>${DECKS[state.deckKey].n.replace('牌组', '')} · ${STAKES[state.stake].n}</b></div>
    <div><span class="lbl">总收视</span><b>${fmt(s.total)}</b></div>
    <div><span class="lbl">最高单手</span><b>${fmt(s.best)}${s.bestType ? ' · ' + HANDS[s.bestType].n : ''}</b></div>
    <div><span class="lbl">最常打的牌型</span><b>${top ? HANDS[top[0]].n + ' ×' + top[1] : '—'}</b></div>
    <div><span class="lbl">出牌手数</span><b>${s.handsPlayed}</b></div>
    <div><span class="lbl">赚到的钱</span><b>$${s.earned}</b></div>
    <div><span class="lbl">用掉的道具 / 广告</span><b>${s.tarots} / ${s.planets}</b></div>
    <div><span class="lbl">跳过的场次</span><b>${s.skipped}</b></div>
  </div><p class="panel-s">最终阵容：${lineup}<br><span class="seed">本局种子 ${state.seed}（反馈问题时附上，可以重现这一局）</span></p>`;
}

function bossBar() {
  const b = curBoss(state);
  if (b && (state.audience || []).some((a) => a.vip)) return ''; // the guest sits in the crowd, rule on their seat
  return b ? `<div class="bossbar"><b>黄金档 · ${b.n}</b><span>${b.d}</span></div>` : '';
}

// the stalls during a show: the heat, who is won over, and who the selected cards would win over or annoy
function crowdHTML() {
  const aud = state.audience || [];
  if (!aud.length) return '';
  let will = [], boos = [], next = null;
  const sel = state.hand.filter((c) => state.selected.includes(c.id));
  if (state.phase === 'play' && sel.length) {
    const r = computeHand(state, sel, state.hand.filter((c) => !state.selected.includes(c.id)), { preview: true });
    will = r.sat || []; boos = r.boos || []; next = r.heat;
  }
  const won = aud.filter((a) => a.ok && !a.vip).length, seats = aud.filter((a) => !a.vip).length;
  return `<div class="crowd" aria-label="观众">${heatHTML(state.heat ?? 1, next)}<span class="cr-k"><i class="en">CROWD</i>观众 ${won}/${seats}</span>
    ${aud.map((a, i) => seatHTML(a.key, i, boos.includes(i) ? 'boo' : a.ok ? 'ok' : will.includes(i) ? 'will' : '', a.vip ? curBoss(state) : null)).join('')}</div>`;
}

// one-time tips, each shown the first time its situation comes up
function coachTip() {
  const p = state.phase, b = curBoss(state);
  if (p === 'play' && b && b.deb) return ['boss', `这一场的黄金档嘉宾是「${b.n}」：${b.d}。被它禁掉的牌盖着红叉、写着「不计分」。嘉宾坐在前排：合了嘉宾的口味（${SPEC[b.vip].d}），规则就作废。`];
  if (p === 'play' && state.cons.length) return ['tarot', '你有道具了：先点一下道具，再在手牌里选中要改造的牌，最后点「使用」。道具用一次就没了。'];
  if (p === 'shop') return ['shop', '赞助广告让一种牌型永久升 1 级，没有上限，越升基础分越高，主力牌型最值得买。道具箱里 3 选 1：可以当场改造牌组里的牌，也可以收进道具栏，留到对局里用在手牌上。'];
  if (p === 'play' && state.jokers.length) return ['joker', '艺人从左往右依次触发。拖动艺人可以换顺序，「×倍率」的放在最右边，最后乘，分数最高。'];
  return null;
}
function coachHTML(inline) {
  const t = coachTip();
  if (!t || ui.tipsSeen.includes(t[0])) return '';
  return `<div class="coach${inline ? ' inline' : ''}" role="note"><b>小提示</b><p>${t[1]}</p><button class="chip" data-act="tipok" data-k="${t[0]}">知道了</button></div>`;
}

function dailyButton() {
  const key = dailyKey(), D = dailySetup(key), r = meta.daily[key];
  return `<button class="btn cv-daily" data-act="daily"><span class="en">DAILY</span>每日挑战
    <small>${key.slice(5).replace('-', '月')}日 · ${DECKS[D.deck].n.replace('牌组', '')}牌组${r ? ` · 最佳 ${r.ante > 8 ? '通关' : '第 ' + r.ante + ' 期'}` : ''}</small></button>`;
}

// what the run that just ended unlocked, plus the daily-challenge result
function endExtras(lead = '') {
  const u = ui.newUnlocks.length ? `<div class="unlocks"><b>新解锁！</b>${ui.newUnlocks.map((x) => `<span>${x.n}</span>`).join('')}</div>` : '';
  const r = state.daily && meta.daily[state.daily];
  const d = r ? `<p class="panel-s">每日挑战 ${state.daily} · 今日最佳 ${r.ante > 8 ? '通关' : '第 ' + r.ante + ' 期'} · ${fmt(r.score)} 分 · 第 ${r.tries} 次</p>` : '';
  return `<div class="end-x">${lead}${u}${d}<button class="btn gold" data-act="restart">回到开局</button></div>`;
}

function menuHTML() {
  const rec = records();
  const last = storage.get('last', null);
  const fan = [[10, 'S'], [11, 'H'], [12, 'D'], [13, 'C'], [14, 'H']].map(([r, s], i) => cardHTML({ id: 'hf' + i, r, s, enh: null, seal: null }, 'none')).join('');
  const lastHTML = last
    ? `<div class="lastrun"><span class="lbl">上一局</span>
      <b>${last.win ? '通关！' : `止步第 ${last.ante} 期 · ${last.blind === 2 ? '黄金档' : BLIND_NAMES[last.blind]}`}</b>
      <span>${DECKS[last.deck] ? DECKS[last.deck].n : ''} · ${STAKES[last.stake] ? STAKES[last.stake].n : ''} · 最高单手 ${fmt(last.best || 0)}${last.bestType ? '（' + HANDS[last.bestType].n + '）' : ''}</span>
      <span class="lr-j">${(last.jokers || []).filter((k) => JD[k]).map((k) => `<i title="${JD[k].name}">${glyph(JICON[k] || '★')}</i>`).join('') || '没带艺人'}</span></div>`
    : '<div class="lastrun"><span class="lbl">上一局</span><b>还没有记录</b><span>打完第一局，这里会记下你播到了第几期。</span></div>';
  return `<div class="cv">
    <aside class="cv-side l">
      <div class="cvp"><span class="cvp-k">HOW TO PLAY<small>三步上手</small></span>
        <div class="how"><em>1</em><b>选牌出牌</b><span>凑出对子、同花、顺子这些牌型</span></div>
        <div class="how"><em>2</em><b>筹码 × 倍率</b><span>牌型定基础分，计分牌再加点数</span></div>
        <div class="how"><em>3</em><b>签艺人叠效果</b><span>收工后去后台，艺人效果层层叠加</span></div>
        <div class="cv-tools"><button class="chip" data-act="help">玩法</button><button class="chip" data-act="guide">牌型图鉴</button><button class="chip" data-act="sound">音效 ${Sfx.on ? '开' : '关'}</button><button class="chip rot-only" data-act="landscape">横屏玩</button><button class="chip" data-act="lang" lang="${isEN ? 'zh' : 'en'}">${isEN ? '中文' : 'English'}</button></div>
      </div>
    </aside>
    <section class="cv-main">
      <div class="cv-title"><div class="cv-fan" aria-hidden="true">${fan}</div>
        <h1 class="cv-logo">别冷场！</h1><div class="cv-en">TOUGH CROWD</div><div class="cv-zh">读观众 · 凑牌型 · 炸翻全场</div></div>
      <div class="cv-eb">CHOOSE YOUR DECK<small>选牌组</small></div>
      <div class="cv-decks" role="group" aria-label="选牌组">${Object.entries(DECKS).map(([k, d]) => {
        const open = isUnlocked(meta, 'deck:' + k);
        return `<button class="cvdk ${state.menuDeck === k ? 'on' : ''} ${open ? '' : 'locked'}" data-act="mdeck" data-v="${k}" aria-pressed="${state.menuDeck === k}" ${open ? '' : 'aria-disabled="true"'}>
        <span class="dback d-${k}"><i>${glyph(open ? DECK_MARK[k] : '🔒')}</i></span><b>${d.n.replace('牌组', '')}</b><span class="dd">${open ? d.d : '解锁：' + UNLOCK['deck:' + k].need}</span></button>`;
      }).join('')}</div>
      <div class="cv-eb">DIFFICULTY<small>选难度</small></div>
      <div class="cv-stakes" role="group" aria-label="选难度">${STAKES.map((s, i) => {
        const open = isUnlocked(meta, 'stake:' + i);
        return `<button class="skp ${state.menuStake === i ? 'on' : ''} ${open ? '' : 'locked'}" data-act="mstake" data-v="${i}" aria-pressed="${state.menuStake === i}" ${open ? '' : 'aria-disabled="true"'}><b><i>${open ? STAKE_MARK[i] : '🔒'}</i>${s.n}</b><span>${open ? s.d : '解锁：' + UNLOCK['stake:' + i].need}</span></button>`;
      }).join('')}</div>
      <div class="cv-go"><button class="btn cv-start" data-act="begin">开始游戏<span class="en">LET'S PLAY</span></button>${dailyButton()}</div>
    </section>
    <aside class="cv-side r">
      <div class="cvp"><span class="cvp-k">RECORDS<small>战绩板</small></span>
        ${STAKES.map((s, i) => {
          const a = rec[i] || 0;
          return `<div class="recrow"><span>${s.n}</span><i class="pips">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<b class="${n <= Math.min(a, 8) ? 'on' : ''} ${a > 8 ? 'win' : ''}"></b>`).join('')}</i><em>${a ? (a > 8 ? '通关' : '第 ' + a + ' 期') : '—'}</em></div>`;
        }).join('')}
        ${lastHTML}
        <button class="cv-coll" data-act="collect"><span>收藏</span><b>${meta.seenJ.length}<small>/${JOKER_COUNT}</small></b><em>· ${meta.wins} 胜 / ${meta.runs} 局</em></button>
      </div>
    </aside>
  </div>`;
}

function roundHTML() {
  const n = state.selected.length, busy = state.phase === 'scoring', tip = coachHTML();
  const hand = state.hand;
  return `<div class="stagebar">${bossBar()}${crowdHTML()}</div>${tip}
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
  const nbNote = nbBoss ? nbBoss.d + '。提前在后台做好准备。'
    : nb.ante !== state.ante ? '进入新的一期，目标收视会明显变高，黄金档嘉宾到时揭晓。' : '没有刁难规则，可以跳过它换奖励券。';
  const aud = (state.audience || []).filter((a) => !a.vip), won = aud.filter((a) => a.ok).length;
  const crowdLine = aud.length ? `<div class="crowd cash-crowd"><span class="cr-k"><i class="en">CROWD</i>观众 ${won}/${aud.length}${won === aud.length ? ' · 全场起立' : ''}</span>${aud.map((a, i) => seatHTML(a.key, i, a.ok ? 'ok' : '')).join('')}</div>` : '';
  return `<h2 class="panel-t" data-en="THAT'S A WRAP">收工！收视 ${fmt(state.roundScore)}</h2>${crowdLine}
    <div class="cash2">
      <div class="cashcol"><div class="ledger">${state.cash.map((l) => `<div><span>${l.t}</span><b>+$${l.v}</b></div>`).join('') || '<div><span>这一场没有收入</span><b>$0</b></div>'}
        <div class="ledger-sum"><span>合计</span><b>$${total}</b></div></div>
        <button class="btn gold" data-act="cashout">领取 $${total}，去后台</button></div>
      <div class="nextcard ${nbBoss ? 'boss' : ''}">
        <span class="nc-k">下一场</span>
        <h3>${nbBoss ? '黄金档 · ' + nbBoss.n : BLIND_NAMES[nb.i]}${nb.ante !== state.ante ? ` <small>第 ${nb.ante} 期</small>` : ''}</h3>
        <div class="nc-t">${fmt(nbTarget)}<small>目标收视</small></div>
        <p>${nbNote}</p>
        <div class="nc-shop"><b>后台有</b>${2 + (state.vouchers.includes('shelf') ? 1 : 0)} 位艺人 · 1 条广告 · 1 个道具箱 · 1 个赞助包${state.voucherOffer ? ' · 1 项演播室升级' : ''}</div>
      </div>
    </div>`;
}

function packHTML() {
  if (state.pack.kind === 'tarot') return tarotPackHTML();
  return `<h2 class="panel-t" data-en="SPONSOR PACK">赞助包 · 挑一家</h2>
    <p class="panel-s">选中的牌型立刻升 1 级。数字是升级后的基础筹码和倍率。</p>
    <div class="shopgrid">${state.pack.opts.map((k) => {
      const h = HANDS[k], l = state.levels[k];
      return `<div class="item">${planetFace(PLANETS[k], `${h.n} ${l}→${l + 1} 级<br>${h.c + h.dc * l} 筹码 × ${h.m + h.dm * l} 倍率<br>本局打过 ${(state.stats.types || {})[k] || 0} 次`)}
        <button class="btn gold buy" data-act="pickpack" data-v="${k}">选这本</button></div>`;
    }).join('')}</div>`;
}

// Tarot pack: three tarots on top, six cards from the deck below; pick a tarot, select cards, use it right here.
function tarotPackHTML() {
  const P = state.pack, d = P.pick ? TD[P.pick] : null, n = state.selected.length;
  const range = d && (d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`);
  const step = P.done ? '改好了！这些牌已经永久写进你的牌组。'
    : !d ? '先挑一件道具。用掉它：当场改造下面这几张牌组里的牌；也可以收进道具栏，留到对局里用在手牌上。'
      : `已选「${d.name}」：在下面选 ${range} 张牌，再点「当场使用」。${d.copy ? '左边那张会变成右边那张的复制。' : ''}`;
  const full = state.cons.length >= state.maxCons;
  return `<h2 class="panel-t" data-en="PROP BOX">道具箱 · 挑一件</h2>
    <p class="panel-s">${step}</p>
    <div class="tp-wrap"><div class="shopgrid tp-opts">${P.opts.map((k) => `<div class="item ${P.pick === k ? 'chosen' : ''} ${P.done && P.pick !== k ? 'sold' : ''}">${tarotFace(k, 'div', 'style="cursor:default"', P.pick === k)}
      <button class="btn ${P.pick === k ? 'primary' : 'gold'} buy" data-act="tpick" data-v="${k}" ${P.done ? 'disabled' : ''}>${P.pick === k ? '已选' : '选这件'}</button></div>`).join('')}</div>
    <div class="tp-side"><div class="tp-cards" style="--n:${P.cards.length}">${packCards(state).map((c) => cardHTML(c, P.done || !d || d.money ? 'none' : 'pcard')).join('')}</div>
    <div class="shopbar tp-bar">${P.done
      ? '<button class="btn primary" data-act="tclose">回到后台</button>'
      : `<button class="btn gold" data-act="tapply" ${d && n >= d.min && n <= d.max ? '' : 'disabled'}>当场使用${d ? `<small>${n}/${range}</small>` : ''}</button>
         <button class="btn ghost" data-act="tkeep" ${d && !full ? '' : 'disabled'}>${full ? '道具栏已满' : '收进道具栏'}</button>
         <button class="btn ghost" data-act="tclose">不要了</button>`}</div></div></div>`;
}

function shopHTML() {
  const items = state.shop.map((it, i) => {
    const can = state.money >= it.price && !it.sold;
    let face;
    if (it.kind === 'joker') face = jokerFace(JD[it.key], null, 'div', '', it.ed);
    else if (it.kind === 'voucher') face = voucherFace(it.key);
    else if (it.kind === 'pack') face = planetFace('三选一', '打开后从 3 条广告里挑 1 条，让对应牌型升 1 级', '赞助包');
    else if (it.kind === 'tpack') face = `<div class="tc tpack"><span class="tag">卡包</span><span class="ji" aria-hidden="true">${glyph('☾')}</span><span class="jn">道具箱</span><span class="jd">3 选 1，当场改造牌组里的牌</span></div>`;
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
  return `<h2 class="panel-t" data-en="BACKSTAGE">后台</h2>
    ${coachHTML(true) || `<p class="panel-s"><b>赞助广告</b>：一种牌型永久升 1 级，可以一直叠加。<b>道具箱</b>：3 选 1，当场改牌或留着用。${state.vouchers.length ? `<br><b>已有升级</b>：${state.vouchers.map((k) => VOUCHERS[k].n).join('、')}` : ''}</p>`}
    <div class="shopgrid">${items}</div>
    <div class="shopbar">
      <button class="btn ghost" data-act="reroll" ${state.money >= state.rerollCost ? '' : 'disabled'}>刷新 $${state.rerollCost}</button>
      <button class="btn primary" data-act="next">下一场</button></div>`;
}

function stageHTML() {
  const p = state.phase;
  if (p === 'play' || p === 'scoring') return roundHTML();
  if (p === 'menu') return menuHTML();
  if (p === 'select') {
    return `<h2 class="panel-t" data-en="TONIGHT'S LINEUP">第 ${state.ante} 期 · 共 8 期</h2>
      <p class="panel-s sel-intro">每期三场，收视够目标就收工。点观众换人入场（3 个座位）。热场和正片可以跳过，换一张奖励券（但没有这场的钱和后台）。</p>
      <div class="blinds">${[0, 1, 2].map(blindCard).join('')}</div>`;
  }
  if (p === 'cashout') return cashoutHTML();
  if (p === 'shop') return state.pack ? packHTML() : shopHTML();
  if (p === 'over') {
    const where = state.blindIdx === 2 ? '黄金档「' + BOSSES[state.bossKey].n + '」' : BLIND_NAMES[state.blindIdx];
    return `<div class="center"><h2 class="panel-t" data-en="OFF AIR">节目停播</h2>
      ${endExtras(`<p class="panel-s">止步于第 ${state.ante} 期的${where}，还差 ${fmt(state.target - state.roundScore)} 分。</p>`)}${summaryHTML()}</div>`;
  }
  if (p === 'win') {
    return `<div class="center"><h2 class="panel-t" data-en="SEASON FINALE">通关！整季 8 期全部播完</h2>
      ${endExtras()}${summaryHTML()}</div>`;
  }
  return '';
}

export function renderStage() {
  const st = $('stage');
  st.classList.toggle('busy', state.phase === 'scoring');
  // freshly drawn cards are dealt out of the draw pile
  // cards discarded, swept away after scoring or cut by a tarot are tossed off the table
  const round = inRound(), packOpen = !!(state.pack && state.pack.kind === 'tarot');
  patch(st, stageHTML(), {
    enter: (el) => (ui.justDrawn.has(el.dataset.id) ? $('pile') : null),
    leave: (el) => (round || packOpen) && el.classList.contains('card'),
  });
}
