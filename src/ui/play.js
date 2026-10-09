// Playing a hand: score it in the core, then animate every scoring step.
import { HANDS, HEAT, beginHand, finishHand } from '../core/index.js';
import { heatHTML } from './components.js';
import { $, fmt, sleep } from './dom.js';
import { pulse, shake } from './fx.js';
import { setLive } from './hud.js';
import { render } from './render.js';
import { Sfx } from './sfx.js';
import { teleBlind, teleEnd } from './tele.js';
import { endRun, saveLast, saveRecord, state, ui } from './store.js';

const playedEl = (id) => document.querySelector(`.played [data-id="${id}"]`);
const handEl = (id) => document.querySelector(`.hand [data-id="${id}"]`);
const jokerEl = (uid) => document.querySelector(`.jrow [data-uid="${uid}"]`);
const seatEl = (i) => document.querySelector(i < 0 ? '.crowd' : `.crowd .seat[data-i="${i}"]`);

// k (0..1) grows as the hand goes on: later pops land bigger, so a long combo feels like it is building
function pop(el, text, cls, k = 0) {
  if (!el) return;
  const p = document.createElement('span');
  p.className = 'pop ' + cls;
  p.textContent = text;
  if (k) p.style.scale = (1 + 0.6 * k).toFixed(2);
  el.appendChild(p);
  setTimeout(() => p.remove(), 1000 / ui.speed);
}

// a spectator speaks: a comic speech bubble under their seat
function say(el, text) {
  if (!el || !text) return;
  el.querySelectorAll('.say').forEach((b) => b.remove());
  const b = document.createElement('span');
  b.className = 'say';
  b.textContent = text;
  el.appendChild(b);
  setTimeout(() => b.remove(), 1900 / ui.speed);
}

function bump(el, k = 0) {
  if (el && el.animate) el.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.1 + 0.12 * k}) rotate(-3deg)` }, { transform: 'scale(1)' }], { duration: 260 / ui.speed });
}

// Rolls the round score up. requestAnimationFrame pauses in background tabs, so a hidden page
// jumps straight to the result instead of stalling the hand until the player comes back.
function countUp(from, to) {
  return new Promise((res) => {
    const t0 = performance.now(), dur = 600 / ui.speed;
    const step = (t) => {
      const k = document.hidden ? 1 : Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      $('roundScore').textContent = fmt(v);
      $('bar').style.width = Math.min(100, (v / state.target) * 100) + '%';
      if (k < 1) requestAnimationFrame(step); else res();
    };
    if (document.hidden) step(t0); else requestAnimationFrame(step);
  });
}

const SOUND_WORDS = ['POW!', 'BAM!', 'ZAP!', 'WHAM!', 'BOOM!'];

export async function playHand() {
  if (state.phase !== 'play' || !state.selected.length || state.hands <= 0) return;
  state.inspect = null;
  const res = beginHand(state, state.selected.slice());
  const name = `${HANDS[res.type].n}<small>${state.levels[res.type]} 级</small>`;
  render();
  setLive(name, res.base.c, res.base.m);
  res.scoring.forEach((c) => { const el = playedEl(c.id); if (el) el.classList.add('scoring'); });

  // comic burst with the hand name over the played cards
  const wrap = document.querySelector('.played-wrap');
  let boom = null;
  if (wrap) {
    boom = document.createElement('div');
    boom.className = 'boom';
    boom.innerHTML = `<span>${HANDS[res.type].n}！</span>`;
    wrap.appendChild(boom);
  }
  await sleep(560);

  let n = 0, money = state.money;
  for (const s of res.steps) {
    const el = s.at === 'card' ? playedEl(s.id) : s.at === 'held' ? handEl(s.id) : s.at === 'aud' ? seatEl(s.i) : jokerEl(s.uid);
    const k = Math.min(1, n / 10);
    if (s.text) { pop(el, s.text, s.cls); say(el, s.say); if (Sfx[s.cls]) Sfx[s.cls](); await sleep(s.say ? 520 : 300); continue; }
    if (s.at === 'heat') {
      // the room settles on its heat for this hand, and the whole hand is scaled by it
      const old = document.getElementById('heat');
      if (old) old.outerHTML = heatHTML(s.heat);
      const hm = document.getElementById('heat');
      pop(hm, `${HEAT[s.heat].n} ×${s.xmult}`, s.heat === 0 ? 'cold' : s.xmult > 1 ? 'xmult' : 'retrig', 0.5);
      bump(hm, 1);
      Sfx.heat(s.heat, state.heat ?? 1);
      if (s.xmult > 1) { pulse($('mult'), 1); shake($('table'), 4 + s.xmult * 4); } else if (s.heat === 0) shake($('stage'), 6);
      setLive(name, s.after.chips, s.after.mult);
      n++;
      await sleep(520);
      continue;
    }
    if (s.chips) { pop(el, '+' + s.chips, 'chips', k); Sfx.chips(n); pulse($('chips'), k); }
    if (s.mult) { pop(el, '+' + s.mult + ' 倍', 'mult', k); Sfx.mult(n); pulse($('mult'), k); }
    if (s.xmult) {
      pop(el, '×' + s.xmult, 'xmult', Math.max(k, 0.5)); Sfx.xmult(); pulse($('mult'), 1);
      shake($('table'), Math.min(18, 4 + s.xmult * 3 + k * 4));
    }
    if (s.money) { pop(el, '+$' + s.money, 'cash', k); Sfx.cash(); money += s.money; $('sMoney').textContent = money; }
    if (s.at === 'aud') {
      // a spectator is won over: the seat lights up for good; the last one brings the house down
      if (el && s.i >= 0) { el.classList.add('ok'); say(el, s.say); if (s.say && !s.lift) Sfx.laugh(); }
      if (s.lift) { pop(el, '规则作废！', 'cash', 1); shake($('table'), 10); Sfx.ovation(); await sleep(400); }
      if (s.ovation) {
        const o = document.createElement('div');
        o.className = 'ovation'; o.textContent = '全场起立！';
        $('stage').appendChild(o);
        setTimeout(() => o.remove(), 1300 / ui.speed);
        shake($('app'), 10); Sfx.ovation();
      }
    }
    n++;
    bump(el, k);
    if (s.card) bump(playedEl(s.card), k);
    setLive(name, s.after.chips, s.after.mult);
    await sleep(s.chips && s.mult ? 520 : 380);
  }
  for (const id of res.broken) { pop(playedEl(id), '碎了', 'break'); Sfx.shatter(); await sleep(300); }

  setLive(name, res.chips, res.mult, '= ' + fmt(res.total));
  Sfx.score();
  // the payoff scales with how much of the target this one hand covers
  const share = Math.min(1, res.total / Math.max(1, state.target));
  pulse($('total'), share);
  if (boom) boom.classList.add('out');
  const clear = state.roundScore + res.total >= state.target;
  const word = document.createElement('div');
  word.className = 'sfxword' + (clear ? ' big' : '');
  word.innerHTML = `${clear ? 'KA-BOOM!' : SOUND_WORDS[Math.floor(Math.random() * SOUND_WORDS.length)]}<small>+${fmt(res.total)}</small>`;
  $('stage').appendChild(word);
  if (clear) shake($('app'), 16); else if (share > 0.25) shake($('table'), 3 + 8 * share);
  setTimeout(() => word.remove(), 1150 / ui.speed);
  await sleep(clear ? 700 : 420);
  await countUp(state.roundScore, state.roundScore + res.total);
  pulse($('roundScore'), share);
  await sleep(420);

  const drawn = finishHand(state, res);
  drawn.forEach((id) => ui.justDrawn.add(id));
  if (['cashout', 'win', 'over'].includes(state.phase)) teleBlind();
  if (state.phase === 'over' || state.phase === 'win') { saveLast(); teleEnd(); endRun(); }
  if (state.phase === 'cashout' || state.phase === 'win') { Sfx.win(); saveRecord(); }
  else if (state.phase === 'over') { Sfx.lose(); saveRecord(); }
  else if (drawn.length) Sfx.deal();
  render();
}
