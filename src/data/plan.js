// ===== TRAINING PLAN =====
export const DEFAULT_PLAN = {
  push: {
    name: 'Push',
    color: 'from-red-600 to-orange-600',
    exercises: [
      { name: 'Bankdrücken (Smith)', sets: 4, reps: '6-8', restSec: 150, hint: 'Stabil, Brust isolieren' },
      { name: 'Schrägbank Kurzhantel', sets: 3, reps: '8-10', restSec: 120, hint: 'Obere Brust' },
      { name: 'Schulterdrücken Maschine', sets: 3, reps: '6-8', restSec: 150, hint: 'Hauptreiz für Schultern' },
      { name: 'Seitheben Kurzhantel', sets: 3, reps: '12', restSec: 75, hint: 'Sauber, kein Schwung' },
      { name: 'Trizeps Pushdown', sets: 3, reps: '10-12', restSec: 75, hint: 'Volle Streckung' },
      { name: 'Overhead Trizeps', sets: 2, reps: '12', restSec: 75, hint: 'Langer Trizepskopf' },
    ],
  },
  pull: {
    name: 'Pull',
    color: 'from-red-600 to-rose-700',
    exercises: [
      { name: 'Klimmzüge', sets: 3, reps: '6-8', restSec: 150, hint: 'Mit Zusatzgewicht wenn möglich' },
      { name: 'Langhantel Rudern', sets: 4, reps: '6-8', restSec: 150, hint: 'Mittlerer Rücken' },
      { name: 'Latzug breit', sets: 3, reps: '10', restSec: 90, hint: 'Lats für V-Taper' },
      { name: 'Facepull', sets: 3, reps: '15', restSec: 60, hint: 'Schulterhinterseite, Haltung' },
      { name: 'SZ Curls', sets: 3, reps: '10', restSec: 75, hint: 'Bizeps Hauptübung' },
      { name: 'Hammer Curls', sets: 2, reps: '12', restSec: 60, hint: 'Brachialis, Unterarm' },
    ],
  },
  legs: {
    name: 'Beine & Core',
    color: 'from-red-700 to-amber-700',
    exercises: [
      { name: 'Kniebeugen', sets: 4, reps: '6-8', restSec: 180, hint: 'Hauptübung' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10/Bein', restSec: 90, hint: 'Glutes, Stabilität' },
      { name: 'Rumänisches Kreuzheben', sets: 3, reps: '8', restSec: 120, hint: 'Beinrückseite' },
      { name: 'Beinbeuger', sets: 3, reps: '12', restSec: 75, hint: 'Hamstrings isoliert' },
      { name: 'Waden', sets: 4, reps: '12', restSec: 60, hint: 'Volle Dehnung' },
      { name: 'KB Swings', sets: 3, reps: '15', restSec: 60, hint: 'Posterior Chain Finisher' },
      { name: 'Hanging Leg Raises', sets: 3, reps: '12', restSec: 60, hint: 'Unterer Bauch' },
    ],
  },
  aesthetic: {
    name: 'Upper Aesthetic + KB',
    color: 'from-red-600 to-pink-700',
    exercises: [
      { name: 'Schrägbank Langhantel', sets: 3, reps: '8', restSec: 120, hint: 'Obere Brust schwer' },
      { name: 'Cable Flys', sets: 3, reps: '12', restSec: 75, hint: 'Brust ausarbeiten' },
      { name: 'Seitheben', sets: 2, reps: '15', restSec: 75, hint: 'Reduziert, kein Dropsatz' },
      { name: 'Supersatz Bizeps/Trizeps', sets: 4, reps: 'Runde', restSec: 90, hint: 'Pump-Finisher' },
      { name: 'Turkish Get-Up', sets: 3, reps: '3/Seite', restSec: 90, hint: 'Schulter-Stabilität, Core' },
      { name: "Farmer's Walk", sets: 3, reps: '30m', restSec: 90, hint: 'Trapezius, Griff, Haltung' },
      { name: 'Cable Crunches', sets: 3, reps: '15', restSec: 60, hint: 'Sichtbarer Bauch' },
    ],
  },
  cardio: { name: 'Zone-2 Cardio + Mobility', color: 'from-emerald-600 to-teal-700', exercises: [] },
  rest: { name: 'Pause', color: 'from-zinc-700 to-zinc-800', exercises: [] },
};

export const DEFAULT_SCHEDULE = ['rest', 'push', 'pull', 'rest', 'legs', 'aesthetic', 'cardio'];
export const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// Workout blocks that contain exercises (everything except cardio / rest)
export const STRENGTH_KEYS = ['push', 'pull', 'legs', 'aesthetic'];

const FALLBACK_COLORS = {
  push: 'from-red-600 to-orange-600',
  pull: 'from-red-600 to-rose-700',
  legs: 'from-red-700 to-amber-700',
  aesthetic: 'from-red-600 to-pink-700',
};

// Normalize one exercise coming from the AI coach or a pasted plan.
// Sets / restSec can arrive as strings ("4", "90s") – make them safe numbers.
function normalizeExercise(ex, idx) {
  const sets = Math.max(1, parseInt(ex?.sets) || 3);
  const restSec = Math.max(15, parseInt(ex?.restSec) || 90);
  return {
    name: String(ex?.name || `Übung ${idx + 1}`).trim(),
    sets,
    reps: String(ex?.reps ?? '10').trim() || '10',
    restSec,
    hint: ex?.hint ? String(ex.hint).trim() : '',
  };
}

function normalizeBlock(key, block) {
  if (!block || typeof block !== 'object') return null;
  const exercises = Array.isArray(block.exercises) ? block.exercises.map(normalizeExercise) : [];
  return {
    name: String(block.name || key).trim() || key,
    color: typeof block.color === 'string' && block.color.includes('from-') ? block.color : (FALLBACK_COLORS[key] || 'from-zinc-700 to-zinc-800'),
    exercises,
  };
}

// Helper: extract a usable PLAN structure from either DEFAULT_PLAN or a custom one
export function buildPlanData(customPlan) {
  if (!customPlan || typeof customPlan !== 'object') {
    return { plan: DEFAULT_PLAN, schedule: DEFAULT_SCHEDULE };
  }
  // Custom plan from DB or AI – only include workout blocks that exist in the user's plan.
  // NEVER fall back to DEFAULT_PLAN workout blocks; that would inject workouts the user
  // never selected. Only cardio/rest get a fallback since they're structural.
  const cardioBase = normalizeBlock('cardio', customPlan.cardio) || DEFAULT_PLAN.cardio;
  const plan = { cardio: cardioBase };
  STRENGTH_KEYS.forEach(k => {
    const b = normalizeBlock(k, customPlan[k]);
    if (b && b.exercises.length > 0) plan[k] = b;
  });
  plan.cardio_optional = normalizeBlock('cardio_optional', customPlan.cardio_optional)
    || { ...cardioBase, name: 'Cardio (optional)', optional: true };
  plan.rest = normalizeBlock('rest', customPlan.rest) || DEFAULT_PLAN.rest;

  const VALID_KEYS = new Set(['push', 'pull', 'legs', 'aesthetic', 'cardio', 'cardio_optional', 'rest']);
  const normalizeKey = (raw) => {
    const k = String(raw || '').toLowerCase().trim();
    if (VALID_KEYS.has(k) && (k === 'cardio' || k === 'cardio_optional' || k === 'rest' || plan[k])) return k;
    if (k === 'cardio_light' || k === 'optional_cardio') return 'cardio_optional';
    if (k.startsWith('cardio')) return 'cardio';
    if (k.startsWith('rest') || k.includes('pause') || k.includes('recovery') || k === '') return 'rest';
    if (k.startsWith('push') && plan.push) return 'push';
    if (k.startsWith('pull') && plan.pull) return 'pull';
    if (k.startsWith('leg') && plan.legs) return 'legs';
    if ((k.startsWith('aesthetic') || k.startsWith('upper')) && plan.aesthetic) return 'aesthetic';
    return 'rest';
  };
  const rawSchedule = Array.isArray(customPlan.schedule) && customPlan.schedule.length === 7
    ? customPlan.schedule
    : DEFAULT_SCHEDULE;
  const schedule = rawSchedule.map(normalizeKey);
  return { plan, schedule };
}
