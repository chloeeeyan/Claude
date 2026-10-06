// Full redraw of HUD, shelf and table, then autosave. A change of phase plays a panel transition on the table
// (rounds skip it: their transition is the deal itself).
import { $ } from './dom.js';
import { panelIn } from './fx.js';
import { renderHud } from './hud.js';
import { renderShelf } from './shelf.js';
import { renderStage } from './screens.js';
import { runTutor } from './tutor.js';
import { noteProgress, saveRun, state, ui } from './store.js';

let lastScreen = null;
const screenOf = () => (state.phase === 'scoring' ? 'play' : state.phase === 'shop' && state.pack ? 'pack' : state.phase);

export function render() {
  renderHud();
  renderShelf();
  renderStage();
  const scr = screenOf();
  if (lastScreen && scr !== lastScreen && scr !== 'play') panelIn($('stage'));
  lastScreen = scr;
  ui.justDrawn.clear();
  noteProgress();
  saveRun();
  runTutor();
}
