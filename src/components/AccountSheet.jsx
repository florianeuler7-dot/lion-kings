import React, { useState } from 'react';
import { KeyRound, LogIn, Mail, Check } from 'lucide-react';
import { Button, ErrorText, Sheet } from './ui';
import { signUp, signIn, requestPasswordReset, setNewPassword, describeAuthError } from '../lib/auth';

// E-mail + password form. mode: 'login' | 'signup' | 'reset'.
// `linkUserId` ties a new account to an existing profile (users row).
export function AuthForm({ initialMode = 'login', linkUserId = null, onAuthed, idPrefix = 'auth' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const switchMode = (m) => { setMode(m); setError(''); setInfo(''); };

  const submit = async () => {
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setError('Bitte eine gültige E-Mail eingeben.'); return; }
    if (mode !== 'reset' && password.length < 6) { setError('Passwort: mindestens 6 Zeichen.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      if (mode === 'signup') {
        const { user, needsConfirm } = await signUp(mail, password, linkUserId);
        if (needsConfirm) {
          setInfo(`Bestätigungs-Mail an ${mail} geschickt. Link klicken, danach hier einloggen.`);
          setMode('login');
        } else {
          onAuthed(user);
        }
      } else if (mode === 'login') {
        onAuthed(await signIn(mail, password));
      } else {
        await requestPasswordReset(mail);
        setInfo(`Mail zum Zurücksetzen an ${mail} geschickt.`);
        setMode('login');
      }
    } catch (e) {
      console.error(e);
      setError(describeAuthError(e));
    }
    setBusy(false);
  };

  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };

  return (
    <div>
      <div className="space-y-2.5 mb-3">
        <div>
          <label htmlFor={`${idPrefix}-email`} className="sr-only">E-Mail</label>
          <input id={`${idPrefix}-email`} type="email" inputMode="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={onKey} placeholder="E-Mail" disabled={busy}
            className="input-field px-4 py-3 text-base" />
        </div>
        {mode !== 'reset' && (
          <div>
            <label htmlFor={`${idPrefix}-password`} className="sr-only">Passwort</label>
            <input id={`${idPrefix}-password`} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
              placeholder={mode === 'signup' ? 'Passwort (mind. 6 Zeichen)' : 'Passwort'} disabled={busy}
              className="input-field px-4 py-3 text-base" />
          </div>
        )}
      </div>

      <ErrorText className="mb-2">{error}</ErrorText>
      {info && <div className="text-sm text-ok mb-3 flex items-start gap-2" role="status"><Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{info}</div>}

      <Button className="w-full" size="lg" onClick={submit} disabled={busy} icon={mode === 'reset' ? Mail : mode === 'signup' ? KeyRound : LogIn}>
        {busy ? 'Moment…' : mode === 'signup' ? 'Konto anlegen' : mode === 'reset' ? 'Link schicken' : 'Einloggen'}
      </Button>

      <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        {mode === 'login' && (
          <>
            <button onClick={() => switchMode('signup')} className="text-accent font-bold min-h-[44px]">Neues Konto anlegen</button>
            <button onClick={() => switchMode('reset')} className="text-fg-muted hover:text-fg min-h-[44px]">Passwort vergessen?</button>
          </>
        )}
        {mode !== 'login' && (
          <button onClick={() => switchMode('login')} className="text-accent font-bold min-h-[44px]">Ich habe schon ein Konto</button>
        )}
      </div>
    </div>
  );
}

// Home → "Konto": shows the login state or lets the user attach an account to this profile.
export function AccountSheet({ user, authUser, onClose, onAuthed }) {
  return (
    <Sheet onClose={onClose} title="Konto">
      <div className="label mb-1">Konto</div>
      {authUser ? (
        <>
          <div className="font-display text-3xl uppercase text-fg leading-none mb-3">Eingeloggt</div>
          <div className="card-soft p-4 mb-4">
            <div className="text-xs text-fg-muted mb-1">E-Mail</div>
            <div className="text-fg font-medium break-all">{authUser.email}</div>
          </div>
          <div className="text-sm text-fg-muted mb-5 leading-relaxed">
            Auf einem anderen Gerät (Laptop, Tablet) einfach die App öffnen und mit dieser E-Mail einloggen –
            du landest direkt bei <span className="text-fg font-semibold">{user.name}</span>, mit Plan und Verlauf.
          </div>
          <Button variant="secondary" size="md" className="w-full" onClick={onClose}>Schließen</Button>
        </>
      ) : (
        <>
          <div className="font-display text-3xl uppercase text-fg leading-none mb-2">Konto anlegen</div>
          <div className="text-sm text-fg-muted mb-5 leading-relaxed">
            Mit E-Mail und Passwort kannst du dich auch am Laptop oder einem neuen Handy einloggen.
            Dein Profil <span className="text-fg font-semibold">{user.name}</span> wird mit dem Konto verknüpft.
          </div>
          <AuthForm initialMode="signup" linkUserId={user.id} onAuthed={onAuthed} idPrefix="acct" />
        </>
      )}
    </Sheet>
  );
}

// Opened automatically when a password-reset link brings the user back into the app.
export function NewPasswordSheet({ onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (password.length < 6) { setError('Passwort: mindestens 6 Zeichen.'); return; }
    setBusy(true); setError('');
    try { await setNewPassword(password); onDone(true); }
    catch (e) { setError(describeAuthError(e)); setBusy(false); }
  };
  return (
    <Sheet onClose={() => onDone(false)} title="Neues Passwort">
      <div className="label mb-1">Konto</div>
      <div className="font-display text-3xl uppercase text-fg leading-none mb-4">Neues Passwort</div>
      <label htmlFor="new-password" className="sr-only">Neues Passwort</label>
      <input id="new-password" type="password" autoComplete="new-password" value={password} autoFocus
        onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Neues Passwort (mind. 6 Zeichen)" disabled={busy} className="input-field px-4 py-3 text-base mb-3" />
      <ErrorText className="mb-2">{error}</ErrorText>
      <Button className="w-full" onClick={submit} disabled={busy} icon={KeyRound}>{busy ? 'Moment…' : 'Passwort speichern'}</Button>
    </Sheet>
  );
}
