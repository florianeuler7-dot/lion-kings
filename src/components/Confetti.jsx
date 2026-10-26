import React, { useEffect, useRef } from 'react';

const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Lightweight canvas particle effect. Modes:
//   burst – explodes from a point (exercise done)
//   rain  – falls from the top (workout done)
// Runs ~duration ms then stops. Respects prefers-reduced-motion.
export default function Confetti({
  mode = 'burst',
  colors = ['#f97316', '#fb923c', '#fbbf24', '#7dd3fc', '#22c55e', '#ffffff'],
  count = 140,
  duration = 1800,
  origin = { x: 0.5, y: 0.45 },
  className = '',
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduceMotion()) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    const W = () => canvas.width, H = () => canvas.height;

    const rand = (a, b) => a + Math.random() * (b - a);
    const particles = Array.from({ length: count }, () => {
      const shape = Math.random() < 0.3 ? 'circle' : 'rect';
      if (mode === 'rain') {
        return {
          x: rand(0, W()), y: rand(-H() * 0.6, -20),
          vx: rand(-0.6, 0.6) * dpr, vy: rand(3, 7) * dpr,
          w: rand(5, 10) * dpr, h: rand(8, 16) * dpr,
          rot: rand(0, Math.PI * 2), vr: rand(-0.15, 0.15),
          color: colors[Math.floor(Math.random() * colors.length)], shape,
          wobble: rand(0, Math.PI * 2), life: 1,
        };
      }
      const angle = rand(0, Math.PI * 2);
      const speed = rand(6, 16) * dpr;
      return {
        x: W() * origin.x, y: H() * origin.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4 * dpr,
        w: rand(5, 10) * dpr, h: rand(8, 16) * dpr,
        rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
        color: colors[Math.floor(Math.random() * colors.length)], shape,
        wobble: rand(0, Math.PI * 2), life: 1,
      };
    });

    const gravity = (mode === 'rain' ? 0.06 : 0.35) * dpr;
    const drag = mode === 'rain' ? 0.995 : 0.92;
    const start = performance.now();
    let raf = 0;

    const frame = (t) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W(), H());
      const fadeStart = duration * 0.65;
      const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart)) : 1;
      particles.forEach(p => {
        p.vy += gravity;
        p.vx *= drag; p.vy *= drag;
        p.wobble += 0.12;
        p.x += p.vx + Math.sin(p.wobble) * 0.8 * dpr;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.wobble)));
        }
        ctx.restore();
      });
      if (elapsed < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W(), H());
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`fixed inset-0 w-full h-full pointer-events-none ${className}`} />;
}
