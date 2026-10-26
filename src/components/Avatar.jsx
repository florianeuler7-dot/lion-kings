import React, { useState } from 'react';

const SIZES = {
  xs: { box: 'w-7 h-7', text: 'text-xs' },
  sm: { box: 'w-9 h-9', text: 'text-sm' },
  md: { box: 'w-11 h-11', text: 'text-base' },
  lg: { box: 'w-14 h-14', text: 'text-xl' },
  xl: { box: 'w-24 h-24', text: 'text-3xl' },
};

export default function Avatar({ user, size = 'md', className = '', ring = false }) {
  const [broken, setBroken] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const ringClass = ring ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink' : '';
  const initial = (user?.name?.[0] || '?').toUpperCase();

  if (user?.avatar_url && !broken) {
    return (
      <img
        src={user.avatar_url}
        alt={user?.name || ''}
        onError={() => setBroken(true)}
        className={`${s.box} rounded-full object-cover bg-surface-2 border border-line ${ringClass} ${className}`}
      />
    );
  }
  return (
    <div className={`${s.box} ${s.text} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-line flex items-center justify-center font-display text-zinc-100 ${ringClass} ${className}`}>
      {initial}
    </div>
  );
}
