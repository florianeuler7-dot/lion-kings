import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, AlertCircle, Trophy } from 'lucide-react';
import { ARC } from '../data/arc';

// ── Brand ────────────────────────────────────────────────────────────────────
// "WINTER ARC" wordmark with the season tag. sizes: sm | md | lg | xl
export function Wordmark({ size = 'lg', stacked = true, className = '' }) {
  const sizes = {
    sm: { text: 'text-2xl', tag: 'text-[9px] px-1.5 py-0.5' },
    md: { text: 'text-4xl', tag: 'text-[10px] px-2 py-0.5' },
    lg: { text: 'text-[3.75rem]', tag: 'text-xs px-2 py-0.5' },
    xl: { text: 'text-[4.5rem]', tag: 'text-xs px-2.5 py-1' },
  };
  const s = sizes[size] || sizes.lg;
  return (
    <div className={`font-display leading-[0.86] tracking-tight uppercase ${s.text} ${className}`}>
      <span className="text-fg">{ARC.name.replace('Arc', '')}</span>
      {stacked ? <br /> : ' '}
      <span className="text-accent">Arc</span>
      <span className={`inline-block align-top ml-2 mt-1 font-body font-bold tracking-widest rounded-md bg-ice/15 text-ice border border-ice/30 ${s.tag}`}>
        {ARC.season}
      </span>
    </div>
  );
}

// ── Layout primitives ────────────────────────────────────────────────────────
export function ScreenHeader({ eyebrow, title, accent, right, className = '' }) {
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="label mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-[2.75rem] leading-[0.92] text-fg uppercase tracking-tight">
          {title}
          {accent && <><br /><span className="text-accent">{accent}</span></>}
        </h1>
      </div>
      {right && <div className="shrink-0 pb-1">{right}</div>}
    </div>
  );
}

export function SectionLabel({ children, className = '', right }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div className="label">{children}</div>
      {right}
    </div>
  );
}

export function Card({ children, className = '', soft = false, ...rest }) {
  return (
    <div className={`${soft ? 'card-soft' : 'card'} ${className}`} {...rest}>
      {children}
    </div>
  );
}

// Square icon container used in rows and tiles
export function IconTile({ icon: Icon, className = '', iconClass = 'text-accent', size = 'md' }) {
  const box = size === 'lg' ? 'w-14 h-14 rounded-2xl' : size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-11 h-11 rounded-2xl';
  const ico = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`${box} bg-surface-2 border border-line flex items-center justify-center shrink-0 ${className}`} aria-hidden="true">
      <Icon className={`${ico} ${iconClass}`} strokeWidth={2.2} />
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const VARIANTS = {
  primary: 'btn-primary',
  cta: 'btn-cta',
  ok: 'btn-cta',
  gold: 'btn-gold',
  dark: 'btn-dark',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'bg-danger text-white rounded-2xl hover:bg-red-400',
  warn: 'bg-accent text-on-accent rounded-2xl',
};

export function Button({ variant = 'primary', size = 'lg', className = '', children, icon: Icon, ...rest }) {
  const sizes = {
    sm: 'min-h-[40px] px-3.5 py-2 text-xs font-bold tracking-wide uppercase',
    md: 'min-h-[48px] px-4 py-3 text-sm font-bold',
    lg: 'min-h-[56px] px-5 py-3.5 font-display text-2xl uppercase tracking-wide',
    xl: 'min-h-[64px] px-6 py-4 font-display text-[1.75rem] uppercase tracking-wide',
  };
  return (
    <button
      className={`pressable inline-flex items-center justify-center gap-2.5 ${VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </button>
  );
}

// Icon-only tap target (44px minimum)
export function IconButton({ icon: Icon, className = '', label, ...rest }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`pressable inline-flex items-center justify-center w-11 h-11 rounded-full text-fg-muted hover:text-fg hover:bg-surface-2 ${className}`}
      {...rest}
    >
      <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

// ── List row ─────────────────────────────────────────────────────────────────
export function ListRow({ icon, iconClass = 'text-accent', title, subtitle, badge, onClick, className = '', right, accentBar }) {
  return (
    <button
      onClick={onClick}
      className={`pressable card w-full p-4 flex items-center gap-4 text-left hover:border-line-2 relative overflow-hidden ${className}`}
    >
      {accentBar && <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${accentBar}`} aria-hidden="true" />}
      {icon && <IconTile icon={icon} iconClass={iconClass} />}
      <div className="flex-1 min-w-0">
        <div className="font-display text-2xl text-fg leading-none uppercase flex items-center gap-2 min-w-0">
          <span className="line-clamp-2">{title}</span>
          {badge && <span className="text-[10px] font-body font-bold tracking-widest text-on-accent bg-accent px-2 py-0.5 rounded-md shrink-0">{badge}</span>}
        </div>
        {subtitle && <div className="text-sm text-fg-muted mt-1 truncate">{subtitle}</div>}
      </div>
      {right ?? <ChevronRight className="w-5 h-5 text-fg-faint shrink-0" aria-hidden="true" />}
    </button>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 p-1 rounded-2xl bg-surface border border-line ${className}`}>
      {options.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold tracking-widest uppercase transition-colors ${
            value === o.value ? 'bg-accent text-on-accent shadow' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Chip (filter / suggestion) ───────────────────────────────────────────────
export function Chip({ active, children, className = '', ...rest }) {
  return (
    <button
      aria-pressed={active}
      className={`pressable min-h-[40px] px-3.5 rounded-full text-sm font-semibold border transition-colors ${
        active ? 'bg-accent border-accent text-on-accent' : 'bg-surface border-line text-fg-muted hover:text-fg hover:border-line-2'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
export function Stat({ icon: Icon, iconClass = 'text-accent', value, label, sub, className = '' }) {
  return (
    <Card className={`p-4 ${className}`}>
      {Icon && <Icon className={`w-5 h-5 mb-3 ${iconClass}`} strokeWidth={2.2} aria-hidden="true" />}
      <div className="font-display text-4xl text-fg leading-none tabular">{value}</div>
      <div className="label mt-2">{label}</div>
      {sub && <div className="text-xs text-fg-faint mt-0.5">{sub}</div>}
    </Card>
  );
}

// ── Leaderboard rank ─────────────────────────────────────────────────────────
const RANK = {
  1: { bg: 'bg-gold', fg: 'text-[#1c1917]', ring: 'ring-gold/40' },
  2: { bg: 'bg-slate-300', fg: 'text-slate-900', ring: 'ring-slate-300/40' },
  3: { bg: 'bg-amber-700', fg: 'text-amber-50', ring: 'ring-amber-700/40' },
};
export function RankBadge({ rank }) {
  const r = RANK[rank];
  if (r) {
    return (
      <div className={`w-9 h-9 rounded-full ${r.bg} ${r.fg} ring-4 ${r.ring} flex items-center justify-center shrink-0`} aria-label={`Platz ${rank}`}>
        {rank === 1 ? <Trophy className="w-4.5 h-4.5" strokeWidth={2.5} aria-hidden="true" /> : <span className="font-display text-lg leading-none">{rank}</span>}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-surface-2 border border-line text-fg-muted flex items-center justify-center shrink-0 font-display text-lg leading-none" aria-label={`Platz ${rank}`}>
      {rank}
    </div>
  );
}

// ── Progress ring ────────────────────────────────────────────────────────────
// Animate from 0 to the first value on mount, then follow value changes
function useAnimatedValue(value) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return shown;
}

export function ProgressRing({ value = 0, size = 220, stroke = 10, color = '#f97316', track = 'rgba(148,163,184,0.15)', children, label, animate = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const animated = useAnimatedValue(value);
  const pct = Math.min(100, Math.max(0, animate ? animated : value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.4s ease', filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value = 0, color = 'bg-accent', className = '', label, animate = true }) {
  const animated = useAnimatedValue(value);
  const pct = Math.min(100, Math.max(0, animate ? animated : value));
  return (
    <div className={`h-2 bg-surface-2 rounded-full overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%`, transition: 'width 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
    </div>
  );
}

// ── Modal (bottom sheet on mobile) ───────────────────────────────────────────
// Overlays are portaled to <body>: screens animate in with a transform (stacking
// context), so a z-50 overlay inside them would otherwise end up below the fixed nav.
export function Sheet({ onClose, children, className = '', title }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-surface border-t sm:border border-line-2 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 safe-bottom animate-fade-up ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-line-2 mb-5 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({ title, text, children, className = '' }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
      <div role="alertdialog" aria-modal="true" aria-label={title} className={`card p-6 w-full max-w-sm animate-pop ${className}`}>
        {title && <div className="font-display text-3xl uppercase text-fg leading-none mb-2">{title}</div>}
        {text && <div className="text-sm text-fg-muted mb-5">{text}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="card-soft flex flex-col items-center justify-center py-14 px-6 text-center">
      {Icon && <IconTile icon={Icon} size="lg" iconClass="text-fg-muted" className="mb-4" />}
      <div className="font-display text-2xl uppercase text-fg mb-1">{title}</div>
      {text && <div className="text-sm text-fg-muted">{text}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ErrorText({ children, className = '' }) {
  if (!children) return null;
  return (
    <div role="alert" className={`flex items-start gap-2 text-sm text-red-400 ${className}`}>
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
