import { useEffect, useRef } from 'react';
import { fireGoalConfetti, playGoalBell } from '../utils/goalCelebration';

/**
 * Fires confetti + bell once when total grafts cross from below goal to >= goal.
 * Skips when the first render is already at/above goal (e.g. page refresh after milestone).
 */
export default function useGraftGoalCelebration(surgeryId, goal, totalExtracted, { enabled = true } = {}) {
  const prevRef = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => {
    prevRef.current = null;
    firedRef.current = false;
  }, [surgeryId]);

  useEffect(() => {
    if (!enabled) {
      prevRef.current = totalExtracted;
      return;
    }
    if (goal <= 0) {
      prevRef.current = totalExtracted;
      return;
    }
    const prevVal = prevRef.current;
    if (totalExtracted >= goal) {
      const wasBelow = prevVal != null && prevVal < goal;
      if (wasBelow && !firedRef.current) {
        firedRef.current = true;
        playGoalBell();
        fireGoalConfetti();
      }
    }
    prevRef.current = totalExtracted;
  }, [enabled, goal, totalExtracted]);
}
