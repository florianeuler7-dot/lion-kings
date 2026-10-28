import React, { useEffect, useState } from 'react';
import { Dumbbell, Play, Check, ChevronDown, Flame, Heart, Activity, Plus, Camera, LogOut, X, Droplets, Footprints, Salad, Snowflake, AlertTriangle, Target, CalendarCheck, Zap, Award, KeyRound } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Card, Button, SectionLabel, ListRow, Stat, Sheet, IconButton, Wordmark, Chip, ProgressBar, ProgressRing } from '../components/ui';
import CountUp from '../components/CountUp';
import RELEASE_NOTES from '../data/releaseNotes';
import { quoteOfTheDay } from '../data/quotes';
import { arcProgress, weeklyGoalFromSchedule } from '../data/arc';
import { totalXp, levelFromXp, levelTitle, unlockedBadges, BADGES } from '../lib/xp';
import { getUserHabits, setUserHabits, computeUserStats } from '../supabase';
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
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse-soft" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl uppercase text-fg leading-none">{release.title}</div>
          <div className="text-xs text-fg-muted truncate mt-1">{release.highlights[0]}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-fg-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-4 pb-5 border-t border-line">
          <div className="flex items-center gap-2 pt-4 mb-4">
            <span className="bg-accent text-on-accent text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest">Neu</span>
            <span className="text-xs text-fg-muted font-mono">{release.version} · {release.date}</span>
          </div>
          {release.thanks && <div className="text-xs text-fg-muted mb-4">{release.thanks}</div>}
          <ul className="space-y-2.5 mb-5">
            {release.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-ok mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-sm text-fg leading-snug">{h}</div>
              </li>
            ))}
          </ul>
          <div className="font-display text-2xl uppercase text-accent leading-none mb-4">{release.motto}</div>
          <Button variant="secondary" size="md" className="w-full" onClick={onDismiss}>Verstanden</Button>
        </div>
      )}
    </Card>
  );
}

// ===== ARC PROGRESS =====
function ArcCard() {
  const p = arcProgress();
  return (
    <Card className="p-4 mb-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 opacity-[0.07] pointer-events-none" aria-hidden="true"><Snowflake className="w-32 h-32" /></div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-ice/15 border border-ice/30 flex items-center justify-center shrink-0" aria-hidden="true">
          <Snowflake className="w-5 h-5 text-ice" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="label">Winter Arc</div>
          <div className="font-display text-2xl uppercase text-fg leading-none mt-1 tabular">
            {p.status === 'before' && `Start in ${p.daysUntil} ${p.daysUntil === 1 ? 'Tag' : 'Tagen'}`}
            {p.status === 'active' && <>Tag <CountUp value={p.done} duration={700} /> <span className="text-fg-faint">/ {p.total}</span></>}
            {p.status === 'done' && 'Arc abgeschlossen'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl text-ice leading-none tabular"><CountUp value={p.pct} duration={700} suffix="%" /></div>
          {p.status === 'active' && <div className="text-[11px] text-fg-faint mt-0.5">{p.daysLeft} Tage übrig</div>}
        </div>
      </div>
      <ProgressBar value={p.pct} color="bg-ice" className="mt-4" label="Winter Arc Fortschritt" />
    </Card>
  );
}

// ===== LEVEL / XP =====
function LevelCard({ history, streak }) {
  const xp = totalXp(history, streak);
  const lv = levelFromXp(xp);
  const badges = unlockedBadges(history, streak);
  return (
    <Card className="p-4 mb-7">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-ok/15 border border-ok/30 flex items-center justify-center shrink-0" aria-hidden="true">
          <Zap className="w-6 h-6 text-ok" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <div className="font-display text-3xl uppercase text-fg leading-none">Level {lv.level}</div>
            <div className="text-xs font-bold text-ok uppercase tracking-wider">{levelTitle(lv.level)}</div>
          </div>
          <div className="text-xs text-fg-muted mt-1 tabular"><CountUp value={xp} duration={900} /> XP · {lv.needed - lv.intoLevel} bis Level {lv.level + 1}</div>
        </div>
        {streak > 0 && (
          <div className="shrink-0 flex items-center gap-1 bg-accent/15 border border-accent/40 text-accent rounded-full px-2.5 py-1 text-xs font-bold tabular" aria-label={`${streak} Tage Streak`}>
            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak}
          </div>
        )}
      </div>
      <ProgressBar value={lv.pct} color="bg-ok" className="mt-3" label="Level-Fortschritt" />
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {BADGES.map(b => {
          const on = badges.some(x => x.id === b.id);
          return (
            <span key={b.id} title={b.label} aria-label={`${b.label}${on ? ' – freigeschaltet' : ' – gesperrt'}`}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold border ${on ? 'bg-gold/15 border-gold/50 text-gold' : 'bg-surface-2/60 border-line text-fg-faint'}`}>
              <Award className="w-3 h-3" aria-hidden="true" /> {b.label}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

// ===== GOLDEN RULES WITH STREAK =====
const RULES = [
  { icon: Droplets, label: '3L Wasser', sub: 'täglich' },
  { icon: Footprints, label: '10k Schritte', sub: 'jeden Tag' },
  { icon: Salad, label: 'Gesund essen', sub: 'wenig Zucker' },
];

function GoldenRules({ userId }) {
  const todayKey = todayStr();
  const [allData, setAllData] = useState(() => {
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

  const doneCount = checked.filter(Boolean).length;

  return (
    <div className="mb-7">
      <SectionLabel right={<span className="text-xs font-bold text-fg-muted tabular">{doneCount}/{RULES.length} heute</span>}>Goldene Regeln</SectionLabel>
      <div className="grid grid-cols-3 gap-2.5">
        {RULES.map((r, i) => {
          const Icon = r.icon;
          const on = !!checked[i];
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={on}
              className={`pressable rounded-2xl p-3 border flex flex-col items-center gap-1.5 transition-all min-h-[120px] ${
                on ? 'bg-ok/12 border-ok/50' : 'card'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${on ? 'bg-ok text-on-ok' : 'bg-surface-2 text-fg-muted'}`} aria-hidden="true">
                {on ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-5 h-5" strokeWidth={2.2} />}
              </div>
              <span className={`font-display text-lg uppercase leading-none text-center ${on ? 'text-ok' : 'text-fg'}`}>{r.label}</span>
              <span className="text-[11px] text-fg-faint text-center leading-tight">{r.sub}</span>
              <div className="flex gap-[3px] mt-1 w-full justify-center" aria-hidden="true">
                {last7.map(({ key, isToday, data }) => {
                  const done = data ? data[i] : null;
                  return (
                    <span
                      key={key}
                      className={`w-[8px] h-[8px] rounded-full ${
                        isToday
                          ? done ? 'bg-ok ring-2 ring-ok/40' : 'bg-fg-faint ring-2 ring-fg-faint/40'
                          : done === true ? 'bg-ok/70'
                          : done === false ? 'bg-accent/50'
                          : 'bg-line-2'
                      }`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
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
    <Sheet onClose={onClose} title="Freies Training eintragen">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-3xl uppercase text-fg leading-none">Freies Training</h2>
        <IconButton icon={X} label="Schließen" onClick={onClose} />
      </div>

      <div className="mb-3">
        <label htmlFor="custom-name" className="label mb-2 block">Was hast du gemacht?</label>
        <input
          id="custom-name"
          type="text"
          value={workoutName}
          onChange={e => setWorkoutName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="z.B. Fußball"
          autoFocus
          className="input-field px-4 py-3 text-2xl font-display uppercase"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {SUGGESTIONS.map(s => (
          <Chip key={s} active={workoutName === s} onClick={() => setWorkoutName(s)}>{s}</Chip>
        ))}
      </div>

      <div className="mb-6">
        <label htmlFor="custom-duration" className="label mb-2 block">Dauer in Minuten (optional)</label>
        <input
          id="custom-duration"
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="z.B. 60"
          className="input-field px-4 py-3 text-2xl font-display"
        />
      </div>

      <Button variant="cta" className="w-full" onClick={handleSave} disabled={!workoutName.trim() || saving} icon={Check}>
        {saving ? 'Speichern…' : 'Eintragen'}
      </Button>
    </Sheet>
  );
}

// ===== HOME =====
const ACCOUNT_HINT_KEY = 'account_hint_dismissed';

export default function HomeScreen({ user, authEmail, onOpenAccount, onLogout, onChangeAvatar, plan: PLAN, schedule, todayPlan, todayKey, todayName, history, dataLoading, loadError, onRetry, onStart, onPickOther, onStartCardio, onStartMobility, onStartCombined, onLogCustom }) {
  const { release, unseen, markSeen } = useLatestRelease();
  const [accountHintDismissed, setAccountHintDismissed] = useState(() => !!readJSON(ACCOUNT_HINT_KEY, false));
  const dismissAccountHint = () => { writeJSON(ACCOUNT_HINT_KEY, true); setAccountHintDismissed(true); };

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
  const weeklyGoal = weeklyGoalFromSchedule(schedule);
  const weekPct = Math.min(100, (thisWeek / weeklyGoal) * 100);
  const quote = quoteOfTheDay();
  const optionalDays = new Set((schedule || []).map((v, i) => (v === 'rest' || v === 'cardio_optional' ? i : -1)).filter(i => i >= 0));
  const streak = computeUserStats(history, optionalDays).streak;

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

  // Hero surface: orange block for strength, ice for cardio, slate for rest
  const hero = isRest
    ? { bg: 'bg-surface border border-line', fg: 'text-fg', muted: 'text-fg-muted', label: 'text-fg-muted' }
    : isAnyCardio
      ? { bg: 'bg-gradient-to-br from-sky-300 to-cyan-400', fg: 'text-[#0b1220]', muted: 'text-[#0b1220]/75', label: 'text-[#0b1220]/70' }
      : { bg: 'bg-gradient-to-br from-accent to-orange-600', fg: 'text-[#0b1220]', muted: 'text-[#0b1220]/75', label: 'text-[#0b1220]/70' };

  return (
    <div className="pt-3 animate-fade-in">
      {/* User strip */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onChangeAvatar} className="pressable flex items-center gap-3 text-left min-h-[44px] rounded-xl" aria-label="Profilbild ändern">
          <div className="relative">
            <Avatar user={user} size="md" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-surface-2 border border-line-2 rounded-full p-1" aria-hidden="true">
              <Camera className="w-2.5 h-2.5 text-fg" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-fg-muted">{todayName}</div>
            <div className="font-semibold text-fg leading-tight">{user.name}</div>
            {authEmail && <div className="text-[11px] text-fg-faint truncate max-w-[180px]">{authEmail}</div>}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <IconButton icon={KeyRound} label="Konto" onClick={onOpenAccount} className={authEmail ? '' : 'text-accent'} />
          <IconButton icon={LogOut} label="Abmelden" onClick={onLogout} />
        </div>
      </div>

      {!authEmail && !accountHintDismissed && (
        <Card className="mb-5 p-4 border-accent/40 bg-accent/[0.06] animate-fade-up">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl uppercase text-fg leading-none mb-1">Auch am Laptop trainieren?</div>
              <div className="text-xs text-fg-muted">Leg ein Konto an (E-Mail + Passwort), dann kannst du dich auf jedem Gerät bei diesem Profil einloggen.</div>
            </div>
            <button onClick={dismissAccountHint} aria-label="Hinweis ausblenden" className="pressable -mr-2 -mt-2 w-10 h-10 flex items-center justify-center text-fg-muted hover:text-fg">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <Button size="sm" className="w-full mt-3" icon={KeyRound} onClick={onOpenAccount}>Konto anlegen</Button>
        </Card>
      )}

      {loadError && (
        <Card className="mb-5 p-4 border-danger/40 bg-danger/[0.06] animate-fade-up" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl uppercase text-fg leading-none mb-1">Daten konnten nicht geladen werden</div>
              <div className="text-xs text-fg-muted break-words">{loadError}</div>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-3" onClick={onRetry} disabled={dataLoading}>
            {dataLoading ? 'Lade…' : 'Nochmal versuchen'}
          </Button>
        </Card>
      )}

      {unseen && <ReleaseCard release={release} onDismiss={markSeen} />}

      <div className="mb-5">
        <Wordmark size="lg" />
      </div>

      <ArcCard />

      {/* Today card */}
      <div className={`relative overflow-hidden rounded-[1.5rem] p-6 mb-4 ${hero.bg} ${isRest ? '' : 'shadow-[0_24px_60px_-24px_rgba(249,115,22,0.55)]'}`}>
        {!isRest && <div className="absolute inset-0 stripes pointer-events-none" aria-hidden="true" />}
        <div className="absolute -right-8 -top-8 opacity-[0.12] pointer-events-none" aria-hidden="true">
          {isAnyCardio ? <Heart className="w-48 h-48" /> : isRest ? <Snowflake className="w-48 h-48" /> : <Dumbbell className="w-48 h-48" />}
        </div>
        <div className="relative z-10">
          <div className={`label ${hero.label} mb-2`}>Heute</div>
          <div className={`font-display text-[2.75rem] uppercase leading-[0.92] mb-4 ${hero.fg}`}>{todayPlan.name}</div>

          <div className="mb-5 leading-snug">
            <div className={`${hero.muted} text-sm italic`}>„{quote.text}"</div>
            {quote.author && <div className={`${hero.label} text-xs mt-1`}>— {quote.author}</div>}
          </div>

          {!isRest && !isAnyCardio && (
            <div className={`${hero.fg} text-sm mb-5 font-semibold`}>{todayPlan.exercises.length} Übungen · ca. 60–75 Min</div>
          )}
          {isRest && <div className="text-fg-muted text-sm mb-2">Pausentag. Ruhe ist Teil des Plans – Muskeln wachsen lassen. Mobility oder ein lockeres Cardio sind trotzdem drin.</div>}
          {isAnyCardio && (
            <div className={`${hero.fg} text-sm mb-5`}>
              {isCardioOptional
                ? 'Cardio heute optional – wenn du Lust hast: 30 Min Zone-2 + Mobility.'
                : '30–40 Min Zone-2 Cardio, danach Mobility. Locker, du kannst noch reden.'}
              {cardioDoneToday && !mobilityDoneToday && (
                <div className="mt-2 text-xs font-bold flex items-center gap-1.5"><Check className="w-4 h-4" aria-hidden="true" /> Cardio erledigt – jetzt Mobility</div>
              )}
            </div>
          )}

          {!isRest && !doneToday && (
            <Button variant="dark" size="xl" className="w-full" onClick={handleStart} icon={Play}>
              Training starten
            </Button>
          )}

          {doneToday && !isRest && (
            <div className="bg-[#0b1220]/85 text-fg py-3.5 px-4 rounded-2xl flex items-center gap-2.5 text-sm font-semibold">
              <Check className="w-5 h-5 text-ok" aria-hidden="true" /> Heute schon erledigt. Stark.
            </div>
          )}
        </div>
      </div>

      {/* Week goal + stats */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-7">
        {dataLoading && history.length === 0 ? (
          <>
            <div className="skeleton w-[104px] h-[104px] rounded-full" />
            <div className="skeleton h-[104px]" />
            <div className="skeleton h-[104px]" />
          </>
        ) : (
          <>
            <Card className="p-2 flex items-center justify-center">
              <ProgressRing value={weekPct} size={88} stroke={8} color={thisWeek >= weeklyGoal ? '#22c55e' : '#f97316'} label="Wochenziel">
                <div className="font-display text-2xl leading-none tabular text-fg">{thisWeek}<span className="text-fg-faint text-base">/{weeklyGoal}</span></div>
                <div className="text-[9px] font-bold tracking-widest text-fg-faint uppercase mt-0.5">Woche</div>
              </ProgressRing>
            </Card>
            <Stat icon={Flame} iconClass="text-accent" value={<CountUp value={totalWorkouts} duration={800} />} label="Workouts" sub="gesamt" />
            <Stat icon={Target} iconClass="text-ice" value={weeklyGoal} label="Ziel" sub="pro Woche" />
          </>
        )}
      </div>

      {!(dataLoading && history.length === 0) && <LevelCard history={history} streak={streak} />}

      <GoldenRules userId={user.id} />

      {/* Quick actions */}
      <div className="mb-7">
        <SectionLabel>Schnellstart</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Heart, label: 'Cardio', sub: 'Zone-2 / HIIT', onClick: onStartCardio, cls: 'text-accent', badge: isAnyCardio },
            { icon: Activity, label: 'Mobility', sub: 'Fokus wählen', onClick: onStartMobility, cls: 'text-ok' },
            { icon: Plus, label: 'Frei', sub: 'Sport eintragen', onClick: onLogCustom, cls: 'text-ice' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={a.onClick} className="pressable card p-3.5 flex flex-col items-start gap-3 text-left min-h-[108px] hover:border-line-2 relative">
                {a.badge && <span className="absolute top-2.5 right-2.5 text-[9px] font-bold tracking-widest text-on-accent bg-accent px-1.5 py-0.5 rounded-md">HEUTE</span>}
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center" aria-hidden="true"><Icon className={`w-5 h-5 ${a.cls}`} strokeWidth={2.2} /></div>
                <div>
                  <div className="font-display text-xl uppercase text-fg leading-none">{a.label}</div>
                  <div className="text-[11px] text-fg-faint mt-1">{a.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strength days */}
      <div className="mb-6">
        <SectionLabel right={<span className="text-xs text-fg-faint flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" /> {strengthKeys.length} Krafttage</span>}>Krafttraining</SectionLabel>
        <div className="space-y-2.5">
          {strengthKeys.map(k => (
            <ListRow
              key={k}
              icon={Dumbbell}
              accentBar={PLAN[k].color}
              title={PLAN[k].name}
              badge={k === todayKey ? 'Heute' : null}
              subtitle={`${PLAN[k].exercises.length} Übungen`}
              onClick={() => onPickOther(k)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
