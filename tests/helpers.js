// "KH KC 9S" → card objects with unique ids
export const cards = (str) => str.split(' ').filter(Boolean).map((t, i) => {
  const s = t.slice(-1), r = t.slice(0, -1);
  return { id: 't' + i, s, r: { A: 14, K: 13, Q: 12, J: 11 }[r] || Number(r), enh: null, seal: null };
});
