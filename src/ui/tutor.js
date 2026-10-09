// Teach-by-doing for a player's first run: each step waits for its moment, lights up what to touch and says one thing
// in a speech bubble next to it; doing the thing (or 知道了) moves on. Progress is stored as jn.tutor (step index,
// or 'done'). Runs after every render because the stage is redrawn and highlight classes would otherwise be lost.
import { $ } from './dom.js';
import { state, storage, ui } from './store.js';

// the two highest cards of a rank the hand holds twice, else its highest card
function pairHint() {
  const by = {};
  state.hand.forEach((c) => (by[c.r] = by[c.r] || []).push(c));
  const pairs = Object.values(by).filter((g) => g.length >= 2).sort((a, b) => b[0].r - a[0].r);
  return (pairs[0] || [state.hand.slice().sort((a, b) => b.r - a.r)[0]]).slice(0, 2).filter(Boolean);
}
const cardSel = (cs) => cs.map((c) => `.hand [data-id="${c.id}"]`).join(',');
const playing = () => state.phase === 'play';

// when(): is this the moment; target(): selector to light up; done(): the player did it (move on by themselves)
const STEPS = [
  {
    key: 'pick', when: () => playing() && state.roundHands === 0 && !state.selected.length,
    target: () => cardSel(pairHint()),
    text: () => (pairHint().length === 2 ? '第一步：点亮起来的两张牌。点数一样的两张叫<b>对子</b>，是最基本的牌型。' : '手里没有对子，先点这张最大的牌试试。'),
    done: () => state.selected.length > 0,
  },
  {
    key: 'read', when: () => playing() && state.selected.length > 0 && state.roundHands === 0,
    target: () => '#scorer, [data-act="play"]',
    text: () => '左边是这手牌能拿到的收视：<b>筹码 × 倍率</b>。最多能选 5 张，看着「预计」分数，满意了就点<b>出牌</b>。',
    done: () => state.phase === 'scoring' || state.roundHands > 0,
  },
  {
    key: 'crowd', when: () => playing() && state.roundHands >= 1 && (state.audience || []).length > 0,
    target: () => '.crowd',
    text: () => '台下坐着 3 位<b>观众</b>，各有各的口味。某手牌合了谁的口味，这位观众就被征服、当场打赏；三位全征服是<b>全场起立</b>。选牌时，会被征服的观众会亮黄。',
    done: () => state.phase !== 'play' || state.roundHands >= 2, ok: true,
  },
  {
    key: 'discard', when: () => playing() && state.roundHands >= 1 && state.discards > 0 && !state.selected.length,
    target: () => '[data-act="discard"]',
    text: () => '还没到目标收视？选几张不想要的牌点<b>弃牌</b>，换新牌凑更大的牌型。出牌次数比弃牌次数宝贵。',
    done: () => state.phase !== 'play' || state.roundHands >= 2, ok: true,
  },
  {
    key: 'shop', when: () => state.phase === 'shop' && !state.pack && state.jokers.length === 0,
    target: () => '.shopgrid .item:first-child',
    text: () => '收工的钱可以在后台花掉。<b>艺人</b>每手牌都会自动帮你加分，先买一张试试。',
    done: () => state.jokers.length > 0 || state.phase !== 'shop', ok: true,
  },
  {
    key: 'jokers', when: () => playing() && state.jokers.length > 0,
    target: () => '#jrow',
    text: () => '艺人<b>从左到右</b>依次触发：「+倍率」放左边，「×倍率」放右边最划算。拖动可以换顺序，点一下看详情或解约。',
    done: () => state.phase === 'scoring', ok: true,
  },
];

const get = () => storage.get('tutor', 0);
const set = (v) => storage.set('tutor', v);
export const tutorActive = () => get() !== 'done';
export function skipTutor() { set('done'); clear(); }
export function tutorOk() { const i = get(); if (i !== 'done') set(i + 1 >= STEPS.length ? 'done' : i + 1); shown = null; runTutor(); }

function clear() {
  document.querySelectorAll('.tutor-focus').forEach((el) => el.classList.remove('tutor-focus'));
  const b = $('tutor'); if (b) b.hidden = true;
  document.body.classList.remove('tutoring');
}

let shown = null; // key of the step whose bubble is up; a step only counts as done once it has been seen

export function runTutor() {
  clear();
  let i = get();
  if (i === 'done' || !state || state.phase === 'menu') return;
  while (i < STEPS.length && shown === STEPS[i].key && STEPS[i].done()) i++;
  if (i >= STEPS.length) { set('done'); return; }
  if (i !== get()) set(i);
  const S = STEPS[i];
  if (!S.when()) return;
  const els = [...document.querySelectorAll(S.target())];
  if (!els.length) return;
  els.forEach((el) => el.classList.add('tutor-focus'));
  document.body.classList.add('tutoring');
  if (S.key === 'jokers' && !ui.tipsSeen.includes('joker')) { ui.tipsSeen.push('joker'); storage.set('tips', ui.tipsSeen); } // same advice as that coach tip
  shown = S.key;
  show(S, els[0]);
}

function show(S, anchor) {
  let b = $('tutor');
  if (!b) {
    b = document.createElement('div');
    b.id = 'tutor'; b.className = 'tutor'; b.setAttribute('role', 'note');
    document.body.appendChild(b);
  }
  b.innerHTML = `<b class="tt-k">新手教学</b><p>${S.text()}</p><div class="tt-a">${S.ok ? '<button class="chip on" data-act="tutorok">知道了</button>' : ''}<button class="chip" data-act="tutorskip">跳过教学</button></div>`;
  b.hidden = false;
  place(b, anchor);
  // cards may still be flying in from the pile; settle the bubble once they land
  clearTimeout(settle);
  settle = setTimeout(() => { if (!b.hidden && anchor.isConnected) place(b, anchor); }, 650 / ui.speed);
}
let settle;

// beside the target: above it when there is room, else below; kept inside the window
function place(b, anchor) {
  const r = anchor.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, pad = 10;
  const above = r.top - h - 16 > 0;
  const top = above ? r.top - h - 16 : Math.min(innerHeight - h - pad, r.bottom + 16);
  const left = Math.max(pad, Math.min(innerWidth - w - pad, r.left + r.width / 2 - w / 2));
  b.style.top = `${Math.max(pad, top)}px`;
  b.style.left = `${left}px`;
  b.classList.toggle('below', !above);
  b.style.setProperty('--ax', `${Math.max(16, Math.min(w - 16, r.left + r.width / 2 - left))}px`);
}

addEventListener('resize', () => { if (tutorActive() && state) runTutor(); });
