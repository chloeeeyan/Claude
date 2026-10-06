// Entry point: fonts and styles, then restore the saved run (or open the cover) and wire up input.
import '@fontsource/zcool-kuaile';
import '@fontsource/luckiest-guy';
import './styles/index.css';

import { bindInput } from './ui/input.js';
import { bindOrientation } from './ui/orient.js';
import { render } from './ui/render.js';
import { loadRun, menuState, setState, state, storage, ui } from './ui/store.js';

// returning players who saw the old how-to modal skip the new hands-on tutorial
if (storage.get('tutorial', false) && storage.get('tutor', null) === null) storage.set('tutor', 'done');
storage.set('tutorial', true);

bindOrientation();
setState(loadRun() || menuState());
if (state.phase === 'play') state.hand.forEach((c) => ui.justDrawn.add(c.id));
bindInput();
render();
