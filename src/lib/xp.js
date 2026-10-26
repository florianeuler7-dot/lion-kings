// ===== XP / LEVEL (gamification) =====
// Everything is derived from the workout history – nothing extra is stored.

export const XP = {
  strength: 100,
  cardio: 60,
  mobility: 30,
  combined: 90,
  custom: 50,
  perSet: 2,         // bonus per logged set
  perVolume1000: 5,  // bonus per 1000 kg moved
  streakDay: 10,     // bonus per streak day (applied to the current streak only)
};

export function xpForWorkout(w) {
  const isC = !!(w.isCardio ?? w.is_cardio);
  const isM = !!(w.isMobility ?? w.is_mobility);
  const logs = w.logs || [];
  if (isC && isM) return XP.combined;
  if (isC) return XP.cardio;
  if (isM) return XP.mobility;
  const sets = logs.reduce((s, l) => s + (l.sets?.length || 0), 0);
  if (sets === 0) return XP.custom;
  const volume = logs.reduce((s, l) => s + (l.sets || []).reduce((r, set) => r + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
  return XP.strength + sets * XP.perSet + Math.floor(volume / 1000) * XP.perVolume1000;
}

export function totalXp(history = [], streak = 0) {
  return history.reduce((s, w) => s + xpForWorkout(w), 0) + streak * XP.streakDay;
}

// Level curve: level n needs n² × 150 XP in total
export function levelFromXp(xp) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 150)));
  const current = level * level * 150;
  const next = (level + 1) * (level + 1) * 150;
  return {
    level,
    xp,
    intoLevel: xp - current,
    needed: next - current,
    pct: Math.min(100, Math.round(((xp - current) / (next - current)) * 100)),
    next,
  };
}

export const LEVEL_TITLES = [
  'Rookie', 'Rookie', 'Grinder', 'Grinder', 'Beast', 'Beast', 'Machine', 'Machine', 'Legend', 'Legend', 'Winter King',
];
export function levelTitle(level) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];
}

// Badges unlocked by the current history
export const BADGES = [
  { id: 'first', label: 'Erstes Workout', test: ({ count }) => count >= 1 },
  { id: 'ten', label: '10 Workouts', test: ({ count }) => count >= 10 },
  { id: 'fifty', label: '50 Workouts', test: ({ count }) => count >= 50 },
  { id: 'streak3', label: '3-Tage-Streak', test: ({ streak }) => streak >= 3 },
  { id: 'streak7', label: '7-Tage-Streak', test: ({ streak }) => streak >= 7 },
  { id: 'cardio', label: 'Erstes Cardio', test: ({ cardio }) => cardio >= 1 },
  { id: 'mobility', label: 'Erste Mobility', test: ({ mobility }) => mobility >= 1 },
  { id: 'volume10k', label: '10 t bewegt', test: ({ volume }) => volume >= 10000 },
  { id: 'volume100k', label: '100 t bewegt', test: ({ volume }) => volume >= 100000 },
];

export function badgeStats(history = [], streak = 0) {
  let cardio = 0, mobility = 0, volume = 0;
  history.forEach(w => {
    if (w.isCardio ?? w.is_cardio) cardio++;
    if (w.isMobility ?? w.is_mobility) mobility++;
    (w.logs || []).forEach(l => (l.sets || []).forEach(s => { volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0); }));
  });
  return { count: history.length, streak, cardio, mobility, volume };
}

export function unlockedBadges(history = [], streak = 0) {
  const stats = badgeStats(history, streak);
  return BADGES.filter(b => b.test(stats));
}
