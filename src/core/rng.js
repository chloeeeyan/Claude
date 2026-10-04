// Seeded randomness. A run keeps its generator position in `st.rng`, so a saved run
// resumes with the same future draws and any seed can be replayed exactly.

export function makeSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}

// mulberry32 step: advances st.rng and returns a float in [0, 1)
export function rand(st) {
  st.rng = (st.rng + 0x6d2b79f5) >>> 0;
  let t = st.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rint = (st, n) => Math.floor(rand(st) * n);

export function shuffle(st, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(st, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
