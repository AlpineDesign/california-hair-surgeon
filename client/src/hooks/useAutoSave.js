import { useEffect, useRef, useState } from 'react';

/**
 * Calls saveFn(data) after `delay` ms of no changes.
 * Returns { status } — 'idle' | 'saving' | 'saved' | 'error'
 *
 * Pass `immediate: true` to skip the debounce (e.g. on discrete actions).
 */
export default function useAutoSave(data, saveFn, { delay = 800, enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const timerRef  = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!mountedRef.current) { mountedRef.current = true; return; }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn(data);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), enabled]);

  return { status };
}
