import React, { useEffect, useState } from 'react';
import { Check, Camera, User, X, Dumbbell, StickyNote, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Button, ListRow, ErrorText, Card, Wordmark } from '../components/ui';
import { findUserByName, getLastWorkoutDate, getUserById, createUser, uploadAvatar, updateUserAvatar, saveUserPlan, parsePlanText, coachChat } from '../supabase';
import { readJSON, writeJSON, removeKey } from '../lib/session';
import { linkedUserId, linkAccount } from '../lib/auth';
import { AuthForm } from '../components/AccountSheet';
import { ChatThread, ChatInput, PlanReview } from './CoachScreen';

// ===== ONBOARDING =====
const ONBOARDING_KEY = 'onboarding_progress';
const load = () => readJSON(ONBOARDING_KEY, {}) || {};
const save = (patch) => writeJSON(ONBOARDING_KEY, { ...load(), ...patch });
const clear = () => removeKey(ONBOARDING_KEY);

// Steps that need in-memory state we don't persist (foundUser) must restart at 'name'
const RESUMABLE_STEPS = new Set(['name', 'avatar', 'plan', 'plan-text', 'plan-coach', 'plan-review']);

// `authUser`: an account that is already logged in on this device but has no profile yet.
export default function OnboardingScreen({ onComplete, authUser = null }) {
  const saved = load();
  const resumable = RESUMABLE_STEPS.has(saved.step) && (saved.step === 'name' || saved.name);
  const initialStep = resumable ? saved.step : (authUser ? 'name' : 'account');
  const [step, setStepRaw] = useState(initialStep);
  const [localAuth, setLocalAuth] = useState(null);
  const auth = authUser || localAuth;
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

  // After login/registration: jump straight to the linked profile, otherwise create one.
  const afterAuth = async (u) => {
    setLocalAuth(u);
    const linked = linkedUserId(u);
    if (linked) {
      setBusy(true);
      try {
        const row = await getUserById(linked);
        if (row) { clear(); onComplete(row); return; }
      } catch (e) {
        console.error(e);
        setError('Profil konnte nicht geladen werden – nochmal versuchen.');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStep('name');
  };

  // A confirmation / login happened elsewhere (e-mail link, another tab) while we sat on the account step
  useEffect(() => {
    if (step === 'account' && authUser) afterAuth(authUser);
  }, [authUser?.id]);

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
      setError('Verbindung zur Datenbank fehlgeschlagen – nochmal versuchen.');
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

      if (auth) {
        try { await linkAccount(newUser.id); } catch (e) { console.error('Account link failed:', e); }
      }

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
      const { reply, plan } = await coachChat(newMessages, null, true,
        partial => partial && setCoachMessages([...newMessages, { role: 'assistant', content: partial, partial: true }]));
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
        content: `Hi ${name}! Ich erstelle dir gerade deinen Trainingsplan für den Winter Arc. Sag mir kurz:\n\n1. Wie oft pro Woche willst du trainieren?\n2. Was ist dein Ziel? (Cut, Muskelaufbau, Maintainen, Athletik...)\n3. Wie viel Erfahrung hast du im Krafttraining?`,
      }]);
    }
  }, [step]);

  const confirmExisting = () => {
    if (auth) linkAccount(foundUser.id).catch(e => console.error('Account link failed:', e));
    clear();
    onComplete(foundUser);
  };
  const reject = () => {
    setFoundUser(null);
    setLastWorkout(null);
    setName('');
    setStep('name');
  };

  if (step === 'plan-coach') {
    return (
      <div className="fixed inset-0 flex flex-col bg-ink text-fg app-bg">
        <div className="flex-1 max-w-md mx-auto w-full px-5 flex flex-col overflow-hidden safe-top safe-bottom">
          <div className="pt-5 pb-3 flex items-end justify-between shrink-0">
            <div>
              <div className="label mb-1">Coach</div>
              <div className="font-display text-3xl uppercase leading-none text-fg">Plan erstellen</div>
            </div>
            <button onClick={() => setStep('plan')} className="text-fg-muted hover:text-fg text-sm font-bold px-3 py-2 min-h-[44px]">zurück</button>
          </div>
          <ChatThread messages={coachMessages} busy={busy} className="flex-1 card-soft p-3 mb-3 min-h-0" />
          {parsedPlan && (
            <div className="bg-ok/10 border border-ok/40 rounded-2xl p-3 mb-3 flex items-center gap-3 animate-fade-up">
              <Check className="w-5 h-5 text-ok shrink-0" aria-hidden="true" />
              <div className="flex-1 text-sm text-fg">Plan ist fertig!</div>
              <Button variant="cta" size="sm" onClick={() => setStep('plan-review')}>Ansehen</Button>
            </div>
          )}
          <ChatInput value={coachInput} onChange={setCoachInput} onSend={handleCoachSend} busy={busy} placeholder="Antwort…" />
          <div className="h-4 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-fg app-bg relative safe-top safe-bottom flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center py-10">
        <div className="mb-10 animate-fade-up">
          <div className="label mb-3">Willkommen beim</div>
          <Wordmark size="xl" />
        </div>

        {step === 'account' && (
          <div className="animate-fade-up">
            <div className="mb-5">
              <div className="label mb-2">Konto</div>
              <div className="font-display text-4xl uppercase text-fg leading-none mb-2">Einloggen</div>
              <div className="text-sm text-fg-muted">
                Mit E-Mail und Passwort bist du auf Handy und Laptop beim selben Profil.
              </div>
            </div>
            <AuthForm initialMode="login" onAuthed={afterAuth} idPrefix="onb" />
            <ErrorText className="mt-3">{error}</ErrorText>
            <div className="mt-6 pt-5 border-t border-line">
              <Button variant="ghost" size="md" className="w-full" onClick={() => setStep('name')} disabled={busy}>
                Ohne Konto weiter (nur dieses Gerät)
              </Button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <label htmlFor="onb-name" className="label mb-3 block">Wie heißt du?</label>
              <input
                id="onb-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Dein Name"
                autoFocus
                disabled={busy}
                autoComplete="given-name"
                className="input-field px-5 py-4 text-3xl font-display uppercase"
              />
              <ErrorText className="mt-3">{error}</ErrorText>
            </div>
            <Button size="xl" className="w-full" onClick={handleNameSubmit} disabled={busy || name.trim().length < 2}>
              {busy ? 'Moment…' : 'Weiter'}
            </Button>
            <div className="mt-8 text-fg-muted text-sm text-center leading-relaxed">
              {auth
                ? <>Dein Profil wird mit <span className="text-fg">{auth.email}</span> verknüpft.<br /></>
                : <>Dein Name wird auf diesem Gerät gespeichert.<br /></>}
              Deine Crew sieht deine Trainings im Dashboard.
            </div>
          </div>
        )}

        {step === 'avatar' && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <div className="label mb-2">Hi, {name}</div>
              <div className="font-display text-4xl uppercase text-fg leading-none mb-2">Profilbild</div>
              <div className="text-sm text-fg-muted">Optional – kannst du später auch hinzufügen.</div>
            </div>

            <div className="flex flex-col items-center mb-6">
              {avatarPreview ? (
                <div className="relative mb-5">
                  <img src={avatarPreview} alt="Vorschau" className="w-32 h-32 rounded-full object-cover ring-4 ring-accent ring-offset-4 ring-offset-ink" />
                  <button onClick={removeAvatar} aria-label="Bild entfernen"
                    className="absolute -top-1 -right-1 bg-surface-2 border border-line-2 rounded-full w-11 h-11 flex items-center justify-center">
                    <X className="w-4 h-4 text-fg" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-surface-2/60 border-2 border-dashed border-line-2 flex items-center justify-center mb-5" aria-hidden="true">
                  <User className="w-12 h-12 text-fg-faint" />
                </div>
              )}

              <label className="pressable cursor-pointer w-full btn-secondary min-h-[48px] py-3 px-4 flex items-center justify-center gap-2">
                <Camera className="w-5 h-5 text-fg" aria-hidden="true" />
                <span className="text-sm font-bold text-fg">{avatarPreview ? 'Anderes Foto wählen' : 'Foto wählen'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              </label>
            </div>

            <ErrorText className="mb-3">{error}</ErrorText>

            <Button size="xl" className="w-full mb-2" onClick={() => setStep('plan')} disabled={busy}>
              {avatarPreview ? 'Weiter' : 'Ohne Bild weiter'}
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
              <div className="font-display text-4xl uppercase text-fg leading-none mb-2">Dein Trainingsplan</div>
              <div className="text-sm text-fg-muted">Wähle, wie du loslegen willst.</div>
            </div>

            <div className="space-y-2.5">
              <ListRow icon={Dumbbell} title="Default-Plan" subtitle="Bewährter 5-Tage-Split mit Cardio" onClick={() => !busy && finishCreation(null)} />
              <ListRow icon={StickyNote} iconClass="text-ice" title="Eigenen Plan eingeben" subtitle="Freitext einfügen, Coach strukturiert automatisch" onClick={() => !busy && setStep('plan-text')} />
              <ListRow icon={Sparkles} iconClass="text-ok" title="Vom Coach erstellen" subtitle="Geführter Chat mit dem Coach" onClick={() => !busy && setStep('plan-coach')} />
            </div>

            {busy && <div className="mt-4 text-xs text-fg-muted text-center" role="status">Konto wird erstellt…</div>}
            <ErrorText className="mt-4">{error}</ErrorText>

            <div className="mt-6 text-fg-faint text-xs text-center">Du kannst den Plan später jederzeit ändern.</div>
          </div>
        )}

        {step === 'plan-text' && (
          <div className="animate-fade-up">
            <div className="mb-5">
              <div className="label mb-2">Plan einfügen</div>
              <div className="font-display text-4xl uppercase text-fg leading-none mb-2">Dein Plan als Text</div>
              <div className="text-sm text-fg-muted">
                Füge deinen Plan als Freitext ein – Übungen, Sätze, Wiederholungen. Der Coach strukturiert ihn automatisch.
              </div>
            </div>

            <label htmlFor="onb-plan-text" className="sr-only">Plan als Text</label>
            <textarea
              id="onb-plan-text"
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
              {busy ? 'Coach liest…' : 'Plan verarbeiten'}
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
                  <div className="font-display text-2xl uppercase text-fg leading-none">{foundUser.name} existiert bereits</div>
                  <div className="text-xs text-fg-muted mt-1.5">
                    {lastWorkout
                      ? `Letztes Workout: ${new Date(lastWorkout).toLocaleDateString('de-DE')}`
                      : 'Noch kein Workout absolviert'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-fg">Bist du diese Person?</div>
            </Card>

            <Button variant="cta" className="w-full mb-3" onClick={confirmExisting} icon={Check}>Ja, das bin ich</Button>
            <Button variant="secondary" size="md" className="w-full" onClick={reject}>Nein, anderen Namen wählen</Button>
          </div>
        )}
      </div>
    </div>
  );
}
