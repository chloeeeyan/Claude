// Playing-card basics shared by rules, scoring and UI.

export const VS = '︎'; // text-presentation selector: keeps suit glyphs from turning into emoji
export const SUITS = ['S', 'H', 'C', 'D'];
export const SYM = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const SNAME = { S: '黑桃', H: '红桃', C: '梅花', D: '方片' };
export const SO = { S: 0, H: 1, C: 2, D: 3 };

export const RL = (r) => (r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r));
export const chipVal = (r) => (r === 14 ? 11 : r >= 11 ? 10 : r);
export const isFace = (r) => r >= 11 && r <= 13;
export const isRed = (s) => s === 'H' || s === 'D';
export const suitIs = (c, s) => c.enh === 'wild' || c.s === s;
