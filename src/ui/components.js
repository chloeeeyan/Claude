// HTML builders for cards, jokers, tarots and planets.
import {
  EDITIONS, ENH, HEAT, JD, RARITY, SEALS, SNAME, SPEC, SYM, VIP, TD, VOUCHERS, VS, RL, curBoss, debuffed, descOf, isFace, isRed, isRegular, tipOf, tipText,
} from '../core/index.js';
import { inRound, state } from './store.js';

export const glyph = (s) => s + VS;

export const JICON = {
  joker: '☻', suitS: '♠', suitH: '♥', suitC: '♣', suitD: '♦', pairM: '☼', twoM: '◑', threeM: '✺', strM: '✹', flM: '☃', pairC: '✖',
  even: '②', odd: '③', face: '♚', ace: '✈', half: '♬', flag: '⚑', misprint: '✧', piggy: '◉', abacus: '⚖', sweeper: '✂', snow: '❄',
  collector: '✪', hoard: '✉', deep: '≋', gem: '◆', first: '☀', fullseat: '⑤', splash: '⛉', fourf: '✋', smith: '⚒', last: '⌛',
  family: '⌂', royal: '♛', duo: '☯', trio: '☘', palette: '✿', mirror: '♔', blueprint: '▤',
  inkwell: '✒', mono: '◧', rainbow: '❂', suitbank: '♮', jester: '♟', crown: '♕', regent: '♜', banquet: '♨',
  gale: '☴', lean: '☁', recycle: '☖', scav: '⚓', cat: '☺', bull: '☊', golden: '☉', rocket: '☄',
  solo: '♪', sniper: '◎', lonely: '☂', thin: '◌', glassblow: '◇', mason: '▦', blush: '❀', sealer: '⊛',
  grower: '⚘', anvil: '⚙', twoC: '♩', strC: '✎', threeC: '☎', quad: '▣', tower: '☷', twin: '☶',
  ladder: '☲', ice: '❆', gambler: '⚂', echo: '⦿',
  shill: '☝', heckler: '☹', agent: '☏', claque: '♫', encore: '↻', boxoffice: '⎚',
};
export const VICON = { slot: '⊞', hand: '✋', disc: '✂', hsize: '⇔', cons: '☾', shelf: '▥', reroll: '⟳', interest: '%' };
export const TICON = {
  tH: '♥', tS: '♠', tC: '♣', tD: '♦', tUp: '⇧', tCut: '✂', tCopy: '⧉', tBonus: '✚', tMult: '✸', tGlass: '◇', tSteel: '⬢',
  tWild: '✦', tRed: '◉', tGold: '✪', tRich: '¥',
};
export const DECK_MARK = { red: '♦', blue: '♠', gold: '$', black: '★', paint: '✦' };
export const STAKE_MARK = ['●○○', '●●○', '●●●'];

export const isPicked = (kind, uid) => !!(state.inspect && state.inspect.kind === kind && state.inspect.uid === uid);

export function cardTitle(c) {
  const p = [SNAME[c.s] + RL(c.r)];
  if (inRound() && debuffed(state, c)) p.push(`本场黄金档嘉宾「${curBoss(state).n}」：这张牌打出去不计分`);
  if (c.enh) p.push(`${ENH[c.enh].n}：${ENH[c.enh].d}`);
  if (c.seal) p.push(`${SEALS[c.seal].n}：${SEALS[c.seal].d}`);
  if (c.pc) p.push(`永久额外筹码 +${c.pc}`);
  return p.join('\n');
}

// arc = {o: offset from the hand's centre}; hand cards fan along a gentle curve
export function cardHTML(c, act = 'card', arc) {
  const sel = state.selected.includes(c.id);
  const cls = ['card', 's-' + c.s, isRed(c.s) ? 'red' : '', sel ? 'sel' : '', inRound() && debuffed(state, c) ? 'debuff' : '',
    c.enh ? 'e-' + c.enh : ''].join(' ');
  const s = SYM[c.s] + VS, r = RL(c.r);
  // number cards: one big halftone pip; aces: pip on a starburst; J/Q/K: a coloured comic panel with a crest
  const mid = isFace(c.r)
    ? `<span class="face" aria-hidden="true"><em>${{ 11: '♞', 12: '♛', 13: '♚' }[c.r] + VS}</em><strong>${r}</strong></span>`
    : c.r === 14
      ? `<span class="burst" aria-hidden="true"></span><span class="pip ace" aria-hidden="true">${s}</span>`
      : `<span class="pip" aria-hidden="true">${s}</span>`;
  const fan = arc ? ` style="--rot:${(arc.o * 1.7).toFixed(1)}deg;--dy:${(arc.o * arc.o * 1.1).toFixed(1)}px"` : '';
  const title = cardTitle(c);
  return `<button class="${cls}"${fan} data-act="${act}" data-id="${c.id}" data-key="c${c.id}" title="${title}" aria-label="${title.replace(/\n/g, '，')}" aria-pressed="${sel}">
    <span class="ci tl"><b>${r}</b><i>${s}</i></span>${mid}<span class="ci br"><b>${r}</b><i>${s}</i></span>
    ${c.enh ? `<span class="eb">${ENH[c.enh].n}</span>` : ''}${c.seal ? `<span class="seal ${c.seal}"></span>` : ''}${c.pc ? `<span class="pcb">+${c.pc}</span>` : ''}</button>`;
}

// ed: edition key (shop items pass it; owned jokers carry it as j.ed)
export function jokerFace(d, j, tag = 'div', attrs = '', ed = j && j.ed) {
  const E = ed && EDITIONS[ed];
  return `<${tag} class="jk r${d.r} ${E ? 'ed-' + ed : ''} ${j && isPicked('j', j.uid) ? 'picked' : ''}" ${attrs}>
    <span class="tag">${RARITY[d.r]}</span><span class="ji" aria-hidden="true">${glyph(JICON[d.key] || '★')}</span>
    <span class="jn">${d.name}</span><span class="jd">${descOf(d, j)}${E ? `<br><b class="edl">${E.n}：${E.d}</b>` : ''}</span>${E ? `<span class="edtag">${E.n}</span>` : ''}</${tag}>`;
}

export const voucherFace = (k) => `<div class="tc voucher"><span class="tag">升级</span><span class="ji" aria-hidden="true">${glyph(VICON[k] || '✚')}</span>
  <span class="jn">${VOUCHERS[k].n}</span><span class="jd">${VOUCHERS[k].d}<br>永久有效</span></div>`;
export const jokerHTML = (j) => jokerFace(JD[j.key], j, 'button', `data-act="joker" data-uid="${j.uid}" data-key="j${j.uid}"`);

export function tarotFace(key, tag = 'div', attrs = '', picked = false) {
  const d = TD[key];
  return `<${tag} class="tc ${picked ? 'picked' : ''}" ${attrs}><span class="tag">一次性</span><span class="ji" aria-hidden="true">${glyph(TICON[key] || '☾')}</span>
    <span class="jn">${d.name}</span><span class="jd">${d.desc}</span></${tag}>`;
}
export const tarotHTML = (c) => tarotFace(c.key, 'button', `data-act="cons" data-uid="${c.uid}" data-key="t${c.uid}"`, isPicked('c', c.uid));

export const planetFace = (name, body, label = '赞助') =>
  `<div class="planet"><span class="lbl">${label}</span><span class="orb" aria-hidden="true"></span><span class="jn">${name}</span><span class="jd">${body}</span></div>`;

// "KH KC 9S" → card objects, for examples in the guide and the cover
export const parseCards = (str) => str.split(' ').filter(Boolean).map((t, i) => {
  const s = t.slice(-1), r = t.slice(0, -1);
  return { id: 'ex' + i, s, r: { A: 14, K: 13, Q: 12, J: 11 }[r] || Number(r), enh: null, seal: null };
});

export const miniCard = (c, cls = '') =>
  `<span class="mini ${isRed(c.s) ? 'red' : ''} ${c.enh ? 'e-' + c.enh : ''} ${cls}"><b>${RL(c.r)}</b><i>${SYM[c.s] + VS}</i></span>`;

// a spectator in the stalls: initial in a face circle, name, taste (♥), pet hate (✕) and tip.
// st: '' | 'will' (this hand wins them) | 'boo' (this hand annoys them) | 'ok' (won over)
export function seatHTML(key, i, st = '', vip = null) {
  const s = SPEC[key];
  if (!s) return '';
  // the 黄金档 guest: their rule instead of a pet hate; winning them over lifts it
  if (vip) {
    return `<div class="seat vip ${st}" data-i="${i}" title="黄金档嘉宾 ${vip.n}　喜欢：${s.d}　征服后：规则作废，打赏 $${VIP.tip}">
    <span class="sa" aria-hidden="true">★</span><span class="sn"><b>${vip.n}</b><i>♥ ${s.d}</i><i class="no rule">⚑ ${vip.d}</i></span>
    <span class="tip">${st === 'ok' ? '✔' : '$' + VIP.tip}</span></div>`;
  }
  const reg = isRegular(state, key), tip = tipOf(state, s);
  return `<div class="seat t${s.tier} ${reg ? 'reg' : ''} ${st}" data-i="${i}" title="${reg ? '熟客 · ' : ''}${s.n}　喜欢：${s.d}（${tipText(s, state)}）　讨厌：${s.nd}${reg ? '　熟客：打赏更多' : ''}">
    <span class="sa" aria-hidden="true">${s.n[0]}</span><span class="sn"><b>${reg ? '<em class="regb">熟</em>' : ''}${s.n}</b><i>♥ ${s.d}</i><i class="no">✕ ${s.nd}</i></span>
    <span class="tip">${st === 'ok' ? '✔' : tip.money ? '$' + tip.money : '×' + tip.xmult}</span></div>`;
}

// the room's heat (0–3): three bulbs, the mood and its ×; next = where the selected hand would take it
export function heatHTML(h, next = null) {
  const H = HEAT[h], N = next == null || next === h ? null : HEAT[next];
  return `<div class="heat h${h}" id="heat" aria-label="热度：${H.n}，收视 ×${H.x}">
    <span class="hk"><i class="en">HEAT</i>热度</span><span class="hm" aria-hidden="true">${[1, 2, 3].map((n) => `<b class="${n <= h ? 'on' : ''}"></b>`).join('')}</span>
    <span class="hv">${H.n} <em>×${H.x}</em></span>${N ? `<span class="hn ${next > h ? 'up' : 'down'}">${next > h ? '▲' : '▼'} ${N.n} ×${N.x}</span>` : ''}</div>`;
}
