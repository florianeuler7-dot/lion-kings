import React, { useEffect, useState } from 'react';
import { Dumbbell, Play, Check, ChevronDown, Flame, TrendingUp, Heart, Activity, Plus, Camera, LogOut, X } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Card, Button, SectionLabel, ListRow, Stat, Sheet, IconButton } from '../components/ui';
import RELEASE_NOTES from '../data/releaseNotes';
import { quoteOfTheDay } from '../data/quotes';
import { getUserHabits, setUserHabits } from '../supabase';
import { todayStr, toLocalDateStr, startOfWeek } from '../lib/date';
import { readJSON, writeJSON } from '../lib/session';

// ===== RELEASE NOTES =====
const LK_SEEN_VERSION_KEY = 'lk_last_seen_version';

function useLatestRelease() {
  const latest = RELEASE_NOTES[0];
  const [unseen, setUnseen] = useState(() => {
    try {
      const seen = localStorage.getItem(LK_SEEN_VERSION_KEY);
      return seen !== latest.version;
    } catch { return false; }
  });
  const markSeen = () => {
    try { localStorage.setItem(LK_SEEN_VERSION_KEY, latest.version); } catch {}
    setUnseen(false);
  };
  return { release: latest, unseen, markSeen };
}

function ReleaseCard({ release, onDismiss }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-5 overflow-hidden animate-fade-up">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse-soft" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-base text-zinc-50">{release.title.toUpperCase()}</div>
          <div className="text-xs text-zinc-500 truncate">{release.highlights[0]}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-5 border-t border-line">
          <div className="flex items-center gap-2 pt-4 mb-4">
            <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Neu</span>
            <span className="text-xs text-zinc-500 font-mono">{release.version} · {release.date}</span>
          </div>
          {release.thanks && <div className="text-xs text-zinc-400 mb-4">{release.thanks}</div>}
          <div className="space-y-2.5 mb-5">
            {release.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2 shrink-0" />
                <div className="text-sm text-zinc-300 leading-snug">{h}</div>
              </div>
            ))}
          </div>
          <div className="font-display text-lg text-accent leading-tight mb-4">{release.motto.toUpperCase()}</div>
          <Button variant="secondary" size="md" className="w-full" onClick={onDismiss}>Verstanden</Button>
        </div>
      )}
    </Card>
  );
}

// ===== GOLDEN RULES WITH STREAK =====
function GoldenRules({ userId }) {
  const todayKey = todayStr();
  const [allData, setAllData] = useState(() => {
    // Seed from localStorage while Supabase loads
    const obj = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = toLocalDateStr(d);
      const v = readJSON(`golden_rules_${k}`, null);
      if (v) obj[k] = v;
    }
    return obj;
  });

  useEffect(() => {
    if (!userId) return;
    getUserHabits(userId).then(data => {
      if (data && Object.keys(data).length > 0) setAllData(local => ({ ...local, ...data }));
    }).catch(() => {});
  }, [userId]);

  const checked = allData[todayKey] || [false, false, false];

  const toggle = (i) => {
    const next = [...checked];
    next[i] = !next[i];
    const newAllData = { ...allData, [todayKey]: next };
    setAllData(newAllData);
    writeJSON(`golden_rules_${todayKey}`, next);
    if (userId) setUserHabits(userId, newAllData).catch(() => {});
  };

  const last7 = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    const key = toLocalDateStr(d);
    return { key, isToday: key === todayKey, data: allData[key] || null };
  });

  const rules = [
    { icon: '💧', label: '3L Wasser', sub: 'täglich' },
    { icon: '👟', label: '10k Schritte', sub: 'jeden Tag' },
    { icon: '🥗', label: 'Gesund essen', sub: 'wenig Zucker' },
  ];

  return (
    <div className="mb-7">
      <SectionLabel>Goldene Regeln</SectionLabel>
      <div className="grid grid-cols-3 gap-2.5">
        {rules.map((r, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`pressable rounded-2xl p-3 border flex flex-col items-center gap-1 transition-all overflow-hidden ${
              checked[i] ? 'bg-ok/10 border-ok/40' : 'card'
            }`}
          >
            <span className="text-2xl leading-none mb-1">{r.icon}</span>
            <span className={`font-display text-sm leading-tight text-center ${checked[i] ? 'text-ok' : 'text-zinc-100'}`}>
              {r.label}
            </span>
            <span className="text-[10px] text-zinc-500 text-center leading-tight">{r.sub}</span>
            <div className="flex gap-[3px] mt-2 w-full justify-center">
              {last7.map(({ key, isToday, data }) => {
                const done = data ? data[i] : null;
                return (
                  <span
                    key={key}
                    className={`w-[9px] h-[9px] rounded-full ${
                      isToday
                        ? done ? 'bg-ok ring-2 ring-ok/40' : 'bg-zinc-700 ring-2 ring-zinc-600/50'
                        : done === true ? 'bg-ok/70'
                        : done === false ? 'bg-accent/50'
                        : 'bg-white/10'
                    }`}
                  />
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== CUSTOM WORKOUT =====
const SUGGESTIONS = ['Fußball', 'Basketball', 'Schwimmen', 'Fahrrad', 'Joggen', 'Tennis', 'Kampfsport', 'Yoga'];

export function CustomWorkoutModal({ onSave, onClose }) {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!workoutName.trim() || saving) return;
    setSaving(true);
    try { await onSave({ name: workoutName.trim(), duration: parseInt(duration) || 0 }); }
    finally { setSaving(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-zinc-50">FREIES TRAINING</h2>
        <IconButton icon={X} label="Schließen" onClick={onClose} />
      </div>

      <div className="mb-3">
        <label className="label mb-2 block">Was hast du gemacht?</label>
        <input
          type="text"
          value={workoutName}
          onChange={e => setWorkoutName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="z.B. Fußball"
          autoFocus
          className="input-field px-4 py-3.5 text-lg font-display"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => setWorkoutName(s)}
            className={`pressable rounded-full px-3 py-1.5 text-xs font-semibold border ${workoutName === s ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'bg-white/[0.04] border-line text-zinc-300'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <label className="label mb-2 block">Dauer in Minuten (optional)</label>
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="z.B. 60"
          className="input-field px-4 py-3.5 text-lg font-display"
        />
      </div>

      <Button className="w-full" onClick={handleSave} disabled={!workoutName.trim() || saving} icon={Check}>
        {saving ? 'SPEICHERN…' : 'EINTRAGEN'}
      </Button>
    </Sheet>
  );
}

// ===== HOME =====
export default function HomeScreen({ user, onLogout, onChangeAvatar, plan: PLAN, todayPlan, todayKey, todayName, history, dataLoading, onStart, onPickOther, onStartCardio, onStartMobility, onStartCombined, onLogCustom }) {
  const { release, unseen, markSeen } = useLatestRelease();

  const isRest = todayKey === 'rest';
  const isCardio = todayKey === 'cardio';
  const isCardioOptional = todayKey === 'cardio_optional';
  const isAnyCardio = isCardio || isCardioOptional;
  const todayDateStr = todayStr();
  const todayEntries = history.filter(h => h.dateOnly === todayDateStr);
  const cardioDoneToday = todayEntries.some(e => e.isCardio);
  const mobilityDoneToday = todayEntries.some(e => e.isMobility);
  const cardioFullyDone = isAnyCardio && cardioDoneToday && mobilityDoneToday;
  const doneToday = isAnyCardio ? cardioFullyDone : todayEntries.length > 0;
  const totalWorkouts = history.length;
  const weekStart = startOfWeek();
  const thisWeek = history.filter(h => new Date(h.date).getTime() >= weekStart).length;
  const quote = quoteOfTheDay();

  const handleStart = () => {
    if (isAnyCardio) {
      if (!cardioDoneToday) onStartCombined();
      else if (!mobilityDoneToday) onStartMobility();
    } else {
      onStart();
    }
  };

  if (!todayPlan) return null;

  const strengthKeys = Object.keys(PLAN).filter(k => k !== 'rest' && k !== 'cardio' && k !== 'cardio_optional' && PLAN[k]?.exercises?.length > 0);

  return (
    <div className="pt-3 animate-fade-in">
      {/* User strip */}
      <div className="flex items-center justify-between mb-7">
        <button onClick={onChangeAvatar} className="pressable flex items-center gap-3 text-left group">
          <div className="relative">
            <Avatar user={user} size="md" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-surface-2 border border-line-2 rounded-full p-1">
              <Camera className="w-2.5 h-2.5 text-zinc-300" />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">{todayName}</div>
            <div className="font-semibold text-zinc-100 leading-tight">{user.name}</div>
          </div>
        </button>
        <IconButton icon={LogOut} label="Abmelden" onClick={onLogout} className="text-zinc-600" />
      </div>

      {unseen && <ReleaseCard release={release} onDismiss={markSeen} />}

      <div className="mb-6">
        <h1 className="font-display text-[4.25rem] text-zinc-50 leading-[0.88] tracking-tight">
          NO<br /><span className="text-accent">EXCUSES</span>
        </h1>
      </div>

      {/* Today card */}
      <div className={`relative overflow-hidden rounded-[1.75rem] p-6 mb-5 bg-gradient-to-br ${todayPlan.color} shadow-[0_20px_60px_-20px_rgba(239,68,68,0.5)]`}>
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,255,255,0.18),transparent)] pointer-events-none" />
        <div className="absolute -right-10 -top-10 opacity-[0.12] pointer-events-none"><Dumbbell className="w-52 h-52" /></div>
        <div className="relative z-10">
          <div className="label text-white/70 mb-2">Heutiges Training</div>
          <div className="font-display text-[2.75rem] text-white leading-[0.95] mb-4">{todayPlan.name.toUpperCase()}</div>

          <div className="mb-5 leading-snug">
            <div className="text-white/80 text-sm italic">„{quote.text}"</div>
            {quote.author && <div className="text-white/50 text-xs mt-1">— {quote.author}</div>}
          </div>

          {!isRest && !isAnyCardio && (
            <div className="text-white/85 text-sm mb-5 font-medium">{todayPlan.exercises.length} Übungen · ca. 60–75 Min</div>
          )}
          {isRest && <div className="text-white/90 text-sm mb-2">Heute ist Pausentag. Ruhe ist Teil des Plans – Cortisol runter, Muskeln wachsen lassen.</div>}
          {isAnyCardio && (
            <div className="text-white/90 text-sm mb-5">
              {isCardioOptional
                ? 'Cardio heute optional – wenn du Lust hast: 30 Min Zone-2 + Mobility.'
                : '30–40 Min Zone-2 Cardio gefolgt von Mobility. Locker, du kannst noch reden.'}
              {cardioDoneToday && !mobilityDoneToday && (
                <div className="mt-2 text-xs font-semibold text-white/85">✓ Cardio erledigt – jetzt Mobility</div>
              )}
            </div>
          )}

          {!isRest && !doneToday && (
            <button onClick={handleStart} className="pressable w-full bg-zinc-950 text-white font-display text-2xl py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl">
              <Play className="w-6 h-6 fill-current" />
              TRAINING STARTEN
            </button>
          )}

          {doneToday && !isRest && (
            <div className="bg-zinc-950/50 border border-white/20 text-white py-3 px-4 rounded-2xl flex items-center gap-2 text-sm font-medium">
              <Check className="w-5 h-5 text-ok" /> Heute schon erledigt. Stark.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-7">
        {dataLoading && history.length === 0 ? (
          <>
            <div className="skeleton h-[108px]" />
            <div className="skeleton h-[108px]" />
          </>
        ) : (
          <>
            <Stat icon={TrendingUp} value={totalWorkouts} label="Workouts gesamt" />
            <Stat icon={Flame} iconClass="text-accent-2" value={thisWeek} label="Diese Woche" />
          </>
        )}
      </div>

      <GoldenRules userId={user.id} />

      <div className="mb-6">
        <SectionLabel>Anderes Training starten</SectionLabel>
        <div className="space-y-2.5">
          {strengthKeys.map(k => (
            <ListRow
              key={k}
              icon={Dumbbell}
              title={PLAN[k].name.toUpperCase()}
              badge={k === todayKey ? 'Heute' : null}
              subtitle={`${PLAN[k].exercises.length} Übungen`}
              onClick={() => onPickOther(k)}
            />
          ))}
          <ListRow
            icon={Heart}
            title="CARDIO"
            badge={isAnyCardio ? 'Heute' : null}
            subtitle="30–40 Min locker · Zone-2 oder HIIT"
            onClick={onStartCardio}
          />
          <ListRow
            icon={Activity}
            iconClass="text-ok"
            title="MOBILITY"
            subtitle="Fokus wählen & abhaken"
            onClick={onStartMobility}
          />
          <ListRow
            icon={Plus}
            iconClass="text-zinc-400"
            title="FREIES TRAINING"
            subtitle="Fußball, Schwimmen, etc."
            onClick={onLogCustom}
          />
        </div>
      </div>
    </div>
  );
}
