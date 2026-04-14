/**
 * Light tap feedback for graft buttons.
 * - Uses Vibration API where supported (many Android browsers).
 * - On iOS Safari / PWA (WebKit), `navigator.vibrate` is usually unavailable; iOS 18+ can emit a
 *   subtle system haptic when a checkbox with the non-standard `switch` attribute is toggled via
 *   an associated <label> click(). Must run synchronously inside the same user gesture as the tap.
 */

const DECOY_ID = 'surgassist-haptic-decoy';

let decoyInput = null;
let decoyLabel = null;

function isIosLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iP(ad|hone|od)/.test(ua)) return true;
  // iPadOS “desktop” Safari
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

function ensureDecoyControls() {
  if (typeof document === 'undefined') return null;
  if (decoyInput && document.body.contains(decoyInput)) {
    return { input: decoyInput, label: decoyLabel };
  }
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = DECOY_ID;
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  Object.assign(input.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  const label = document.createElement('label');
  label.htmlFor = DECOY_ID;
  label.setAttribute('aria-hidden', 'true');
  label.tabIndex = -1;
  Object.assign(label.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  document.body.appendChild(input);
  document.body.appendChild(label);
  decoyInput = input;
  decoyLabel = label;
  return { input, label };
}

function triggerIosSwitchHaptic() {
  if (!isIosLike()) return;
  try {
    const pair = ensureDecoyControls();
    if (!pair) return;
    const { input, label } = pair;
    input.checked = !input.checked;
    label.click();
  } catch {
    /* ignore */
  }
}

export function triggerLightHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(18);
    } catch {
      /* ignore */
    }
  }
  triggerIosSwitchHaptic();
}
