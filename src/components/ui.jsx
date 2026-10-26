import React from 'react';
import { ChevronRight } from 'lucide-react';

// ── Layout primitives ────────────────────────────────────────────────────────

// Screen header: small label + big display title
export function ScreenHeader({ eyebrow, title, accent, right, className = '' }) {
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="label mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-[2.75rem] leading-[0.95] text-zinc-50">
          {title}
          {accent && <><br /><span className="text-accent">{accent}</span></>}
        </h1>
      </div>
      {right && <div className="shrink-0 pb-1">{right}</div>}
    </div>
  );
}

export function SectionLabel({ children, className = '' }) {
  return <div className={`label mb-3 ${className}`}>{children}</div>;
}

export function Card({ children, className = '', soft = false, ...rest }) {
  return (
    <div className={`${soft ? 'card-soft' : 'card'} ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const VARIANTS = {
  primary: 'btn-primary',
  gold: 'btn-gold',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  ok: 'bg-ok text-zinc-950 rounded-2xl shadow-[0_10px_40px_-10px_rgba(34,197,94,0.5)]',
  danger: 'bg-accent text-white rounded-2xl',
  warn: 'bg-accent-2 text-white rounded-2xl',
};

export function Button({ variant = 'primary', size = 'lg', className = '', children, icon: Icon, ...rest }) {
  const sizes = {
    sm: 'px-3 py-2 text-xs font-semibold',
    md: 'px-4 py-3 text-sm font-semibold',
    lg: 'px-5 py-4 font-display text-xl tracking-wide',
    xl: 'px-6 py-5 font-display text-2xl tracking-wide',
  };
  return (
    <button
      className={`pressable inline-flex items-center justify-center gap-2.5 ${VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'} />}
      {children}
    </button>
  );
}

// Icon-only tap target (44px minimum)
export function IconButton({ icon: Icon, className = '', label, ...rest }) {
  return (
    <button
      aria-label={label}
      className={`pressable inline-flex items-center justify-center w-11 h-11 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-white/5 ${className}`}
      {...rest}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

// ── List row used on Home / Plan / Mobility ──────────────────────────────────
export function ListRow({ icon, iconClass = 'text-accent', title, subtitle, badge, onClick, className = '', right }) {
  return (
    <button
      onClick={onClick}
      className={`pressable card w-full p-4 flex items-center gap-4 text-left hover:border-line-2 ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-line flex items-center justify-center shrink-0">
          {typeof icon === 'string'
            ? <span className="text-2xl leading-none">{icon}</span>
            : React.createElement(icon, { className: `w-5 h-5 ${iconClass}` })}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-display text-xl text-zinc-50 leading-tight flex items-center gap-2 min-w-0">
          <span className="line-clamp-2">{title}</span>
          {badge && <span className="text-[10px] font-body font-bold tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">{badge}</span>}
        </div>
        {subtitle && <div className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</div>}
      </div>
      {right ?? <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />}
    </button>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-line ${className}`}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors ${
            value === o.value ? 'bg-zinc-100 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
export function Stat({ icon: Icon, iconClass = 'text-accent', value, label, className = '' }) {
  return (
    <Card className={`p-4 ${className}`}>
      {Icon && <Icon className={`w-5 h-5 mb-3 ${iconClass}`} />}
      <div className="font-display text-3xl text-zinc-50 leading-none tabular">{value}</div>
      <div className="label mt-2">{label}</div>
    </Card>
  );
}

// ── Progress ring ────────────────────────────────────────────────────────────
export function ProgressRing({ value = 0, size = 220, stroke = 10, color = '#ef4444', track = 'rgba(255,255,255,0.08)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, color = 'bg-accent', className = '' }) {
  return (
    <div className={`h-1.5 bg-white/[0.06] rounded-full overflow-hidden ${className}`}>
      <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ── Modal (bottom sheet on mobile) ───────────────────────────────────────────
export function Sheet({ onClose, children, className = '' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div
        className={`glass border-t sm:border border-line-2 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 safe-bottom animate-fade-up ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-5 sm:hidden" />
        {children}
      </div>
    </div>
  );
}

// Centered confirm dialog
export function Dialog({ title, text, children, className = '' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
      <div className={`card p-6 w-full max-w-sm animate-pop ${className}`}>
        {title && <div className="font-display text-2xl text-zinc-50 leading-tight mb-2">{title}</div>}
        {text && <div className="text-sm text-zinc-400 mb-5">{text}</div>}
        {children}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, emoji, title, text }) {
  return (
    <div className="card-soft flex flex-col items-center justify-center py-14 px-6 text-center">
      {Icon && <Icon className="w-10 h-10 text-zinc-700 mb-4" />}
      {emoji && <div className="text-4xl mb-4">{emoji}</div>}
      <div className="font-display text-xl text-zinc-300 mb-1">{title}</div>
      {text && <div className="text-xs text-zinc-500">{text}</div>}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

// ── Error line ───────────────────────────────────────────────────────────────
export function ErrorText({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-2 text-sm text-red-400 ${className}`}>
      <span className="mt-0.5">⚠︎</span>
      <span>{children}</span>
    </div>
  );
}
