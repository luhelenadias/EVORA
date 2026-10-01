import React from 'react';
import { cn } from '@/lib/utils';
import { corDoTecnico, iniciaisDoNome } from '@/lib/preventivas';

/** Indicador visual do responsável pela preventiva (avatar com a cor fixa do técnico). */
export default function TechnicianTag({ technicianId, name, className, showName = true }) {
  if (!technicianId) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[11px] text-muted-foreground', className)}>
        <span className="h-4 w-4 rounded-full border border-dashed border-warning/70 bg-warning/10" />
        Não atribuída
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] text-muted-foreground', className)}>
      <span
        className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-semibold text-primary-foreground flex-shrink-0"
        style={{ backgroundColor: corDoTecnico(technicianId) }}
      >
        {iniciaisDoNome(name)}
      </span>
      {showName && <span className="truncate">{name || 'Técnico'}</span>}
    </span>
  );
}