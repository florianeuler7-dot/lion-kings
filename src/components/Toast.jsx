import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, Droplet, Info, AlertTriangle } from 'lucide-react';

// Minimal, non-blocking notices. Used for errors (so failures are never silent),
// drink reminders and a couple of confirmations.
const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  check: { Icon: Check, cls: 'text-ok' },
  drink: { Icon: Droplet, cls: 'text-sky-400' },
  info: { Icon: Info, cls: 'text-zinc-300' },
  error: { Icon: AlertTriangle, cls: 'text-accent' },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((msg, kind = 'info', ms) => {
    if (!msg) return;
    clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), ms || (kind === 'error' ? 4500 : 2800));
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { Icon, cls } = ICONS[toast?.kind] || ICONS.info;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          onClick={() => setToast(null)}
          className="fixed left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <div className="pointer-events-auto glass border border-line-2 rounded-full pl-3 pr-4 py-2.5 flex items-center gap-2.5 shadow-2xl animate-fade-up max-w-sm">
            <Icon className={`w-4 h-4 shrink-0 ${cls}`} />
            <span className="text-sm text-zinc-100 leading-snug">{toast.msg}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
