// Every player action: one delegated click handler, keyboard shortcuts and joker drag-to-reorder.
import {
  JD, TD, UNLOCK, buy, cashOut, choosePack, dailyKey, dailySetup, discardCards, freshState, isUnlocked, nextBlind, noteTarot,
  packApply, packClose, packKeep, packPick, reroll, sellJ, skipBlind, sortHand, startBlind, useTarot,
} from '../core/index.js';
import { $, toast } from './dom.js';
import { isPicked } from './components.js';
import { pulse } from './fx.js';
import { closeModal, openModal, switchGuideTab } from './guide.js';
import { goLandscape } from './orient.js';
import { playHand } from './play.js';
import { teleCopy, teleEnd, teleExport, teleStart } from './tele.js';
import { skipTutor, tutorOk } from './tutor.js';
import { render } from './render.js';
import { renderHud } from './hud.js';
import { renderShelf } from './shelf.js';
import { renderStage } from './screens.js';
import { Sfx } from './sfx.js';
import { endRun, menuState, meta, saveMeta, saveRecord, saveRun, setState, state, storage, ui } from './store.js';

function toggleCard(id) {
  if (state.phase !== 'play') return;
  const i = state.selected.indexOf(id);
  if (i >= 0) state.selected.splice(i, 1);
  else if (state.selected.length < 5) state.selected.push(id);
  else { toast('一次最多选 5 张'); return; }
  Sfx.select();
  render();
}

function doDiscard() {
  if (state.phase !== 'play' || !state.selected.length || state.discards <= 0) return;
  discardCards(state, state.selected.slice()).forEach((id) => ui.justDrawn.add(id));
  Sfx.deal();
  render();
}

function cycleSort(v) {
  if (state.phase === 'scoring' || state.phase === 'menu') return;
  state.sort = v || (state.sort === 'rank' ? 'suit' : 'rank');
  sortHand(state);
  render();
}

// Two-step confirmation: the first click arms the button for 3 seconds.
let confirmTimer;
const NEW_GAME_LABEL = '<span>⟲</span>重开';
function armed(b, label, armedLabel) {
  if (b.dataset.armed) { clearTimeout(confirmTimer); return true; }
  b.dataset.armed = '1';
  b.textContent = armedLabel;
  b.classList.add('warn');
  confirmTimer = setTimeout(() => {
    if (!b.isConnected) return;
    delete b.dataset.armed;
    if (b.id === 'newBtn') b.innerHTML = NEW_GAME_LABEL; else b.textContent = label;
    b.classList.remove('warn');
  }, 3000);
  return false;
}

// leaving a run (finished or abandoned) folds it into the cross-run progress first
function backToMenu() { teleEnd(); endRun(); setState(menuState()); render(); }

function startRun(st) {
  ui.newUnlocks = [];
  setState(st);
  teleStart();
  Sfx.select();
  render();
}

const lockedMsg = (id) => `还没解锁：${UNLOCK[id].need}`;

const ACTIONS = {
  card: (b) => toggleCard(b.dataset.id),
  play: () => playHand(),
  discard: () => doDiscard(),
  sort: (b) => cycleSort(b.dataset.v),
  joker: (b) => {
    if (suppressClick) return;
    const u = Number(b.dataset.uid);
    state.inspect = isPicked('j', u) ? null : { kind: 'j', uid: u };
    renderShelf();
  },
  cons: (b) => {
    const u = Number(b.dataset.uid);
    state.inspect = isPicked('c', u) ? null : { kind: 'c', uid: u };
    renderShelf();
  },
  jleft: (b) => moveJoker(-1),
  jright: (b) => moveJoker(1),
  jsell: (b) => {
    if (state.phase === 'scoring') return;
    const i = state.jokers.findIndex((j) => j.uid === state.inspect.uid);
    if (i < 0) return;
    const d = JD[state.jokers[i].key], v = sellJ(state.jokers[i]);
    if (!armed(b, `出售 $${v}`, `确认卖掉${d.name}？`)) return;
    state.money += v;
    state.jokers.splice(i, 1);
    state.inspect = null;
    Sfx.cash();
    toast(`卖掉了${d.name}，得到 $${v}`);
    render();
  },
  cuse: () => {
    const c = state.cons.find((x) => x.uid === state.inspect.uid);
    const r = useTarot(state, state.inspect.uid, state.selected);
    if (!r.err && c) { noteTarot(meta, c.key); saveMeta(); }
    if (r.err) { toast(r.err); return; }
    state.inspect = null;
    Sfx.retrig();
    toast(r.msg);
    render();
  },
  csell: (b) => {
    if (state.phase === 'scoring') return;
    const i = state.cons.findIndex((c) => c.uid === state.inspect.uid);
    if (i < 0) return;
    if (!armed(b, '出售 $1', '确认出售？')) return;
    state.cons.splice(i, 1);
    state.money += 1;
    state.inspect = null;
    render();
  },
  mdeck: (b) => {
    if (!isUnlocked(meta, 'deck:' + b.dataset.v)) { toast(lockedMsg('deck:' + b.dataset.v)); return; }
    state.menuDeck = b.dataset.v; renderStage();
  },
  mstake: (b) => {
    if (!isUnlocked(meta, 'stake:' + b.dataset.v)) { toast(lockedMsg('stake:' + b.dataset.v)); return; }
    state.menuStake = Number(b.dataset.v); state.stake = state.menuStake; renderStage(); renderHud();
  },
  begin: () => {
    if (!isUnlocked(meta, 'deck:' + state.menuDeck)) state.menuDeck = 'red';
    if (!isUnlocked(meta, 'stake:' + state.menuStake)) state.menuStake = 0;
    ui.prefs.deck = state.menuDeck;
    ui.prefs.stake = state.menuStake;
    storage.set('prefs', ui.prefs);
    startRun(freshState(state.menuDeck, state.menuStake));
  },
  daily: () => {
    const key = dailyKey(), D = dailySetup(key), st = freshState(D.deck, D.stake, D.seed);
    st.daily = key;
    startRun(st);
    toast(`每日挑战 ${key}：今天所有人的牌都一样`);
  },
  collect: () => openModal('guide', 'collect'),
  tutorok: () => tutorOk(),
  teleexport: () => teleExport(),
  telecopy: async () => toast((await teleCopy()) ? '已复制，粘贴发给开发者即可' : '复制失败，请用「导出文件」'),
  tutorskip: () => skipTutor(),
  start: () => { startBlind(state).forEach((id) => ui.justDrawn.add(id)); Sfx.deal(); render(); },
  skip: () => { const m = skipBlind(state); if (m) { Sfx.cash(); toast('跳过盲注：' + m); render(); } },
  cashout: () => { if (cashOut(state)) Sfx.cash(); render(); },
  buy: (b) => {
    const r = buy(state, Number(b.dataset.i));
    if (r.err) { toast(r.err); return; }
    Sfx.cash();
    toast(r.msg);
    render();
  },
  tipok: (b) => { ui.tipsSeen.push(b.dataset.k); storage.set('tips', ui.tipsSeen); renderStage(); },
  tpick: (b) => {
    const r = packPick(state, b.dataset.v);
    if (r.err) { toast(r.err); return; }
    if (r.msg) { noteTarot(meta, b.dataset.v); saveMeta(); }
    Sfx.select();
    if (r.msg) { Sfx.cash(); toast(r.msg); }
    render();
  },
  pcard: (b) => {
    const P = state.pack, d = P && P.pick && TD[P.pick];
    if (!d || P.done) return;
    const id = b.dataset.id, i = state.selected.indexOf(id);
    if (i >= 0) state.selected.splice(i, 1);
    else if (state.selected.length < d.max) state.selected.push(id);
    else if (d.max === 1) state.selected = [id];
    else { toast(`「${d.name}」最多选 ${d.max} 张`); return; }
    Sfx.select();
    render();
  },
  tapply: () => {
    const r = packApply(state);
    if (r.err) { toast(r.err); return; }
    noteTarot(meta, state.pack.pick); saveMeta();
    Sfx.retrig(); toast(r.msg); render();
    (state.pack.changed || []).forEach((id) => pulse(document.querySelector(`.tp-cards [data-id="${id}"]`), 0.8));
  },
  tkeep: () => { const r = packKeep(state); if (r.err) { toast(r.err); return; } Sfx.select(); toast(r.msg); render(); },
  tclose: () => { if (packClose(state)) render(); },
  pickpack: (b) => { const m = choosePack(state, b.dataset.v); if (m) { Sfx.win(); toast(m); render(); } },
  reroll: () => { if (reroll(state)) { Sfx.deal(); render(); } },
  next: () => { nextBlind(state); saveRecord(); render(); },
  restart: () => backToMenu(),
  newgame: (b) => {
    if (state.phase === 'scoring') return;
    if (['menu', 'over', 'win'].includes(state.phase)) { backToMenu(); return; }
    if (!armed(b, '重开', '确认放弃这局？')) return;
    delete b.dataset.armed;
    b.innerHTML = NEW_GAME_LABEL;
    b.classList.remove('warn');
    backToMenu();
  },
  guide: (b) => openModal('guide', b.dataset.tab),
  deck: () => openModal('deck'),
  help: () => openModal('help'),
  gtab: (b) => switchGuideTab(b.dataset.tab),
  close: () => closeModal(),
  speed: () => { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1; storage.set('speed', ui.speed); renderHud(); },
  sound: () => { Sfx.toggle(); render(); },
  landscape: async () => { if (!(await goLandscape())) toast('把手机横过来，就是和电脑一样的横屏布局'); },
};

function moveJoker(dir) {
  if (state.phase === 'scoring') return;
  const i = state.jokers.findIndex((j) => j.uid === state.inspect.uid), k = i + dir;
  if (i < 0 || k < 0 || k >= state.jokers.length) return;
  [state.jokers[i], state.jokers[k]] = [state.jokers[k], state.jokers[i]];
  render();
}

const NEEDS_INSPECT = new Set(['jleft', 'jright', 'jsell', 'cuse', 'csell']);

function onClick(e) {
  if (e.target === $('modal')) { closeModal(); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (NEEDS_INSPECT.has(a) && !state.inspect) return;
  if (ACTIONS[a]) ACTIONS[a](b);
}

function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if (state.phase !== 'play') return;
  const k = e.key.toLowerCase();
  if (/^[1-9]$/.test(k)) {
    const c = state.hand[Number(k) - 1];
    if (c) { e.preventDefault(); toggleCard(c.id); }
  } else if (k === 'enter') {
    if (document.activeElement && document.activeElement.matches('button:not(.card)')) return; // let focused buttons handle Enter
    e.preventDefault();
    playHand();
  } else if (k === 'd') doDiscard();
  else if (k === 's') cycleSort();
  else if (k === 'escape' && state.selected.length) { state.selected = []; render(); }
}

// ---- drag jokers to reorder (pointer events, works with touch)
let drag = null, suppressClick = false;

function onPointerDown(e) {
  const el = e.target.closest('.jk[data-uid]');
  if (!el || state.phase === 'scoring' || e.button > 0) return;
  drag = { el, uid: Number(el.dataset.uid), x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 8) return;
    drag.moved = true;
    drag.el.classList.add('dragging');
    try { drag.el.setPointerCapture(drag.pid); } catch (err) { /* capture is optional */ }
  }
  drag.el.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.max(-6, Math.min(6, dx / 20))}deg)`;
}

function onPointerEnd(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  drag = null;
  if (!d.moved) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const others = [...$('jrow').querySelectorAll('.jk[data-uid]')].filter((x) => x !== d.el);
  let to = others.findIndex((x) => { const r = x.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
  if (to < 0) to = others.length;
  const from = state.jokers.findIndex((j) => j.uid === d.uid);
  if (from >= 0 && e.type === 'pointerup') {
    const [j] = state.jokers.splice(from, 1);
    state.jokers.splice(to, 0, j);
    if (from !== to) Sfx.select();
  }
  renderShelf();
  saveRun();
}

export function bindInput() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  $('jrow').addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerEnd);
  window.addEventListener('pointercancel', onPointerEnd);
}
