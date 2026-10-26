import { useEffect, useRef } from 'react';

// ── Haptics ──────────────────────────────────────────────────────────────────
export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// ── Wake Lock: keeps screen on during active training ────────────────────────
export function useWakeLock() {
  const ref = useRef(null);
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let disposed = false;
    const acquire = async () => {
      try {
        if (disposed || ref.current) return; // already held
        ref.current = await navigator.wakeLock.request('screen');
        // Re-acquire immediately if the system releases it (e.g. low battery)
        ref.current.addEventListener('release', () => {
          ref.current = null;
          if (!disposed && document.visibilityState === 'visible') acquire();
        });
      } catch (_) {}
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      ref.current?.release().catch(() => {});
      ref.current = null;
    };
  }, []);
}

// ── Notification helpers ──────────────────────────────────────────────────────
export async function requestNotifPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default')
      await Notification.requestPermission();
  } catch (_) {}
}

// Play a short beep using Web Audio API (works on iOS PWA)
let audioCtx = null;
export function playBeep(freq = 880, duration = 0.5) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export async function scheduleRestNotification(endAt) {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) return;
    reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', id: 'rest-timer', endAt, title: 'Pause erreicht!', body: 'Empfohlene Pause vorbei – nächster Satz 💪' });
  } catch (_) {}
}

export async function cancelRestNotification() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CANCEL_NOTIFICATION', id: 'rest-timer' });
  } catch (_) {}
}

export function scrollTop() {
  try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }
}
