// Visits every screen in English mode and prints the Chinese text still untranslated (i18n keys, one per line).
// Needs a dev server: npx vite --port 5199, then node tools/i18n-scan.cjs [port]
const { chromium } = require(process.env.PW || 'playwright');
const port = process.argv[2] || 5199;
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-US' })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('crash', () => console.error('PAGE CRASHED')); p.on('framenavigated', (f) => { if (f === p.mainFrame()) console.error('NAV', f.url()); }); p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  const click = (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel);
  const wait = (ms) => p.waitForTimeout(ms);
  const set = (fn) => p.evaluate(async (src) => { const m = await import('/src/ui/store.js'); const C = await import('/src/core/index.js'); (new Function('m', 'C', src))(m, C); (await import('/src/ui/render.js')).render(); }, fn);
  await p.goto(`http://localhost:${port}/`); await p.evaluate(() => localStorage.setItem('jn.lang', 'en')); await p.reload(); await wait(1500);
  // cover modals
  for (const t of ['help', 'guide']) { await click(`[data-act="${t}"]`); await wait(300); if (t === 'guide') for (const tab of ['hands', 'score', 'crowd', 'cards', 'boss', 'collect']) { await click(`[data-act="gtab"][data-tab="${tab}"]`); await wait(200); } await click('[data-act="close"]'); await wait(200); }
  await click('[data-act="begin"]'); await wait(500);
  await wait(300); await click('[data-act="tutorok"]'); await wait(300);
  await click('.bc.cur .pickseat.on'); await wait(200); await click('.bc.cur .pickseat:not(.on)'); await wait(200);
  await click('[data-act="start"]'); await wait(1200);
  for (let i = 0; i < 6; i++) { await click('[data-act="tutorok"]'); await wait(200); }
  await p.evaluate(() => [...document.querySelectorAll('[data-act="card"]')].slice(0, 2).forEach((c) => c.click())); await wait(300);
  await click('[data-act="play"]'); await wait(6000);
  await click('[data-act="discard"]'); await wait(300);
  await click('[data-act="deck"]'); await wait(300); await click('[data-act="close"]'); await wait(200);
  // with cast, props and a VIP headline show
  await set(`m.state.jokers = C.JOKERS.slice(0, 5).map((j, i) => ({ key: j.key, uid: 700 + i, data: {} })); m.state.cons = C.TAROTS.slice(0, 2).map((t, i) => ({ key: t.key, uid: 800 + i })); m.state.regulars = Object.fromEntries(C.SPECTATORS.map((s) => [s.key, 2]));`);
  await wait(300); await click('.jrow [data-uid="700"]'); await wait(300); await click('.crow [data-uid="800"]'); await wait(300);
  // cash-out, shop, packs
  await set(`m.state.roundScore = m.state.target; m.state.cash = C.cashLines(m.state); m.state.phase = 'cashout';`); await wait(400);
  await click('[data-act="cashout"]'); await wait(400);
  for (let i = 0; i < 6; i++) { await set(`m.state.money = 99;`); await p.evaluate((i) => document.querySelectorAll('[data-act="buy"]')[i]?.click(), i); await wait(400); await click('[data-act="tclose"]'); await wait(200); await click('[data-act="tkeep"]'); await wait(200); await p.evaluate(() => document.querySelector('[data-act="pickpack"]')?.click()); await wait(300); }
  await click('[data-act="reroll"]'); await wait(300);
  await click('[data-act="next"]'); await wait(400);
  await set(`m.state.blindIdx = 2; m.state.bossKey = 'spade';`); await wait(300);
  await click('[data-act="start"]'); await wait(1200);
  await set(`m.state.phase = 'over';`); await wait(400);
  await set(`m.state.phase = 'win';`); await wait(400);
  const miss = await p.evaluate(() => [...window.__i18nMissing]);
  console.log(miss.join('\n'));
  if (errs.length) console.error('PAGE ERRORS:', errs.join(' | '));
  await b.close();
})();
