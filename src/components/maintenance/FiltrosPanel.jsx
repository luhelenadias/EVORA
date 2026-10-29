import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Painel discreto de filtros: fica fechado por padrão e abre ao clicar em
 * "Filtros". O número ao lado indica quantos filtros estão ativos, para que a
 * seleção continue visível com o painel fechado.
 */
export default function FiltrosPanel({ ativos = 0, acoes = null, children, className }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {ativos > 0 && (
            <span className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">{ativos}</span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
        </button>
        {acoes}
      </div>

      {aberto && (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">{children}</div>
      )}
    </div>
  );
}