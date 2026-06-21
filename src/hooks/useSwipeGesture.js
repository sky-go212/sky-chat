import { useRef, useEffect } from 'react';

export function useSwipeGesture({ onSwipeRight, onSwipeLeft, threshold = 50 } = {}) {
  const ref = useRef(null);
  const startX = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e) => { startX.current = e.touches?.[0]?.clientX ?? e.clientX; };
    const onEnd = (e) => {
      if (startX.current === null) return;
      const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
      const diff = endX - startX.current;
      if (Math.abs(diff) >= threshold) {
        if (diff > 0 && onSwipeRight) onSwipeRight();
        if (diff < 0 && onSwipeLeft) onSwipeLeft();
      }
      startX.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [onSwipeRight, onSwipeLeft, threshold]);

  return ref;
}
