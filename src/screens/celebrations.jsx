import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Zap, Award, Flame } from 'lucide-react';
import { MOTIVATION_QUOTES, quoteOfTheDay } from '../data/quotes';
import { formatDuration, workoutTotals } from '../lib/workouts';
import { playBeep, vibrate } from '../lib/device';
import { xpForWorkout, totalXp, levelFromXp, levelTitle, unlockedBadges, XP } from '../lib/xp';
import Confetti from '../components/Confetti';
import CountUp from '../components/CountUp';

const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// ── Exercise done: impact flash, shake, confetti burst, +XP ─────────────────
export function CelebrationOverlay({ message, nextExercise, onDone, xp = XP.perSet * 3 }) {
  const [phase, setPhase] = useState('impact');

  useEffect(() => {
    vibrate([60, 20, 120, 20, 220, 30, 400]);
    playBeep(660, 0.12); setTimeout(() => playBeep(880, 0.18), 120); setTimeout(() => playBeep(1174, 0.35), 260);
    const t1 = setTimeout(() => setPhase('hold'), 500);
    const t2 = setTimeout(() => setPhase('fade'), 2600);
    const t3 = setTimeout(onDone, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); vibrate(0); };
  }, []);

  const handleTap = () => {
    if (phase !== 'fade') {
      vibrate(0);
      setPhase('fade');
      setTimeout(onDone, 400);
    }
  };

  const msgClean = message.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

  return (
    <div onClick={handleTap} role="status" aria-live="assertive"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none ${phase === 'impact' && !reduceMotion() ? 'shake' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #2a1304 0%, #130b05 45%, #0b1220 85%)',
        opacity: phase === 'fade' ? 0 : 1,
        transition: phase === 'fade' ? 'opacity 0.45s ease' : 'none',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'impactFlash 0.35s ease-out both', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, animation: 'fireEdge 2.8s ease-in-out both', pointerEvents: 'none', zIndex: 2 }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
          border: `3px solid rgba(249,${115 + i * 25},22,${0.9 - i * 0.2})`,
          animation: `energyRing 0.65s cubic-bezier(0,0.4,0.6,1) ${i * 90}ms both`,
          pointerEvents: 'none', zIndex: 2,
        }} />
      ))}
      <Confetti mode="burst" count={160} duration={1700} origin={{ x: 0.5, y: 0.42 }} className="z-[3]" />

      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center', animation: 'powerImpact 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div className="font-display text-white uppercase"
          style={{
            fontSize: 'clamp(3.4rem, 16vw, 6rem)',
            lineHeight: 0.88,
            textShadow: '0 0 30px rgba(249,115,22,1), 0 0 70px rgba(249,115,22,0.55), 6px 6px 0 rgba(0,0,0,0.9)',
            paddingLeft: '1rem', paddingRight: '1rem',
          }}>
          {msgClean}
        </div>
        <div style={{
          height: 4, marginTop: 12, marginLeft: '12%', marginRight: '12%',
          background: 'linear-gradient(90deg, transparent, #f97316 30%, #7dd3fc 70%, transparent)',
          animation: 'impactLine 0.35s ease 0.08s both',
        }} />
      </div>

      <div className="xp-pop font-display text-4xl text-ok flex items-center gap-2" style={{ position: 'relative', zIndex: 4, marginTop: 18, animationDelay: '0.35s' }} aria-hidden="true">
        <Zap className="w-7 h-7" strokeWidth={2.5} /> +{xp} XP
      </div>

      {nextExercise && (
        <div className="label text-fg-muted mt-4"
          style={{ position: 'relative', zIndex: 4, animation: 'celebFadeUp 0.4s ease 0.5s both' }}>
          Weiter: {nextExercise}
        </div>
      )}

      <div className="text-xs text-fg-faint absolute bottom-10"
        style={{ zIndex: 4, animation: 'celebFadeUp 0.3s ease 1s both' }}>
        tippen zum überspringen
      </div>
    </div>
  );
}

// ── Workout done: confetti rain, trophy, counting stats, XP bar, level-up ───
export function WorkoutCompleteModal({ data, onClose, history = [], streak = 0 }) {
  const [note, setNote] = useState('');
  const [stage, setStage] = useState(0); // 0 intro, 1 stats, 2 xp
  const [saving, setSaving] = useState(false);

  const { totalSets, totalReps, totalVolume, exerciseCount } = workoutTotals(data.logs || []);
  const q = quoteOfTheDay(MOTIVATION_QUOTES.filter(x => x.author === 'Markus Rühl'));

  // XP: before → after
  const gained = useMemo(() => xpForWorkout({ logs: data.logs }), [data]);
  const before = useMemo(() => totalXp(history, streak), [history, streak]);
  const lvBefore = levelFromXp(before);
  const lvAfter = levelFromXp(before + gained);
  const leveledUp = lvAfter.level > lvBefore.level;
  const newBadges = useMemo(() => {
    const prev = new Set(unlockedBadges(history, streak).map(b => b.id));
    const after = unlockedBadges([...history, { logs: data.logs, isCardio: false, isMobility: false }], streak + 1);
    return after.filter(b => !prev.has(b.id));
  }, [history, streak, data]);

  useEffect(() => {
    vibrate([80, 40, 120, 35, 180, 30, 260, 25, 380]);
    playBeep(523, 0.15); setTimeout(() => playBeep(659, 0.15), 150); setTimeout(() => playBeep(784, 0.15), 300); setTimeout(() => playBeep(1046, 0.5), 450);
    const t1 = setTimeout(() => setStage(1), 450);
    const t2 = setTimeout(() => setStage(2), 1300);
    const t3 = leveledUp ? setTimeout(() => { vibrate([200, 80, 300]); playBeep(1318, 0.5); }, 2200) : null;
    return () => { clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3); };
  }, []);

  const fade = (on, delay = 0) => ({ opacity: on ? 1 : 0, transform: on ? 'translateY(0)' : 'translateY(18px)', transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.2,0.8,0.2,1) ${delay}ms` });

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try { await onClose(note); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Training abgeschlossen"
      style={{ background: 'radial-gradient(ellipse at 50% 15%, #2a1a03 0%, #120d04 40%, #0b1220 100%)',
               paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', animation: 'victoryEdge 3s ease-in-out both' }} />
      <Confetti mode="rain" count={220} duration={3800} colors={['#fbbf24', '#f59e0b', '#f97316', '#7dd3fc', '#ffffff']} className="z-[1]" />

      <div className="relative z-[2] flex flex-col items-center px-6 pt-10 pb-10 max-w-md mx-auto">
        <div className={`w-28 h-28 rounded-full bg-gold/15 border-2 border-gold/60 flex items-center justify-center mb-5 ${reduceMotion() ? '' : 'ring-pulse'}`}
          style={{ animation: 'celebScale 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.05s both', filter: 'drop-shadow(0 0 36px rgba(251,191,36,0.65))' }} aria-hidden="true">
          <Trophy className="w-14 h-14 text-gold" strokeWidth={2} />
        </div>

        <div className="font-display text-center text-gold uppercase"
          style={{ fontSize: 'clamp(3.2rem,15vw,5.5rem)', lineHeight: 0.88,
            textShadow: '0 0 60px rgba(251,191,36,0.65), 0 0 120px rgba(251,191,36,0.25)',
            animation: 'powerImpact 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
          Training
        </div>
        <div className="font-display text-center text-white uppercase"
          style={{ fontSize: 'clamp(2.4rem,11vw,4rem)', lineHeight: 0.9, marginBottom: 10,
            animation: 'celebFadeUp 0.4s ease 0.3s both' }}>
          Fertig!
        </div>

        <div className="label text-gold/80 mb-1" style={{ animation: 'celebFadeUp 0.4s ease 0.42s both' }}>
          {data.planName}{data.duration > 0 ? ` · ${formatDuration(data.duration)}` : ''}
        </div>

        {/* Stats count up */}
        <div className="w-full grid grid-cols-3 gap-3 mt-6 mb-3" style={fade(stage >= 1)}>
          {[
            { label: 'Übungen', value: exerciseCount },
            { label: 'Sätze',   value: totalSets },
            { label: 'Wdh.',    value: totalReps },
          ].map(({ label, value }, i) => (
            <div key={label} className="bg-surface/70 border border-gold/25 rounded-2xl p-4 text-center">
              <div className="font-display text-4xl text-gold leading-none">
                {stage >= 1 ? <CountUp value={value} duration={700} delay={i * 120} /> : 0}
              </div>
              <div className="label mt-2">{label}</div>
            </div>
          ))}
        </div>

        {totalVolume > 0 && (
          <div className="w-full bg-surface/70 border border-gold/25 rounded-2xl p-4 mb-3 text-center" style={fade(stage >= 1, 150)}>
            <div className="label mb-1">Gesamtvolumen</div>
            <div className="font-display text-5xl text-gold leading-none">
              {stage >= 1 ? <CountUp value={totalVolume} duration={1100} delay={200} /> : 0} <span className="text-2xl text-fg-muted">kg</span>
            </div>
          </div>
        )}

        {/* XP + level */}
        <div className="w-full bg-surface/80 border border-ok/30 rounded-2xl p-4 mb-3" style={fade(stage >= 2)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-ok/15 flex items-center justify-center" aria-hidden="true"><Zap className="w-5 h-5 text-ok" strokeWidth={2.5} /></div>
              <div>
                <div className="label">Level {leveledUp ? lvAfter.level : lvBefore.level}</div>
                <div className="text-xs text-fg-muted">{levelTitle(leveledUp ? lvAfter.level : lvBefore.level)}</div>
              </div>
            </div>
            <div className="font-display text-3xl text-ok leading-none">
              {stage >= 2 ? <CountUp value={gained} duration={800} prefix="+" suffix=" XP" /> : '+0 XP'}
            </div>
          </div>
          <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={lvAfter.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Level-Fortschritt">
            <div className="h-full bg-ok rounded-full" style={{ width: `${stage >= 2 ? (leveledUp ? 100 : lvAfter.pct) : lvBefore.pct}%`, transition: 'width 1s cubic-bezier(0.2,0.8,0.2,1) 0.2s' }} />
          </div>
          <div className="flex justify-between text-[11px] text-fg-faint mt-1.5 tabular">
            <span>{(before + gained).toLocaleString('de-DE')} XP gesamt</span>
            <span>{leveledUp ? 'Level up!' : `${(lvAfter.next - before - gained).toLocaleString('de-DE')} bis Level ${lvAfter.level + 1}`}</span>
          </div>
        </div>

        {leveledUp && stage >= 2 && (
          <div className="level-up w-full bg-gradient-to-br from-accent to-orange-600 text-on-accent rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ animationDelay: '0.9s' }} role="status">
            <Award className="w-8 h-8 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <div>
              <div className="font-display text-3xl uppercase leading-none">Level {lvAfter.level}!</div>
              <div className="text-sm font-semibold opacity-80">Du bist jetzt {levelTitle(lvAfter.level)}.</div>
            </div>
          </div>
        )}

        {newBadges.length > 0 && stage >= 2 && (
          <div className="w-full flex flex-wrap gap-2 mb-3" style={fade(true, 300)}>
            {newBadges.map(b => (
              <span key={b.id} className="inline-flex items-center gap-1.5 bg-gold/15 border border-gold/50 text-gold rounded-full px-3 py-1.5 text-xs font-bold">
                <Award className="w-3.5 h-3.5" aria-hidden="true" /> Neu: {b.label}
              </span>
            ))}
          </div>
        )}

        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-fg-muted mb-4" style={fade(stage >= 2, 200)}>
            <Flame className="w-4 h-4 text-accent" aria-hidden="true" /> {streak + 1} Tage in Folge
          </div>
        )}

        <div className="w-full mb-5" style={fade(stage >= 1, 300)}>
          <label htmlFor="workout-note" className="label mb-2 block">Notiz zum Training</label>
          <textarea
            id="workout-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Wie lief's? Gewicht, Gefühl, Besonderheiten…"
            rows={3}
            className="input-field px-4 py-3 text-base resize-none"
          />
        </div>

        <div className="w-full border-t border-line pt-4 mb-7 text-center" style={fade(stage >= 1, 350)}>
          <div className="text-fg text-sm italic leading-snug">„{q.text}"</div>
          {q.author && <div className="text-fg-muted text-xs mt-2">— {q.author}</div>}
        </div>

        <button onClick={submit} disabled={saving}
          className="btn-gold pressable w-full font-display text-2xl uppercase py-4 min-h-[56px]"
          style={fade(stage >= 1, 400)}>
          {saving ? 'Speichern…' : 'Weiter'}
        </button>
      </div>
    </div>
  );
}
