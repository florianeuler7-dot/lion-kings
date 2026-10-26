import React, { useState } from 'react';
import { ChevronRight, Heart, Sparkles } from 'lucide-react';
import { ScreenHeader, Card, SectionLabel, Button } from '../components/ui';
import { DAY_SHORT, STRENGTH_KEYS } from '../data/plan';

export default function PlanScreen({ plan: PLAN, schedule, onOpenCoach }) {
  const [open, setOpen] = useState(null);
  const todayDow = new Date().getDay();
  const strengthKeys = STRENGTH_KEYS.filter(k => PLAN[k]?.exercises?.length > 0);
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="pt-3 animate-fade-in">
      <ScreenHeader eyebrow="Übersicht" title="DER PLAN" />

      <Card className="p-5 mb-5">
        <SectionLabel>Wochenstruktur</SectionLabel>
        <div className="space-y-1">
          {weekOrder.map(dow => {
            const key = schedule[dow];
            const block = PLAN[key];
            const isToday = dow === todayDow;
            const isRest = key === 'rest';
            const isCardio = key === 'cardio' || key === 'cardio_optional';
            return (
              <div key={dow} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isToday ? 'bg-accent/10 border border-accent/40' : ''}`}>
                <div className={`w-7 text-[11px] font-bold tracking-widest ${isToday ? 'text-accent' : 'text-zinc-500'}`}>{DAY_SHORT[dow]}</div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${isRest ? 'bg-zinc-700' : isCardio ? 'bg-ok' : 'bg-accent'}`} />
                <div className={`text-sm flex-1 truncate ${isRest ? 'text-zinc-500' : 'text-zinc-100 font-medium'}`}>
                  {block?.name || key}
                </div>
                {isToday && <span className="text-[10px] font-bold tracking-widest text-accent">HEUTE</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-2.5 mb-5">
        {strengthKeys.map(k => (
          <Card key={k} className="overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)} className="w-full p-4 flex items-center gap-4">
              <div className={`w-2 self-stretch rounded-full bg-gradient-to-b ${PLAN[k].color}`} />
              <div className="text-left flex-1 min-w-0">
                <div className="font-display text-2xl text-zinc-50 leading-tight truncate">{PLAN[k].name.toUpperCase()}</div>
                <div className="text-xs text-zinc-500">{PLAN[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-4 pb-4 border-t border-line pt-3">
                {PLAN[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-line last:border-0">
                    <div className="min-w-0">
                      <div className="text-zinc-100 text-sm font-medium">{ex.name}</div>
                      {ex.hint && <div className="text-zinc-500 text-xs mt-0.5">{ex.hint}</div>}
                    </div>
                    <div className="font-mono text-xs text-accent whitespace-nowrap pt-0.5">{ex.sets} × {ex.reps}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        <Card className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-2 self-stretch rounded-full bg-gradient-to-b from-emerald-600 to-teal-700" />
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-ok" />
              <div className="font-display text-2xl text-zinc-50">CARDIO</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-zinc-400 pl-6">
            <div className="flex items-start gap-2">
              <span className="text-ok font-bold w-12 shrink-0">Zone-2</span>
              <span>30–40 Min locker – du kannst noch reden, konstantes Tempo</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold w-12 shrink-0">HIIT</span>
              <span>Intervalle – kurze Belastungsspitzen, dann Erholung</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <SectionLabel className="text-accent">Ernährung Cut</SectionLabel>
        <div className="space-y-1 text-sm">
          {[
            ['Kalorien', '2.200–2.400 kcal'], ['Protein', '180–200 g'], ['Fett', '70–80 g'],
            ['Carbs', '200–250 g'], ['Wasser', '3–4 L'], ['Schritte', '8–10k'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-line last:border-0">
              <span className="text-zinc-500">{k}</span><span className="font-mono text-zinc-100">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {onOpenCoach && (
        <Button variant="secondary" size="md" className="w-full" icon={Sparkles} onClick={onOpenCoach}>
          Plan mit dem Coach anpassen
        </Button>
      )}
    </div>
  );
}
