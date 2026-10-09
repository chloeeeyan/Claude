// Top HUD strip and the scorer panel ("THIS HAND").
import { BLIND_NAMES, BOSSES, ENH, HANDS, SEALS, computeHand, hasJ, targetFor } from '../core/index.js';
import { $, fmt, fmtM } from './dom.js';
import { Sfx } from './sfx.js';
import { inRound, state, ui } from './store.js';

export function setLive(name, chips, mult, totalText, ok) {
  $('hname').innerHTML = name;
  $('chips').textContent = fmt(chips);
  $('mult').textContent = fmtM(mult);
  $('total').textContent = totalText || '';
  $('total').classList.toggle('ok', !!ok);
}

export function renderHud() {
  const p = state.phase, b = state.blindIdx === 2 && state.bossKey ? BOSSES[state.bossKey] : null;
  $('app').classList.toggle('menu', p === 'menu');
  $('table').classList.toggle('full', !['play', 'scoring'].includes(p));
  if (p !== 'menu') {
    const lead = p === 'select' ? '下一场' : p === 'shop' || p === 'cashout' ? '刚播完' : `第 ${state.ante} 期 · 第 ${state.blindIdx + 1} 场`;
    $('blindBox').innerHTML = `<span class="lbl">${lead}</span><span class="bn ${b ? 'boss' : ''}">${b ? '黄金档 · ' + b.n : BLIND_NAMES[state.blindIdx]}</span>`;
  }
  const showScore = inRound() || p === 'over';
  $('roundScore').textContent = fmt(showScore ? state.roundScore : 0);
  $('hudTarget').textContent = fmt(state.target || (p === 'menu' ? 0 : targetFor(state, state.blindIdx)));
  $('bar').style.width = showScore && state.target ? Math.min(100, (state.roundScore / state.target) * 100) + '%' : '0%';
  $('sMoney').textContent = state.money;
  $('sAnte').textContent = `${Math.min(state.ante, 8)}/8`;
  if (inRound()) {
    const k = state.deckKey;
    $('pile').innerHTML = `<span class="dback d-${k}"></span><span class="dback d-${k}"></span><span class="dback d-${k}"></span><b>${state.deck.length}</b><small>牌堆 · 点开看牌组</small>`;
    $('pile').setAttribute('aria-label', `牌堆还剩 ${state.deck.length} 张，点击查看牌组`);
  }
  $('speedBtn').innerHTML = `<span>${ui.speed}×</span>速度`;
  $('soundBtn').classList.toggle('off', !Sfx.on);
  $('soundBtn').title = Sfx.on ? '音效：开（点击关闭）' : '音效：关（点击打开）';
  document.documentElement.style.setProperty('--spd', ui.speed);

  if (p === 'scoring') return; // the scoring animation drives the scorer itself
  const sel = state.hand.filter((c) => state.selected.includes(c.id));
  if (sel.length && p === 'play') {
    const held = state.hand.filter((c) => !state.selected.includes(c.id));
    const res = computeHand(state, sel, held, { preview: true });
    const need = state.target - state.roundScore;
    setLive(`${HANDS[res.type].n}<small>${state.levels[res.type]} 级</small>`, res.base.c, res.base.m,
      res.voided ? `这手不得分：${res.voided}` : `预计 ${hasJ(state, 'misprint') || hasJ(state, 'gambler') ? '≈ ' : ''}${fmt(res.total)}${res.total >= need ? ' · 够收工' : ''}`, res.total >= need);
  } else setLive(p === 'play' ? '选牌，凑牌型' : '—', 0, 0);
  // enhancement / seal effects of the selected cards are spelled out instead of hiding in a tooltip
  const notes = [...new Set(sel.flatMap((c) => [
    c.enh && `「${ENH[c.enh].n}」${ENH[c.enh].d}`, c.seal && `「${SEALS[c.seal].n}」${SEALS[c.seal].d}`,
  ]).filter(Boolean))];
  $('cardnote').hidden = !notes.length || p !== 'play';
  $('cardnote').innerHTML = notes.join('<br>');
}
