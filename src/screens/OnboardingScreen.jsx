import React, { useEffect, useState } from 'react';
import { Check, Camera, User, X, Dumbbell, StickyNote, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Button, ListRow, ErrorText, Card } from '../components/ui';
import { findUserByName, getLastWorkoutDate, createUser, uploadAvatar, updateUserAvatar, saveUserPlan, parsePlanText, coachChat } from '../supabase';
import { readJSON, writeJSON, removeKey } from '../lib/session';
import { ChatThread, ChatInput, PlanReview } from './CoachScreen';

// ===== ONBOARDING =====
const ONBOARDING_KEY = 'onboarding_progress';
const load = () => readJSON(ONBOARDING_KEY, {}) || {};
const save = (patch) => writeJSON(ONBOARDING_KEY, { ...load(), ...patch });
const clear = () => removeKey(ONBOARDING_KEY);

// Steps that need in-memory state we don't persist (foundUser) must restart at 'name'
const RESUMABLE_STEPS = new Set(['name', 'avatar', 'plan', 'plan-text', 'plan-coach', 'plan-review']);

export default function OnboardingScreen({ onComplete }) {
  const saved = load();
  const initialStep = RESUMABLE_STEPS.has(saved.step) && (saved.step === 'name' || saved.name) ? saved.step : 'name';
  const [step, setStepRaw] = useState(initialStep);
  const [name, setNameRaw] = useState(saved.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [planText, setPlanTextRaw] = useState(saved.planText || '');
  const [parsedPlan, setParsedPlanRaw] = useState(saved.parsedPlan || null);
  const [coachMessages, setCoachMessagesRaw] = useState(saved.coachMessages || []);
  const [coachInput, setCoachInput] = useState('');

  // Wrap setters to also persist
  const setStep = (v) => { setStepRaw(v); setError(''); save({ step: v }); };
  const setName = (v) => { setNameRaw(v); save({ name: v }); };
  const setPlanText = (v) => { setPlanTextRaw(v); save({ planText: v }); };
  const setParsedPlan = (v) => { setParsedPlanRaw(v); save({ parsedPlan: v }); };
  const setCoachMessages = (v) => { setCoachMessagesRaw(v); save({ coachMessages: v }); };

  // Resuming at plan-review without a plan makes no sense
  useEffect(() => {
    if (step === 'plan-review' && !parsedPlan) setStep('plan');
  }, []);

  const handleNameSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Bitte mindestens 2 Zeichen.'); return; }
    setError('');
    setBusy(true);
    try {
      const existing = await findUserByName(trimmed);
      if (existing) {
        const lastDate = await getLastWorkoutDate(existing.id);
        setFoundUser(existing);
        setLastWorkout(lastDate);
        setStepRaw('confirm'); // not persisted on purpose
      } else {
        setStep('avatar');
      }
    } catch (e) {
      console.error(e);
      setError('Verbindung fehlgeschlagen – nochmal versuchen.');
    }
    setBusy(false);
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
  };

  const finishCreation = async (planToSave = null) => {
    setBusy(true);
    setError('');
    try {
      // Someone else might have created the same name in the meantime
      const existing = await findUserByName(name.trim());
      if (existing) {
        setFoundUser(existing);
        setLastWorkout(await getLastWorkoutDate(existing.id));
        setStepRaw('confirm');
        return;
      }
      const newUser = await createUser(name.trim(), null);

      if (avatarFile) {
        try {
          const url = await uploadAvatar(newUser.id, avatarFile);
          await updateUserAvatar(newUser.id, url);
          newUser.avatar_url = url;
        } catch (e) {
          console.error('Avatar upload failed:', e);
        }
      }

      if (planToSave) {
        try {
          await saveUserPlan(newUser.id, planToSave);
          newUser.plan_data = planToSave;
        } catch (e) {
          console.error('Plan save failed:', e);
        }
      }

      clear();
      onComplete(newUser);
    } catch (e) {
      console.error(e);
      setError('Konto konnte nicht erstellt werden – nochmal versuchen');
    } finally {
      setBusy(false);
    }
  };

  const submitPlanText = async () => {
    if (planText.trim().length < 30) { setError('Plan zu kurz – beschreibe ihn etwas detaillierter.'); return; }
    setError('');
    setBusy(true);
    try {
      const plan = await parsePlanText(planText);
      setParsedPlan(plan);
      setStep('plan-review');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Plan konnte nicht verarbeitet werden. Versuche es nochmal oder formatiere klarer.');
    }
    setBusy(false);
  };

  const handleCoachSend = async () => {
    if (!coachInput.trim() || busy) return;
    const userMsg = { role: 'user', content: coachInput.trim() };
    const newMessages = [...coachMessages, userMsg];
    setCoachMessages(newMessages);
    setCoachInput('');
    setBusy(true);
    try {
      const { reply, plan } = await coachChat(newMessages, null, true);
      setCoachMessages([...newMessages, { role: 'assistant', content: reply }]);
      if (plan) {
        setParsedPlan(plan);
        setTimeout(() => setStep('plan-review'), 800);
      }
    } catch (e) {
      console.error(e);
      setCoachMessages([...newMessages, { role: 'assistant', content: `Fehler (${e.message}) – nochmal versuchen.` }]);
    }
    setBusy(false);
  };

  // Auto-start coach with greeting when entering coach step
  useEffect(() => {
    if (step === 'plan-coach' && coachMessages.length === 0) {
      setCoachMessages([{
        role: 'assistant',
        content: `Hi ${name}! Ich erstelle dir gerade deinen Trainingsplan. Sag mir kurz:\n\n1. Wie oft pro Woche willst du trainieren?\n2. Was ist dein Ziel? (Cut, Muskelaufbau, Maintainen, Athletik...)\n3. Wie viel Erfahrung hast du im Krafttraining?`,
      }]);
    }
  }, [step]);

  const confirmExisting = () => { clear(); onComplete(foundUser); };
  const reject = () => {
    setFoundUser(null);
    setLastWorkout(null);
    setName('');
    setStep('name');
  };

  if (step === 'plan-coach') {
    return (
      <div className="fixed inset-0 flex flex-col bg-ink text-zinc-100 app-bg">
        <div className="flex-1 max-w-md mx-auto w-full px-5 flex flex-col overflow-hidden safe-top safe-bottom">
          <div className="pt-5 pb-3 flex items-end justify-between shrink-0">
            <div>
              <div className="label mb-1">Coach</div>
              <div className="font-display text-3xl leading-none text-zinc-50">PLAN ERSTELLEN</div>
            </div>
            <button onClick={() => setStep('plan')} className="text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-3 py-2">zurück</button>
          </div>
          <ChatThread messages={coachMessages} busy={busy} className="flex-1 card-soft p-3 mb-3 min-h-0" />
          {parsedPlan && (
            <div className="bg-ok/10 border border-ok/30 rounded-2xl p-3 mb-3 flex items-center gap-3 animate-fade-up">
              <Check className="w-5 h-5 text-ok shrink-0" />
              <div className="flex-1 text-sm text-emerald-100">Plan ist fertig!</div>
              <Button variant="ok" size="sm" onClick={() => setStep('plan-review')}>ANSEHEN</Button>
            </div>
          )}
          <ChatInput value={coachInput} onChange={setCoachInput} onSend={handleCoachSend} busy={busy} placeholder="Antwort… (Shift+Enter = Absatz)" />
          <div className="h-4 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-zinc-100 app-bg relative safe-top safe-bottom flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center py-10">
        <div className="mb-10 animate-fade-up">
          <div className="label mb-2">Willkommen bei</div>
          <h1 className="font-display text-[4rem] text-zinc-50 leading-[0.9] tracking-tight">NO<br /><span className="text-accent">EXCUSES</span></h1>
        </div>

        {step === 'name' && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <label className="label mb-3 block">Wie heißt du?</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Dein Name"
                autoFocus
                disabled={busy}
                autoComplete="given-name"
                className="input-field px-5 py-4 text-2xl font-display"
              />
              <ErrorText className="mt-3">{error}</ErrorText>
            </div>
            <Button size="xl" className="w-full" onClick={handleNameSubmit} disabled={busy || name.trim().length < 2}>
              {busy ? 'MOMENT…' : 'WEITER'}
            </Button>
            <div className="mt-8 text-zinc-500 text-xs text-center leading-relaxed">
              Dein Name wird auf diesem Gerät gespeichert.<br />
              Deine Crew sieht deine Trainings im Dashboard.
            </div>
          </div>
        )}

        {step === 'avatar' && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <div className="label mb-2">Hi, {name}</div>
              <div className="font-display text-3xl text-zinc-50 leading-tight mb-1">PROFILBILD</div>
              <div className="text-sm text-zinc-400">Optional – kannst du später auch hinzufügen.</div>
            </div>

            <div className="flex flex-col items-center mb-6">
              {avatarPreview ? (
                <div className="relative mb-5">
                  <img src={avatarPreview} alt="Vorschau" className="w-32 h-32 rounded-full object-cover ring-4 ring-accent ring-offset-4 ring-offset-ink" />
                  <button onClick={removeAvatar} aria-label="Bild entfernen"
                    className="absolute -top-1 -right-1 bg-surface-2 border border-line-2 rounded-full p-2">
                    <X className="w-4 h-4 text-zinc-300" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/[0.03] border-2 border-dashed border-line-2 flex items-center justify-center mb-5">
                  <User className="w-12 h-12 text-zinc-700" />
                </div>
              )}

              <label className="pressable cursor-pointer w-full btn-secondary py-3.5 px-4 flex items-center justify-center gap-2">
                <Camera className="w-5 h-5 text-zinc-300" />
                <span className="text-sm font-semibold text-zinc-200">{avatarPreview ? 'Anderes Foto wählen' : 'Foto wählen'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              </label>
            </div>

            <ErrorText className="mb-3">{error}</ErrorText>

            <Button size="xl" className="w-full mb-2" onClick={() => setStep('plan')} disabled={busy}>
              {avatarPreview ? 'WEITER' : 'OHNE BILD WEITER'}
            </Button>
            {avatarPreview && (
              <Button variant="ghost" size="md" className="w-full" onClick={() => { removeAvatar(); setStep('plan'); }} disabled={busy}>
                überspringen
              </Button>
            )}
          </div>
        )}

        {step === 'plan' && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <div className="label mb-2">Hi, {name}</div>
              <div className="font-display text-3xl text-zinc-50 leading-tight mb-1">DEIN TRAININGSPLAN</div>
              <div className="text-sm text-zinc-400">Wähle wie du loslegen willst.</div>
            </div>

            <div className="space-y-2.5">
              <ListRow icon={Dumbbell} title="DEFAULT-PLAN" subtitle="Bewährter 5-Tage-Split mit Cardio" onClick={() => !busy && finishCreation(null)} />
              <ListRow icon={StickyNote} iconClass="text-sky-400" title="EIGENEN PLAN EINGEBEN" subtitle="Freitext einfügen, Coach strukturiert automatisch" onClick={() => !busy && setStep('plan-text')} />
              <ListRow icon={Sparkles} iconClass="text-ok" title="VOM COACH ERSTELLEN" subtitle="Geführter Chat mit dem Coach" onClick={() => !busy && setStep('plan-coach')} />
            </div>

            {busy && <div className="mt-4 text-xs text-zinc-500 text-center">Konto wird erstellt…</div>}
            <ErrorText className="mt-4">{error}</ErrorText>

            <div className="mt-6 text-zinc-500 text-xs text-center">Du kannst den Plan später jederzeit ändern.</div>
          </div>
        )}

        {step === 'plan-text' && (
          <div className="animate-fade-up">
            <div className="mb-5">
              <div className="label mb-2">Plan einfügen</div>
              <div className="font-display text-3xl text-zinc-50 leading-tight mb-1">DEIN PLAN ALS TEXT</div>
              <div className="text-sm text-zinc-400">
                Füge deinen Plan als Freitext ein – Übungen, Sätze, Wiederholungen. Der Coach strukturiert ihn automatisch.
              </div>
            </div>

            <textarea
              value={planText}
              onChange={e => setPlanText(e.target.value)}
              placeholder={`z.B.\n\nMo: Push\nBankdrücken 4x6-8\nSchulterdrücken 3x8\nTrizeps Pushdown 3x12\n\nDi: Pull\n...`}
              rows={9}
              autoFocus
              disabled={busy}
              className="input-field px-4 py-3 text-sm mb-4 font-mono"
            />

            <ErrorText className="mb-3">{error}</ErrorText>

            <Button className="w-full mb-2" onClick={submitPlanText} disabled={busy || planText.trim().length < 30}>
              {busy ? 'COACH LIEST…' : 'PLAN VERARBEITEN'}
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={() => setStep('plan')} disabled={busy}>zurück</Button>
          </div>
        )}

        {step === 'plan-review' && parsedPlan && (
          <div className="animate-fade-up">
            <PlanReview plan={parsedPlan} onConfirm={() => finishCreation(parsedPlan)} onBack={() => setStep('plan')} busy={busy} />
            <ErrorText className="mt-3">{error}</ErrorText>
          </div>
        )}

        {step === 'confirm' && foundUser && (
          <div className="animate-fade-up">
            <Card className="p-5 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Avatar user={foundUser} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xl text-zinc-50 leading-tight">{foundUser.name.toUpperCase()} EXISTIERT BEREITS</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {lastWorkout
                      ? `Letztes Workout: ${new Date(lastWorkout).toLocaleDateString('de-DE')}`
                      : 'Noch kein Workout absolviert'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-zinc-300">Bist du diese Person?</div>
            </Card>

            <Button className="w-full mb-3" onClick={confirmExisting} icon={Check}>JA, DAS BIN ICH</Button>
            <Button variant="secondary" size="md" className="w-full" onClick={reject}>Nein, anderen Namen wählen</Button>
          </div>
        )}
      </div>
    </div>
  );
}
