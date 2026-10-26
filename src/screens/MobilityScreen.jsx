import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, X, ArrowLeft, PersonStanding, Hand, StretchVertical, MoveVertical, Activity, Brain } from 'lucide-react';
import { MOBILITY } from '../data/mobility';
import { setLiveStatus } from '../supabase';
import { Button, ListRow, ProgressBar, IconButton } from '../components/ui';

const ICONS = { PersonStanding, Hand, StretchVertical, MoveVertical, Activity, Brain };
const iconFor = (name) => ICONS[name] || Activity;

export default function MobilityScreen({ onFinish, onCancel, user, combinedFlow }) {
  const [focus, setFocus] = useState(combinedFlow ? 'fullbody' : null);
  const [done, setDone] = useState({});
  const [openIdx, setOpenIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);

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
    if (!done[idx]) {
      const program = MOBILITY[focus];
      const nextIdx = program.exercises.findIndex((_, i) => i > idx && !next[i]);
      if (nextIdx !== -1) setOpenIdx(nextIdx);
    }
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    const program = MOBILITY[focus];
    const completed = Object.values(done).filter(Boolean).length;
    try { await onFinish(focus, completed, program.exercises.length); } finally { setFinishing(false); }
  };

  // Focus selection screen
  if (!focus) {
    return (
      <div className="min-h-screen flex flex-col animate-fade-in">
        <div className="pt-2 pb-3 flex items-center justify-between">
          <div className="w-11" />
          <div className="label">Mobility</div>
          <IconButton icon={X} label="Abbrechen" onClick={onCancel} />
        </div>

        <div className="mb-6">
          <div className="label mb-2">Fokus wählen</div>
          <h2 className="font-display text-[2.75rem] uppercase text-fg leading-[0.92]">Was<br /><span className="text-ok">mobilisieren?</span></h2>
        </div>

        <div className="space-y-2.5">
          {Object.entries(MOBILITY).map(([key, prog]) => (
            <ListRow
              key={key}
              icon={iconFor(prog.icon)}
              iconClass="text-ok"
              title={prog.name}
              subtitle={`${prog.description} · ${prog.exercises.length} Übungen`}
              onClick={() => setFocus(key)}
            />
          ))}
        </div>
      </div>
    );
  }

  const program = MOBILITY[focus];
  const ProgIcon = iconFor(program.icon);
  const completedCount = Object.values(done).filter(Boolean).length;
  const totalCount = program.exercises.length;
  const allDone = completedCount === totalCount;

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      <div className="pt-2 pb-3 flex items-center justify-between">
        <IconButton icon={ArrowLeft} label="Fokus wechseln" onClick={() => { setFocus(null); setDone({}); setOpenIdx(0); }} />
        <div className="text-xs font-bold text-fg-muted tabular">{completedCount} / {totalCount}</div>
        <IconButton icon={X} label="Abbrechen" onClick={onCancel} />
      </div>

      <ProgressBar value={(completedCount / totalCount) * 100} color="bg-ok" className="mb-6" label="Mobility Fortschritt" />

      <div className="mb-6">
        <div className="label text-ok mb-2 flex items-center gap-2">
          <ProgIcon className="w-4 h-4" aria-hidden="true" /> Mobility
        </div>
        <h2 className="font-display text-[2.5rem] uppercase text-fg leading-[0.92]">{program.name}<br /><span className="text-ok">Flow</span></h2>
      </div>

      <div className="space-y-2.5 mb-6">
        {program.exercises.map((ex, idx) => {
          const isDone = !!done[idx];
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={`rounded-card border overflow-hidden transition-colors ${isDone ? 'bg-ok/10 border-ok/40' : 'card'}`}>
              <div className="w-full p-3 flex items-center gap-3 text-left">
                <button onClick={() => toggleDone(idx)} aria-pressed={isDone} aria-label={`${ex.name} ${isDone ? 'als offen markieren' : 'als erledigt markieren'}`}
                  className={`pressable shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-ok border-ok' : 'border-line-2'}`}>
                  {isDone && <Check className="w-5 h-5 text-on-ok" strokeWidth={3} aria-hidden="true" />}
                </button>
                <button onClick={() => setOpenIdx(isOpen ? -1 : idx)} aria-expanded={isOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-[44px]">
                  <div className="flex-1 min-w-0">
                    <div className={`font-display text-xl uppercase leading-none ${isDone ? 'text-fg-muted line-through' : 'text-fg'}`}>
                      {ex.name}
                    </div>
                    <div className="text-xs text-ok font-semibold mt-1">{ex.duration}</div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-fg-faint transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-line">
                  <div className="label mb-2 mt-3">Anleitung</div>
                  <ol className="space-y-2">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-fg leading-relaxed">
                        <span className="font-mono text-ok shrink-0 mt-0.5">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {!isDone && (
                    <Button variant="cta" size="md" className="mt-4 w-full" icon={Check} onClick={() => toggleDone(idx)}>
                      Als erledigt markieren
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button variant={allDone ? 'cta' : 'secondary'} className="w-full" onClick={handleFinish} icon={Check} disabled={finishing}>
        {allDone ? 'Komplett fertig' : `Beenden (${completedCount}/${totalCount})`}
      </Button>

      <div className="mt-4 mb-2 text-fg-faint text-xs text-center">
        Mobility ist kein Sprint – atme tief und nimm dir Zeit.
      </div>
    </div>
  );
}
