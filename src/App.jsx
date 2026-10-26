import React, { useEffect, useRef, useState } from 'react';
import { Calendar, History, Home, Sparkles, Users } from 'lucide-react';
import { getUserById, getUserWorkouts, saveWorkout, rowToWorkout, computeLastWeights, computeUserStats, setLiveStatus, clearLiveStatus, deleteWorkout, uploadAvatar, updateUserAvatar, saveUserPlan, getActivePlanForUser } from './supabase';
import { buildPlanData, DAY_NAMES } from './data/plan';
import { MOBILITY } from './data/mobility';
import { session } from './lib/session';
import { ToastProvider, useToast } from './components/Toast';
import { Wordmark } from './components/ui';
import HomeScreen, { CustomWorkoutModal } from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import HistoryScreen from './screens/HistoryScreen';
import PlanScreen from './screens/PlanScreen';
import CardioScreen from './screens/CardioScreen';
import MobilityScreen from './screens/MobilityScreen';
import DashboardScreen from './screens/DashboardScreen';
import CoachScreen from './screens/CoachScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { WorkoutCompleteModal } from './screens/celebrations';

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

// Turn a Supabase / fetch error into something a human can act on
export function describeError(e) {
  const msg = e?.message || e?.details || e?.error_description || (typeof e === 'string' ? e : '') || '';
  const code = e?.code ? ` [${e.code}]` : '';
  const status = e?.status || e?.statusCode;
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg)) {
    return 'Keine Verbindung zur Datenbank (Supabase nicht erreichbar – Projekt pausiert oder offline?)';
  }
  if (status === 401 || /JWT|Invalid API key|apikey/i.test(msg)) {
    return `Datenbank lehnt den Zugriff ab (${status || 401}): ${msg}`;
  }
  if (status === 503 || status === 540 || /paused/i.test(msg)) {
    return 'Supabase-Projekt ist pausiert. Im Supabase-Dashboard „Restore project“ klicken.';
  }
  return `${msg || 'Unbekannter Fehler'}${code}${status ? ` (HTTP ${status})` : ''}`;
}

function Splash({ fading }) {
  return (
    <div className="fixed inset-0 z-[200] bg-ink flex items-center justify-center pointer-events-none"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.65s ease' }}>
      <Wordmark size="md" className="text-center" />
    </div>
  );
}

function Shell() {
  const showToast = useToast();
  const [user, setUser] = useState(null); // {id, name, avatar_url, plan_data}
  const [authLoading, setAuthLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [screen, setScreen] = useState('home');
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [history, setHistory] = useState([]); // array of workouts (app shape)
  const [lastWeights, setLastWeights] = useState({});
  const [combinedFlow, setCombinedFlow] = useState(false);
  const pendingCombinedCardioRef = useRef(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(null); // { planName, duration, logs, ... }
  const [planConfig, setPlanConfig] = useState(buildPlanData(null)); // { plan, schedule }
  const PLAN = planConfig.plan;
  const DAY_MAP = planConfig.schedule;

  // Load user identity on mount
  useEffect(() => {
    (async () => {
      const stored = session.getUser();
      if (stored?.id) {
        try {
          const dbUser = await getUserById(stored.id);
          if (dbUser) {
            setUser(dbUser);
            session.setUser(dbUser);
          } else {
            session.clear();
          }
        } catch (e) {
          // Offline / network error → keep the cached identity so the app still opens
          console.error('User load error:', e);
          setUser(stored);
        }
      }
      setAuthLoading(false);
      setSplashFading(true);
      setTimeout(() => setSplashVisible(false), 650);
    })();
  }, []);

  // Clear live status when the tab/app closes
  useEffect(() => {
    if (!user) return;
    const cleanup = () => clearLiveStatus(user.id);
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      window.removeEventListener('pagehide', cleanup);
    };
  }, [user]);

  // Load workouts and plan when user is set
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setLoadError(null);
      try {
        const [rows, customPlan] = await Promise.all([
          getUserWorkouts(user.id),
          getActivePlanForUser(user.id),
        ]);
        if (cancelled) return;
        const workouts = rows.map(rowToWorkout);
        setHistory(workouts);
        setLastWeights(computeLastWeights(workouts));
        setPlanConfig(buildPlanData(customPlan));
      } catch (e) {
        console.error('Data load error:', e);
        if (!cancelled) setLoadError(describeError(e));
      }
      if (!cancelled) setDataLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, loadAttempt]);

  // Scroll to top on screen change
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const handleOnboarded = (newUser) => {
    session.setUser(newUser);
    setUser(newUser);
  };

  const handleLogout = () => {
    if (user) clearLiveStatus(user.id);
    session.clear();
    setUser(null);
    setHistory([]);
    setLastWeights({});
    setPlanConfig(buildPlanData(null));
    setActiveWorkout(null);
    setScreen('home');
  };

  const handleChangeAvatar = async (file) => {
    if (!file || !user) return;
    try {
      const url = await uploadAvatar(user.id, file);
      const updated = await updateUserAvatar(user.id, url);
      setUser(updated);
      session.setUser(updated);
      showToast('Profilbild aktualisiert', 'check');
    } catch (e) {
      console.error('Avatar update error:', e);
      showToast(`Profilbild fehlgeschlagen: ${describeError(e)}`, 'error', 8000);
    }
  };

  const handlePlanSaved = async (newPlan) => {
    try {
      await saveUserPlan(user.id, newPlan);
      setPlanConfig(buildPlanData(newPlan));
      showToast('Neuer Plan aktiv', 'check');
      setScreen('plan');
    } catch (e) {
      console.error('Plan save error:', e);
      showToast(`Plan konnte nicht gespeichert werden: ${describeError(e)}`, 'error', 8000);
      throw e;
    }
  };

  const persistWorkout = async (entry) => {
    try {
      const saved = await saveWorkout(user.id, entry);
      const newRow = rowToWorkout(saved);
      setHistory(prev => [newRow, ...prev]);
      return newRow;
    } catch (e) {
      console.error('Save error:', e);
      showToast(`Speichern fehlgeschlagen: ${describeError(e)}`, 'error', 8000);
      throw e;
    }
  };

  const handleLogCustom = async ({ name: workoutName, duration }) => {
    try {
      await persistWorkout({
        date: new Date(),
        planKey: 'custom',
        planName: workoutName,
        logs: [],
        duration, // minutes
        isCardio: false,
        isMobility: false,
        notes: '',
        skippedExercises: [],
      });
      showToast(`${workoutName} eingetragen`, 'check');
      setShowCustomModal(false);
    } catch (e) {}
  };

  const handleDeleteWorkout = async (ids) => {
    try {
      await Promise.all(ids.map(id => deleteWorkout(id)));
      setHistory(prev => {
        const next = prev.filter(w => !ids.includes(w.id));
        setLastWeights(computeLastWeights(next));
        return next;
      });
      showToast('Workout gelöscht', 'info');
    } catch (e) {
      console.error('Delete error:', e);
      showToast(`Löschen fehlgeschlagen: ${describeError(e)}`, 'error');
    }
  };

  const today = new Date();
  const todayKey = DAY_MAP[today.getDay()];
  const todayPlan = PLAN[todayKey] || PLAN.rest;

  const startWorkout = (planKey) => {
    const plan = PLAN[planKey];
    if (!plan || !plan.exercises.length) return;
    setActiveWorkout({
      planKey, plan, exerciseIdx: 0, setIdx: 0,
      logs: plan.exercises.map(ex => ({ name: ex.name, sets: [], note: '' })),
      startTime: Date.now(),
      skippedExercises: [],
    });
    setScreen('workout');
    setLiveStatus(user.id, plan.name, `Übung 1/${plan.exercises.length}`);
  };

  const finishCardio = async (durationMin, type) => {
    try {
      clearLiveStatus(user.id);
      if (combinedFlow) {
        // Don't save yet — merge with mobility into one entry
        pendingCombinedCardioRef.current = { durationMin, type };
        showToast('Cardio fertig – jetzt Mobility', 'check');
        setScreen('mobility');
      } else {
        await persistWorkout({
          date: new Date().toISOString(),
          planKey: 'cardio',
          planName: type,
          logs: [],
          duration: durationMin,
          isCardio: true,
        });
        setScreen('home');
        showToast('Cardio abgeschlossen', 'check');
      }
    } catch (e) {}
  };

  const finishMobility = async (focus, completed, total) => {
    try {
      clearLiveStatus(user.id);
      if (combinedFlow && pendingCombinedCardioRef.current) {
        const { durationMin, type } = pendingCombinedCardioRef.current;
        await persistWorkout({
          date: new Date().toISOString(),
          planKey: 'combined',
          planName: `${type} + Mobility`,
          logs: [],
          duration: durationMin,
          isCardio: true,
          isMobility: true,
          focus,
          completed,
          total,
        });
        pendingCombinedCardioRef.current = null;
        setCombinedFlow(false);
        setScreen('home');
        showToast('Training komplett', 'check');
      } else {
        await persistWorkout({
          date: new Date().toISOString(),
          planKey: 'mobility',
          planName: `Mobility – ${MOBILITY[focus]?.name || focus}`,
          logs: [],
          duration: 0,
          isMobility: true,
          focus,
          completed,
          total,
        });
        setCombinedFlow(false);
        setScreen('home');
        showToast(`Mobility abgeschlossen (${completed}/${total})`, 'check');
      }
    } catch (e) {}
  };

  const finishWorkout = (logs, extras = {}) => {
    const duration = Math.max(1, Math.floor((Date.now() - activeWorkout.startTime) / 60000));
    clearLiveStatus(user.id);
    setActiveWorkout(null);
    setScreen('home');
    // Store pending workout — modal asks for notes, then calls saveCompletedWorkout
    setWorkoutComplete({
      planKey: activeWorkout.planKey,
      planName: activeWorkout.plan.name,
      logs,
      duration,
      skippedExercises: extras.skippedExercises || [],
    });
  };

  const saveCompletedWorkout = async (note) => {
    const w = workoutComplete;
    if (!w) return;
    try {
      await persistWorkout({
        date: new Date().toISOString(),
        planKey: w.planKey,
        planName: w.planName,
        logs: w.logs,
        duration: w.duration,
        notes: note || '',
        skippedExercises: w.skippedExercises,
      });
      setWorkoutComplete(null);
      const newLW = { ...lastWeights };
      w.logs.forEach(l => {
        if (l.sets.length > 0) {
          const heaviest = Math.max(...l.sets.map(s => parseFloat(s.weight) || 0));
          if (heaviest > 0) newLW[l.name] = heaviest;
        }
      });
      setLastWeights(newLW);
    } catch (e) {
      // Keep the modal open so the user can retry instead of losing the workout
    }
  };

  const cancelActivity = async () => {
    clearLiveStatus(user.id);
    setCombinedFlow(false);
    setActiveWorkout(null);
    setScreen('home');
    // Cardio was already done in the combined flow – don't lose it when mobility is cancelled
    const pending = pendingCombinedCardioRef.current;
    pendingCombinedCardioRef.current = null;
    if (pending) {
      try {
        await persistWorkout({
          date: new Date().toISOString(),
          planKey: 'cardio',
          planName: pending.type,
          logs: [],
          duration: pending.durationMin,
          isCardio: true,
        });
        showToast('Cardio gespeichert – Mobility übersprungen', 'info');
      } catch (e) {}
    }
  };

  // Hidden file input for changing avatar after onboarding
  const avatarInputRef = useRef(null);
  const triggerAvatarChange = () => avatarInputRef.current?.click();
  const onAvatarFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await handleChangeAvatar(file);
  };

  if (authLoading) return <Splash fading={splashFading} />;

  if (!user) {
    return <OnboardingScreen onComplete={handleOnboarded} />;
  }

  const optionalDays = new Set(DAY_MAP.map((v, i) => (v === 'rest' || v === 'cardio_optional' ? i : -1)).filter(i => i >= 0));
  const fullscreen = screen === 'workout' || screen === 'cardio' || screen === 'mobility';

  return (
    <div className="min-h-screen bg-ink text-fg app-bg relative safe-top">
      {splashVisible && <Splash fading={splashFading} />}

      <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarFileChosen} className="hidden" aria-hidden="true" tabIndex={-1} />

      {workoutComplete && (
        <WorkoutCompleteModal data={workoutComplete} onClose={saveCompletedWorkout} history={history} streak={computeUserStats(history, optionalDays).streak} />
      )}

      {/* No z-index here on purpose: overlays inside (sheets, dialogs) must stack above the nav */}
      <main className={`max-w-2xl mx-auto px-4 ${fullscreen ? 'pb-8' : 'pb-28'}`}>
        {screen === 'home' && (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onChangeAvatar={triggerAvatarChange}
            plan={PLAN}
            schedule={DAY_MAP}
            todayPlan={todayPlan} todayKey={todayKey}
            todayName={DAY_NAMES[today.getDay()]}
            history={history}
            dataLoading={dataLoading}
            loadError={loadError}
            onRetry={() => setLoadAttempt(n => n + 1)}
            onStart={() => startWorkout(todayKey)}
            onPickOther={(k) => startWorkout(k)}
            onStartCardio={() => { setCombinedFlow(false); setScreen('cardio'); }}
            onStartMobility={() => { setCombinedFlow(false); setScreen('mobility'); }}
            onStartCombined={() => { setCombinedFlow(true); setScreen('cardio'); }}
            onLogCustom={() => setShowCustomModal(true)}
          />
        )}
        {showCustomModal && (
          <CustomWorkoutModal onSave={handleLogCustom} onClose={() => setShowCustomModal(false)} />
        )}
        {screen === 'workout' && activeWorkout && (
          <WorkoutScreen
            workout={activeWorkout} setWorkout={setActiveWorkout}
            lastWeights={lastWeights}
            user={user}
            onFinish={finishWorkout}
            onCancel={cancelActivity}
            showToast={showToast}
          />
        )}
        {screen === 'history' && <HistoryScreen history={history} onDelete={handleDeleteWorkout} />}
        {screen === 'plan' && <PlanScreen plan={PLAN} schedule={DAY_MAP} onOpenCoach={() => setScreen('coach')} />}
        {screen === 'dashboard' && <DashboardScreen user={user} optionalDays={optionalDays} />}
        {screen === 'coach' && <CoachScreen user={user} currentPlan={PLAN} currentSchedule={DAY_MAP} onPlanSaved={handlePlanSaved} showToast={showToast} />}
        {screen === 'cardio' && <CardioScreen onFinish={finishCardio} onCancel={cancelActivity} showToast={showToast} user={user} combinedFlow={combinedFlow} />}
        {screen === 'mobility' && <MobilityScreen onFinish={finishMobility} onCancel={cancelActivity} user={user} combinedFlow={combinedFlow} />}
      </main>

      {!fullscreen && (
        <nav className="app-nav glass" aria-label="Hauptnavigation">
          <div className="app-nav-inner max-w-2xl mx-auto w-full">
            <NavBtn icon={Home} label="Home" active={screen === 'home'} onClick={() => setScreen('home')} />
            <NavBtn icon={Users} label="Crew" active={screen === 'dashboard'} onClick={() => setScreen('dashboard')} />
            <NavBtn icon={Sparkles} label="Coach" active={screen === 'coach'} onClick={() => setScreen('coach')} />
            <NavBtn icon={History} label="Verlauf" active={screen === 'history'} onClick={() => setScreen('history')} />
            <NavBtn icon={Calendar} label="Plan" active={screen === 'plan'} onClick={() => setScreen('plan')} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-accent' : 'text-fg-muted hover:text-fg'}`}
    >
      <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors ${active ? 'bg-accent/15' : ''}`} aria-hidden="true">
        <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[11px] font-bold tracking-wide leading-none">{label}</span>
    </button>
  );
}
