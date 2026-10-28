import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Sparkles, Send, Trash2 } from 'lucide-react';
import { coachChat } from '../supabase';
import { DAY_SHORT, STRENGTH_KEYS } from '../data/plan';
import { readJSON, writeJSON, removeKey } from '../lib/session';
import { Button, Dialog } from '../components/ui';

const greeting = (name) => ({
  role: 'assistant',
  content: `Yo ${name}, dein Coach hier. Ich kenn deinen Plan und bin am Start: Plan anpassen, neue Phase starten oder einfach Fragen klären.\n\nIt's you versus you, Bre. Was machen wir heute?`,
});

// ── Shared chat thread (coach tab + onboarding) ──────────────────────────────
export function ChatThread({ messages, busy, className = '' }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);
  // While an answer streams in, the partial bubble replaces the typing indicator.
  const last = messages[messages.length - 1];
  const showTyping = busy && !(last?.partial && last.content);

  return (
    <div ref={scrollRef} className={`overflow-y-auto space-y-3 ${className}`}>
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
          <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
            m.role === 'user'
              ? 'bg-accent text-on-accent font-medium rounded-br-md'
              : 'bg-surface-2 border border-line text-fg rounded-bl-md'
          }`}>
            {m.content}
          </div>
        </div>
      ))}
      {showTyping && (
        <div className="flex justify-start">
          <div className="bg-surface-2 border border-line rounded-3xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatInput({ value, onChange, onSend, busy, placeholder = 'Frag deinen Coach…', inputRef }) {
  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          // Enter = new line; Ctrl/Cmd+Enter sends (so multi-line messages work on a laptop)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); }
        }}
        placeholder={placeholder}
        disabled={busy}
        rows={1}
        style={{ resize: 'none', overflow: 'hidden', maxHeight: 120 }}
        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }}
        className="input-field px-4 py-3 text-sm rounded-3xl"
      />
      <button onClick={onSend} disabled={busy || !value.trim()} aria-label="Senden" title="Senden (Strg+Enter)"
        className="pressable w-12 h-12 shrink-0 btn-primary rounded-full flex items-center justify-center disabled:opacity-40 disabled:shadow-none">
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Plan review (onboarding + coach) ─────────────────────────────────────────
export function PlanReview({ plan, onConfirm, onBack, busy }) {
  const [open, setOpen] = useState(null);
  const schedule = Array.isArray(plan.schedule) && plan.schedule.length === 7 ? plan.schedule : ['rest', 'push', 'pull', 'rest', 'legs', 'aesthetic', 'cardio'];
  const keys = STRENGTH_KEYS.filter(k => plan[k]?.exercises?.length > 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="label mb-1">Vorschau</div>
          <div className="font-display text-4xl uppercase text-fg leading-none">Dein Plan</div>
        </div>
        <button onClick={onBack} disabled={busy} className="text-fg-muted hover:text-fg text-sm font-bold px-3 py-2 min-h-[44px]">zurück</button>
      </div>

      <div className="card p-4 mb-4">
        <div className="label mb-3">Wochenstruktur</div>
        <div className="grid grid-cols-7 gap-1">
          {schedule.map((key, i) => {
            const k = String(key || '').toLowerCase();
            const isRest = k.startsWith('rest') || !k;
            const isCardio = k.startsWith('cardio');
            return (
              <div key={i} className="bg-surface-2/60 border border-line rounded-lg p-1.5 text-center">
                <div className="text-[10px] font-bold text-fg-muted mb-1.5">{DAY_SHORT[i]}</div>
                <div className={`mx-auto w-2 h-2 rounded-full ${isRest ? 'bg-surface-2' : isCardio ? 'bg-ok' : 'bg-accent'}`} />
                <div className="text-[9px] text-fg-muted mt-1.5 truncate">
                  {isRest ? 'Pause' : isCardio ? 'Cardio' : (plan[k]?.name?.split(' ')[0] || k)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 mb-4 max-h-[38vh] overflow-y-auto">
        {keys.length === 0 && (
          <div className="card-soft p-4 text-xs text-fg-muted">Dieser Plan enthält keine Kraft-Einheiten. Bitte den Coach um einen vollständigen Plan.</div>
        )}
        {keys.map(k => (
          <div key={k} className="card overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)} className="w-full p-3 flex items-center justify-between">
              <div className="text-left">
                <div className="font-display text-xl uppercase text-fg leading-none">{plan[k].name}</div>
                <div className="text-xs text-fg-muted">{plan[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-4 h-4 text-fg-muted transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-3 pb-3 space-y-1 border-t border-line pt-2">
                {plan[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-baseline py-1 gap-3">
                    <div className="text-xs text-fg truncate">{ex.name}</div>
                    <div className="font-mono text-xs text-accent whitespace-nowrap">{ex.sets} × {ex.reps}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="cta" className="w-full" onClick={onConfirm} disabled={busy || keys.length === 0} icon={busy ? undefined : Check}>
        {busy ? 'Wird gespeichert…' : 'Plan übernehmen'}
      </Button>
    </>
  );
}

// ── Coach tab ────────────────────────────────────────────────────────────────
export default function CoachScreen({ user, currentPlan, currentSchedule, onPlanSaved, showToast }) {
  const storageKey = `coach_chat_${user.id}`;
  const [messages, setMessages] = useState(() => {
    const cached = readJSON(storageKey, []);
    return cached.length ? cached : [greeting(user.name)];
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposedPlan, setProposedPlan] = useState(() => readJSON(`${storageKey}_plan`, null));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef(null);

  // Keyboard avoiding via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  useEffect(() => { writeJSON(storageKey, messages); }, [messages, storageKey]);
  useEffect(() => {
    if (proposedPlan) writeJSON(`${storageKey}_plan`, proposedPlan); else removeKey(`${storageKey}_plan`);
  }, [proposedPlan, storageKey]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setBusy(true);
    try {
      const planWithSchedule = { ...currentPlan, schedule: currentSchedule };
      const { reply, plan } = await coachChat(next, planWithSchedule, false,
        partial => partial && setMessages([...next, { role: 'assistant', content: partial, partial: true }]));
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (plan) setProposedPlan(plan);
    } catch (e) {
      console.error(e);
      setMessages([...next, { role: 'assistant', content: `Hmm, da ist was schiefgelaufen (${e.message}). Versuch's nochmal.` }]);
    }
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const doClearChat = () => {
    setMessages([greeting(user.name)]);
    setProposedPlan(null);
    setConfirmClear(false);
    removeKey(storageKey);
  };

  const acceptPlan = async () => {
    const plan = proposedPlan;
    setBusy(true);
    // Clear first: onPlanSaved navigates away and unmounts this screen,
    // so a cleanup after the await would never run and the banner would reappear.
    setProposedPlan(null);
    removeKey(`${storageKey}_plan`);
    try {
      await onPlanSaved(plan);
      setReviewOpen(false);
    } catch (e) {
      setProposedPlan(plan); // keep it so the user can retry
    }
    setBusy(false);
  };

  const kbStyle = keyboardOffset > 0 ? { bottom: `${keyboardOffset}px` } : {};

  if (reviewOpen && proposedPlan) {
    return (
      <div className="coach-screen safe-top overflow-y-auto" style={kbStyle}>
        <div className="px-5 pt-6 pb-8 max-w-2xl mx-auto w-full">
          <PlanReview plan={proposedPlan} onConfirm={acceptPlan} onBack={() => setReviewOpen(false)} busy={busy} />
        </div>
      </div>
    );
  }

  return (
    <div className="coach-screen safe-top" style={kbStyle}>
      <div className="px-5 pt-5 pb-3 flex items-end justify-between border-b border-line shrink-0 glass">
        <div>
          <div className="label mb-1">Dein</div>
          <h1 className="font-display text-4xl uppercase leading-none text-accent">Coach</h1>
        </div>
        {messages.length > 1 && (
          <button onClick={() => setConfirmClear(true)} className="text-xs font-bold text-fg-muted hover:text-fg flex items-center gap-1.5 py-2 min-h-[44px]">
            <Trash2 className="w-3.5 h-3.5" /> Verlauf löschen
          </button>
        )}
      </div>

      <ChatThread messages={messages} busy={busy} className="flex-1 px-4 py-4" />

      {proposedPlan && (
        <div className="bg-ok/10 border-t border-ok/30 px-4 py-3 flex items-center gap-3 shrink-0 animate-fade-up">
          <Sparkles className="w-5 h-5 text-ok shrink-0" />
          <div className="flex-1 text-sm text-fg">Neuer Plan vorbereitet</div>
          <Button variant="cta" size="sm" onClick={() => setReviewOpen(true)}>Ansehen</Button>
        </div>
      )}

      {messages.length <= 1 && (
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-1 shrink-0">
          {['Plan optimal für Cut?', 'Mehr Volumen Schultern', 'Plan für 4 Tage', 'Progressiv überlasten?'].map((q, i) => (
            <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
              className="pressable shrink-0 bg-surface border border-line rounded-full px-3.5 min-h-[40px] text-sm font-semibold text-fg">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-line shrink-0 glass">
        <ChatInput value={input} onChange={setInput} onSend={send} busy={busy} inputRef={inputRef} />
      </div>

      {confirmClear && (
        <Dialog title="Verlauf löschen?" text="Der Chat-Verlauf wird unwiderruflich gelöscht.">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setConfirmClear(false)}>Abbrechen</Button>
            <Button variant="danger" size="md" className="flex-1" onClick={doClearChat}>Löschen</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
