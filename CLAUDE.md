# 别冷场！ · Tough Crowd — notes for Claude

Pop-art poker deck-builder for the browser (Balatro-inspired; names, art and cards are original). Chinese UI.
Theme: a 1980s US late-night TV card show; you are the host. Core twist (读场): every show seats an audience of three
whose tastes you play to. Pop art for the real world, vaporwave only on screens.
Read `docs/direction.md` before planning work; it holds the direction and the roadmap. (Was 鬼牌夜场 / 夜场剧团 until 2026-10-09.)
Vite + vanilla JS ES modules, no framework. Node 20+.

## Commands
- `npm ci` then `npm test` (Vitest, 59 tests) — run after any change
- `npm run sim -- n=400` — balance bot; after rule/number changes, 普通 (stake 0, red deck) should stay around 8–10% win
  (`aud=0` runs with empty seats, ≈2%: the audience is core, not a bonus)
- `npm run dev` / `npm run build` (output `dist/`, relative paths via `base: './'`)

## Layout (read only what the task needs)
- `src/core/` game rules, no DOM: `rules.js` tables · `jokers.js` (hooks: card / held / hand / before / discard / money / broke; `arch` = build style) / `tarots.js` content · `evaluate.js` hand detection ·
  `scoring.js` computeHand → animation `steps` · `run.js` state machine (select → play ⇄ scoring → cashout → shop → … → over/win) ·
  `rng.js` seeded RNG kept in `st.rng` · `save.js` versioned saves ·
  `meta.js` cross-run progress (unlocks, collection, daily challenge), stored by the UI as `jn.meta` ·
  `audience.js` spectators, crowd rolls per night, tips (scored inside `computeHand` as `at: 'aud'` steps)
- `src/ui/` `store.js` (live `state` + `setState`, localStorage via `storage`, keys `jn.*`) · `hud.js` · `shelf.js` · `screens.js` (per-phase table HTML) ·
  `guide.js` modals · `play.js` scoring animation · `patch.js` keyed redraw + FLIP · `fx.js` shake / pulse / phase transition · `orient.js` phone landscape · `tutor.js` first-run tutorial · `tele.js` local playtest log · `input.js` all actions (ACTIONS map) · `components.js` HTML builders
- `src/styles/` one file per component, imported by `index.css`; tokens in `tokens.css`
- `tests/`, `tools/sim.js`

## Names: code vs. what the player sees
Code keeps poker/Balatro names; all UI text uses the TV-show names. ante → 第 N 期 (episode) · blind 0/1/2 → 热场 / 正片 / 黄金档
(boss = 黄金档嘉宾) · score → 收视 · round cleared → 收工 · joker → 艺人, the row → 班底 (selling = 解约) · tarot / cons → 道具,
tarot pack → 道具箱 · planet → 赞助广告 (names are made-up 1980s brands), planet pack → 赞助包 · shop → 后台 ·
voucher → 演播室升级 · audience / spectator → 观众, all three won over → 全场起立. Storage keys stay `jn.*`.
Hand types (对子, 顺子…) keep their poker names on purpose.

## Rules of thumb
- All randomness in core goes through `rand/rint/shuffle(st, …)`; never `Math.random` in `src/core` (breaks seed replay).
- Changing the shape of run state: bump `SAVE_VERSION` in `src/core/save.js` and add a migration.
- UI renders by string templates; `render()` redraws everything. Stage and shelf go through `patch()` (`src/ui/patch.js`):
  elements with `data-key` (cards `c<id>`, jokers `j<uid>`, tarots `t<uid>`) are reused across renders and FLIP-animate
  when they change zone/order; new cards in `ui.justDrawn` are dealt from `#pile`. Keys must be unique within a root.
  Motion goes through Web Animations with durations `/ ui.speed`, skipped under `prefers-reduced-motion`. Keep core free of DOM.
- Fonts are self-hosted via `@fontsource` (Google Fonts is unreliable in mainland China). Don't add CDN dependencies.
- Style: Pop Art comic — ink outlines, hard offset shadows, Ben-Day dots; Chinese text in ZCOOL KuaiLe, numbers in Luckiest Guy;
  English only as small slanted eyebrows next to Chinese. Essential info must be visible, not hover-only.
- Desktop must fit one screen (checked at 1366×640 and 1134×734); phones held upright stack and scroll. Phones held sideways
  get the desktop layout: `ui/orient.js` widens the viewport meta so the page lays out ~640px tall and the browser scales it.
- Reply to the user in Chinese, plainly; verify visual changes in a browser before claiming done.

## Status and next steps
Done: playable full run (8 nights, 75 jokers in 8 build styles, 15 tarots, 12 hand types incl. 3 hidden, 20 bosses, 8 vouchers,
4 joker editions, 5 decks, 3 stakes, 17 spectator types, 6 crowd jokers), hand guide,
coach tips, pop-art UI, game-screen layout, seeded RNG, versioned saves, tests, sim.

Agreed priority list (from the product review), in order:
1. ✅ repo + module split
2. ✅ Deploy: GitHub → EdgeOne Pages (international; free, no ICP filing, loads in China). Build `npm run build`, output `dist`.
   Vercel default domain is blocked in China.
3. ✅ Rendering architecture: keyed DOM reuse so cards can animate between zones (FLIP), prerequisite for game feel.
4. ✅ Game feel: deal from pile, cards fly to play area, escalating score feedback, screen shake on ×mult, phase transitions.
5. ✅ Game identity: chose 观众席 (audience) + 夜场剧团 naming — see `docs/identity-options.md`.
6. ✅ Content by archetype (flush / face / discard / economy / single-card / deck-rewrite builds), vouchers, joker editions; ~70–80 jokers, ~20 bosses.
7. ✅ Meta progression: unlocks, collection, stake ladder, daily seed.
8. ✅ Onboarding: teach-by-doing first run.
9. ✅ Tarot/pack UX: open pack → pick and apply on the spot.
10. Art & audio plan (`docs/art-audio-plan.md`); ✅ local telemetry (export from 图鉴 → 收藏); playtest plan in `docs/playtest.md`.
Next (2026-10-09): the roadmap in `docs/direction.md` replaces the rest of this list — step 1 retheme, then 读场 phase ①.
Commercial notes: 棋牌 themes are blocked for WeChat mini-games (personal accounts can't pick 牌类); Steam-first is the realistic route.
