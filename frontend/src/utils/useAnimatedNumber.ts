import { useEffect, useState } from 'react';

/**
 * Hook para animar suavemente números y porcentajes en tarjetas KPI y gráficos
 * Utiliza cubic easing para un efecto visual ejecutivo y fluido.
 */
export function useAnimatedNumber(target: number, duration: number = 650, decimals: number = 0): number {
  const [current, setCurrent] = useState<number>(target);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = current;
    const diff = target - startVal;

    if (diff === 0) return;

    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing cúbico desacelerado para sensación de solidez ejecutiva
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + diff * eased;

      if (progress < 1) {
        setCurrent(nextVal);
        frameId = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  if (decimals === 0) {
    return Math.round(current);
  }
  const factor = Math.pow(10, decimals);
  return Math.round(current * factor) / factor;
}
