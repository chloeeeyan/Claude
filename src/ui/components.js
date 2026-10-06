// HTML builders for cards, jokers, tarots and planets.
import { ENH, JD, RARITY, SEALS, SNAME, SYM, TD, VS, RL, curBoss, debuffed, descOf, isFace, isRed } from '../core/index.js';
import { inRound, state, ui } from './store.js';

export const glyph = (s) => s + VS;

export const JICON = {
  joker: '☻', suitS: '♠', suitH: '♥', suitC: '♣', suitD: '♦', pairM: '⚇', twoM: '⚏', threeM: '♆', strM: '↗', flM: '❖', pairC: '✌',
  even: '②', odd: '③', face: '♚', ace: '✈', half: '◐', flag: '⚑', misprint: '✎', piggy: '◉', abacus: '⚖', sweeper: '✂', snow: '❄',
  collector: '✪', hoard: '$', deep: '≋', gem: '◆', first: '☀', fullseat: '⑤', splash: '☔', fourf: '✋', smith: '⚒', last: '⌛',
  family: '⌂', royal: '♛', duo: '☯', trio: '☘', palette: '✿', mirror: '♔', blueprint: '▤',
};
export const TICON = {
  tH: '♥', tS: '♠', tC: '♣', tD: '♦', tUp: '⇧', tCut: '✂', tCopy: '⧉', tBonus: '✚', tMult: '✸', tGlass: '◇', tSteel: '⬢',
  tWild: '✦', tRed: '◉', tGold: '✪', tRich: '¥',
};
export const DECK_MARK = { red: '♦', blue: '♠', gold: '$', black: '★', paint: '✦' };
export const STAKE_MARK = ['●○○', '●●○', '●●●'];

export const isPicked = (kind, uid) => !!(state.inspect && state.inspect.kind === kind && state.inspect.uid === uid);

export function cardTitle(c) {
  const p = [SNAME[c.s] + RL(c.r)];
  if (inRound() && debuffed(state, c)) p.push(`本关 Boss「${curBoss(state).n}」：这张牌打出去不计分`);
  if (c.enh) p.push(`${ENH[c.enh].n}：${ENH[c.enh].d}`);
  if (c.seal) p.push(`${SEALS[c.seal].n}：${SEALS[c.seal].d}`);
  return p.join('\n');
}

// arc = {o: offset from the hand's centre}; hand cards fan along a gentle curve
export function cardHTML(c, act = 'card', arc) {
  const sel = state.selected.includes(c.id);
  const cls = ['card', 's-' + c.s, isRed(c.s) ? 'red' : '', sel ? 'sel' : '', inRound() && debuffed(state, c) ? 'debuff' : '',
    ui.justDrawn.has(c.id) ? 'deal' : '', c.enh ? 'e-' + c.enh : ''].join(' ');
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
    ${c.enh ? `<span class="eb">${ENH[c.enh].n}</span>` : ''}${c.seal ? `<span class="seal ${c.seal}"></span>` : ''}</button>`;
}

export function jokerFace(d, j, tag = 'div', attrs = '') {
  return `<${tag} class="jk r${d.r} ${j && isPicked('j', j.uid) ? 'picked' : ''}" ${attrs}>
    <span class="tag">${RARITY[d.r]}</span><span class="ji" aria-hidden="true">${glyph(JICON[d.key] || '★')}</span>
    <span class="jn">${d.name}</span><span class="jd">${descOf(d, j)}</span></${tag}>`;
}
export const jokerHTML = (j) => jokerFace(JD[j.key], j, 'button', `data-act="joker" data-uid="${j.uid}" data-key="j${j.uid}"`);

export function tarotFace(key, tag = 'div', attrs = '', picked = false) {
  const d = TD[key];
  return `<${tag} class="tc ${picked ? 'picked' : ''}" ${attrs}><span class="tag">一次性</span><span class="ji" aria-hidden="true">${glyph(TICON[key] || '☾')}</span>
    <span class="jn">${d.name}</span><span class="jd">${d.desc}</span></${tag}>`;
}
export const tarotHTML = (c) => tarotFace(c.key, 'button', `data-act="cons" data-uid="${c.uid}" data-key="t${c.uid}"`, isPicked('c', c.uid));

export const planetFace = (name, body, label = '星图') =>
  `<div class="planet"><span class="lbl">${label}</span><span class="orb" aria-hidden="true"></span><span class="jn">${name}</span><span class="jd">${body}</span></div>`;

// "KH KC 9S" → card objects, for examples in the guide and the cover
export const parseCards = (str) => str.split(' ').filter(Boolean).map((t, i) => {
  const s = t.slice(-1), r = t.slice(0, -1);
  return { id: 'ex' + i, s, r: { A: 14, K: 13, Q: 12, J: 11 }[r] || Number(r), enh: null, seal: null };
});

export const miniCard = (c, cls = '') =>
  `<span class="mini ${isRed(c.s) ? 'red' : ''} ${c.enh ? 'e-' + c.enh : ''} ${cls}"><b>${RL(c.r)}</b><i>${SYM[c.s] + VS}</i></span>`;
