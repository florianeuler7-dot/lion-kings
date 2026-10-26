import React, { useEffect, useRef, useState } from 'react';

const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Animates a number from `from` to `value` (ease-out). Formats with de-DE separators.
export function useCountUp(value, { duration = 900, delay = 0, from = 0 } = {}) {
  const [n, setN] = useState(reduceMotion() ? value : from);
  const raf = useRef(0);
  useEffect(() => {
    if (reduceMotion()) { setN(value); return; }
    let start = 0;
    const startVal = n;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(startVal + (value - startVal) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { raf.current = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); };
  }, [value]);
  return n;
}

export default function CountUp({ value, duration, delay, className = '', suffix = '', prefix = '' }) {
  const n = useCountUp(value, { duration, delay });
  return <span className={`tabular ${className}`}>{prefix}{n.toLocaleString('de-DE')}{suffix}</span>;
}
