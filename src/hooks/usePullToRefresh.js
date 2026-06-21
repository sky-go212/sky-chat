import { useRef, useState, useEffect } from 'react';

export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e) => {
      if (el.scrollTop === 0) startY.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (startY.current === null) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 80 && !refreshing) {
        setRefreshing(true);
        startY.current = null;
        Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
      }
    };
    const onEnd = () => { startY.current = null; };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [onRefresh, refreshing]);

  return { ref, refreshing };
}
