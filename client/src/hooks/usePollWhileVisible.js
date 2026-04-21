import { useEffect, useRef } from 'react';

/**
 * Runs `callback` every `intervalMs` only while the browser tab is visible.
 * Pauses when the tab is in the background; on return, runs once immediately then resumes the interval.
 */
export default function usePollWhileVisible(callback, intervalMs, enabled = true) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const tick = () => {
      cb.current();
    };
    const arm = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        timer = setInterval(tick, intervalMs);
      }
    };
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        if (timer) clearInterval(timer);
        timer = null;
      } else {
        tick();
        arm();
      }
    };
    arm();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
