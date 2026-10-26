import React, { useEffect, useState } from 'react';
import { MOTIVATION_QUOTES, quoteOfTheDay } from '../data/quotes';
import { formatDuration, workoutTotals } from '../lib/workouts';
import { playBeep, vibrate } from '../lib/device';

const SPARKS = [
  { top: '8%',  left:  '5%', char: '✦', color: '#ef4444', delay: '0ms',   size: 22 },
  { top: '6%',  left: '88%', char: '⚡', color: '#f97316', delay: '60ms',  size: 20 },
  { top: '18%', left: '96%', char: '✦', color: '#fff',    delay: '140ms', size: 14 },
  { top: '72%', left:  '2%', char: '★', color: '#ef4444', delay: '100ms', size: 18 },
  { top: '80%', left: '92%', char: '✦', color: '#f97316', delay: '30ms',  size: 24 },
  { top: '42%', left:  '1%', char: '⚡', color: '#fff',    delay: '200ms', size: 16 },
  { top: '60%', left: '97%', char: '★', color: '#ef4444', delay: '130ms', size: 14 },
  { top: '88%', left: '15%', char: '✦', color: '#f97316', delay: '80ms',  size: 20 },
  { top: '84%', left: '78%', char: '⚡', color: '#fff',    delay: '230ms', size: 16 },
  { top:  '3%', left: '50%', char: '★', color: '#ef4444', delay: '40ms',  size: 18 },
  { top: '35%', left: '98%', char: '✦', color: '#fbbf24', delay: '170ms', size: 12 },
  { top: '55%', left:  '0%', char: '⚡', color: '#fbbf24', delay: '250ms', size: 14 },
];

// Full-screen "exercise done" celebration between exercises
export function CelebrationOverlay({ message, nextExercise, onDone }) {
  const [phase, setPhase] = useState('impact');

  useEffect(() => {
    vibrate([100, 30, 180, 25, 260, 20, 180, 15, 120, 10, 80, 30, 400]);
    playBeep(); setTimeout(() => playBeep(), 180);
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('fade'), 3400);
    const t3 = setTimeout(onDone, 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); vibrate(0); };
  }, []);

  const handleTap = () => {
    if (phase !== 'fade') {
      vibrate(0);
      setPhase('fade');
      setTimeout(onDone, 500);
    }
  };

  // Separate emoji from text for correct centering
  const msgClean = message.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
  const msgEmoji = [...message].filter(c => /\p{Emoji_Presentation}/u.test(c)).join('');

  return (
    <div onClick={handleTap}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #200505 0%, #0d0101 45%, #04020a 80%, #000 100%)',
        opacity: phase === 'fade' ? 0 : 1,
        transition: phase === 'fade' ? 'opacity 0.6s ease' : 'none',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'white', animation: 'impactFlash 0.4s ease-out both', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, animation: 'fireEdge 4s ease-in-out both', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)',
        animation: 'auraGlow 1.2s ease-in-out 0.2s infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
          border: `2px solid rgba(239,${68 + i * 20},68,${0.85 - i * 0.15})`,
          animation: `energyRing 0.7s cubic-bezier(0,0.4,0.6,1) ${i * 100}ms both`,
          pointerEvents: 'none', zIndex: 2,
        }} />
      ))}
      {SPARKS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: s.top, left: s.left,
          fontSize: s.size, color: s.color, pointerEvents: 'none',
          animation: `celebSpark 1.6s ease-out ${s.delay} both`, zIndex: 3,
        }}>{s.char}</div>
      ))}

      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center', animation: 'powerImpact 0.32s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        {msgEmoji && <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 6 }}>{msgEmoji}</div>}
        <div className="font-display text-white"
          style={{
            fontSize: 'clamp(3rem, 14vw, 5rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            textShadow: '0 0 25px rgba(239,68,68,1), 0 0 60px rgba(239,68,68,0.6), 5px 5px 0 rgba(0,0,0,0.9)',
            WebkitTextStroke: '1px rgba(255,80,80,0.25)',
            paddingLeft: '1rem', paddingRight: '1rem',
          }}>
          {msgClean}
        </div>
        <div style={{
          height: 3, marginTop: 10, marginLeft: '15%', marginRight: '15%',
          background: 'linear-gradient(90deg, transparent, #ef4444 30%, #f97316 70%, transparent)',
          animation: 'impactLine 0.35s ease 0.08s both',
        }} />
      </div>

      {nextExercise && (
        <div className="label text-zinc-400 mt-7"
          style={{ position: 'relative', zIndex: 4, animation: 'celebFadeUp 0.4s ease 0.5s both' }}>
          Weiter: {nextExercise}
        </div>
      )}

      <div className="text-xs text-zinc-600 absolute bottom-10"
        style={{ zIndex: 4, animation: 'celebFadeUp 0.3s ease 1.2s both' }}>
        tippen zum überspringen
      </div>
    </div>
  );
}

const VICTORY_SPARKS = [
  { top: '6%',  left: '8%',  char: '✦', color: '#fbbf24', delay: '0ms',   size: 24 },
  { top: '10%', left: '78%', char: '✦', color: '#fcd34d', delay: '120ms', size: 18 },
  { top: '4%',  left: '42%', char: '⚡', color: '#f59e0b', delay: '60ms',  size: 26 },
  { top: '16%', left: '18%', char: '✦', color: '#fbbf24', delay: '200ms', size: 14 },
  { top: '8%',  left: '62%', char: '✦', color: '#fde68a', delay: '90ms',  size: 20 },
  { top: '14%', left: '88%', char: '⚡', color: '#f59e0b', delay: '300ms', size: 16 },
  { top: '20%', left: '50%', char: '✦', color: '#fbbf24', delay: '180ms', size: 13 },
  { top: '18%', left: '32%', char: '✦', color: '#fcd34d', delay: '40ms',  size: 17 },
  { top: '3%',  left: '26%', char: '✦', color: '#f59e0b', delay: '250ms', size: 15 },
  { top: '12%', left: '95%', char: '✦', color: '#fbbf24', delay: '150ms', size: 12 },
];

// Full-screen "workout done" summary with notes field
export function WorkoutCompleteModal({ data, onClose }) {
  const [note, setNote] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vibrate([80, 40, 120, 35, 180, 30, 260, 25, 380, 20, 550, 15, 800]);
    playBeep();
    const t1 = setTimeout(() => playBeep(), 350);
    const t2 = setTimeout(() => setShowStats(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const { totalSets, totalReps, totalVolume, exerciseCount } = workoutTotals(data.logs || []);
  const q = quoteOfTheDay(MOTIVATION_QUOTES.filter(x => x.author === 'Markus Rühl'));

  const fade = { opacity: showStats ? 1 : 0, transform: showStats ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.55s ease, transform 0.55s ease' };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try { await onClose(note); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 18%, #1c0f00 0%, #0a0600 45%, #030303 100%)',
               paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', animation: 'victoryEdge 3.5s ease-in-out both' }} />
      {VICTORY_SPARKS.map((s, i) => (
        <div key={i} style={{ position: 'fixed', top: s.top, left: s.left, fontSize: s.size, color: s.color,
          pointerEvents: 'none', animation: `celebSpark 2.8s ease-out ${s.delay} both` }}>
          {s.char}
        </div>
      ))}

      <div className="flex flex-col items-center px-6 pt-12 pb-10 max-w-md mx-auto">
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16,
          animation: 'celebScale 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
          filter: 'drop-shadow(0 0 32px rgba(251,191,36,0.7))' }}>
          🏆
        </div>

        <div className="font-display text-center text-gold"
          style={{ fontSize: 'clamp(2.8rem,13vw,4.5rem)', lineHeight: 1,
            textShadow: '0 0 60px rgba(251,191,36,0.65), 0 0 120px rgba(251,191,36,0.25)',
            animation: 'celebScale 0.48s cubic-bezier(0.34,1.56,0.64,1) 0.18s both' }}>
          TRAINING
        </div>
        <div className="font-display text-center text-white"
          style={{ fontSize: 'clamp(2.2rem,10vw,3.5rem)', lineHeight: 1, marginBottom: 10,
            animation: 'celebFadeUp 0.4s ease 0.3s both' }}>
          FERTIG!
        </div>

        <div className="label text-gold/80 mb-1" style={{ animation: 'celebFadeUp 0.4s ease 0.42s both' }}>
          {data.planName}
        </div>
        {data.duration > 0 && (
          <div className="text-xs text-zinc-500 mb-8" style={{ animation: 'celebFadeUp 0.4s ease 0.5s both' }}>
            {formatDuration(data.duration)}
          </div>
        )}

        <div className="w-full grid grid-cols-3 gap-3 mb-3" style={{ ...fade, transitionDelay: '0ms' }}>
          {[
            { label: 'Übungen', value: exerciseCount },
            { label: 'Sätze',   value: totalSets },
            { label: 'Wdh.',    value: totalReps },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] border border-gold/20 rounded-2xl p-4 text-center">
              <div className="font-display text-3xl text-gold tabular">{value}</div>
              <div className="label mt-1">{label}</div>
            </div>
          ))}
        </div>

        {totalVolume > 0 && (
          <div className="w-full bg-white/[0.04] border border-gold/20 rounded-2xl p-4 mb-6 text-center"
            style={{ ...fade, transitionDelay: '80ms' }}>
            <div className="label mb-1">Gesamtvolumen</div>
            <div className="font-display text-4xl text-gold tabular">
              {totalVolume.toLocaleString('de-DE')} <span className="text-xl text-zinc-500">kg</span>
            </div>
          </div>
        )}

        <div className="w-full mb-5" style={{ ...fade, transitionDelay: '160ms' }}>
          <div className="label mb-2">Notiz zum Training</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Wie lief's? Gewicht, Gefühl, Besonderheiten..."
            rows={3}
            className="input-field px-4 py-3 text-sm resize-none"
          />
        </div>

        <div className="w-full border-t border-line pt-4 mb-7 text-center" style={{ ...fade, transitionDelay: '240ms' }}>
          <div className="text-zinc-300 text-sm italic leading-snug">„{q.text}"</div>
          {q.author && <div className="text-zinc-500 text-xs mt-2">— {q.author}</div>}
        </div>

        <button onClick={submit} disabled={saving}
          className="btn-gold pressable w-full font-display text-xl py-4"
          style={{ ...fade, transitionDelay: '320ms' }}>
          {saving ? 'SPEICHERN…' : 'WEITER →'}
        </button>
      </div>
    </div>
  );
}
