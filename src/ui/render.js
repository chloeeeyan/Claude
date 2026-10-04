// Full redraw of HUD, shelf and table, then autosave.
import { renderHud } from './hud.js';
import { renderShelf } from './shelf.js';
import { renderStage } from './screens.js';
import { saveRun, ui } from './store.js';

export function render() {
  renderHud();
  renderShelf();
  renderStage();
  ui.justDrawn.clear();
  saveRun();
}
