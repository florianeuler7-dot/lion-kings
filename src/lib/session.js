// ===== SESSION STORAGE (user identity only) =====
// Key kept for backwards compatibility – existing users stay logged in.
const USER_KEY = 'cutphase_user';

export const session = {
  getUser: () => {
    try {
      const v = localStorage.getItem(USER_KEY);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  },
  setUser: (user) => {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) {}
  },
  clear: () => {
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
  },
};

export function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch {}
}
