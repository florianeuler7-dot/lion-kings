import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Play, Pause, SkipForward, Check, Calendar, History, Home, X, Droplet, ChevronRight, Clock, Flame, TrendingUp, Coffee, Timer, Heart, Activity, Sparkles, User, LogOut, AlertCircle, Users, Trophy, Zap, Footprints, Plus, Minus, Camera, Upload, StickyNote, Forward } from 'lucide-react';
import { findUserByName, getUserById, createUser, getLastWorkoutDate, getUserWorkouts, saveWorkout, rowToWorkout, computeLastWeights, getAllUsers, getActivityFeed, getAllLiveStatuses, setLiveStatus, clearLiveStatus, getReactionsForWorkouts, toggleReaction, computeUserStats, supabase, getUserSteps, setUserSteps, getAllStepsForDate, uploadAvatar, updateUserAvatar, saveUserPlan, getActivePlanForUser, parsePlanText, coachChat } from './supabase';

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
  const plan = {
    push: customPlan.push || DEFAULT_PLAN.push,
    pull: customPlan.pull || DEFAULT_PLAN.pull,
    legs: customPlan.legs || DEFAULT_PLAN.legs,
    aesthetic: customPlan.aesthetic || DEFAULT_PLAN.aesthetic,
    cardio: customPlan.cardio || DEFAULT_PLAN.cardio,
    rest: customPlan.rest || DEFAULT_PLAN.rest,
  };
  const schedule = Array.isArray(customPlan.schedule) && customPlan.schedule.length === 7
    ? customPlan.schedule
    : DEFAULT_SCHEDULE;
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
      console.error('Avatar update error:', e);
      showToast('Upload fehlgeschlagen', 'info');
    }
  };

  const handlePlanSaved = async (newPlan) => {
    try {
      await saveUserPlan(user.id, newPlan);
      setPlanConfig(buildPlanData(newPlan));
      showToast('Neuer Plan aktiv 🦁', 'check');
      setScreen('home');
    } catch (e) {
      console.error('Plan save error:', e);
      showToast('Plan konnte nicht gespeichert werden', 'info');
    }
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
      showToast('Training abgeschlossen 💪', 'check');
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
        capture="user"
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
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 z-20 safe-bottom">
          <div className="max-w-2xl mx-auto flex">
            <NavBtn icon={Home} label="Heute" active={screen==='home'} onClick={() => setScreen('home')} />
            <NavBtn icon={Users} label="Crew" active={screen==='dashboard'} onClick={() => setScreen('dashboard')} />
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
    <button onClick={onClick} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${active ? 'text-red-500' : 'text-zinc-500'}`}>
      <Icon className="w-5 h-5" />
      <span className="text-xs font-mono">{label}</span>
    </button>
  );
}

function HomeScreen({ user, onLogout, onChangeAvatar, plan: PLAN, todayPlan, todayKey, todayName, history, dataLoading, onStart, onPickOther, onStartCardio, onStartMobility, onStartCombined }) {
  const isRest = todayKey === 'rest';
  const isCardio = todayKey === 'cardio';
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEntries = history.filter(h => h.dateOnly === todayDateStr);
  const cardioDoneToday = todayEntries.some(e => e.isCardio);
  const mobilityDoneToday = todayEntries.some(e => e.isMobility);
  const cardioFullyDone = isCardio && cardioDoneToday && mobilityDoneToday;
  const doneToday = isCardio ? cardioFullyDone : todayEntries.length > 0;
  const totalWorkouts = history.length;
  const lastWeek = history.filter(h => (Date.now() - new Date(h.date).getTime()) < 7*24*60*60*1000).length;

  // Decide what to do when user taps the START button
  const handleStart = () => {
    if (isCardio) {
      // Combined flow: cardio → mobility
      if (!cardioDoneToday) {
        onStartCombined();
      } else if (!mobilityDoneToday) {
        // cardio done already, just do mobility
        onStartMobility();
      }
    } else {
      onStart();
    }
  };

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
        <button onClick={onLogout} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1">
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
          <div className="font-display text-5xl text-white leading-none mb-4">{todayPlan.name.toUpperCase()}</div>
          {!isRest && !isCardio && <div className="text-white/80 text-sm mb-6 font-mono">{todayPlan.exercises.length} Übungen · ca. 60–75 Min</div>}
          {isRest && <div className="text-white/90 text-sm mb-6">Heute ist Pausentag. Ruhe ist Teil des Plans – Cortisol runter, Muskeln wachsen lassen.</div>}
          {isCardio && (
            <div className="text-white/90 text-sm mb-6">
              30–40 Min Zone-2 Cardio gefolgt von Mobility. Locker, du kannst noch reden.
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

          {doneToday && (
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

      <StepCounter user={user} />

      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Anderes Training starten</div>
        <div className="space-y-2">
          {['push', 'pull', 'legs', 'aesthetic'].map(k => (
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
                  {isCardio && <span className="text-xs text-red-400 font-mono">(HEUTE)</span>}
                </div>
                <div className="font-mono text-xs text-zinc-500">Zone-2 oder HIIT</div>
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
        </div>
      </div>

    </div>
  );
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

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(workout.notes || '');
  const [skippedNames, setSkippedNames] = useState(workout.skippedExercises || []);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const lastDrinkRef = useRef(Date.now());
  const restRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastDrinkRef.current > 15 * 60 * 1000) {
        showToast('Trink etwas Wasser 💧', 'drink');
        lastDrinkRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restRunning && restTime > 0) {
      restRef.current = setTimeout(() => setRestTime(t => t - 1), 1000);
    } else if (restRunning && restTime === 0) {
      setRestRunning(false);
      showToast('Pause vorbei – nächster Satz!', 'info');
      // Vibration if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    return () => clearTimeout(restRef.current);
  }, [restRunning, restTime]);

  useEffect(() => {
    if (lastWeights[exercise.name] && !weight) {
      setWeight(String(lastWeights[exercise.name]));
    }
  }, [exerciseIdx]);

  const logSet = () => {
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
      setWorkout({ ...workout, logs: newLogs, exerciseIdx: exerciseIdx + 1, setIdx: 0 });
      setReps(''); setWeight('');
      showToast('Übung abgeschlossen!', 'check');
    } else {
      setWorkout({ ...workout, logs: newLogs, setIdx: setIdx + 1 });
      setReps('');
      setRestTime(exercise.restSec);
      setRestRunning(true);
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
    setRestTime(0);
    showToast(`${exercise.name} übersprungen`, 'info');
  };

  const skipRest = () => { setRestRunning(false); setRestTime(0); };
  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const completedSets = logs[exerciseIdx].sets;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-6 pb-4 flex items-center justify-between">
        <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
        <div className="font-mono text-xs text-zinc-500">Übung {exerciseIdx + 1} / {plan.exercises.length}</div>
        <button onClick={() => setNotesOpen(!notesOpen)}
          className={`p-1 transition-colors ${notes ? 'text-yellow-400' : 'text-zinc-500'}`}
          title="Notiz hinzufügen">
          <StickyNote className="w-5 h-5" />
        </button>
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

      {restRunning && (
        <div className="fixed inset-0 bg-zinc-950/95 z-40 flex flex-col items-center justify-center p-4">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-4">Pause</div>
          <div className="font-display text-9xl text-red-500 mb-8">{fmt(restTime)}</div>
          <div className="text-zinc-400 mb-8 text-center">Nächster Satz: <span className="text-zinc-100 font-bold">{exercise.name}</span></div>
          <div className="flex gap-3">
            <button onClick={() => setRestTime(t => t + 30)} className="bg-zinc-800 px-5 py-3 rounded-xl font-mono text-sm">+30s</button>
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

        <button onClick={() => setSkipConfirm(true)}
          className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono text-xs py-2.5 rounded-lg flex items-center justify-center gap-2">
          <Forward className="w-3 h-3" /> Übung überspringen
        </button>
      </div>
    </div>
  );
}

function HistoryScreen({ history }) {
  const entries = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Trainings-Verlauf</div>
        <h1 className="font-display text-5xl text-zinc-100">HISTORY</h1>
      </div>
      {entries.length === 0 && (
        <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
          <Coffee className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <div className="text-zinc-400">Noch keine Trainings absolviert.</div>
          <div className="text-zinc-600 text-sm mt-1 font-mono">Fang heute an.</div>
        </div>
      )}
      <div className="space-y-3">
        {entries.map((e, i) => (
          <div key={i} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="font-display text-2xl">{e.planName.toUpperCase()}</div>
                <div className="font-mono text-xs text-zinc-500">{new Date(e.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-red-500">{e.duration}<span className="text-sm text-zinc-500"> min</span></div>
              </div>
            </div>
            {e.isCardio ? (
              <div className="flex items-center gap-2 text-sm font-mono text-zinc-400 pt-2 border-t border-zinc-800/50">
                <Heart className="w-4 h-4 text-red-500" /> {e.duration} Minuten Cardio absolviert
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
  const [open, setOpen] = useState('push');
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
  const [type, setType] = useState('zone2'); // 'zone2' | 'hiit'
  const [targetMin, setTargetMin] = useState(30);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const lastDrinkRef = useRef(Date.now());
  const intervalRef = useRef(null);

  // Set live status when running starts
  useEffect(() => {
    if (running && user) {
      const typeName = type === 'hiit' ? 'HIIT Cardio' : 'Zone-2 Cardio';
      setLiveStatus(user.id, typeName, `${Math.floor(elapsed / 60)} / ${targetMin} Min`);
    }
  }, [running, Math.floor(elapsed / 60), type, targetMin, user]);

  // Tick every second when running
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
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

  // Notify when target reached
  useEffect(() => {
    if (running && elapsed === targetMin * 60) {
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
        <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
        <div className="font-mono text-xs text-zinc-500">CARDIO</div>
        <div className="w-6"></div>
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

          <button onClick={() => setRunning(true)}
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
              <button onClick={() => setRunning(false)}
                className="bg-zinc-800 px-6 py-3 rounded-xl font-mono text-sm flex items-center gap-2">
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button onClick={() => setRunning(true)}
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
          <button onClick={onCancel} className="text-zinc-500"><X className="w-6 h-6" /></button>
          <div className="font-mono text-xs text-zinc-500">MOBILITY</div>
          <div className="w-6"></div>
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
        <button onClick={() => setFocus(null)} className="text-zinc-500 flex items-center gap-1">
          <X className="w-6 h-6" />
        </button>
        <div className="font-mono text-xs text-zinc-500">{completedCount} / {totalCount}</div>
        <div className="w-6"></div>
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
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('name'); // 'name' | 'avatar' | 'plan' | 'plan-text' | 'plan-coach' | 'plan-review' | 'confirm'
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [planText, setPlanText] = useState('');
  const [parsedPlan, setParsedPlan] = useState(null);
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState('');

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
      let avatarUrl = null;
      if (!skipAvatar && avatarFile) {
        try {
          avatarUrl = await uploadAvatar(name.trim(), avatarFile);
        } catch (e) {
          console.error('Avatar upload failed:', e);
        }
      }
      const newUser = await createUser(name.trim(), avatarUrl);
      // If a custom plan was created, save it
      if (planToSave) {
        try {
          await saveUserPlan(newUser.id, planToSave);
        } catch (e) {
          console.error('Plan save failed:', e);
        }
      }
      onComplete(newUser);
    } catch (e) {
      console.error(e);
      setError('Konto konnte nicht erstellt werden – nochmal versuchen');
    }
    setBusy(false);
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
      const { reply, plan } = await coachChat(newMessages);
      setCoachMessages([...newMessages, { role: 'assistant', content: reply }]);
      if (plan) {
        setParsedPlan(plan);
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

  const confirmExisting = () => onComplete(foundUser);
  const reject = () => {
    setFoundUser(null);
    setLastWorkout(null);
    setName('');
    setStep('name');
  };

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
                <input type="file" accept="image/*" capture="user" onChange={handleAvatarPick} className="hidden" />
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
                  <div className="font-mono text-xs text-zinc-500">Freitext einfügen, Claude strukturiert</div>
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
                  <div className="font-mono text-xs text-zinc-500">Geführter Chat mit Claude</div>
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
                Claude strukturiert ihn dann automatisch.
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

        {step === 'plan-coach' && (
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
  const [allWorkoutsByUser, setAllWorkoutsByUser] = useState({});
  const [stepsByUser, setStepsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');

  const REACTIONS = ['💪', '🔥', '👏', '🦁'];

  const loadAll = async () => {
    try {
      const [allUsers, statuses, feedRows, todaySteps] = await Promise.all([
        getAllUsers(),
        getAllLiveStatuses(),
        getActivityFeed(40),
        getAllStepsForDate(),
      ]);
      setUsers(allUsers);
      setLiveStatuses(statuses);
      setFeed(feedRows);

      // Map steps by user_id
      const stepsMap = {};
      todaySteps.forEach(s => { stepsMap[s.user_id] = s.steps; });
      setStepsByUser(stepsMap);

      const ids = feedRows.map(w => w.id);
      const reactionsMap = await getReactionsForWorkouts(ids);
      setReactions(reactionsMap);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_steps' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const leaderboard = users.map(u => {
    const userWorkouts = allWorkoutsByUser[u.id] || [];
    const stats = computeUserStats(userWorkouts);
    const status = liveStatuses.find(s => s.user_id === u.id);
    const steps = stepsByUser[u.id] || 0;
    return { user: u, stats, status, steps };
  }).sort((a, b) => b.stats.thisWeek - a.stats.thisWeek);

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
    return <div className="pt-8 text-zinc-500 font-mono text-sm">Lade Crew-Daten...</div>;
  }

  return (
    <div className="pt-8">
      <div className="mb-6">
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Die Crew</div>
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
        <div className="space-y-2">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">Diese Woche</div>
          {leaderboard.map((row, idx) => {
            const isMe = row.user.id === user.id;
            const medals = ['🥇', '🥈', '🥉'];
            const stepsReached = row.steps >= 10000;
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
                  <div className="font-mono text-xs text-zinc-500 flex gap-3 flex-wrap">
                    {row.stats.streak > 0 && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" /> {row.stats.streak}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${stepsReached ? 'text-green-500' : 'text-blue-400'}`}>
                      <Footprints className="w-3 h-3" /> {row.steps.toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-2xl text-red-500">{row.stats.thisWeek}</div>
                  <div className="font-mono text-xs text-zinc-500">Woche</div>
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <div className="text-center text-zinc-500 py-8 font-mono text-sm">Noch keine Daten</div>
          )}
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
                </div>

                {/* Names below reactions for mobile clarity */}
                {Object.keys(grouped).length > 0 && (
                  <div className="ml-12 mt-2 space-y-0.5">
                    {Object.entries(grouped).map(([emoji, list]) => (
                      <div key={emoji} className="font-mono text-xs text-zinc-500 truncate">
                        <span>{emoji}</span> <span className="text-zinc-400">{list.map(r => r.users?.name || '?').join(', ')}</span>
                      </div>
                    ))}
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

// ===== STEP COUNTER =====
function StepCounter({ user }) {
  const [savedSteps, setSavedSteps] = useState(0);
  const [draft, setDraft] = useState('0');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [flashedAdd, setFlashedAdd] = useState(null); // which quick-add button just saved
  const stepsRef = useRef(0);

  const GOAL = 10000;

  useEffect(() => {
    (async () => {
      try {
        const s = await getUserSteps(user.id);
        setSavedSteps(s);
        setDraft(String(s));
        stepsRef.current = s;
      } catch (e) {}
    })();
  }, [user.id]);

  const draftNum = parseInt(draft) || 0;
  const isDirty = draftNum !== savedSteps;
  const progress = Math.min((savedSteps / GOAL) * 100, 100);
  const reached = savedSteps >= GOAL;

  const flashSaved = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const save = async () => {
    setSaving(true);
    try {
      const n = Math.max(0, draftNum);
      await setUserSteps(user.id, n);
      setSavedSteps(n);
      setDraft(String(n));
      stepsRef.current = n;
      flashSaved();
    } catch (e) {
      console.error('Steps save error:', e);
    }
    setSaving(false);
  };

  // Quick add: saves immediately + visual flash on the button
  const quickAdd = async (delta) => {
    const newVal = Math.max(0, stepsRef.current + delta);
    stepsRef.current = newVal;
    setSavedSteps(newVal);
    setDraft(String(newVal));
    setFlashedAdd(delta);
    setTimeout(() => setFlashedAdd(null), 800);
    try {
      await setUserSteps(user.id, newVal);
    } catch (e) {
      console.error('Steps quick-add error:', e);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Footprints className={`w-5 h-5 ${reached ? 'text-green-500' : 'text-blue-400'}`} />
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Schritte heute</div>
        </div>
        <div className="font-mono text-xs text-zinc-500">
          {savedSteps.toLocaleString('de-DE')} / {GOAL.toLocaleString('de-DE')}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div className={`h-full transition-all ${reached ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${progress}%` }} />
      </div>

      {/* Input + Save button */}
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={e => e.target.select()}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-2xl font-display text-zinc-100 focus:border-red-500 focus:outline-none"
        />
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className={`px-5 rounded-lg font-mono text-sm flex items-center gap-2 transition-colors ${
            isDirty && !saving
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : justSaved
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-500'
          }`}
        >
          <Check className="w-4 h-4" />
          {saving ? '...' : justSaved ? 'OK' : 'Speichern'}
        </button>
      </div>

      {/* Quick add buttons - save immediately, flash green on tap */}
      <div className="flex gap-2">
        {[500, 1000, 2500].map(d => (
          <button key={d} onClick={() => quickAdd(d)}
            className={`flex-1 border font-mono text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              flashedAdd === d
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
            }`}>
            {flashedAdd === d ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {flashedAdd === d ? 'gespeichert' : `${d.toLocaleString('de-DE')}`}
          </button>
        ))}
      </div>

      {reached && (
        <div className="mt-3 text-center font-mono text-xs text-green-500">
          ✓ Tagesziel erreicht
        </div>
      )}
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
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Coach</div>
          <div className="font-display text-2xl text-zinc-100">PLAN ERSTELLEN</div>
        </div>
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 font-mono text-xs">
          zurück
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 mb-3 space-y-3 max-h-[50vh]">
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

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
          placeholder="Antwort eingeben..."
          disabled={busy}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
        />
        <button onClick={onSend} disabled={busy || !input.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-sm px-4 rounded-xl">
          {busy ? '...' : 'SEND'}
        </button>
      </div>
    </>
  );
}

// ===== PLAN REVIEW =====
function PlanReview({ plan, onConfirm, onBack, busy }) {
  const [open, setOpen] = useState('push');
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
  const scrollRef = useRef(null);

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

  const clearChat = () => {
    if (!window.confirm('Verlauf löschen?')) return;
    setMessages([]);
    setProposedPlan(null);
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

  if (reviewOpen && proposedPlan) {
    return (
      <div className="pt-8 pb-32">
        <PlanReview
          plan={proposedPlan}
          onConfirm={acceptPlan}
          onBack={() => setReviewOpen(false)}
          busy={busy}
        />
      </div>
    );
  }

  return (
    <div className="pt-8 pb-32 flex flex-col h-[calc(100vh-100px)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">Dein Coach</div>
          <h1 className="font-display text-5xl text-zinc-100 leading-none">CLAUDE<br/><span className="text-red-500">COACH</span></h1>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="font-mono text-xs text-zinc-500 hover:text-zinc-300 mt-2">
            verlauf löschen
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 mb-3 space-y-3">
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
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 mb-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-emerald-200">Neuer Plan vorbereitet</div>
          <button onClick={() => setReviewOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs px-3 py-1.5 rounded-lg">
            ANSEHEN
          </button>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            'Ist mein Plan optimal für Cut?',
            'Mehr Volumen für Schultern',
            'Plan für 4 Tage statt 5',
            'Wie progressiv überlasten?',
          ].map((q, i) => (
            <button key={i} onClick={() => setInput(q)}
              className="flex-shrink-0 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full px-3 py-1.5 font-mono text-xs text-zinc-300">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
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
    </div>
  );
}
