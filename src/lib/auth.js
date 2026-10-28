// Account login via Supabase Auth (e-mail + password).
//
// The account is only an identity: which `users` row belongs to this login is stored in the
// auth user's metadata (`app_user_id`). No extra table or migration needed, and data access
// stays unchanged (see the data client in src/supabase.js).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'winterarc-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // confirmation / reset links land here with a token in the URL
  },
});

const APP_USER_KEY = 'app_user_id';

export const linkedUserId = (authUser) => authUser?.user_metadata?.[APP_USER_KEY] || null;

export async function getAuthUser() {
  const { data, error } = await authClient.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

export function describeAuthError(e) {
  const msg = e?.message || String(e || '');
  if (/Invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort falsch.';
  if (/Email not confirmed/i.test(msg)) return 'E-Mail noch nicht bestätigt – bitte den Link in der Mail klicken.';
  if (/already registered|already been registered/i.test(msg)) return 'Für diese E-Mail gibt es schon ein Konto – bitte einloggen.';
  if (/Password should be at least|at least 6/i.test(msg)) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (/rate limit|For security purposes|too many/i.test(msg)) return 'Zu viele Versuche – kurz warten und nochmal.';
  if (/Signups not allowed/i.test(msg)) return 'Registrierung ist in Supabase deaktiviert (Authentication → Providers → Email).';
  if (/invalid format|Unable to validate email/i.test(msg)) return 'Die E-Mail-Adresse sieht nicht richtig aus.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Keine Verbindung – bist du online?';
  return msg || 'Unbekannter Fehler';
}

export async function signUp(email, password, appUserId = null) {
  const { data, error } = await authClient.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: appUserId ? { [APP_USER_KEY]: appUserId } : {},
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  // With e-mail confirmation on, Supabase answers an already registered address with a
  // user object that has no identities instead of an error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('User already registered');
  }
  return { user: data.session?.user || data.user, needsConfirm: !data.session };
}

export async function signIn(email, password) {
  const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data.user;
}

// Remember which profile (users row) belongs to this login.
export async function linkAccount(appUserId) {
  const { data, error } = await authClient.auth.updateUser({ data: { [APP_USER_KEY]: appUserId } });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  try { await authClient.auth.signOut(); } catch (e) { console.error('Sign out failed:', e); }
}

export async function requestPasswordReset(email) {
  const { error } = await authClient.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw error;
}

export async function setNewPassword(password) {
  const { error } = await authClient.auth.updateUser({ password });
  if (error) throw error;
}

// Fires on login, logout, token refresh and when a reset link opens the app (PASSWORD_RECOVERY).
export function onAuthChange(cb) {
  const { data } = authClient.auth.onAuthStateChange((event, session) => cb(event, session?.user || null));
  return () => data.subscription.unsubscribe();
}
