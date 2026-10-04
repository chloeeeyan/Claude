// Small DOM and formatting helpers.
import { ui } from './store.js';

export const $ = (id) => document.getElementById(id);
export const fmt = (n) => Math.floor(n).toLocaleString('en-US');
export const fmtM = (m) => { const v = Math.round(m * 100) / 100; return v >= 1000 ? fmt(v) : String(v); };

// animation delays scale with the speed setting
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms / ui.speed));

let toastTimer;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
}
