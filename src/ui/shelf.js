// Joker and tarot shelf, plus the inspector panel that opens under it.
import { EDITIONS, JD, RARITY, TD, descOf, sellJ, usedSlots } from '../core/index.js';
import { $ } from './dom.js';
import { patch } from './patch.js';
import { jokerHTML, tarotHTML } from './components.js';
import { state } from './store.js';

export function renderShelf() {
  const used = usedSlots(state);
  $('jcount').textContent = `${used}/${state.maxJokers}`;
  let html = state.jokers.map(jokerHTML).join('');
  for (let i = used; i < state.maxJokers; i++) html += `<div class="jk empty">${i === 0 && !state.jokers.length ? '商店里买小丑' : '空位'}</div>`;
  patch($('jrow'), html);

  $('ccount').textContent = `${state.cons.length}/${state.maxCons}`;
  let ch = state.cons.map(tarotHTML).join('');
  for (let i = state.cons.length; i < state.maxCons; i++) ch += '<div class="tc empty">空位</div>';
  patch($('crow'), ch);
  renderInspector();
}

function renderInspector() {
  const ins = $('inspector'), busy = state.phase === 'scoring', I = state.inspect;
  if (I && I.kind === 'j') {
    const j = state.jokers.find((x) => x.uid === I.uid);
    if (j) {
      const d = JD[j.key], idx = state.jokers.indexOf(j);
      ins.hidden = false;
      const E = j.ed && EDITIONS[j.ed];
      ins.innerHTML = `<div class="in-t"><b>${E ? E.n : ''}${d.name}</b><span class="hint">${RARITY[d.r]}小丑 · 第 ${idx + 1} 位（从左往右触发）</span><p>${descOf(d, j).replace(/<br>/g, ' ')}${E ? `　${E.n}：${E.d}` : ''}</p></div>
        <div class="in-a">
          <button class="chip" data-act="jleft" ${idx === 0 || busy ? 'disabled' : ''}>← 左移</button>
          <button class="chip" data-act="jright" ${idx === state.jokers.length - 1 || busy ? 'disabled' : ''}>右移 →</button>
          <button class="chip" data-act="jsell" ${busy ? 'disabled' : ''}>出售 $${sellJ(j)}</button>
        </div>`;
      return;
    }
  }
  if (I && I.kind === 'c') {
    const c = state.cons.find((x) => x.uid === I.uid);
    if (c) {
      const d = TD[c.key];
      const can = !busy && (d.money ? state.phase !== 'menu' : state.phase === 'play');
      const range = d.min === d.max ? d.min : d.min + '–' + d.max;
      const hint = d.money ? '一次性 · 随时可以用'
        : state.phase === 'play' ? `一次性 · 先在手牌里选 ${range} 张，再点「使用」` : '一次性 · 下一关开打后，选中手牌再点「使用」';
      ins.hidden = false;
      ins.innerHTML = `<div class="in-t"><b>${d.name}</b><span class="hint">塔罗 · ${hint}</span><p>${d.desc.replace(/<\/?b>/g, '')}</p></div>
        <div class="in-a">
          <button class="chip on" data-act="cuse" ${can ? '' : 'disabled'}>使用</button>
          <button class="chip" data-act="csell" ${busy ? 'disabled' : ''}>出售 $1</button>
        </div>`;
      return;
    }
  }
  ins.hidden = true;
  ins.innerHTML = '';
  if (I) state.inspect = null;
}
