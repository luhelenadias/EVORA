import React from 'react';
import { NIVEL_UI } from '@/lib/alertas';
import { cn } from '@/lib/utils';

export default function NivelBadge({ nivel, className }) {
  const ui = NIVEL_UI[nivel] || NIVEL_UI.Informativo;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        ui.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', ui.dot)} />
      {nivel}
    </span>
  );
}