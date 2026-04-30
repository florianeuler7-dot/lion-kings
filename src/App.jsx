import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Play, Pause, SkipForward, Check, Calendar, History, Home, X, Droplet, ChevronRight, Clock, Flame, TrendingUp, Coffee, Timer, Heart, Activity, Sparkles, User, LogOut, AlertCircle, Users, Trophy, Zap, Plus, Minus, Camera, Upload, StickyNote, Forward, MessageCircle, Send } from 'lucide-react';
import { findUserByName, getUserById, createUser, getLastWorkoutDate, getUserWorkouts, saveWorkout, rowToWorkout, computeLastWeights, getAllUsers, getActivityFeed, getAllLiveStatuses, setLiveStatus, clearLiveStatus, getReactionsForWorkouts, toggleReaction, getCommentsForWorkouts, addComment, computeUserStats, supabase, uploadAvatar, updateUserAvatar, saveUserPlan, getActivePlanForUser, parsePlanText, coachChat } from './supabase';

// ===== HELPERS =====
// Legacy workouts stored duration in seconds; newer ones in minutes.
// Heuristic: values > 300 are almost certainly seconds (5h+ workout = implausible).
function formatDuration(raw) {
  if (!raw || raw === 0) return null;
  const mins = raw > 300 ? Math.round(raw / 60) : raw;
  if (mins < 60) return `${mins} Min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m} Min` : `${h}h`;
}

// ===== MOTIVATION QUOTES =====
const MOTIVATION_QUOTES = [
  { text: 'Wer nicht trainiert, hat keine Entschuldigungen – nur Ergebnisse, die fehlen.', author: 'Markus Rühl' },
  { text: 'Ich hab\' nie gezählt, wie viel ich hebe. Ich hab\' gezählt, wie oft ich aufgestanden bin.', author: 'Markus Rühl' },
  { text: 'Das Eisen lügt nie. Menschen lügen, Zahlen lügen – aber das Eisen nicht.', author: 'Markus Rühl' },
  { text: 'Wenn\'s brennt, wird\'s gut.', author: 'Markus Rühl' },
  { text: 'Der Körper hat immer mehr drauf als der Kopf glaubt.', author: 'Markus Rühl' },
  { text: 'Aufhören ist keine Option. Pause ja, aufhören nein.', author: 'Markus Rühl' },
  { text: 'Ich bin nicht hier um gut auszusehen. Ich bin hier um stärker zu werden.', author: 'Markus Rühl' },
  { text: 'Du willst aufhören? Dann mach noch drei.', author: 'Markus Rühl' },
  { text: 'Keine Ausreden. Kein Mitleid. Einfach machen.', author: 'Markus Rühl' },
  { text: 'Wer Muskeln will, muss leiden wollen. Klingt hart, ist aber so.', author: 'Markus Rühl' },
  { text: 'Ein schlechtes Training ist besser als kein Training.', author: 'Markus Rühl' },
  { text: 'Eat, sleep, train, repeat – und irgendwann passt nix mehr.', author: 'Markus Rühl' },
  { text: 'Der einzige schlechte Satz im Training ist der, den du nicht gemacht hast.', author: 'Markus Rühl' },
  { text: 'Shut up and train.', author: 'Markus Rühl' },
  { text: 'Schmerz ist temporär. Stolz ist für immer.', author: 'Markus Rühl' },
  { text: 'Niemand wird groß durch zuschauen. Du musst selbst ran.', author: 'Markus Rühl' },
  { text: 'Im Training gibt\'s kein Morgen. Nur jetzt und dieser Satz.', author: 'Markus Rühl' },
  { text: 'Wer aufhört, besser werden zu wollen, hört auf, gut zu sein.', author: 'Markus Rühl' },
  { text: 'Das Gewicht weiß nicht, ob du müde bist. Also interessiert\'s mich auch nicht.', author: 'Markus Rühl' },
  { text: 'Nicht das Gewicht macht dich groß – die Wiederholungen, die wehtun.', author: 'Markus Rühl' },
  { text: 'The last three or four reps is what makes the muscle grow.', author: 'Arnold Schwarzenegger' },
  { text: 'Of course it\'s heavy. That\'s why they call it weight.', author: 'Arnold Schwarzenegger' },
  { text: 'You can have results or excuses. Not both.', author: 'Arnold Schwarzenegger' },
  { text: 'Champions aren\'t made in gyms. Champions are made from something deep inside.', author: 'Arnold Schwarzenegger' },
  { text: 'The mind always fails first, not the body.', author: 'Arnold Schwarzenegger' },
];

const CHEER_MESSAGES = [
  'STARK! 💪', 'BOOM! 🔥', 'GEILE EINHEIT!', 'LION KING! 🦁',
  'WEITER SO!', 'BEAST MODE!', 'DOER! ⚡', 'SO GEHT DAS!',
  'KILLER SATZ! 🔥', 'MAKER!', 'NICHT AUFHÖREN!', 'WEITER, WEITER!',
];

// ===== TRAINING PLAN =====
const DEFAULT_PLAN = {
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

const DEFAULT_SCHEDULE = ['rest', 'push', 'pull', 'rest', 'legs', 'aesthetic', 'cardio'];
const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Helper: extract a usable PLAN structure from either DEFAULT_PLAN or a custom one
function buildPlanData(customPlan) {
  if (!customPlan) {
    return { plan: DEFAULT_PLAN, schedule: DEFAULT_SCHEDULE };
  }
  // Custom plan from DB or AI – ensure cardio + rest exist
  const cardioBase = customPlan.cardio || DEFAULT_PLAN.cardio;
  const plan = {
    push: customPlan.push || DEFAULT_PLAN.push,
    pull: customPlan.pull || DEFAULT_PLAN.pull,
    legs: customPlan.legs || DEFAULT_PLAN.legs,
    aesthetic: customPlan.aesthetic || DEFAULT_PLAN.aesthetic,
    cardio: cardioBase,
    cardio_optional: customPlan.cardio_optional || { ...cardioBase, name: 'Cardio (optional)', optional: true },
    rest: customPlan.rest || DEFAULT_PLAN.rest,
  };
  const VALID_KEYS = new Set(['push', 'pull', 'legs', 'aesthetic', 'cardio', 'cardio_optional', 'rest']);
  const normalizeKey = (k) => {
    if (VALID_KEYS.has(k)) return k;
    if (k === 'cardio_optional' || k === 'cardio_light' || k === 'optional_cardio') return 'cardio_optional';
    if (k.startsWith('cardio')) return 'cardio';
    if (k.startsWith('rest') || k.includes('pause') || k.includes('recovery')) return 'rest';
    if (k.startsWith('push')) return 'push';
    if (k.startsWith('pull')) return 'pull';
    if (k.startsWith('leg')) return 'legs';
    if (k.startsWith('aesthetic') || k.startsWith('upper')) return 'aesthetic';
    return 'rest';
  };
  const rawSchedule = Array.isArray(customPlan.schedule) && customPlan.schedule.length === 7
    ? customPlan.schedule
    : DEFAULT_SCHEDULE;
  const schedule = rawSchedule.map(normalizeKey);
  return { plan, schedule };
}

// ===== MOBILITY PROGRAMS =====
const MOBILITY = {
  hip: {
    name: 'Hüfte',
    icon: '🦵',
    description: 'Ideal nach Beintag oder bei viel Sitzen',
    exercises: [
      { name: '90/90 Hip Switch', duration: '8 pro Seite', steps: ['Beide Beine im 90°-Winkel auf den Boden, eines vor dir, eines seitlich', 'Hüfte rollen, Beine zur anderen Seite drehen', 'Oberkörper aufrecht halten, Bewegung kommt aus der Hüfte', 'Langsam und kontrolliert'] },
      { name: "World's Greatest Stretch", duration: '5 pro Seite', steps: ['Aus dem Ausfallschritt: vorderes Bein 90°, hinteres Knie am Boden', 'Gleichseitige Hand neben den Fuß', 'Anderen Arm zur Decke drehen, Brustwirbelsäule rotieren', '5 Sekunden halten, Seite wechseln'] },
      { name: 'Frog Pose', duration: '60 Sek halten', steps: ['Im Vierfüßlerstand Knie weit auseinander', 'Füße zeigen nach außen, Innenseite der Schienbeine am Boden', 'Hüfte langsam nach hinten schieben', 'Tief atmen, Adduktoren entspannen lassen'] },
      { name: 'Pigeon Pose', duration: '60 Sek pro Seite', steps: ['Vorderes Bein angewinkelt vor dem Körper, hinteres Bein lang ausgestreckt', 'Hüften gerade halten (nicht zur Seite kippen)', 'Oberkörper langsam nach vorne sinken lassen', 'In Po und Hüfte spüren – nicht in den Knien'] },
      { name: 'Couch Stretch (Hüftbeuger)', duration: '60 Sek pro Seite', steps: ['Hinteres Knie am Boden, Fuß an die Wand oder Couch', 'Vorderes Bein im 90°-Winkel', 'Becken nach vorne kippen, Po anspannen', 'Aufrechter Oberkörper – Dehnung in der vorderen Hüfte'] },
    ],
  },
  shoulder: {
    name: 'Schulter',
    icon: '💪',
    description: 'Nach Push-Tag oder bei verspannten Schultern',
    exercises: [
      { name: 'Wall Slides', duration: '10 Wdh', steps: ['Mit dem Rücken zur Wand, Arme im 90°-Winkel an die Wand', 'Hände, Ellbogen, Schultern und Po berühren die Wand', 'Arme langsam nach oben gleiten', 'Kontakt zur Wand halten – nicht abheben'] },
      { name: 'Außenrotation (mit Band)', duration: '12 pro Seite', steps: ['Ellbogen am Körper anliegend, 90°-Winkel', 'Band oder Handtuch in beiden Händen', 'Unterarm langsam nach außen drehen', 'Schulterblatt unten halten, nicht hochziehen'] },
      { name: 'Cross-Body Stretch', duration: '30 Sek pro Seite', steps: ['Arm gestreckt vor dem Körper', 'Mit der anderen Hand am Ellbogen näher zur Brust ziehen', 'Schulter unten halten – nicht hochziehen', 'Spürbar im hinteren Schulterbereich'] },
      { name: 'Doorway Pec Stretch', duration: '30 Sek pro Seite', steps: ['Unterarm im Türrahmen, Ellbogen schulterhoch', 'Schritt durch den Türrahmen', 'Brust geht nach vorne, Arm bleibt fest', 'Dehnung in der Brustmuskulatur'] },
      { name: 'Sleeper Stretch', duration: '30 Sek pro Seite', steps: ['Auf der Seite liegen, unterer Arm im 90°-Winkel nach vorne', 'Mit der oberen Hand den unteren Arm sanft Richtung Boden drücken', 'Rotation in der Schulterkapsel', 'Nicht in den Schmerz – nur leichte Dehnung'] },
    ],
  },
  back: {
    name: 'Rücken',
    icon: '🔙',
    description: 'Nach Pull-Tag oder bei langem Sitzen',
    exercises: [
      { name: 'Cat-Cow', duration: '10 Wdh', steps: ['Vierfüßlerstand, Hände unter Schultern, Knie unter Hüfte', 'Einatmen: Rücken ins Hohlkreuz, Blick nach oben', 'Ausatmen: Rücken rund machen, Kinn zur Brust', 'Langsam und kontrolliert'] },
      { name: 'Thread the Needle', duration: '8 pro Seite', steps: ['Vierfüßlerstand', 'Einen Arm unter dem Körper durchführen', 'Schulter und Wange am Boden, anderer Arm bleibt gestreckt', 'Rotation in der Brustwirbelsäule'] },
      { name: "Child's Pose with Side Reach", duration: '30 Sek pro Seite', steps: ['Knie auseinander, Po auf den Fersen, Stirn am Boden', 'Beide Arme nach vorne strecken', 'Hände nach rechts wandern – linke Flanke dehnt sich', 'Seite wechseln'] },
      { name: 'Lat Stretch (am Rack)', duration: '30 Sek pro Seite', steps: ['An einem Türrahmen oder Rack festhalten', 'Po nach hinten schieben, Arm gestreckt', 'Hüfte zur gegenüberliegenden Seite verlagern', 'Dehnung im Lat (seitlicher Rücken)'] },
      { name: 'Spinal Twist (liegend)', duration: '45 Sek pro Seite', steps: ['Auf dem Rücken liegen, Arme T-förmig ausgestreckt', 'Ein Bein anwinkeln und zur gegenüberliegenden Seite fallen lassen', 'Schultern bleiben am Boden', 'Tief atmen, Rotation lösen lassen'] },
    ],
  },
  tspine: {
    name: 'Brustwirbelsäule',
    icon: '⬆️',
    description: 'Für aufrechte Haltung, vor Push-Tagen ideal',
    exercises: [
      { name: 'Foam Roll T-Spine', duration: '8-10 Wdh', steps: ['Foam Roller quer unter die obere Brustwirbelsäule', 'Hände hinter den Kopf, Ellbogen zusammen', 'Brustwirbelsäule über den Roller nach hinten dehnen', 'Roller leicht verschieben, mehrere Stellen bearbeiten'] },
      { name: 'Open Books', duration: '8 pro Seite', steps: ['Auf der Seite liegen, Knie 90° angewinkelt', 'Beide Arme nach vorne gestreckt', 'Oberen Arm im großen Bogen zur anderen Seite öffnen', 'Knie bleiben zusammen am Boden'] },
      { name: 'Quadruped T-Spine Rotation', duration: '8 pro Seite', steps: ['Vierfüßlerstand', 'Eine Hand zum Hinterkopf', 'Ellbogen zur Decke drehen, Brustwirbelsäule rotieren', 'Blick folgt dem Ellbogen'] },
      { name: 'Wall Angels', duration: '10 Wdh', steps: ['Mit dem Rücken zur Wand, Füße 30 cm entfernt', 'Schulterblätter, Po und Hinterkopf an der Wand', 'Arme im 90°-Winkel an der Wand', 'Langsam nach oben und unten gleiten'] },
      { name: 'Bench T-Spine Extension', duration: '10 Wdh', steps: ['Knien vor einer Bank', 'Ellbogen schulterbreit auf der Bank ablegen', 'Hände hinter dem Kopf zusammen', 'Brust sinkt zwischen die Schultern – T-Spine streckt sich'] },
    ],
  },
  fullbody: {
    name: 'Ganzkörper',
    icon: '🌿',
    description: 'Allround-Mobility für Cardio-Tage',
    exercises: [
      { name: 'Cat-Cow', duration: '10 Wdh', steps: ['Vierfüßlerstand', 'Einatmen: Rücken durchhängen lassen, Blick nach oben', 'Ausatmen: Rücken rund, Kinn zur Brust', 'Atmung mit Bewegung verbinden'] },
      { name: "World's Greatest Stretch", duration: '5 pro Seite', steps: ['Ausfallschritt, vorderes Bein 90°', 'Gleichseitige Hand neben den Fuß', 'Anderen Arm zur Decke rotieren', 'Tiefe Hüftöffnung + Brustwirbelsäulen-Rotation'] },
      { name: 'Down Dog to Up Dog', duration: '8 Wdh', steps: ['Vom Liegestütz: Hüfte zur Decke schieben (Down Dog)', 'Einatmen, durchschwingen zur Up Dog (Hüfte am Boden)', 'Brust öffnen, Schultern weg von den Ohren', 'Fließend zwischen beiden Positionen wechseln'] },
      { name: 'Cossack Squat', duration: '8 pro Seite', steps: ['Sehr breiter Stand, Füße zeigen leicht nach außen', 'Gewicht auf eine Seite, ein Bein beugen, anderes strecken', 'Po geht tief, gestrecktes Bein bleibt gerade', 'Auf andere Seite verlagern'] },
      { name: '90/90 Hip Switch', duration: '8 pro Seite', steps: ['Beide Beine im 90°-Winkel am Boden', 'Hüfte rollen, Beine zur anderen Seite', 'Oberkörper aufrecht', 'Kontrolliert von Seite zu Seite'] },
      { name: 'Standing Forward Fold', duration: '60 Sek halten', steps: ['Stehend, Knie locker', 'Oberkörper Richtung Beine sinken lassen', 'Hände greifen Ellbogen oder Knöchel', 'Locker hängen lassen, Nacken entspannt'] },
    ],
  },
  neck: {
    name: 'Nacken',
    icon: '👤',
    description: 'Bei Schreibtisch-Verspannungen',
    exercises: [
      { name: 'Chin Tucks', duration: '10 Wdh', steps: ['Aufrecht sitzen oder stehen', 'Kinn leicht nach hinten ziehen (Doppelkinn machen)', 'Kopf bleibt waagerecht – nicht nach unten kippen', '2 Sekunden halten, lösen'] },
      { name: 'Neck Rotations', duration: '5 pro Seite', steps: ['Aufrechter Sitz', 'Kopf langsam nach rechts drehen, kurz halten', 'Zurück zur Mitte, dann nach links', 'Schultern bleiben entspannt'] },
      { name: 'Upper Trap Stretch', duration: '30 Sek pro Seite', steps: ['Ohr zur Schulter neigen', 'Andere Hand greift unter dem Po (oder hinter dem Rücken)', 'Sanfter Zug am Kopf mit der freien Hand', 'Gegenseitige Schulter unten halten'] },
      { name: 'Levator Scapulae Stretch', duration: '30 Sek pro Seite', steps: ['Kinn zur Achsel drehen (45°-Winkel)', 'Hand auf den Hinterkopf, sanfter Zug nach vorn-unten', 'Andere Hand hält die Schulter unten', 'Spürbar im seitlichen Nacken/Schulterblatt'] },
      { name: 'Scapula Squeezes', duration: '15 Wdh', steps: ['Aufrechter Sitz, Arme entspannt', 'Schulterblätter zusammenziehen wie eine Bleistift-Klemme', '3 Sekunden halten, lösen', 'Nicht hochziehen – nur zusammenziehen'] },
    ],
  },
};

// ===== AVATAR COMPONENT =====
function Avatar({ user, size = 'md', className = '', ring = false }) {
  const sizes = {
    xs: { box: 'w-7 h-7', text: 'text-xs' },
    sm: { box: 'w-9 h-9', text: 'text-sm' },
    md: { box: 'w-10 h-10', text: 'text-base' },
    lg: { box: 'w-14 h-14', text: 'text-xl' },
    xl: { box: 'w-24 h-24', text: 'text-3xl' },
  };
  const s = sizes[size] || sizes.md;
  const ringClass = ring ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950' : '';
  const initial = (user?.name?.[0] || '?').toUpperCase();

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user?.name || ''}
        className={`${s.box} rounded-full object-cover bg-zinc-800 ${ringClass} ${className}`}
      />
    );
  }
  return (
    <div className={`${s.box} ${s.text} rounded-full bg-zinc-800 flex items-center justify-center font-display text-zinc-200 ${ringClass} ${className}`}>
      {initial}
    </div>
  );
}

// ===== SESSION STORAGE (user identity only) =====
const session = {
  getUser: () => {
    try {
      const v = localStorage.getItem('cutphase_user');
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  },
  setUser: (user) => {
    try { localStorage.setItem('cutphase_user', JSON.stringify(user)); } catch (e) {}
  },
  clear: () => {
    try { localStorage.removeItem('cutphase_user'); } catch (e) {}
  },
};

export default function App() {
  const [user, setUser] = useState(null); // {id, name}
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [screen, setScreen] = useState('home');
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [history, setHistory] = useState([]); // array of workout rows
  const [lastWeights, setLastWeights] = useState({});
  const [toast, setToast] = useState(null);
  const [combinedFlow, setCombinedFlow] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(null); // { planName, duration }
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
          } else {
            session.clear();
          }
        } catch (e) {
          console.error('User load error:', e);
        }
      }
      setAuthLoading(false);
    })();
  }, []);

  // Load workouts and plan when user is set
  useEffect(() => {
    if (!user) return;
    (async () => {
      setDataLoading(true);
      try {
        const [rows, customPlan] = await Promise.all([
          getUserWorkouts(user.id),
          getActivePlanForUser(user.id),
        ]);
        const workouts = rows.map(rowToWorkout);
        setHistory(workouts);
        setLastWeights(computeLastWeights(workouts));
        setPlanConfig(buildPlanData(customPlan));
      } catch (e) {
        console.error('Data load error:', e);
      }
      setDataLoading(false);
    })();
  }, [user]);

  const showToast = (msg, icon = 'info') => {
    setToast({ msg, icon, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOnboarded = (newUser) => {
    session.setUser(newUser);
    setUser(newUser);
  };

  const handleLogout = () => {
    session.clear();
    setUser(null);
    setHistory([]);
    setLastWeights({});
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
      const msg = e?.message || e?.details || e?.code || String(e);
      console.error('Avatar update error:', e?.message, '| code:', e?.code, '| details:', e?.details);
      showToast(`Upload fehlgeschlagen: ${msg}`, 'info');
    }
  };

  const handlePlanSaved = async (newPlan) => {
    try {
      await saveUserPlan(user.id, newPlan);
      setPlanConfig(buildPlanData(newPlan));
      showToast('Neuer Plan aktiv 🦁', 'check');
      setScreen('home');
    } catch (e) {
      const msg = e?.message || e?.details || e?.code || String(e);
      console.error('Plan save error:', e?.message, '| code:', e?.code, '| details:', e?.details, '| hint:', e?.hint);
      showToast(`Fehler: ${msg}`, 'info');
    }
  };

  const handleLogCustom = async ({ name: workoutName, duration }) => {
    try {
      const row = await saveWorkout(user.id, {
        date: new Date(),
        planKey: 'custom',
        planName: workoutName,
        logs: [],
        duration: duration * 60,
        isCardio: false,
        isMobility: false,
        notes: '',
        skippedExercises: [],
      });
      setHistory(prev => [rowToWorkout(row), ...prev]);
      showToast(`${workoutName} eingetragen ✓`, 'check');
    } catch (e) {
      showToast('Fehler beim Speichern', 'info');
    }
    setShowCustomModal(false);
  };

  const today = new Date();
  const todayKey = DAY_MAP[today.getDay()];
  const todayPlan = PLAN[todayKey];

  const startWorkout = (planKey) => {
    const plan = PLAN[planKey];
    if (!plan.exercises.length) return;
    setActiveWorkout({
      planKey, plan, exerciseIdx: 0, setIdx: 0,
      logs: plan.exercises.map(ex => ({ name: ex.name, sets: [] })),
      startTime: Date.now(),
    });
    setScreen('workout');
    // Live status: training started
    setLiveStatus(user.id, plan.name, `Übung 1/${plan.exercises.length}`);
  };

  const persistWorkout = async (entry) => {
    try {
      const saved = await saveWorkout(user.id, entry);
      const newRow = rowToWorkout(saved);
      setHistory(prev => [newRow, ...prev]);
      return newRow;
    } catch (e) {
      console.error('Save error:', e);
      showToast('Fehler beim Speichern – nochmal versuchen', 'info');
      throw e;
    }
  };

  const finishCardio = async (durationMin, type) => {
    try {
      await persistWorkout({
        date: new Date().toISOString(),
        planKey: 'cardio',
        planName: type,
        logs: [],
        duration: durationMin,
        isCardio: true,
      });
      clearLiveStatus(user.id);
      if (combinedFlow) {
        // Chain into mobility
        showToast('Cardio fertig – jetzt Mobility', 'check');
        setScreen('mobility');
      } else {
        setScreen('home');
        showToast('Cardio abgeschlossen 🔥', 'check');
      }
    } catch (e) {}
  };

  const finishMobility = async (focus, completed, total) => {
    try {
      await persistWorkout({
        date: new Date().toISOString(),
        planKey: 'mobility',
        planName: `Mobility – ${MOBILITY[focus].name}`,
        logs: [],
        duration: 0,
        isMobility: true,
        focus,
        completed,
        total,
      });
      clearLiveStatus(user.id);
      if (combinedFlow) {
        setCombinedFlow(false);
        setScreen('home');
        showToast('Training komplett 🦁', 'check');
      } else {
        setScreen('home');
        showToast(`Mobility abgeschlossen (${completed}/${total})`, 'check');
      }
    } catch (e) {}
  };

  const finishWorkout = async (logs, extras = {}) => {
    try {
      const newRow = await persistWorkout({
        date: new Date().toISOString(),
        planKey: activeWorkout.planKey,
        planName: activeWorkout.plan.name,
        logs,
        duration: Math.floor((Date.now() - activeWorkout.startTime) / 60000),
        notes: extras.notes || '',
        skippedExercises: extras.skippedExercises || [],
      });
      const newLW = { ...lastWeights };
      logs.forEach(l => {
        if (l.sets.length > 0) {
          const heaviest = Math.max(...l.sets.map(s => parseFloat(s.weight) || 0));
          if (heaviest > 0) newLW[l.name] = heaviest;
        }
      });
      setLastWeights(newLW);
      clearLiveStatus(user.id);
      setActiveWorkout(null);
      setScreen('home');
      setWorkoutComplete({ planName: activeWorkout.plan.name, duration: Math.floor((Date.now() - activeWorkout.startTime) / 60000) });
    } catch (e) {}
  };

  // Hidden file input for changing avatar after onboarding
  const avatarInputRef = useRef(null);
  const triggerAvatarChange = () => avatarInputRef.current?.click();
  const onAvatarFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking same file again works
    if (file) await handleChangeAvatar(file);
  };

  // Show onboarding if no user
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="font-display text-3xl text-red-500 animate-pulse">LION KINGS</div>
      </div>
    );
  }

  if (!user) {
    return <OnboardingScreen onComplete={handleOnboarded} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 grain relative safe-top safe-bottom">
      {/* Hidden file input for changing avatar */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={onAvatarFileChosen}
        className="hidden"
      />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-red-600 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3">
          {toast.icon === 'drink' && <Droplet className="w-5 h-5 text-blue-400" />}
          {toast.icon === 'check' && <Check className="w-5 h-5 text-green-500" />}
          {toast.icon === 'info' && <Flame className="w-5 h-5 text-red-500" />}
          <span className="font-mono text-sm">{toast.msg}</span>
        </div>
      )}

      {workoutComplete && (
        <WorkoutCompleteModal
          data={workoutComplete}
          onClose={() => setWorkoutComplete(null)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 pb-24 relative z-10">
        {screen === 'home' && (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onChangeAvatar={triggerAvatarChange}
            plan={PLAN}
            todayPlan={todayPlan} todayKey={todayKey}
            todayName={DAY_NAMES[today.getDay()]}
            history={history}
            dataLoading={dataLoading}
            onStart={() => startWorkout(todayKey)}
            onPickOther={(k) => startWorkout(k)}
            onStartCardio={() => setScreen('cardio')}
            onStartMobility={() => setScreen('mobility')}
            onStartCombined={() => { setCombinedFlow(true); setScreen('cardio'); }}
            onLogCustom={() => setShowCustomModal(true)}
          />
        )}
        {showCustomModal && (
          <CustomWorkoutModal
            onSave={handleLogCustom}
            onClose={() => setShowCustomModal(false)}
          />
        )}
        {screen === 'workout' && activeWorkout && (
          <WorkoutScreen
            workout={activeWorkout} setWorkout={setActiveWorkout}
            lastWeights={lastWeights}
            user={user}
            onFinish={finishWorkout}
            onCancel={() => { setActiveWorkout(null); clearLiveStatus(user.id); setScreen('home'); }}
            showToast={showToast}
          />
        )}
        {screen === 'history' && <HistoryScreen history={history} />}
        {screen === 'plan' && <PlanScreen plan={PLAN} schedule={DAY_MAP} />}
        {screen === 'dashboard' && <DashboardScreen user={user} />}
        {screen === 'coach' && <CoachScreen user={user} currentPlan={PLAN} currentSchedule={DAY_MAP} onPlanSaved={handlePlanSaved} showToast={showToast} />}
        {screen === 'cardio' && <CardioScreen onFinish={finishCardio} onCancel={() => { clearLiveStatus(user.id); setCombinedFlow(false); setScreen('home'); }} showToast={showToast} user={user} combinedFlow={combinedFlow} />}
        {screen === 'mobility' && <MobilityScreen onFinish={finishMobility} onCancel={() => { clearLiveStatus(user.id); setCombinedFlow(false); setScreen('home'); }} user={user} combinedFlow={combinedFlow} />}
      </div>

      {screen !== 'workout' && screen !== 'cardio' && screen !== 'mobility' && (
        <nav className="app-nav">
          <div className="app-nav-inner max-w-2xl mx-auto w-full">
            <NavBtn icon={Home} label="Heute" active={screen==='home'} onClick={() => setScreen('home')} />
            <NavBtn icon={Users} label="Löwen" active={screen==='dashboard'} onClick={() => setScreen('dashboard')} />
            <NavBtn icon={Sparkles} label="Coach" active={screen==='coach'} onClick={() => setScreen('coach')} />
            <NavBtn icon={History} label="Verlauf" active={screen==='history'} onClick={() => setScreen('history')} />
            <NavBtn icon={Calendar} label="Plan" active={screen==='plan'} onClick={() => setScreen('plan')} />
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
      className={`flex-1 flex flex-col items-center justify-center transition-colors ${active ? 'text-red-500' : 'text-zinc-400'}`}
      style={{ gap: 6 }}
    >
      <Icon style={{ width: 25, height: 25 }} />
      <span style={{ fontSize: 10, lineHeight: 1 }} className="font-mono">{label}</span>
    </button>
  );
}

const SPARKS = [
  { top: '12%', left:  '7%', char: '✦', color: '#ef4444', delay: '0ms',   size: 22 },
  { top: '10%', left: '88%', char: '⚡', color: '#f97316', delay: '80ms',  size: 18 },
  { top: '22%', left: '94%', char: '✦', color: '#ffffff', delay: '180ms', size: 14 },
  { top: '68%', left:  '4%', char: '★', color: '#ef4444', delay: '120ms', size: 18 },
  { top: '78%', left: '91%', char: '✦', color: '#f97316', delay: '40ms',  size: 24 },
  { top: '44%', left:  '2%', char: '⚡', color: '#ffffff', delay: '220ms', size: 16 },
  { top: '58%', left: '96%', char: '★', color: '#ef4444', delay: '160ms', size: 14 },
  { top: '87%', left: '18%', char: '✦', color: '#f97316', delay: '100ms', size: 20 },
  { top: '82%', left: '75%', char: '⚡', color: '#ffffff', delay: '260ms', size: 16 },
  { top:  '5%', left: '50%', char: '★', color: '#ef4444', delay: '50ms',  size: 18 },
];

function CelebrationOverlay({ message, nextExercise, onDone }) {
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    // Escalating vibration: short pulses → longer bursts over 3 seconds
    if (navigator.vibrate) {
      navigator.vibrate([
        80, 60,          // beat 1
        100, 50,         // beat 2
        120, 40,         // beat 3
        150, 35,         // beat 4
        180, 30,         // beat 5
        220, 25,         // beat 6 – climax
        300,             // long final buzz
      ]);
    }
    const t1 = setTimeout(() => setFading(true), 3200);
    const t2 = setTimeout(onDone, 4000);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  const handleTap = () => {
    if (!fading) {
      if (navigator.vibrate) navigator.vibrate(0);
      setFading(true);
      setTimeout(onDone, 600);
    }
  };

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 38%, #3f0a0a 0%, #0c0101 55%, #0a0a0a 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.7s ease',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Fire border — inset box-shadow rings around the whole screen */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 0,
        animation: 'fireEdge 4s ease-in-out both',
      }} />

      {SPARKS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: s.top, left: s.left,
          fontSize: s.size, color: s.color, pointerEvents: 'none',
          animation: `celebSpark 2s ease-out ${s.delay} both`,
        }}>
          {s.char}
        </div>
      ))}

      {/* Check circle with pulse */}
      <div style={{ animation: 'celebScale 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid #ef4444',
          background: 'rgba(239,68,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
          animation: 'celebPulse 1s ease-in-out 0.4s 3',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
            stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Cheer message */}
      <div className="font-display text-center text-white"
        style={{
          fontSize: 'clamp(2.8rem, 13vw, 4.5rem)',
          lineHeight: 1.1,
          paddingLeft: '1.5rem', paddingRight: '1.5rem',
          textShadow: '0 0 50px rgba(239,68,68,0.6), 0 0 100px rgba(239,68,68,0.2)',
          animation: 'celebScale 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.07s both',
        }}>
        {message}
      </div>

      {nextExercise && (
        <div className="font-mono text-zinc-400 text-xs mt-5 uppercase tracking-widest"
          style={{ animation: 'celebFadeUp 0.4s ease 0.35s both' }}>
          Weiter: {nextExercise}
        </div>
      )}

      <div className="font-mono text-zinc-700 text-xs absolute bottom-10"
        style={{ animation: 'celebFadeUp 0.3s ease 1s both' }}>
        tippen zum überspringen
      </div>
    </div>
  );
}

function WorkoutCompleteModal({ data, onClose }) {
  const q = MOTIVATION_QUOTES.filter(q => q.author === 'Markus Rühl')[new Date().getDate() % MOTIVATION_QUOTES.filter(q => q.author === 'Markus Rühl').length];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="font-display text-3xl text-white mb-1">TRAINING FERTIG</div>
        <div className="font-display text-lg text-red-500 mb-1">{data.planName.toUpperCase()}</div>
        {formatDuration(data.duration) && (
          <div className="font-mono text-sm text-zinc-400 mb-6">{formatDuration(data.duration)}</div>
        )}
        <div className="border-t border-zinc-800 pt-5 mb-6">
          <div className="text-zinc-300 text-sm font-mono italic leading-snug">„{q.text}"</div>
          <div className="text-zinc-500 text-xs font-mono mt-2">— {q.author}</div>
        </div>
        <button onClick={onClose} className="w-full bg-red-600 text-white font-display text-xl py-4 rounded-xl">
          WEITER
        </button>
      </div>
    </div>
  );
}

function HomeScreen({ user, onLogout, onChangeAvatar, plan: PLAN, todayPlan, todayKey, todayName, history, dataLoading, onStart, onPickOther, onStartCardio, onStartMobility, onStartCombined, onLogCustom }) {
  const isRest = todayKey === 'rest';
  const isCardio = todayKey === 'cardio';
  const isCardioOptional = todayKey === 'cardio_optional';
  const isAnyCardio = isCardio || isCardioOptional;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEntries = history.filter(h => h.dateOnly === todayDateStr);
  const cardioDoneToday = todayEntries.some(e => e.isCardio);
  const mobilityDoneToday = todayEntries.some(e => e.isMobility);
  const cardioFullyDone = isAnyCardio && cardioDoneToday && mobilityDoneToday;
  const doneToday = isAnyCardio ? cardioFullyDone : todayEntries.length > 0;
  const totalWorkouts = history.length;
  const lastWeek = history.filter(h => (Date.now() - new Date(h.date).getTime()) < 7*24*60*60*1000).length;

  // Decide what to do when user taps the START button
  const handleStart = () => {
    if (isAnyCardio) {
      if (!cardioDoneToday) {
        onStartCombined();
      } else if (!mobilityDoneToday) {
        onStartMobility();
      }
    } else {
      onStart();
    }
  };

  if (!todayPlan) return null;

  return (
    <div className="pt-8">
      {/* User strip */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onChangeAvatar}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors group"
        >
          <div className="relative">
            <Avatar user={user} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-800 border border-zinc-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-2.5 h-2.5 text-zinc-300" />
            </div>
          </div>
          <span className="font-mono text-sm">{user.name}</span>
        </button>
        <button onClick={onLogout} className="text-zinc-600 hover:text-zinc-400 transition-colors p-3">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-8">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">{todayName}</div>
        <h1 className="font-display text-6xl text-zinc-100 leading-none">LION<br/><span className="text-red-500">KINGS</span></h1>
      </div>

      <div className={`bg-gradient-to-br ${todayPlan.color} rounded-2xl p-6 mb-6 relative overflow-hidden`}>
        <div className="absolute -right-8 -top-8 opacity-10"><Dumbbell className="w-48 h-48" /></div>
        <div className="relative z-10">
          <div className="font-mono text-xs uppercase tracking-widest text-white/70 mb-2">Heutiges Training</div>
          <div className="font-display text-5xl text-white leading-none mb-3">{todayPlan.name.toUpperCase()}</div>
          {(() => { const q = MOTIVATION_QUOTES[new Date().getDate() % MOTIVATION_QUOTES.length]; return (
            <div className="mb-4 leading-snug">
              <div className="text-white/70 text-xs font-mono italic">„{q.text}"</div>
              <div className="text-white/40 text-xs font-mono mt-0.5">— {q.author}</div>
            </div>
          ); })()}
          {!isRest && !isAnyCardio && <div className="text-white/80 text-sm mb-6 font-mono">{todayPlan.exercises.length} Übungen · ca. 60–75 Min</div>}
          {isRest && <div className="text-white/90 text-sm mb-6">Heute ist Pausentag. Ruhe ist Teil des Plans – Cortisol runter, Muskeln wachsen lassen.</div>}
          {isAnyCardio && (
            <div className="text-white/90 text-sm mb-6">
              {isCardioOptional
                ? 'Cardio heute optional – wenn du Lust hast: 30 Min Zone-2 + Mobility.'
                : '30–40 Min Zone-2 Cardio gefolgt von Mobility. Locker, du kannst noch reden.'}
              {cardioDoneToday && !mobilityDoneToday && (
                <div className="mt-2 font-mono text-xs text-white/80">✓ Cardio erledigt – jetzt Mobility</div>
              )}
            </div>
          )}

          {!isRest && !doneToday && (
            <button onClick={handleStart} className="w-full bg-zinc-950 text-white font-display text-2xl py-4 rounded-xl flex items-center justify-center gap-3">
              <Play className="w-6 h-6 fill-current" />
              TRAINING STARTEN
            </button>
          )}

          {doneToday && !isRest && (
            <div className="bg-zinc-950/50 border border-white/20 text-white py-3 px-4 rounded-xl flex items-center gap-2 font-mono text-sm">
              <Check className="w-5 h-5" /> Heute schon erledigt. Gut gemacht.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <TrendingUp className="w-5 h-5 text-red-500 mb-2" />
          <div className="font-display text-3xl">{totalWorkouts}</div>
          <div className="font-mono text-xs text-zinc-500 uppercase">Workouts gesamt</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <Flame className="w-5 h-5 text-orange-500 mb-2" />
          <div className="font-display text-3xl">{lastWeek}</div>
          <div className="font-mono text-xs text-zinc-500 uppercase">Diese Woche</div>
        </div>
      </div>

      <GoldenRules />

      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Anderes Training starten</div>
        <div className="space-y-2">
          {[...new Set(PLAN && Object.keys(PLAN).filter(k => k !== 'rest' && k !== 'cardio' && k !== 'cardio_optional' && PLAN[k]?.exercises?.length > 0))].map(k => (
            <button key={k} onClick={() => onPickOther(k)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="bg-zinc-950 rounded-lg p-2">
                  <Dumbbell className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="font-display text-xl flex items-center gap-2">
                    {PLAN[k].name.toUpperCase()}
                    {k === todayKey && <span className="text-xs text-red-400 font-mono">(HEUTE)</span>}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">{PLAN[k].exercises.length} Übungen</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          ))}

          {/* Cardio as a workout option */}
          <button onClick={onStartCardio} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-zinc-950 rounded-lg p-2">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="font-display text-xl flex items-center gap-2">
                  CARDIO
                  {isAnyCardio && <span className="text-xs text-red-400 font-mono">(HEUTE)</span>}
                </div>
                <div className="font-mono text-xs text-zinc-500">30–40 Min locker · Zone-2 oder HIIT</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>

          {/* Mobility as a workout option */}
          <button onClick={onStartMobility} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-zinc-950 rounded-lg p-2">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="font-display text-xl">MOBILITY</div>
                <div className="font-mono text-xs text-zinc-500">Fokus wählen &amp; abhaken</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>

          {/* Freies Training */}
          <button onClick={onLogCustom} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-zinc-950 rounded-lg p-2">
                <Plus className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <div className="font-display text-xl">FREIES TRAINING</div>
                <div className="font-mono text-xs text-zinc-500">Fußball, Schwimmen, etc.</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      </div>

    </div>
  );
}

function CustomWorkoutModal({ onSave, onClose }) {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const SUGGESTIONS = ['Fußball', 'Basketball', 'Schwimmen', 'Fahrrad', 'Joggen', 'Tennis', 'Kampfsport', 'Yoga'];

  const handleSave = async () => {
    if (!workoutName.trim()) return;
    setSaving(true);
    await onSave({ name: workoutName.trim(), duration: parseInt(duration) || 0 });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div className="bg-zinc-900 w-full rounded-t-2xl p-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl text-zinc-100">FREIES TRAINING</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-4">
          <label className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Was hast du gemacht?</label>
          <input
            type="text"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder="z.B. Fußball"
            autoFocus
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-display text-zinc-100 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setWorkoutName(s)}
              className="bg-zinc-800 hover:bg-zinc-700 rounded-full px-3 py-1 font-mono text-xs text-zinc-300">
              {s}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Dauer (Minuten, optional)</label>
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="z.B. 60"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-display text-zinc-100 focus:border-red-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!workoutName.trim() || saving}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-display text-xl py-4 rounded-xl">
          {saving ? 'SPEICHERN...' : 'EINTRAGEN'}
        </button>
      </div>
    </div>
  );
}

// ── Wake Lock: keeps screen on during active training ────────────────────────
function useWakeLock() {
  const ref = useRef(null);
  useEffect(() => {
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) ref.current = await navigator.wakeLock.request('screen');
      } catch (_) {}
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      ref.current?.release().catch(() => {});
    };
  }, []);
}

// ── Notification helpers ──────────────────────────────────────────────────────
async function requestNotifPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default')
      await Notification.requestPermission();
  } catch (_) {}
}

async function scheduleRestNotification(endAt) {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'SCHEDULE_NOTIFICATION', id: 'rest-timer', endAt, title: 'Pause vorbei!', body: 'Nächster Satz – los geht\'s 💪' });
  } catch (_) {}
}

async function cancelRestNotification() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CANCEL_NOTIFICATION', id: 'rest-timer' });
  } catch (_) {}
}

function WorkoutScreen({ workout, setWorkout, lastWeights, onFinish, onCancel, showToast, user }) {
  const { plan, exerciseIdx, setIdx, logs } = workout;
  const exercise = plan.exercises[exerciseIdx];
  const totalSets = exercise.sets;

  // Update live status when exercise changes
  useEffect(() => {
    if (user) {
      setLiveStatus(user.id, plan.name, `Übung ${exerciseIdx + 1}/${plan.exercises.length}`);
    }
  }, [exerciseIdx, user]);

  useWakeLock();
  useEffect(() => { requestNotifPermission(); }, []);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [restEndAt, setRestEndAt] = useState(null); // timestamp when pause ends
  const [restDisplay, setRestDisplay] = useState(0); // seconds shown in UI
  const [restRunning, setRestRunning] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(workout.notes || '');
  const [skippedNames, setSkippedNames] = useState(workout.skippedExercises || []);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [celebrating, setCelebrating] = useState(null); // { message, nextWorkout, nextExerciseName }
  const lastDrinkRef = useRef(Date.now());
  const restRef = useRef(null);
  const restFiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastDrinkRef.current > 15 * 60 * 1000) {
        showToast('Trink etwas Wasser 💧', 'drink');
        lastDrinkRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Timestamp-based rest timer — survives background/lock
  useEffect(() => {
    if (!restRunning || !restEndAt) return;
    restFiredRef.current = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
      setRestDisplay(remaining);
      if (remaining === 0 && !restFiredRef.current) {
        restFiredRef.current = true;
        setRestRunning(false);
        setRestEndAt(null);
        showToast('Pause vorbei – nächster Satz!', 'info');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        cancelRestNotification();
      }
    };
    tick();
    restRef.current = setInterval(tick, 250);
    return () => clearInterval(restRef.current);
  }, [restRunning, restEndAt]);

  useEffect(() => {
    if (lastWeights[exercise.name] && !weight) {
      setWeight(String(lastWeights[exercise.name]));
    }
  }, [exerciseIdx]);

  const logSet = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    if (!weight || !reps) {
      showToast('Gewicht und Wdh. eingeben', 'info');
      return;
    }
    const newLogs = [...logs];
    newLogs[exerciseIdx].sets.push({ weight: parseFloat(weight), reps: parseInt(reps) });

    const isLastSet = setIdx + 1 >= totalSets;
    const isLastExercise = exerciseIdx + 1 >= plan.exercises.length;

    if (isLastSet && isLastExercise) {
      onFinish(newLogs, { notes, skippedExercises: skippedNames });
      return;
    }
    if (isLastSet) {
      // Show celebration before advancing to next exercise
      const msg = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
      const nextEx = plan.exercises[exerciseIdx + 1];
      setCelebrating({
        message: msg,
        nextExerciseName: nextEx?.name,
        nextWorkout: { ...workout, logs: newLogs, exerciseIdx: exerciseIdx + 1, setIdx: 0 },
      });
      setReps(''); setWeight('');
    } else {
      setWorkout({ ...workout, logs: newLogs, setIdx: setIdx + 1 });
      setReps('');
      const endAt = Date.now() + exercise.restSec * 1000;
      setRestEndAt(endAt);
      setRestDisplay(exercise.restSec);
      setRestRunning(true);
      scheduleRestNotification(endAt);
    }
  };

  const skipExercise = () => {
    const newSkipped = [...skippedNames, exercise.name];
    setSkippedNames(newSkipped);
    setSkipConfirm(false);

    const isLastExercise = exerciseIdx + 1 >= plan.exercises.length;
    if (isLastExercise) {
      // If last exercise: finish if there's any logged data, else just cancel
      const hasAnyData = logs.some(l => l.sets.length > 0);
      if (hasAnyData) {
        onFinish(logs, { notes, skippedExercises: newSkipped });
      } else {
        showToast('Keine Daten erfasst', 'info');
        onCancel();
      }
      return;
    }

    setWorkout({ ...workout, exerciseIdx: exerciseIdx + 1, setIdx: 0 });
    setReps(''); setWeight('');
    setRestRunning(false);
    setRestEndAt(null); setRestDisplay(0);
    cancelRestNotification();
    window.scrollTo({ top: 0, behavior: 'instant' });
    showToast(`${exercise.name} übersprungen`, 'info');
  };

  const onCelebrationDone = () => {
    setWorkout(celebrating.nextWorkout);
    setCelebrating(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const skipRest = () => { setRestRunning(false); setRestEndAt(null); setRestDisplay(0); cancelRestNotification(); };
  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const completedSets = logs[exerciseIdx].sets;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div className="w-6"></div>
        <div className="font-mono text-xs text-zinc-500">Übung {exerciseIdx + 1} / {plan.exercises.length}</div>
        <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
      </div>

      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${((exerciseIdx + setIdx/totalSets) / plan.exercises.length) * 100}%` }} />
      </div>

      {/* Notes drawer */}
      {notesOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Notiz zum Training</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="z.B. Knie zwickt, Gewicht nächstes Mal +2,5 kg..."
            rows={3}
            autoFocus
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={() => setNotesOpen(false)} className="font-mono text-xs text-zinc-500 hover:text-zinc-300">
              schließen
            </button>
          </div>
        </div>
      )}

      {/* Skip-confirm dialog */}
      {skipConfirm && (
        <div className="fixed inset-0 bg-zinc-950/95 z-40 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full">
            <div className="font-display text-2xl text-zinc-100 mb-2">ÜBUNG ÜBERSPRINGEN?</div>
            <div className="text-sm text-zinc-400 mb-5">
              "{exercise.name}" wird im Verlauf als übersprungen markiert.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSkipConfirm(false)}
                className="flex-1 bg-zinc-800 text-zinc-300 font-mono text-sm py-3 rounded-lg">
                Abbrechen
              </button>
              <button onClick={skipExercise}
                className="flex-1 bg-orange-600 text-white font-mono text-sm py-3 rounded-lg flex items-center justify-center gap-2">
                <Forward className="w-4 h-4" /> Überspringen
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrating && (
        <CelebrationOverlay
          message={celebrating.message}
          nextExercise={celebrating.nextExerciseName}
          onDone={onCelebrationDone}
        />
      )}

      {restRunning && (
        <div className="fixed inset-0 bg-zinc-950/95 z-40 flex flex-col items-center justify-center p-4">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-4">Pause</div>
          <div className="font-display text-9xl text-red-500 mb-8">{fmt(restDisplay)}</div>
          <div className="text-zinc-400 mb-8 text-center">Nächster Satz: <span className="text-zinc-100 font-bold">{exercise.name}</span></div>
          <div className="flex gap-3">
            <button onClick={() => { const newEnd = (restEndAt || Date.now()) + 30000; setRestEndAt(newEnd); scheduleRestNotification(newEnd); }} className="bg-zinc-800 px-5 py-3 rounded-xl font-mono text-sm">+30s</button>
            <button onClick={skipRest} className="bg-red-600 px-6 py-3 rounded-xl font-mono text-sm flex items-center gap-2">
              <SkipForward className="w-4 h-4" /> Weiter
            </button>
          </div>
        </div>
      )}

      <div className="flex-1">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">{plan.name}</div>
        <h2 className="font-display text-5xl text-zinc-100 leading-none mb-3">{exercise.name.toUpperCase()}</h2>
        <div className="text-zinc-400 mb-8 italic">{exercise.hint}</div>

        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="font-mono text-xs text-zinc-500 uppercase">Aktueller Satz</div>
              <div className="font-display text-4xl text-red-500">{setIdx + 1} <span className="text-zinc-600 text-2xl">/ {totalSets}</span></div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-zinc-500 uppercase">Ziel</div>
              <div className="font-display text-3xl">{exercise.reps} <span className="text-base text-zinc-500">Wdh.</span></div>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            {Array.from({ length: totalSets }).map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${i < completedSets.length ? 'bg-green-500' : i === setIdx ? 'bg-red-500' : 'bg-zinc-800'}`} />
            ))}
          </div>
          {lastWeights[exercise.name] && (
            <div className="font-mono text-xs text-zinc-500 mt-3">
              Letztes Mal: <span className="text-zinc-300">{lastWeights[exercise.name]} kg</span>
            </div>
          )}
        </div>

        {completedSets.length > 0 && (
          <div className="mb-6">
            <div className="font-mono text-xs text-zinc-500 uppercase mb-2">Erledigt</div>
            <div className="space-y-1">
              {completedSets.map((s, i) => (
                <div key={i} className="bg-zinc-900/50 rounded-lg px-4 py-2 flex justify-between text-sm font-mono">
                  <span className="text-zinc-500">Satz {i+1}</span>
                  <span className="text-zinc-300">{s.weight} kg × {s.reps}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-4">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Was hast du gemacht?</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="font-mono text-xs text-zinc-500 block mb-1">Gewicht (kg)</label>
              <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-2xl font-display text-zinc-100 focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="font-mono text-xs text-zinc-500 block mb-1">Wiederholungen</label>
              <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} placeholder="0"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-2xl font-display text-zinc-100 focus:border-red-500 focus:outline-none" />
            </div>
          </div>
          <button onClick={logSet} className="w-full bg-red-600 text-white font-display text-xl py-4 rounded-xl flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> SATZ EINTRAGEN
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Pause: {fmt(exercise.restSec)}</div>
          <div className="flex items-center gap-2"><Droplet className="w-4 h-4" /> Trinken nicht vergessen</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => setNotesOpen(!notesOpen)}
            className={`bg-zinc-900 hover:bg-zinc-800 border rounded-lg py-2.5 font-mono text-xs flex items-center justify-center gap-2 ${
              notes ? 'border-yellow-600/50 text-yellow-400' : 'border-zinc-800 text-zinc-400'
            }`}>
            <StickyNote className="w-3 h-3" /> {notes ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
          </button>
          <button onClick={() => setSkipConfirm(true)}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono text-xs py-2.5 rounded-lg flex items-center justify-center gap-2">
            <Forward className="w-3 h-3" /> Übung überspringen
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ history }) {
  const entries = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!entries || entries.length === 0) {
    return (
      <div className="pt-8">
        <div className="mb-6">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Dein</div>
          <h1 className="font-display text-5xl text-zinc-100 leading-none">VERLAUF</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Dumbbell className="w-12 h-12 text-zinc-700 mb-4" />
          <div className="font-display text-xl text-zinc-500 mb-2">Noch kein Training</div>
          <div className="font-mono text-xs text-zinc-600">Starte dein erstes Workout auf dem Heute-Tab.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Trainings-Verlauf</div>
        <h1 className="font-display text-5xl text-zinc-100">HISTORY</h1>
      </div>
      <div className="space-y-3">
        {entries.map((e, i) => (
          <div key={i} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl leading-tight">{e.planName.toUpperCase()}</div>
                <div className="font-mono text-xs text-zinc-500">{new Date(e.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
              </div>
              {formatDuration(e.duration) && (
                <div className="text-right shrink-0">
                  <div className="font-display text-xl text-red-500 leading-tight">{formatDuration(e.duration)}</div>
                </div>
              )}
            </div>
            {e.isCardio ? (
              <div className="flex items-center gap-2 text-sm font-mono text-zinc-400 pt-2 border-t border-zinc-800/50">
                <Heart className="w-4 h-4 text-red-500" /> {formatDuration(e.duration) || '—'} Cardio absolviert
              </div>
            ) : e.isMobility ? (
              <div className="flex items-center gap-2 text-sm font-mono text-zinc-400 pt-2 border-t border-zinc-800/50">
                <Activity className="w-4 h-4 text-emerald-500" /> {e.completed} / {e.total} Mobility-Übungen
              </div>
            ) : (
              <div className="space-y-1">
                {e.logs.filter(l => l.sets.length > 0).map((l, j) => {
                  const heaviest = Math.max(...l.sets.map(s => s.weight));
                  return (
                    <div key={j} className="flex justify-between text-sm font-mono py-1 border-t border-zinc-800/50">
                      <span className="text-zinc-400">{l.name}</span>
                      <span className="text-zinc-200">{l.sets.length} × {heaviest} kg</span>
                    </div>
                  );
                })}
                {e.skippedExercises && e.skippedExercises.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/50 mt-2">
                    <div className="font-mono text-xs text-orange-400 mb-1 flex items-center gap-1">
                      <Forward className="w-3 h-3" /> Übersprungen
                    </div>
                    {e.skippedExercises.map((name, i) => (
                      <div key={i} className="font-mono text-xs text-zinc-500">{name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {e.notes && (
              <div className="mt-3 pt-3 border-t border-zinc-800/50 flex gap-2">
                <StickyNote className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 italic flex-1">{e.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanScreen({ plan: PLAN, schedule }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Übersicht</div>
        <h1 className="font-display text-5xl text-zinc-100">DER PLAN</h1>
      </div>
      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase mb-3">Wochenstruktur</div>
        <div className="space-y-1 font-mono text-sm">
          {[
            ['Mo', schedule[1]],
            ['Di', schedule[2]],
            ['Mi', schedule[3]],
            ['Do', schedule[4]],
            ['Fr', schedule[5]],
            ['Sa', schedule[6]],
            ['So', schedule[0]],
          ].map(([d, key]) => (
            <div key={d} className="flex justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
              <span className="text-zinc-500">{d}</span>
              <span className="text-zinc-200">{PLAN[key]?.name || key}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 mb-6">
        {['push', 'pull', 'legs', 'aesthetic'].map(k => (
          <div key={k} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)} className="w-full p-5 flex items-center justify-between">
              <div className="text-left">
                <div className="font-display text-2xl">{PLAN[k].name.toUpperCase()}</div>
                <div className="font-mono text-xs text-zinc-500">{PLAN[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-5 pb-5 space-y-2 border-t border-zinc-800 pt-4">
                {PLAN[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-baseline py-1.5">
                    <div>
                      <div className="text-zinc-200 text-sm">{ex.name}</div>
                      <div className="text-zinc-500 text-xs italic">{ex.hint}</div>
                    </div>
                    <div className="font-mono text-xs text-red-500 whitespace-nowrap ml-3">{ex.sets} × {ex.reps}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Cardio */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 gap-4">
          <div className="flex items-center gap-3 mb-3">
            <Heart className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="font-display text-2xl text-zinc-100">CARDIO</div>
          </div>
          <div className="space-y-2 font-mono text-xs text-zinc-400">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 flex-shrink-0">Zone-2</span>
              <span>30–40 Min locker – du kannst noch reden, konstantes Tempo</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 flex-shrink-0">HIIT</span>
              <span>Intervalle – kurze Belastungsspitzen, dann Erholung</span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <div className="font-mono text-xs text-red-500 uppercase mb-2">Ernährung Cut</div>
        <div className="space-y-1 font-mono text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Kalorien</span><span>2.200–2.400 kcal</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Protein</span><span>180–200 g</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Fett</span><span>70–80 g</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Carbs</span><span>200–250 g</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Wasser</span><span>3–4 L</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Schritte</span><span>8–10k</span></div>
        </div>
      </div>
    </div>
  );
}

function CardioScreen({ onFinish, onCancel, showToast, user, combinedFlow }) {
  useWakeLock();

  const [type, setType] = useState('zone2'); // 'zone2' | 'hiit'
  const [targetMin, setTargetMin] = useState(30);
  const [elapsed, setElapsed] = useState(0); // seconds, display only
  const [running, setRunning] = useState(false);
  const lastDrinkRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const startAtRef = useRef(null);     // timestamp when current run-period began
  const accumulatedRef = useRef(0);   // seconds accumulated before current period
  const targetReachedRef = useRef(false);

  // Set live status when running starts
  useEffect(() => {
    if (running && user) {
      const typeName = type === 'hiit' ? 'HIIT Cardio' : 'Zone-2 Cardio';
      setLiveStatus(user.id, typeName, `${Math.floor(elapsed / 60)} / ${targetMin} Min`);
    }
  }, [running, Math.floor(elapsed / 60), type, targetMin, user]);

  // Timestamp-based tick — survives background/lock
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(accumulatedRef.current + Math.floor((Date.now() - startAtRef.current) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Drink reminder every 10 min during cardio
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (Date.now() - lastDrinkRef.current > 10 * 60 * 1000) {
        showToast('Trink etwas Wasser 💧', 'drink');
        lastDrinkRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [running]);

  // Notify when target reached (use ref to fire only once per target)
  useEffect(() => { targetReachedRef.current = false; }, [targetMin]);
  useEffect(() => {
    if (running && elapsed >= targetMin * 60 && !targetReachedRef.current) {
      targetReachedRef.current = true;
      showToast(`${targetMin} Min erreicht – stark!`, 'check');
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    }
  }, [elapsed, targetMin, running]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const progress = Math.min((elapsed / (targetMin * 60)) * 100, 100);
  const reachedTarget = elapsed >= targetMin * 60;

  const handleFinish = () => {
    const min = Math.max(1, Math.round(elapsed / 60));
    const typeName = type === 'hiit' ? 'HIIT Cardio' : 'Zone-2 Cardio';
    onFinish(min, typeName);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div className="w-6"></div>
        <div className="font-mono text-xs text-zinc-500">CARDIO</div>
        <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
      </div>

      {!running && elapsed === 0 && (
        <div className="flex-1 flex flex-col">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Vorbereitung</div>
          <h2 className="font-display text-5xl text-zinc-100 leading-none mb-8">CARDIO<br/><span className="text-red-500">SETUP</span></h2>

          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-4">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Typ</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setType('zone2'); setTargetMin(35); }}
                className={`p-4 rounded-lg border ${type === 'zone2' ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                <Heart className="w-5 h-5 mx-auto mb-2" />
                <div className="font-display text-lg">ZONE 2</div>
                <div className="font-mono text-xs opacity-75">locker, 30–40 Min</div>
              </button>
              <button onClick={() => { setType('hiit'); setTargetMin(15); }}
                className={`p-4 rounded-lg border ${type === 'hiit' ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                <Flame className="w-5 h-5 mx-auto mb-2" />
                <div className="font-display text-lg">HIIT</div>
                <div className="font-mono text-xs opacity-75">intensiv, 10–15 Min</div>
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-6">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Ziel-Dauer</div>
            <div className="flex gap-2">
              {(type === 'zone2' ? [30, 35, 40, 45] : [10, 15, 20]).map(m => (
                <button key={m} onClick={() => setTargetMin(m)}
                  className={`flex-1 py-3 rounded-lg border font-display text-xl ${targetMin === m ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                  {m}<span className="text-xs ml-1 opacity-75">min</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { startAtRef.current = Date.now(); accumulatedRef.current = 0; setRunning(true); }}
            className="w-full bg-red-600 text-white font-display text-2xl py-5 rounded-xl flex items-center justify-center gap-3">
            <Play className="w-6 h-6 fill-current" /> LOS GEHT'S
          </button>

          <div className="mt-6 text-zinc-500 text-sm font-mono text-center">
            {type === 'zone2'
              ? 'Tempo so, dass du noch reden könntest. HF ~120–140.'
              : '30 Sek volle Power / 60 Sek Pause × Runden.'}
          </div>
        </div>
      )}

      {(running || elapsed > 0) && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-4">
            {type === 'hiit' ? 'HIIT Cardio' : 'Zone-2 Cardio'} · Ziel {targetMin} Min
          </div>

          <div className="font-display text-8xl text-zinc-100 mb-2 tabular-nums">{fmt(elapsed)}</div>

          {reachedTarget && (
            <div className="font-mono text-sm text-green-500 mb-4 flex items-center gap-2">
              <Check className="w-4 h-4" /> Ziel erreicht – kannst weitermachen oder beenden
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-xs h-2 bg-zinc-900 rounded-full overflow-hidden mb-12">
            <div className={`h-full transition-all ${reachedTarget ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
          </div>

          <div className="flex gap-3 mb-6">
            {running ? (
              <button onClick={() => { accumulatedRef.current += Math.floor((Date.now() - startAtRef.current) / 1000); startAtRef.current = null; setRunning(false); }}
                className="bg-zinc-800 px-6 py-3 rounded-xl font-mono text-sm flex items-center gap-2">
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button onClick={() => { startAtRef.current = Date.now(); setRunning(true); }}
                className="bg-zinc-800 px-6 py-3 rounded-xl font-mono text-sm flex items-center gap-2">
                <Play className="w-4 h-4" /> Weiter
              </button>
            )}
            <button onClick={handleFinish}
              className="bg-red-600 px-6 py-3 rounded-xl font-mono text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> {combinedFlow ? 'WEITER ZU MOBILITY' : 'FERTIG'}
            </button>
          </div>

          <div className="text-zinc-500 text-xs font-mono flex items-center gap-2">
            <Droplet className="w-4 h-4" /> Erinnerung alle 10 Min
          </div>
          {combinedFlow && (
            <div className="text-zinc-500 text-xs font-mono mt-2">
              Als Nächstes: Mobility – Ganzkörper
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobilityScreen({ onFinish, onCancel, user, combinedFlow }) {
  const [focus, setFocus] = useState(combinedFlow ? 'fullbody' : null);
  const [done, setDone] = useState({});
  const [openIdx, setOpenIdx] = useState(0);

  // Set live status when focus is selected
  useEffect(() => {
    if (focus && user) {
      const program = MOBILITY[focus];
      const completed = Object.values(done).filter(Boolean).length;
      setLiveStatus(user.id, `Mobility – ${program.name}`, `${completed}/${program.exercises.length}`);
    }
  }, [focus, done, user]);

  const toggleDone = (idx) => {
    const next = { ...done, [idx]: !done[idx] };
    setDone(next);
    // Auto-open next undone
    if (!done[idx]) {
      const program = MOBILITY[focus];
      const nextIdx = program.exercises.findIndex((_, i) => i > idx && !next[i]);
      if (nextIdx !== -1) setOpenIdx(nextIdx);
    }
  };

  const handleFinish = () => {
    const program = MOBILITY[focus];
    const completed = Object.values(done).filter(Boolean).length;
    onFinish(focus, completed, program.exercises.length);
  };

  // Focus selection screen
  if (!focus) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div className="w-6"></div>
          <div className="font-mono text-xs text-zinc-500">MOBILITY</div>
          <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
        </div>

        <div className="mb-6">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Fokus wählen</div>
          <h2 className="font-display text-5xl text-zinc-100 leading-none">WAS<br/><span className="text-emerald-500">MOBILISIEREN?</span></h2>
        </div>

        <div className="space-y-2">
          {Object.entries(MOBILITY).map(([key, prog]) => (
            <button key={key} onClick={() => setFocus(key)}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 text-left transition-colors">
              <div className="text-3xl">{prog.icon}</div>
              <div className="flex-1">
                <div className="font-display text-xl text-zinc-100">{prog.name.toUpperCase()}</div>
                <div className="font-mono text-xs text-zinc-500">{prog.description}</div>
                <div className="font-mono text-xs text-emerald-500 mt-1">{prog.exercises.length} Übungen</div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Exercise list screen
  const program = MOBILITY[focus];
  const completedCount = Object.values(done).filter(Boolean).length;
  const totalCount = program.exercises.length;
  const allDone = completedCount === totalCount;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div className="w-6"></div>
        <div className="font-mono text-xs text-zinc-500">{completedCount} / {totalCount}</div>
        <button onClick={() => setFocus(null)} className="text-zinc-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
      </div>

      <div className="mb-6">
        <div className="font-mono text-xs text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
          <span>{program.icon}</span> MOBILITY · {program.name.toUpperCase()}
        </div>
        <h2 className="font-display text-4xl text-zinc-100 leading-none">{program.name.toUpperCase()}<br/><span className="text-emerald-500">FLOW</span></h2>
      </div>

      <div className="space-y-3 mb-6">
        {program.exercises.map((ex, idx) => {
          const isDone = !!done[idx];
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={`rounded-xl border overflow-hidden transition-colors ${isDone ? 'bg-emerald-950/30 border-emerald-800/50' : 'bg-zinc-900 border-zinc-800'}`}>
              <button onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                className="w-full p-4 flex items-center gap-3 text-left">
                <div onClick={(e) => { e.stopPropagation(); toggleDone(idx); }}
                  className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                  {isDone && <Check className="w-4 h-4 text-zinc-950" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-display text-lg leading-tight ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                    {ex.name.toUpperCase()}
                  </div>
                  <div className="font-mono text-xs text-emerald-500/80">{ex.duration}</div>
                </div>
                <ChevronRight className={`w-5 h-5 text-zinc-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                  <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2 mt-3">Anleitung</div>
                  <ol className="space-y-2">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                        <span className="font-mono text-emerald-500 flex-shrink-0 mt-0.5">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {!isDone && (
                    <button onClick={() => toggleDone(idx)}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-sm py-2.5 rounded-lg flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> ALS ERLEDIGT MARKIEREN
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleFinish}
        className={`w-full font-display text-xl py-4 rounded-xl flex items-center justify-center gap-2 transition-colors ${
          allDone ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
        }`}>
        <Check className="w-5 h-5" />
        {allDone ? 'KOMPLETT FERTIG' : `BEENDEN (${completedCount}/${totalCount})`}
      </button>

      <div className="mt-4 text-zinc-500 text-xs font-mono text-center">
        Mobility ist kein Sprint – atme tief und nimm dir Zeit.
      </div>
    </div>
  );
}

// ===== ONBOARDING =====
const ONBOARDING_KEY = 'onboarding_progress';

function saveOnboardingProgress(data) {
  try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data)); } catch {}
}
function loadOnboardingProgress() {
  try { return JSON.parse(localStorage.getItem(ONBOARDING_KEY)) || {}; } catch { return {}; }
}
function clearOnboardingProgress() {
  try { localStorage.removeItem(ONBOARDING_KEY); } catch {}
}

function OnboardingScreen({ onComplete }) {
  const saved = loadOnboardingProgress();
  const [step, setStepRaw] = useState(saved.step || 'name');
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
  const setStep = (v) => { setStepRaw(v); saveOnboardingProgress({ ...loadOnboardingProgress(), step: v }); };
  const setName = (v) => { setNameRaw(v); saveOnboardingProgress({ ...loadOnboardingProgress(), name: v }); };
  const setPlanText = (v) => { setPlanTextRaw(v); saveOnboardingProgress({ ...loadOnboardingProgress(), planText: v }); };
  const setParsedPlan = (v) => { setParsedPlanRaw(v); saveOnboardingProgress({ ...loadOnboardingProgress(), parsedPlan: v }); };
  const setCoachMessages = (v) => { setCoachMessagesRaw(v); saveOnboardingProgress({ ...loadOnboardingProgress(), coachMessages: v }); };

  const handleNameSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Bitte mindestens 2 Zeichen.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const existing = await findUserByName(trimmed);
      if (existing) {
        const lastDate = await getLastWorkoutDate(existing.id);
        setFoundUser(existing);
        setLastWorkout(lastDate);
        setStep('confirm');
      } else {
        // New user → ask for avatar
        setStep('avatar');
      }
    } catch (e) {
      console.error(e);
      setError('Fehler – nochmal versuchen');
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

  const finishCreation = async (skipAvatar = false, planToSave = null) => {
    setBusy(true);
    setError('');
    try {
      // 1. Create user first (without avatar)
      const newUser = await createUser(name.trim(), null);

      // 2. Upload avatar with real userId
      if (!skipAvatar && avatarFile) {
        try {
          const url = await uploadAvatar(newUser.id, avatarFile);
          await updateUserAvatar(newUser.id, url);
          newUser.avatar_url = url;
        } catch (e) {
          console.error('Avatar upload failed:', e);
        }
      }

      // 3. Save custom plan if user picked one
      if (planToSave) {
        try {
          await saveUserPlan(newUser.id, planToSave);
        } catch (e) {
          console.error('Plan save failed:', e);
          setError('Plan konnte nicht gespeichert werden – Default wird genutzt.');
          // Continue anyway, user is created
        }
      }

      clearOnboardingProgress();
      onComplete(newUser);
    } catch (e) {
      console.error(e);
      setError('Konto konnte nicht erstellt werden – nochmal versuchen');
    } finally {
      setBusy(false);
    }
  };

  const goToPlanStep = () => {
    setStep('plan');
  };

  const useDefaultPlan = () => {
    finishCreation(false, null);
  };

  const submitPlanText = async () => {
    if (planText.trim().length < 30) {
      setError('Plan zu kurz – beschreibe ihn etwas detaillierter.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const plan = await parsePlanText(planText);
      setParsedPlan(plan);
      setStep('plan-review');
    } catch (e) {
      console.error(e);
      setError('Plan konnte nicht verarbeitet werden. Versuche es nochmal oder formatiere klarer.');
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
        // Auto-forward to review after a short delay so user sees the message
        setTimeout(() => setStep('plan-review'), 800);
      }
    } catch (e) {
      console.error(e);
      setCoachMessages([...newMessages, { role: 'assistant', content: 'Fehler – nochmal versuchen.' }]);
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

  const confirmExisting = () => { clearOnboardingProgress(); onComplete(foundUser); };
  const reject = () => {
    setFoundUser(null);
    setLastWorkout(null);
    setName('');
    setStep('name');
  };

  if (step === 'plan-coach') {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#09090b', color: '#f4f4f5' }}>
        <div style={{ flex: 1, maxWidth: '448px', margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CoachOnboardingChat
            messages={coachMessages}
            input={coachInput}
            setInput={setCoachInput}
            onSend={handleCoachSend}
            busy={busy}
            parsedPlan={parsedPlan}
            onPlanReady={() => setStep('plan-review')}
            onBack={() => setStep('plan')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 grain relative safe-top safe-bottom flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center pb-20">
        <div className="mb-12">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Willkommen bei</div>
          <h1 className="font-display text-7xl text-zinc-100 leading-none">LION<br/><span className="text-red-500">KINGS</span></h1>
        </div>

        {step === 'name' && (
          <>
            <div className="mb-8">
              <label className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3 block">Wie heißt du?</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Dein Name"
                autoFocus
                disabled={busy}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-2xl font-display text-zinc-100 focus:border-red-500 focus:outline-none"
              />
              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400 font-mono">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
            </div>
            <button
              onClick={handleNameSubmit}
              disabled={busy || name.trim().length < 2}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-display text-2xl py-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
            >
              {busy ? 'MOMENT...' : 'WEITER'}
            </button>
            <div className="mt-8 text-zinc-500 text-xs font-mono text-center leading-relaxed">
              Dein Name wird auf diesem Gerät gespeichert.<br/>
              Andere Freunde sehen deine Trainings im Dashboard.
            </div>
          </>
        )}

        {step === 'avatar' && (
          <>
            <div className="mb-6">
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Hi, {name}</div>
              <div className="font-display text-3xl text-zinc-100 leading-tight mb-2">Profilbild</div>
              <div className="text-sm text-zinc-400">Optional – kannst du später auch hinzufügen.</div>
            </div>

            <div className="flex flex-col items-center mb-6">
              {avatarPreview ? (
                <div className="relative mb-4">
                  <img src={avatarPreview} alt="Vorschau"
                    className="w-32 h-32 rounded-full object-cover ring-4 ring-red-500 ring-offset-4 ring-offset-zinc-950" />
                  <button onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-700 rounded-full p-1.5 hover:bg-zinc-800">
                    <X className="w-4 h-4 text-zinc-300" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-zinc-700" />
                </div>
              )}

              <label className="cursor-pointer w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
                <Camera className="w-5 h-5 text-zinc-300" />
                <span className="font-mono text-sm text-zinc-200">{avatarPreview ? 'Anderes Foto wählen' : 'Foto wählen'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              </label>
            </div>

            {error && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-400 font-mono">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              onClick={goToPlanStep}
              disabled={busy}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-display text-2xl py-4 rounded-xl flex items-center justify-center gap-3 transition-colors mb-2"
            >
              {busy ? 'MOMENT...' : avatarPreview ? 'WEITER' : 'OHNE BILD WEITER'}
            </button>

            {avatarPreview && (
              <button onClick={() => { removeAvatar(); goToPlanStep(); }} disabled={busy}
                className="w-full text-zinc-500 hover:text-zinc-300 font-mono text-sm py-2">
                überspringen
              </button>
            )}
          </>
        )}

        {step === 'plan' && (
          <>
            <div className="mb-6">
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Hi, {name}</div>
              <div className="font-display text-3xl text-zinc-100 leading-tight mb-2">Dein Trainingsplan</div>
              <div className="text-sm text-zinc-400">Wähle wie du loslegen willst.</div>
            </div>

            <div className="space-y-3">
              <button onClick={useDefaultPlan} disabled={busy}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 text-left transition-colors">
                <div className="bg-red-600/20 rounded-lg p-2">
                  <Dumbbell className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg text-zinc-100">DEFAULT-PLAN</div>
                  <div className="font-mono text-xs text-zinc-500">Bewährter 5-Tage-Split mit Cardio</div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </button>

              <button onClick={() => setStep('plan-text')} disabled={busy}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 text-left transition-colors">
                <div className="bg-blue-600/20 rounded-lg p-2">
                  <StickyNote className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg text-zinc-100">EIGENEN PLAN EINGEBEN</div>
                  <div className="font-mono text-xs text-zinc-500">Freitext einfügen, Lions Coach strukturiert</div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </button>

              <button onClick={() => setStep('plan-coach')} disabled={busy}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 text-left transition-colors">
                <div className="bg-emerald-600/20 rounded-lg p-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg text-zinc-100">VOM COACH ERSTELLEN</div>
                  <div className="font-mono text-xs text-zinc-500">Geführter Chat mit dem Lions Coach</div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-mono">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="mt-6 text-zinc-500 text-xs font-mono text-center">
              Du kannst den Plan später jederzeit ändern.
            </div>
          </>
        )}

        {step === 'plan-text' && (
          <>
            <div className="mb-6">
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">Plan einfügen</div>
              <div className="font-display text-3xl text-zinc-100 leading-tight mb-2">Dein Plan als Text</div>
              <div className="text-sm text-zinc-400">
                Füge deinen Plan als Freitext ein – Übungen, Sätze, Wiederholungen.
                Der Lions Coach strukturiert ihn dann automatisch.
              </div>
            </div>

            <textarea
              value={planText}
              onChange={e => setPlanText(e.target.value)}
              placeholder={`z.B.

Mo: Push
Bankdrücken 4x6-8
Schulterdrücken 3x8
Trizeps Pushdown 3x12

Di: Pull
...`}
              rows={10}
              autoFocus
              disabled={busy}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-red-500 focus:outline-none mb-4 font-mono"
            />

            {error && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-400 font-mono">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button onClick={submitPlanText} disabled={busy || planText.trim().length < 30}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-display text-xl py-3 rounded-xl flex items-center justify-center gap-2 mb-2">
              {busy ? 'CLAUDE LIEST...' : 'PLAN VERARBEITEN'}
            </button>

            <button onClick={() => setStep('plan')} disabled={busy}
              className="w-full text-zinc-500 hover:text-zinc-300 font-mono text-sm py-2">
              zurück
            </button>
          </>
        )}


        {step === 'plan-review' && parsedPlan && (
          <PlanReview
            plan={parsedPlan}
            onConfirm={() => finishCreation(false, parsedPlan)}
            onBack={() => setStep('plan')}
            busy={busy}
          />
        )}

        {step === 'confirm' && foundUser && (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Avatar user={foundUser} size="lg" />
                <div className="flex-1">
                  <div className="font-display text-xl text-zinc-100">{foundUser.name.toUpperCase()} EXISTIERT BEREITS</div>
                  <div className="font-mono text-xs text-zinc-500 mt-1">
                    {lastWorkout
                      ? `Letztes Workout: ${new Date(lastWorkout).toLocaleDateString('de-DE')}`
                      : 'Noch kein Workout absolviert'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-zinc-300">Bist du der/die selbe Person?</div>
            </div>

            <button onClick={confirmExisting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-display text-xl py-4 rounded-xl flex items-center justify-center gap-3 mb-3">
              <Check className="w-5 h-5" /> JA, DAS BIN ICH
            </button>

            <button onClick={reject}
              className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-mono text-sm py-3 rounded-xl">
              Nein, anderen Namen wählen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ===== DASHBOARD =====
function DashboardScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [liveStatuses, setLiveStatuses] = useState([]);
  const [feed, setFeed] = useState([]);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState(null); // workoutId
  const [commentInputs, setCommentInputs] = useState({}); // workoutId -> text
  const [allWorkoutsByUser, setAllWorkoutsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');

  const REACTIONS = ['💪', '🔥', '👏', '🦁'];

  const loadTimeoutRef = useRef(null);
  const debouncedLoad = () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(loadAll, 1500);
  };

  const loadAll = async () => {
    try {
      const [allUsers, statuses, feedRows] = await Promise.all([
        getAllUsers(),
        getAllLiveStatuses(),
        getActivityFeed(200),
      ]);
      setUsers(allUsers);
      setLiveStatuses(statuses);
      setFeed(feedRows);

      const ids = feedRows.map(w => w.id);
      const [reactionsMap, commentsMap] = await Promise.all([
        getReactionsForWorkouts(ids),
        getCommentsForWorkouts(ids),
      ]);
      setReactions(reactionsMap);
      setComments(commentsMap);

      const byUser = {};
      feedRows.forEach(w => {
        if (!byUser[w.user_id]) byUser[w.user_id] = [];
        byUser[w.user_id].push(w);
      });
      setAllWorkoutsByUser(byUser);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Realtime: subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, () => debouncedLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, () => debouncedLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => debouncedLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => debouncedLoad())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  const handleReaction = async (workoutId, emoji) => {
    try {
      await toggleReaction(workoutId, user.id, emoji);
      const current = reactions[workoutId] || [];
      const existingIdx = current.findIndex(r => r.user_id === user.id && r.emoji === emoji);
      let newList;
      if (existingIdx >= 0) {
        newList = current.filter((_, i) => i !== existingIdx);
      } else {
        newList = [...current, { user_id: user.id, emoji, users: { id: user.id, name: user.name } }];
      }
      setReactions({ ...reactions, [workoutId]: newList });
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  const handleAddComment = async (workoutId) => {
    const text = (commentInputs[workoutId] || '').trim();
    if (!text) return;
    try {
      const newComment = await addComment(workoutId, user.id, text);
      setComments(prev => ({
        ...prev,
        [workoutId]: [...(prev[workoutId] || []), newComment],
      }));
      setCommentInputs(prev => ({ ...prev, [workoutId]: '' }));
    } catch (e) {
      console.error('Comment error:', e);
    }
  };

  const [lbFilter, setLbFilter] = useState('week');

  const leaderboard = users.map(u => {
    const userWorkouts = allWorkoutsByUser[u.id] || [];
    const now = Date.now();
    const cutoff = lbFilter === 'week'
      ? now - 7 * 24 * 60 * 60 * 1000
      : now - 30 * 24 * 60 * 60 * 1000;
    const filtered = userWorkouts.filter(w => new Date(w.created_at || w.date).getTime() > cutoff);
    const stats = computeUserStats(userWorkouts);
    const status = liveStatuses.find(s => s.user_id === u.id);
    return { user: u, stats, count: filtered.length };
  }).sort((a, b) => b.count - a.count);

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / (1000 * 60 * 60);
    if (diffH < 1) return `vor ${Math.floor(diffH * 60)} Min`;
    if (diffH < 24) return `vor ${Math.floor(diffH)} h`;
    if (diffH < 48) return 'gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return <div className="pt-8 text-zinc-500 font-mono text-sm">Lade Löwen-Daten...</div>;
  }

  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Die Löwen</div>
        <h1 className="font-display text-5xl text-zinc-100 leading-none">CREW<br/><span className="text-red-500">DASHBOARD</span></h1>
      </div>

      {/* Live status section */}
      {liveStatuses.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="font-mono text-xs text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse" /> Live – Gerade aktiv
          </div>
          <div className="space-y-2">
            {liveStatuses.map(s => (
              <div key={s.user_id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar user={s.users} size="md" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base text-zinc-100">{s.users?.name?.toUpperCase()}</div>
                  <div className="font-mono text-xs text-zinc-400 truncate">
                    {s.status} · {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('feed')}
          className={`flex-1 py-2.5 rounded-lg font-display text-sm transition-colors ${
            tab === 'feed' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400'
          }`}>
          ACTIVITY
        </button>
        <button onClick={() => setTab('leaderboard')}
          className={`flex-1 py-2.5 rounded-lg font-display text-sm transition-colors ${
            tab === 'leaderboard' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400'
          }`}>
          LEADERBOARD
        </button>
      </div>

      {tab === 'leaderboard' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setLbFilter('week')}
              className={`flex-1 py-2 rounded-lg font-mono text-xs transition-colors ${
                lbFilter === 'week' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
              }`}>
              WOCHE
            </button>
            <button onClick={() => setLbFilter('month')}
              className={`flex-1 py-2 rounded-lg font-mono text-xs transition-colors ${
                lbFilter === 'month' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
              }`}>
              MONAT
            </button>
          </div>
          <div className="space-y-2">
            {leaderboard.map((row, idx) => {
              const isMe = row.user.id === user.id;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={row.user.id}
                  className={`rounded-xl p-4 flex items-center gap-3 border ${
                    isMe ? 'bg-red-950/30 border-red-800/50' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                  <div className="font-display text-2xl w-8 text-center">
                    {medals[idx] || <span className="text-zinc-600 text-lg">#{idx + 1}</span>}
                  </div>
                  <Avatar user={row.user} size="md" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg text-zinc-100 truncate">
                      {row.user.name.toUpperCase()}
                      {isMe && <span className="ml-2 text-xs text-red-400 font-mono">(DU)</span>}
                    </div>
                    {row.stats.streak > 0 && (
                      <div className="font-mono text-xs text-zinc-500 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" /> {row.stats.streak} Tage Streak
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-2xl text-red-500">{row.count}</div>
                    <div className="font-mono text-xs text-zinc-500">{lbFilter === 'week' ? 'Woche' : 'Monat'}</div>
                  </div>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <div className="text-center text-zinc-500 py-8 font-mono text-sm">Noch keine Daten</div>
            )}
          </div>
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-3">
          {feed.length === 0 && (
            <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
              <Coffee className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <div className="text-zinc-400">Noch keine Aktivität.</div>
              <div className="text-zinc-600 text-sm mt-1 font-mono">Sei der erste – starte ein Training.</div>
            </div>
          )}

          {feed.map(w => {
            const isMe = w.user_id === user.id;
            const wReactions = reactions[w.id] || [];
            const grouped = {};
            wReactions.forEach(r => {
              if (!grouped[r.emoji]) grouped[r.emoji] = [];
              grouped[r.emoji].push(r);
            });

            return (
              <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <Avatar user={w.users} size="sm" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display text-base text-zinc-100 truncate">
                        {w.users?.name?.toUpperCase()}
                        {isMe && <span className="ml-2 text-xs text-red-400 font-mono">(DU)</span>}
                      </div>
                      <div className="font-mono text-xs text-zinc-500 flex-shrink-0">{formatTime(w.created_at)}</div>
                    </div>
                    <div className="font-mono text-xs text-zinc-400 mt-0.5">
                      {w.is_cardio && <Heart className="w-3 h-3 text-red-500 inline mr-1" />}
                      {w.is_mobility && <Activity className="w-3 h-3 text-emerald-500 inline mr-1" />}
                      {!w.is_cardio && !w.is_mobility && <Dumbbell className="w-3 h-3 text-zinc-400 inline mr-1" />}
                      {w.plan_name}{w.duration > 0 && ` · ${w.duration} min`}
                      {w.is_mobility && ` · ${w.completed}/${w.total}`}
                    </div>
                  </div>
                </div>

                {!w.is_cardio && !w.is_mobility && w.logs && w.logs.length > 0 && (
                  <div className="ml-12 mt-2 space-y-0.5">
                    {w.logs.filter(l => l.sets && l.sets.length > 0).slice(0, 3).map((l, i) => {
                      const heaviest = Math.max(...l.sets.map(s => s.weight));
                      return (
                        <div key={i} className="font-mono text-xs text-zinc-500 truncate">
                          <span className="text-zinc-300">{l.name}</span> · {l.sets.length} × {heaviest} kg
                        </div>
                      );
                    })}
                    {w.logs.filter(l => l.sets && l.sets.length > 0).length > 3 && (
                      <div className="font-mono text-xs text-zinc-600">
                        + {w.logs.filter(l => l.sets && l.sets.length > 0).length - 3} weitere Übungen
                      </div>
                    )}
                  </div>
                )}

                {/* Skipped exercises */}
                {w.skipped_exercises && w.skipped_exercises.length > 0 && (
                  <div className="ml-12 mt-2 font-mono text-xs text-orange-400/80 flex items-center gap-1">
                    <Forward className="w-3 h-3" /> {w.skipped_exercises.length} übersprungen
                  </div>
                )}

                {/* Notes */}
                {w.notes && (
                  <div className="ml-12 mt-2 flex gap-2 text-sm text-zinc-300 bg-zinc-950/50 rounded-lg px-3 py-2 border border-zinc-800/50">
                    <StickyNote className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="font-mono text-xs italic">{w.notes}</div>
                  </div>
                )}

                <div className="ml-12 mt-3 flex items-center gap-2 flex-wrap">
                  {Object.entries(grouped).map(([emoji, list]) => {
                    const userReacted = list.some(r => r.user_id === user.id);
                    const names = list.map(r => r.users?.name || '?').join(', ');
                    return (
                      <button key={emoji}
                        onClick={() => handleReaction(w.id, emoji)}
                        title={names}
                        className={`px-2.5 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                          userReacted ? 'bg-red-950/50 border border-red-800/50' : 'bg-zinc-800 border border-zinc-700'
                        }`}>
                        <span>{emoji}</span>
                        <span className="font-mono text-xs text-zinc-300">{list.length}</span>
                      </button>
                    );
                  })}
                  <div className="flex gap-1">
                    {REACTIONS.filter(e => !grouped[e]).map(emoji => (
                      <button key={emoji}
                        onClick={() => handleReaction(w.id, emoji)}
                        className="px-2 py-1 rounded-full text-sm bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 opacity-50 hover:opacity-100 transition-opacity">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setOpenComments(openComments === w.id ? null : w.id)}
                    className="ml-auto flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    {(comments[w.id] || []).length > 0 && (
                      <span className="font-mono text-xs">{(comments[w.id] || []).length}</span>
                    )}
                  </button>
                </div>

                {openComments === w.id && (
                  <div className="ml-12 mt-3 space-y-2">
                    {(comments[w.id] || []).map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="font-display text-xs text-red-400 flex-shrink-0 pt-0.5">{c.users?.name?.toUpperCase()}</div>
                        <div className="font-mono text-xs text-zinc-300 flex-1">{c.content}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={commentInputs[w.id] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(w.id)}
                        placeholder="Kommentar..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600"
                      />
                      <button
                        onClick={() => handleAddComment(w.id)}
                        className="p-1.5 bg-red-600 rounded-lg hover:bg-red-500 transition-colors">
                        <Send className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== GOLDEN RULES WITH STREAK =====
function GoldenRules() {
  const todayKey = new Date().toISOString().split('T')[0];

  // Load today's state
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`golden_rules_${todayKey}`)) || [false, false, false]; }
    catch { return [false, false, false]; }
  });

  const toggle = (i) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    try { localStorage.setItem(`golden_rules_${todayKey}`, JSON.stringify(next)); } catch {}
  };

  // Build last 7 days (Mon-Sun of current week relative to today)
  const last7 = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isToday = key === todayKey;
    let stored;
    try { stored = JSON.parse(localStorage.getItem(`golden_rules_${key}`)); } catch {}
    const data = stored || (isToday ? checked : null);
    return { key, isToday, data };
  });

  const rules = [
    { icon: '💧', label: '3L Wasser', sub: 'mind. täglich' },
    { icon: '👟', label: '10k Schritte', sub: 'jeden Tag' },
    { icon: '🥗', label: 'Gesund essen', sub: 'wenig Zucker' },
  ];

  return (
    <div className="mb-6">
      <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Goldene Regeln</div>
      <div className="grid grid-cols-3 gap-2">
        {rules.map((r, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`rounded-xl p-3 border flex flex-col items-center gap-1 transition-all overflow-hidden ${
              checked[i] ? 'bg-emerald-950/60 border-emerald-700/60' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <span className="text-2xl">{r.icon}</span>
            <span className={`font-display text-sm leading-tight text-center ${checked[i] ? 'text-emerald-400' : 'text-zinc-100'}`}>
              {r.label}
            </span>
            <span className="font-mono text-[10px] text-zinc-500 text-center leading-tight">{r.sub}</span>
            {/* 7-day streak dots */}
            <div className="flex gap-px mt-1 w-full justify-center">
              {last7.map(({ key, isToday, data }) => {
                const done = data ? data[i] : null;
                return (
                  <span
                    key={key}
                    className={`w-[13px] h-[13px] rounded-sm flex items-center justify-center text-[8px] font-bold border ${
                      isToday
                        ? done
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                        : done === true
                          ? 'bg-emerald-800/70 border-emerald-700/50 text-emerald-300'
                          : done === false
                            ? 'bg-red-950/60 border-red-900/50 text-red-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                    }`}
                  >
                    {done === true ? '✓' : done === false ? '✗' : '·'}
                  </span>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== COACH ONBOARDING CHAT =====
function CoachOnboardingChat({ messages, input, setInput, onSend, busy, parsedPlan, onPlanReady, onBack }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div className="mb-3 flex items-center justify-between flex-shrink-0 pt-6">
        <div>
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Coach</div>
          <div className="font-display text-2xl text-zinc-100">PLAN ERSTELLEN</div>
        </div>
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 font-mono text-xs">
          zurück
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 mb-3 space-y-3 no-scrollbar" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-red-600 text-white rounded-br-sm'
                : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm font-mono">
              tippt...
            </div>
          </div>
        )}
      </div>

      {parsedPlan && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 mb-3 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-emerald-200">Plan ist fertig!</div>
          <button onClick={onPlanReady}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs px-3 py-1.5 rounded-lg">
            ANSEHEN
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Antwort… (Shift+Enter = Absatz)"
          disabled={busy}
          rows={1}
          style={{ resize: 'none', overflow: 'hidden' }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
        />
        <button onClick={onSend} disabled={busy || !input.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-sm px-4 py-3 rounded-xl flex-shrink-0">
          {busy ? '...' : 'SEND'}
        </button>
      </div>
      <div style={{ height: '24px', flexShrink: 0 }} />
    </div>
  );
}

// ===== PLAN REVIEW =====
function PlanReview({ plan, onConfirm, onBack, busy }) {
  const [open, setOpen] = useState(null);
  const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Vorschau</div>
          <div className="font-display text-2xl text-zinc-100">DEIN PLAN</div>
        </div>
        <button onClick={onBack} disabled={busy}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-xs">
          zurück
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Wochenstruktur</div>
        <div className="grid grid-cols-7 gap-1">
          {(plan.schedule || ['rest','push','pull','rest','legs','aesthetic','cardio']).map((key, i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-center">
              <div className="font-mono text-xs text-zinc-500 mb-1">{dayLabels[i]}</div>
              <div className="font-display text-xs text-zinc-200 truncate">
                {plan[key]?.name?.split(' ')[0]?.toUpperCase() || key.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-4 max-h-[35vh] overflow-y-auto">
        {['push', 'pull', 'legs', 'aesthetic'].filter(k => plan[k]?.exercises?.length > 0).map(k => (
          <div key={k} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)}
              className="w-full p-3 flex items-center justify-between">
              <div className="text-left">
                <div className="font-display text-base">{plan[k].name.toUpperCase()}</div>
                <div className="font-mono text-xs text-zinc-500">{plan[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-3 pb-3 space-y-1 border-t border-zinc-800 pt-2">
                {plan[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-baseline py-1">
                    <div className="text-xs text-zinc-200">{ex.name}</div>
                    <div className="font-mono text-xs text-red-500 ml-2 whitespace-nowrap">
                      {ex.sets} × {ex.reps}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={onConfirm} disabled={busy}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-display text-xl py-3 rounded-xl flex items-center justify-center gap-2">
        {busy ? 'WIRD GESPEICHERT...' : <><Check className="w-5 h-5" /> PLAN ÜBERNEHMEN</>}
      </button>
    </>
  );
}

// ===== COACH SCREEN =====
function CoachScreen({ user, currentPlan, currentSchedule, onPlanSaved, showToast }) {
  const storageKey = `coach_chat_${user.id}`;
  const [messages, setMessages] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposedPlan, setProposedPlan] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Keyboard avoiding via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  // Greeting on first visit
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${user.name}! Ich bin dein Coach. Ich kenne deinen aktuellen Plan und kann dir helfen ihn anzupassen, neue Trainingsphasen zu starten, oder einfach Fragen beantworten.\n\nWas willst du machen?`,
      }]);
    }
  }, []);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
    setBusy(true);
    try {
      const planWithSchedule = { ...currentPlan, schedule: currentSchedule };
      const { reply, plan } = await coachChat(next, planWithSchedule);
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (plan) {
        setProposedPlan(plan);
      }
    } catch (e) {
      console.error(e);
      setMessages([...next, { role: 'assistant', content: 'Hmm, da ist was schiefgelaufen. Versuch nochmal.' }]);
    }
    setBusy(false);
  };

  const clearChat = () => setConfirmClear(true);
  const doClearChat = () => {
    setMessages([]);
    setProposedPlan(null);
    setConfirmClear(false);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const acceptPlan = async () => {
    setBusy(true);
    try {
      await onPlanSaved(proposedPlan);
      setProposedPlan(null);
      setReviewOpen(false);
    } catch (e) {}
    setBusy(false);
  };

  const kbStyle = keyboardOffset > 0 ? { bottom: `${keyboardOffset}px` } : {};

  if (reviewOpen && proposedPlan) {
    return (
      <div className="coach-screen safe-top overflow-y-auto" style={kbStyle}>
        <div className="px-5 pt-6 pb-8 max-w-2xl mx-auto">
          <PlanReview
            plan={proposedPlan}
            onConfirm={acceptPlan}
            onBack={() => setReviewOpen(false)}
            busy={busy}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="coach-screen safe-top" style={kbStyle}>
      <div className="px-5 pt-6 pb-3 flex items-start justify-between border-b border-zinc-900 flex-shrink-0">
        <div>
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Dein</div>
          <h1 className="font-display text-3xl text-zinc-100 leading-none">LIONS <span className="text-red-500">COACH</span></h1>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="font-mono text-xs text-zinc-500 hover:text-zinc-300 mt-2">
            verlauf löschen
          </button>
        )}
      </div>

      {/* Messages – scroll zone */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-red-600 text-white rounded-br-sm'
                : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm font-mono">
              tippt...
            </div>
          </div>
        )}
      </div>

      {/* Plan ready banner */}
      {proposedPlan && (
        <div className="bg-emerald-950/60 border-t border-emerald-800/50 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-emerald-200">Neuer Plan vorbereitet</div>
          <button onClick={() => setReviewOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs px-3 py-1.5 rounded-lg">
            ANSEHEN
          </button>
        </div>
      )}

      {/* Quick prompts – only first time */}
      {messages.length <= 1 && (
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {['Plan optimal für Cut?', 'Mehr Volumen Schultern', 'Plan für 4 Tage', 'Progressiv überlasten?'].map((q, i) => (
            <button key={i} onClick={() => setInput(q)}
              className="flex-shrink-0 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full px-3 py-1.5 font-mono text-xs text-zinc-300">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-900 flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Frag deinen Coach..."
          disabled={busy}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
        />
        <button onClick={send} disabled={busy || !input.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-sm px-4 rounded-xl">
          {busy ? '...' : 'SEND'}
        </button>
      </div>

      {confirmClear && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 p-6">
          <div className="bg-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="font-display text-xl text-zinc-100 mb-2">Verlauf löschen?</div>
            <div className="font-mono text-xs text-zinc-400 mb-5">Der Chat-Verlauf wird unwiderruflich gelöscht.</div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="flex-1 bg-zinc-700 text-zinc-200 font-mono text-sm py-3 rounded-xl">Abbrechen</button>
              <button onClick={doClearChat} className="flex-1 bg-red-600 text-white font-mono text-sm py-3 rounded-xl">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
