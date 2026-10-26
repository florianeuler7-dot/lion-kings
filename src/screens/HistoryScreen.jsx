import React, { useRef, useState } from 'react';
import { Dumbbell, ChevronDown, Heart, Activity, StickyNote, Forward, Trash2 } from 'lucide-react';
import { ScreenHeader, Button, Dialog, Empty } from '../components/ui';
import { formatDuration, mergeCardioMobilityPairs, heaviestOf } from '../lib/workouts';
import { relativeTime } from '../lib/date';

export default function HistoryScreen({ history, onDelete }) {
  const entries = mergeCardioMobilityPairs([...history]).sort((a, b) => new Date(b.date) - new Date(a.date));
  const [expanded, setExpanded] = useState(new Set());
  const [swipedId, setSwipedId] = useState(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState(null);
  const swipeStartX = useRef(0);

  const toggle = (id) => {
    if (swipedId) { setSwipedId(null); return; }
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allExpanded = entries.length > 0 && entries.every(e => expanded.has(e.id));
  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(entries.map(e => e.id)));
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="pt-3 animate-fade-in">
        <ScreenHeader eyebrow="Dein" title="VERLAUF" />
        <Empty icon={Dumbbell} title="Noch kein Training" text="Starte dein erstes Workout auf dem Home-Tab." />
      </div>
    );
  }

  return (
    <div className="pt-3 animate-fade-in">
      {confirmDeleteIds && (
        <Dialog title="WORKOUT LÖSCHEN?" text="Das kann nicht rückgängig gemacht werden.">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => { setConfirmDeleteIds(null); setSwipedId(null); }}>Abbrechen</Button>
            <Button variant="danger" size="md" className="flex-1" icon={Trash2} onClick={() => { onDelete(confirmDeleteIds); setConfirmDeleteIds(null); setSwipedId(null); }}>Löschen</Button>
          </div>
        </Dialog>
      )}

      <ScreenHeader
        eyebrow={`${entries.length} Einheiten`}
        title="VERLAUF"
        right={
          <button onClick={toggleAll} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            {allExpanded ? 'Alle zuklappen' : 'Alle ausklappen'}
          </button>
        }
      />

      <div className="space-y-3">
        {entries.map((e) => {
          const isOpen = expanded.has(e.id);
          const isSwiped = swipedId === e.id;
          const isCombined = e.isCardio && e.isMobility;
          const dur = formatDuration(e.duration);
          const ids = e._allIds || [e.id];
          return (
            <div key={e.id} className="relative rounded-card overflow-hidden">
              {/* Delete button revealed by swipe */}
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-accent flex items-center justify-center rounded-r-card">
                <button onClick={() => setConfirmDeleteIds(ids)} className="flex flex-col items-center gap-1">
                  <Trash2 className="w-5 h-5 text-white" />
                  <span className="text-[10px] font-semibold text-white">Löschen</span>
                </button>
              </div>
              <div
                className="card"
                style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}
                onTouchStart={e2 => { swipeStartX.current = e2.touches[0].clientX; }}
                onTouchEnd={e2 => {
                  const delta = e2.changedTouches[0].clientX - swipeStartX.current;
                  if (delta < -40) setSwipedId(e.id);
                  else if (delta > 20) setSwipedId(null);
                }}
              >
                <button onClick={() => toggle(e.id)} className="w-full p-4 flex items-center gap-3 text-left">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-line flex items-center justify-center shrink-0">
                    {isCombined ? <Heart className="w-5 h-5 text-accent" />
                      : e.isCardio ? <Heart className="w-5 h-5 text-accent" />
                      : e.isMobility ? <Activity className="w-5 h-5 text-ok" />
                      : <Dumbbell className="w-5 h-5 text-zinc-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl leading-tight text-zinc-50 truncate">{e.planName.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {relativeTime(e.date)}{dur ? ` · ${dur}` : ''}
                    </div>
                  </div>
                  <ChevronDown
                    className="w-5 h-5 text-zinc-600 shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                <div style={{ maxHeight: isOpen ? 2000 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <div className="px-4 pb-4 border-t border-line">
                    {isCombined ? (
                      <div className="space-y-2 pt-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Heart className="w-4 h-4 text-accent" /> {dur || '—'} Cardio
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Activity className="w-4 h-4 text-ok" /> {e.completed} / {e.total} Mobility-Übungen
                        </div>
                      </div>
                    ) : e.isCardio ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-400 pt-4">
                        <Heart className="w-4 h-4 text-accent" /> {dur || '—'} Cardio absolviert
                      </div>
                    ) : e.isMobility ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-400 pt-4">
                        <Activity className="w-4 h-4 text-ok" /> {e.completed} / {e.total} Mobility-Übungen
                      </div>
                    ) : (
                      <div className="space-y-1 pt-3">
                        {(e.logs || []).filter(l => l.sets?.length > 0).map((l, j) => (
                          <div key={j} className="py-2 border-t border-line first:border-t-0 first:pt-0">
                            <div className="flex justify-between text-sm gap-3">
                              <span className="text-zinc-300 truncate">{l.name}</span>
                              <span className="text-zinc-100 font-mono shrink-0">{l.sets.length} × {heaviestOf(l.sets)} kg</span>
                            </div>
                            {l.note && (
                              <div className="flex items-start gap-1.5 mt-1">
                                <StickyNote className="w-3 h-3 text-gold/70 mt-0.5 shrink-0" />
                                <span className="text-xs text-gold/80 italic">{l.note}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!e.logs || e.logs.every(l => !l.sets?.length)) && (
                          <div className="text-xs text-zinc-500 pt-1">Freies Training{dur ? ` · ${dur}` : ''}</div>
                        )}
                        {e.skippedExercises && e.skippedExercises.length > 0 && (
                          <div className="pt-2 border-t border-line">
                            <div className="text-xs text-accent-2 mb-1 flex items-center gap-1 font-semibold">
                              <Forward className="w-3 h-3" /> Übersprungen
                            </div>
                            {e.skippedExercises.map((name, k) => (
                              <div key={k} className="text-xs text-zinc-500">{name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {e.notes && (
                      <div className="mt-3 pt-3 border-t border-line flex gap-2">
                        <StickyNote className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div className="text-xs text-zinc-300 italic">{e.notes}</div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-line flex justify-end">
                      <button onClick={() => setConfirmDeleteIds(ids)} className="text-xs text-zinc-500 hover:text-accent flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
