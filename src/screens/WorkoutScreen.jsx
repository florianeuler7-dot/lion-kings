import React, { useEffect, useRef, useState } from 'react';
import { Check, X, ArrowLeft, Forward, SkipForward, Clock, Droplet } from 'lucide-react';
import { CHEER_MESSAGES } from '../data/quotes';
import { setLiveStatus } from '../supabase';
import { useWakeLock, requestNotifPermission, playBeep, vibrate, scheduleRestNotification, cancelRestNotification, scrollTop } from '../lib/device';
import { fmtClock } from '../lib/date';
import { Button, Dialog, ProgressRing, ProgressBar, IconButton } from '../components/ui';
import { CelebrationOverlay } from './celebrations';

export default function WorkoutScreen({ workout, setWorkout, lastWeights, onFinish, onCancel, showToast, user }) {
  const { plan, exerciseIdx, setIdx, logs } = workout;
  const exercise = plan.exercises[exerciseIdx];
  const totalSets = exercise.sets;
  const completedSets = logs[exerciseIdx].sets;
  const recRest = exercise.restSec || 90;

  // Update live status when exercise changes + keep-alive ping every 60s
  useEffect(() => {
    if (!user) return;
    const detail = `Übung ${exerciseIdx + 1}/${plan.exercises.length}`;
    setLiveStatus(user.id, plan.name, detail);
    const ping = setInterval(() => setLiveStatus(user.id, plan.name, detail), 60_000);
    return () => clearInterval(ping);
  }, [exerciseIdx, user]);

  useWakeLock();
  useEffect(() => { requestNotifPermission(); }, []);

  const [exerciseNote, setExerciseNote] = useState(logs[exerciseIdx].note || '');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [inputError, setInputError] = useState(null); // 'weight' | 'reps' | 'both' | null
  const [restDisplay, setRestDisplay] = useState(0); // seconds elapsed shown in UI
  const [restRunning, setRestRunning] = useState(false);
  const [earlyRestConfirm, setEarlyRestConfirm] = useState(false);
  const [skippedNames, setSkippedNames] = useState(workout.skippedExercises || []);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [celebrating, setCelebrating] = useState(null); // { message, nextWorkout, nextExerciseName }
  const lastDrinkRef = useRef(Date.now());
  const restRef = useRef(null);
  const restStartRef = useRef(null);
  const recReachedRef = useRef(false);

  useEffect(() => { scrollTop(); }, []);

  // Drink reminder every 15 min
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastDrinkRef.current > 15 * 60 * 1000) {
        showToast('Trink etwas Wasser 💧', 'drink');
        lastDrinkRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ascending rest timer — counts up from 0, user decides when to continue
  useEffect(() => {
    if (!restRunning) return;
    recReachedRef.current = false;
    const tick = () => {
      if (!restStartRef.current) return;
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      setRestDisplay(elapsed);
      if (elapsed >= recRest && !recReachedRef.current) {
        recReachedRef.current = true;
        playBeep();
        vibrate([200, 100, 200]);
      }
    };
    tick();
    restRef.current = setInterval(tick, 500);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(restRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [restRunning]);

  // Prefill last weight when the exercise changes
  useEffect(() => {
    if (lastWeights[exercise.name] && !weight) {
      setWeight(String(lastWeights[exercise.name]));
    }
    setExerciseNote(logs[exerciseIdx].note || '');
  }, [exerciseIdx]);

  const stopRest = () => {
    setRestRunning(false);
    restStartRef.current = null;
    setRestDisplay(0);
    cancelRestNotification();
  };

  const logSet = () => {
    vibrate(50);
    if (!weight || !reps) {
      setInputError(!weight && !reps ? 'both' : !weight ? 'weight' : 'reps');
      setTimeout(() => setInputError(null), 600);
      return;
    }
    setInputError(null);
    // Immutable update (no shared array mutation)
    const newLogs = logs.map((l, i) => i === exerciseIdx
      ? { ...l, note: exerciseNote, sets: [...l.sets, { weight: parseFloat(weight), reps: parseInt(reps) }] }
      : l);

    const isLastSet = setIdx + 1 >= totalSets;
    const isLastExercise = exerciseIdx + 1 >= plan.exercises.length;

    if (isLastSet && isLastExercise) {
      onFinish(newLogs, { skippedExercises: skippedNames });
      return;
    }
    if (isLastSet) {
      const msg = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
      const nextEx = plan.exercises[exerciseIdx + 1];
      setWorkout({ ...workout, logs: newLogs });
      setCelebrating({
        message: msg,
        nextExerciseName: nextEx?.name,
        nextWorkout: { ...workout, logs: newLogs, exerciseIdx: exerciseIdx + 1, setIdx: 0 },
      });
      setReps(''); setWeight('');
    } else {
      setWorkout({ ...workout, logs: newLogs, setIdx: setIdx + 1 });
      setReps('');
      restStartRef.current = Date.now();
      setRestDisplay(0);
      setRestRunning(true);
      scheduleRestNotification(Date.now() + recRest * 1000);
    }
  };

  const canGoBack = completedSets.length > 0 || exerciseIdx > 0;

  const goBack = () => {
    if (restRunning) stopRest();
    if (completedSets.length > 0) {
      // Undo last set of current exercise
      const newLogs = logs.map((l, i) => i === exerciseIdx ? { ...l, sets: l.sets.slice(0, -1) } : l);
      setWorkout({ ...workout, logs: newLogs, setIdx: Math.max(0, completedSets.length - 1) });
    } else if (exerciseIdx > 0) {
      // Go back to previous exercise, undo its last set
      const prevIdx = exerciseIdx - 1;
      const newLogs = logs.map((l, i) => i === prevIdx ? { ...l, sets: l.sets.slice(0, -1) } : l);
      setWorkout({ ...workout, logs: newLogs, exerciseIdx: prevIdx, setIdx: newLogs[prevIdx].sets.length });
    }
  };

  const skipExercise = () => {
    const newSkipped = [...skippedNames, exercise.name];
    setSkippedNames(newSkipped);
    setSkipConfirm(false);

    const savedLogs = logs.map((l, i) => i === exerciseIdx ? { ...l, note: exerciseNote } : l);

    const isLastExercise = exerciseIdx + 1 >= plan.exercises.length;
    if (isLastExercise) {
      const hasAnyData = savedLogs.some(l => l.sets.length > 0);
      if (hasAnyData) {
        onFinish(savedLogs, { skippedExercises: newSkipped });
      } else {
        showToast('Keine Daten erfasst – Training verworfen', 'info');
        onCancel();
      }
      return;
    }

    setWorkout({ ...workout, logs: savedLogs, exerciseIdx: exerciseIdx + 1, setIdx: 0 });
    setReps(''); setWeight('');
    stopRest();
    scrollTop();
    showToast(`${exercise.name} übersprungen`, 'info');
  };

  const onCelebrationDone = () => {
    setWorkout(celebrating.nextWorkout);
    setCelebrating(null);
    scrollTop();
  };

  const doSkipRest = () => {
    stopRest();
    setEarlyRestConfirm(false);
    requestAnimationFrame(() => requestAnimationFrame(scrollTop));
  };
  const trySkipRest = () => {
    if (restDisplay < recRest) setEarlyRestConfirm(true); else doSkipRest();
  };

  const progressPct = ((exerciseIdx + setIdx / totalSets) / plan.exercises.length) * 100;
  const isLastSetBtn = setIdx + 1 >= totalSets;
  const isLastExerciseBtn = exerciseIdx + 1 >= plan.exercises.length;

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      <div className="pt-2 pb-3 flex items-center justify-between">
        <IconButton icon={ArrowLeft} label="Zurück" onClick={goBack} disabled={!canGoBack}
          className={canGoBack ? 'text-fg' : 'text-fg-faint/40'} />
        <div className="text-xs font-semibold text-fg-muted tracking-wide">Übung {exerciseIdx + 1} / {plan.exercises.length}</div>
        <IconButton icon={X} label="Abbrechen" onClick={() => setCancelConfirm(true)} />
      </div>

      <ProgressBar value={progressPct} className="mb-5" />

      {cancelConfirm && (
        <Dialog title="Training abbrechen?" text="Die bisher eingetragenen Sätze gehen verloren.">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setCancelConfirm(false)}>Weiter trainieren</Button>
            <Button variant="danger" size="md" className="flex-1" onClick={onCancel}>Abbrechen</Button>
          </div>
        </Dialog>
      )}

      {skipConfirm && (
        <Dialog title="Übung überspringen?" text={`„${exercise.name}“ wird im Verlauf als übersprungen markiert.`}>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setSkipConfirm(false)}>Zurück</Button>
            <Button variant="warn" size="md" className="flex-1" onClick={skipExercise} icon={Forward}>Überspringen</Button>
          </div>
        </Dialog>
      )}

      {celebrating && (
        <CelebrationOverlay
          message={celebrating.message}
          nextExercise={celebrating.nextExerciseName}
          onDone={onCelebrationDone}
        />
      )}

      {restRunning && (() => {
        const recReached = restDisplay >= recRest;
        const overdue = restDisplay >= Math.floor(recRest * 1.5);
        const pct = Math.min(100, (restDisplay / recRest) * 100);
        return (
          <div className="fixed inset-0 bg-ink/95 z-40 flex flex-col items-center justify-center animate-fade-in"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>

            {earlyRestConfirm && (
              <Dialog title="Denk an deine Pausen!" className="text-center">
                <div className="text-sm text-fg-muted mb-5 font-mono">
                  Empfohlen: {fmtClock(recRest)} &nbsp;·&nbsp; Aktuell: {fmtClock(restDisplay)}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="md" className="w-full" onClick={() => setEarlyRestConfirm(false)}>Pause fortsetzen</Button>
                  <Button variant="ghost" size="md" className="w-full" onClick={doSkipRest}>Trotzdem weiter</Button>
                </div>
              </Dialog>
            )}

            <div className="label mb-6">Pause</div>

            <ProgressRing value={pct} size={250} stroke={10} color={recReached ? '#22c55e' : '#f97316'} label="Pause">
              <div className={`font-display text-7xl leading-none transition-colors duration-500 tabular ${recReached ? 'text-ok' : 'text-fg'}`}>
                {fmtClock(restDisplay)}
              </div>
              <div className={`text-xs mt-2 font-semibold transition-colors ${recReached ? 'text-ok' : 'text-fg-muted'}`}>
                {recReached ? 'Empfehlung erreicht ✓' : `Ziel ${fmtClock(recRest)}`}
              </div>
            </ProgressRing>

            <div className="h-8 mt-4 text-xs text-accent-2 font-semibold">
              {overdue && 'Bereit für den nächsten Satz?'}
            </div>

            <div className="text-fg-muted mb-8 text-center text-sm">
              Nächster Satz: <span className="text-fg font-semibold">{exercise.name}</span>
              <span className="text-fg-faint"> · Satz {setIdx + 1}/{totalSets}</span>
            </div>

            <Button variant={recReached ? 'cta' : 'secondary'} size="lg" className="px-12" onClick={trySkipRest} icon={SkipForward}>
              Weiter
            </Button>
          </div>
        );
      })()}

      <div className="flex-1">
        <div className="label mb-2">{plan.name}</div>
        <h2 className="font-display text-[2.75rem] uppercase text-fg leading-[0.92] mb-2">{exercise.name}</h2>
        {exercise.hint && <div className="text-fg-muted mb-7 text-sm">{exercise.hint}</div>}

        <div className="card p-5 mb-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="label">Aktueller Satz</div>
              <div className="font-display text-5xl text-accent leading-none mt-1 tabular">{setIdx + 1} <span className="text-fg-faint text-2xl">/ {totalSets}</span></div>
            </div>
            <div className="text-right">
              <div className="label">Ziel</div>
              <div className="font-display text-3xl leading-none mt-1">{exercise.reps} <span className="text-sm text-fg-muted font-body font-semibold">Wdh.</span></div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full transition-colors ${i < completedSets.length ? 'bg-ok' : i === setIdx ? 'bg-accent' : 'bg-line-2'}`} />
            ))}
          </div>
          {lastWeights[exercise.name] && (
            <div className="text-xs text-fg-muted mt-4">
              Letztes Mal: <span className="text-fg font-semibold">{lastWeights[exercise.name]} kg</span>
            </div>
          )}
        </div>

        {completedSets.length > 0 && (
          <div className="mb-5">
            <div className="label mb-2">Erledigt</div>
            <div className="space-y-1.5">
              {completedSets.map((s, i) => (
                <div key={i} className={`rounded-xl px-4 py-2.5 flex justify-between text-sm ${i === completedSets.length - 1 ? 'bg-surface-2 border border-line-2' : 'bg-surface-2/60'}`}>
                  <span className="text-fg-muted">Satz {i + 1}</span>
                  <span className="text-fg font-mono">{s.weight} kg × {s.reps}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-5 mb-4">
          <div className="label mb-3">Satz eintragen</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="set-weight" className="text-xs font-semibold text-fg-muted block mb-1.5">Gewicht (kg)</label>
              <input id="set-weight" type="number" inputMode="decimal" value={weight}
                onChange={e => { setWeight(e.target.value); if (inputError === 'weight' || inputError === 'both') setInputError(null); }}
                placeholder="0"
                className={`input-field px-4 py-3 text-3xl font-display ${(inputError === 'weight' || inputError === 'both') ? 'input-error' : ''}`} />
            </div>
            <div>
              <label htmlFor="set-reps" className="text-xs font-semibold text-fg-muted block mb-1.5">Wiederholungen</label>
              <input id="set-reps" type="number" inputMode="numeric" value={reps}
                onChange={e => { setReps(e.target.value); if (inputError === 'reps' || inputError === 'both') setInputError(null); }}
                onKeyDown={e => e.key === 'Enter' && logSet()}
                placeholder="0"
                className={`input-field px-4 py-3 text-3xl font-display ${(inputError === 'reps' || inputError === 'both') ? 'input-error' : ''}`} />
            </div>
          </div>
          <Button variant={isLastSetBtn && isLastExerciseBtn ? 'cta' : 'primary'} className="w-full" onClick={logSet} icon={Check}>
            {isLastSetBtn ? (isLastExerciseBtn ? 'Training abschließen' : 'Übung abschließen') : 'Satz eintragen'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-fg-muted px-1">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Empf. Pause: <span className="font-mono">{fmtClock(recRest)}</span></div>
          <div className="flex items-center gap-2"><Droplet className="w-4 h-4" /> Trinken nicht vergessen</div>
        </div>

        <div className="mt-4">
          <textarea
            value={exerciseNote}
            onChange={e => setExerciseNote(e.target.value)}
            aria-label="Notiz zur Übung"
            placeholder="Notiz zur Übung (optional)…"
            rows={2}
            className="input-field px-4 py-3 text-base resize-none"
          />
        </div>

        <div className="mt-3 mb-2">
          <Button variant="ghost" size="sm" className="w-full border border-line" onClick={() => setSkipConfirm(true)} icon={Forward}>
            Übung überspringen
          </Button>
        </div>
      </div>
    </div>
  );
}
