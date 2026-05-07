import confetti from 'canvas-confetti';

/** Shared options — canvas-confetti has no single “fullscreen” mode; use wide spread + several origins. */
const BASE = { disableForReducedMotion: true };

/**
 * One-shot burst, doctor / tech dashboards when graft goal is first reached.
 * Fires along the bottom edge (multiple x positions) plus a wide center fan so it fills the viewport.
 */
export function fireGoalConfetti() {
  if (typeof window === 'undefined') return;

  const fromBottom = (x, particleCount, opts = {}) => {
    confetti({
      ...BASE,
      origin: { x, y: 0.92 },
      particleCount,
      spread: 72,
      startVelocity: 50,
      ...opts,
    });
  };

  [0.1, 0.28, 0.46, 0.54, 0.72, 0.9].forEach((x, i) => {
    fromBottom(x, 48, {
      spread: 68 + (i % 2) * 18,
      startVelocity: 46 + (i % 3) * 6,
      scalar: i % 3 === 0 ? 1.05 : 0.92,
    });
  });

  confetti({
    ...BASE,
    origin: { x: 0.5, y: 0.88 },
    particleCount: 110,
    spread: 105,
    startVelocity: 52,
    decay: 0.91,
  });

  confetti({
    ...BASE,
    origin: { x: 0.5, y: 0.72 },
    particleCount: 70,
    spread: 125,
    startVelocity: 38,
    decay: 0.92,
    scalar: 0.85,
  });
}

/** Served from `client/public/bell.mp3` (CRA: root-relative URL). */
function goalBellAssetUrl() {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  return `${base}/bell.mp3`;
}

function playGoalBellSynthesized() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    void ctx.resume?.();
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.4, t0);
    master.connect(ctx.destination);

    const f0 = 698.46;
    const partials = [
      { ratio: 1, peak: 0.2, decay: 0.5 },
      { ratio: 2.02, peak: 0.14, decay: 0.4 },
      { ratio: 2.98, peak: 0.085, decay: 0.32 },
      { ratio: 4.12, peak: 0.05, decay: 0.24 },
    ];
    const end = t0 + 0.58;

    partials.forEach(({ ratio, peak, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * ratio, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(end);
    });

    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 720);
  } catch {
    // ignore
  }
}

/**
 * Goal-reached bell: plays `public/bell.mp3` when present; falls back to Web Audio synthesis.
 */
export function playGoalBell() {
  if (typeof window === 'undefined') return;
  let fellBack = false;
  const fallback = () => {
    if (fellBack) return;
    fellBack = true;
    playGoalBellSynthesized();
  };
  try {
    const audio = new Audio(goalBellAssetUrl());
    audio.volume = 0.92;
    audio.addEventListener('error', fallback, { once: true });
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.catch(fallback);
    }
  } catch {
    fallback();
  }
}
