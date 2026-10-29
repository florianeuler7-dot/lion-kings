import React, { useState } from 'react';
import { ChevronRight, Heart, Sparkles, FileText } from 'lucide-react';
import { ScreenHeader, Card, SectionLabel, Button, Sheet, ErrorText } from '../components/ui';
import { DAY_SHORT, STRENGTH_KEYS } from '../data/plan';
import { parsePlanText } from '../supabase';
import { PlanReview } from './CoachScreen';

// Paste an existing plan as free text → coach structures it → review → save
function ImportSheet({ onClose, onPlanSaved }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null);

  const parse = async () => {
    if (text.trim().length < 30) { setError('Plan zu kurz – beschreibe ihn etwas detaillierter.'); return; }
    setBusy(true); setError('');
    try {
      setParsed(await parsePlanText(text));
    } catch (e) {
      console.error(e);
      setError(e.message || 'Plan konnte nicht verarbeitet werden.');
    }
    setBusy(false);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onPlanSaved(parsed); // navigates + toasts; throws on failure
      onClose();
    } catch (e) { /* toast shown by caller, keep the sheet open */ }
    setBusy(false);
  };

  return (
    <Sheet onClose={busy ? undefined : onClose} title="Plan importieren" className="max-h-[92vh] overflow-y-auto">
      {parsed ? (
        <PlanReview plan={parsed} onConfirm={confirm} onBack={() => setParsed(null)} busy={busy} />
      ) : (
        <>
          <div className="label mb-1">Import</div>
          <div className="font-display text-3xl uppercase text-fg leading-none mb-2">Plan als Text</div>
          <div className="text-sm text-fg-muted mb-4">
            Bestehenden Plan einfügen – Übungen, Sätze, Wiederholungen, gern mit Wochentagen. Der Coach strukturiert ihn.
          </div>
          <label htmlFor="plan-import-text" className="sr-only">Plan als Text</label>
          <textarea
            id="plan-import-text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`z.B.\n\nMo: Push\nBankdrücken 4x6-8\nSchulterdrücken 3x8\n\nDi: Pull\n...`}
            rows={8}
            autoFocus
            disabled={busy}
            className="input-field px-4 py-3 text-base mb-3 font-mono"
          />
          <ErrorText className="mb-3">{error}</ErrorText>
          <Button className="w-full mb-2" onClick={parse} disabled={busy || text.trim().length < 30}>
            {busy ? 'Coach liest…' : 'Plan verarbeiten'}
          </Button>
          <Button variant="ghost" size="md" className="w-full" onClick={onClose} disabled={busy}>Abbrechen</Button>
        </>
      )}
    </Sheet>
  );
}

export default function PlanScreen({ plan: PLAN, schedule, onOpenCoach, onPlanSaved }) {
  const [open, setOpen] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const todayDow = new Date().getDay();
  const strengthKeys = STRENGTH_KEYS.filter(k => PLAN[k]?.exercises?.length > 0);
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="pt-3 animate-fade-in">
      <ScreenHeader eyebrow="Übersicht" title="Der Plan" />

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
                <div className={`w-7 text-[11px] font-bold tracking-widest ${isToday ? 'text-accent' : 'text-fg-muted'}`}>{DAY_SHORT[dow]}</div>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRest ? 'bg-line-2' : isCardio ? 'bg-ice' : 'bg-accent'}`} aria-hidden="true" />
                <div className={`text-sm flex-1 truncate ${isRest ? 'text-fg-muted' : 'text-fg font-medium'}`}>
                  {block?.name || key}
                </div>
                {isToday && <span className="text-[10px] font-bold tracking-widest text-on-accent bg-accent px-1.5 py-0.5 rounded-md">HEUTE</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-2.5 mb-5">
        {strengthKeys.map(k => (
          <Card key={k} className="overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className="w-full p-4 flex items-center gap-4 min-h-[64px]">
              <div className={`w-2 self-stretch rounded-full bg-gradient-to-b ${PLAN[k].color}`} />
              <div className="text-left flex-1 min-w-0">
                <div className="font-display text-2xl uppercase text-fg leading-none truncate">{PLAN[k].name}</div>
                <div className="text-xs text-fg-muted">{PLAN[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-5 h-5 text-fg-muted transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-4 pb-4 border-t border-line pt-3">
                {PLAN[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-line last:border-0">
                    <div className="min-w-0">
                      <div className="text-fg text-sm font-medium">{ex.name}</div>
                      {ex.hint && <div className="text-fg-muted text-xs mt-0.5">{ex.hint}</div>}
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
            <div className="w-2 self-stretch rounded-full bg-gradient-to-b from-sky-300 to-cyan-500" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-ice" aria-hidden="true" />
              <div className="font-display text-2xl uppercase text-fg leading-none">Cardio</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-fg-muted pl-6">
            <div className="flex items-start gap-2">
              <span className="text-ice font-bold w-12 shrink-0">Zone-2</span>
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
        <SectionLabel>Ernährung Cut</SectionLabel>
        <div className="space-y-1 text-sm">
          {[
            ['Kalorien', '2.200–2.400 kcal'], ['Protein', '180–200 g'], ['Fett', '70–80 g'],
            ['Carbs', '200–250 g'], ['Wasser', '3–4 L'], ['Schritte', '8–10k'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-line last:border-0">
              <span className="text-fg-muted">{k}</span><span className="font-mono text-fg">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-2">
        {onOpenCoach && (
          <Button variant="secondary" size="md" className="w-full" icon={Sparkles} onClick={onOpenCoach}>
            Plan mit dem Coach anpassen
          </Button>
        )}
        {onPlanSaved && (
          <Button variant="ghost" size="md" className="w-full" icon={FileText} onClick={() => setImportOpen(true)}>
            Bestehenden Plan als Text importieren
          </Button>
        )}
      </div>

      {importOpen && <ImportSheet onClose={() => setImportOpen(false)} onPlanSaved={onPlanSaved} />}
    </div>
  );
}
