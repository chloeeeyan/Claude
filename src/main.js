// Entry point: fonts and styles, then restore the saved run (or open the cover) and wire up input.
import '@fontsource/zcool-kuaile';
import '@fontsource/luckiest-guy';
import './styles/index.css';

import { openModal } from './ui/guide.js';
import { bindInput } from './ui/input.js';
import { render } from './ui/render.js';
import { loadRun, menuState, setState, state, storage, ui } from './ui/store.js';

setState(loadRun() || menuState());
if (state.phase === 'play') state.hand.forEach((c) => ui.justDrawn.add(c.id));
bindInput();
render();

if (!storage.get('tutorial', false)) {
  storage.set('tutorial', true);
  openModal('help');
}
