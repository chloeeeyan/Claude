// Phones turned sideways get the desktop layout. Instead of a separate landscape stylesheet, the viewport is widened
// so the page is laid out at roughly 640px tall (the height the desktop layout is tuned for) and the browser scales it
// down to the screen. Every desktop media query, vh unit and pointer coordinate then just works.
const meta = document.querySelector('meta[name="viewport"]');
const PORTRAIT = 'width=device-width, initial-scale=1, viewport-fit=cover';

// a phone: touch-first and a short side under 600 CSS px
export const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
const landscape = () => matchMedia('(orientation: landscape)').matches;

function fit() {
  if (!meta) return;
  let want = PORTRAIT;
  if (isPhone() && landscape()) {
    const long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
    const w = Math.round(Math.min(1500, Math.max(1100, (640 * long) / short)));
    want = `width=${w}, viewport-fit=cover`;
  }
  if (meta.content !== want) meta.content = want;
  document.documentElement.classList.toggle('phone-land', isPhone() && landscape());
  document.documentElement.classList.toggle('phone-port', isPhone() && !landscape());
}

// fullscreen + orientation lock where the browser allows it (Android Chrome); elsewhere the player just turns the phone
export async function goLandscape() {
  const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* not allowed */ }
  try { await screen.orientation.lock('landscape'); return true; } catch (e) { return false; }
}

export function bindOrientation() {
  fit();
  matchMedia('(orientation: landscape)').addEventListener('change', fit);
  addEventListener('resize', fit);
}
