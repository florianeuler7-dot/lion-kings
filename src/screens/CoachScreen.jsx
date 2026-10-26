import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Sparkles, Send, Trash2 } from 'lucide-react';
import { coachChat } from '../supabase';
import { DAY_SHORT, STRENGTH_KEYS } from '../data/plan';
import { readJSON, writeJSON, removeKey } from '../lib/session';
import { Button, Dialog } from '../components/ui';

const greeting = (name) => ({
  role: 'assistant',
  content: `Hi ${name}! Ich bin dein Coach. Ich kenne deinen aktuellen Plan und kann dir helfen ihn anzupassen, neue Trainingsphasen zu starten, oder einfach Fragen beantworten.\n\nWas willst du machen?`,
});

// ── Shared chat thread (coach tab + onboarding) ──────────────────────────────
export function ChatThread({ messages, busy, className = '' }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  return (
    <div ref={scrollRef} className={`overflow-y-auto space-y-3 ${className}`}>
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
          <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
            m.role === 'user'
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-surface-2 border border-line text-zinc-100 rounded-bl-md'
          }`}>
            {m.content}
          </div>
        </div>
      ))}
      {busy && (
        <div className="flex justify-start">
          <div className="bg-surface-2 border border-line rounded-3xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }} />
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
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
        }}
        placeholder={placeholder}
        disabled={busy}
        rows={1}
        style={{ resize: 'none', overflow: 'hidden', maxHeight: 120 }}
        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }}
        className="input-field px-4 py-3 text-sm rounded-3xl"
      />
      <button onClick={onSend} disabled={busy || !value.trim()} aria-label="Senden"
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
          <div className="font-display text-3xl text-zinc-50 leading-none">DEIN PLAN</div>
        </div>
        <button onClick={onBack} disabled={busy} className="text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-3 py-2">zurück</button>
      </div>

      <div className="card p-4 mb-4">
        <div className="label mb-3">Wochenstruktur</div>
        <div className="grid grid-cols-7 gap-1">
          {schedule.map((key, i) => {
            const k = String(key || '').toLowerCase();
            const isRest = k.startsWith('rest') || !k;
            const isCardio = k.startsWith('cardio');
            return (
              <div key={i} className="bg-white/[0.03] border border-line rounded-lg p-1.5 text-center">
                <div className="text-[10px] font-bold text-zinc-500 mb-1.5">{DAY_SHORT[i]}</div>
                <div className={`mx-auto w-2 h-2 rounded-full ${isRest ? 'bg-zinc-700' : isCardio ? 'bg-ok' : 'bg-accent'}`} />
                <div className="text-[9px] text-zinc-400 mt-1.5 truncate">
                  {isRest ? 'Pause' : isCardio ? 'Cardio' : (plan[k]?.name?.split(' ')[0] || k)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 mb-4 max-h-[38vh] overflow-y-auto">
        {keys.length === 0 && (
          <div className="card-soft p-4 text-xs text-zinc-400">Dieser Plan enthält keine Kraft-Einheiten. Bitte den Coach um einen vollständigen Plan.</div>
        )}
        {keys.map(k => (
          <div key={k} className="card overflow-hidden">
            <button onClick={() => setOpen(open === k ? null : k)} className="w-full p-3 flex items-center justify-between">
              <div className="text-left">
                <div className="font-display text-base text-zinc-50">{plan[k].name.toUpperCase()}</div>
                <div className="text-xs text-zinc-500">{plan[k].exercises.length} Übungen</div>
              </div>
              <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${open === k ? 'rotate-90' : ''}`} />
            </button>
            {open === k && (
              <div className="px-3 pb-3 space-y-1 border-t border-line pt-2">
                {plan[k].exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-baseline py-1 gap-3">
                    <div className="text-xs text-zinc-200 truncate">{ex.name}</div>
                    <div className="font-mono text-xs text-accent whitespace-nowrap">{ex.sets} × {ex.reps}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onConfirm} disabled={busy || keys.length === 0} icon={busy ? undefined : Check}>
        {busy ? 'WIRD GESPEICHERT…' : 'PLAN ÜBERNEHMEN'}
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
      const { reply, plan } = await coachChat(next, planWithSchedule);
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
          <h1 className="font-display text-3xl leading-none text-accent">COACH</h1>
        </div>
        {messages.length > 1 && (
          <button onClick={() => setConfirmClear(true)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 py-2">
            <Trash2 className="w-3.5 h-3.5" /> Verlauf löschen
          </button>
        )}
      </div>

      <ChatThread messages={messages} busy={busy} className="flex-1 px-4 py-4" />

      {proposedPlan && (
        <div className="bg-ok/10 border-t border-ok/30 px-4 py-3 flex items-center gap-3 shrink-0 animate-fade-up">
          <Sparkles className="w-5 h-5 text-ok shrink-0" />
          <div className="flex-1 text-sm text-emerald-100">Neuer Plan vorbereitet</div>
          <Button variant="ok" size="sm" onClick={() => setReviewOpen(true)}>ANSEHEN</Button>
        </div>
      )}

      {messages.length <= 1 && (
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-1 shrink-0">
          {['Plan optimal für Cut?', 'Mehr Volumen Schultern', 'Plan für 4 Tage', 'Progressiv überlasten?'].map((q, i) => (
            <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
              className="pressable shrink-0 bg-white/[0.04] border border-line rounded-full px-3.5 py-2 text-xs font-medium text-zinc-300">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-line shrink-0 glass">
        <ChatInput value={input} onChange={setInput} onSend={send} busy={busy} inputRef={inputRef} />
      </div>

      {confirmClear && (
        <Dialog title="VERLAUF LÖSCHEN?" text="Der Chat-Verlauf wird unwiderruflich gelöscht.">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setConfirmClear(false)}>Abbrechen</Button>
            <Button variant="danger" size="md" className="flex-1" onClick={doClearChat}>Löschen</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
