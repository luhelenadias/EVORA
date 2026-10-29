import React from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card cinza de sugestão de data: deixa claro que NÃO é agendamento. */
export default function SuggestionCard({ sugestao, order, tecnico, onAceitar, onDispensar }) {
  return (
    <div
      className={cn(
        'h-[104px] w-full overflow-hidden rounded-md border border-dashed border-border bg-muted/50 px-2 py-1.5 text-left'
      )}
    >
      <div className="flex items-center gap-1">
        <Sparkles className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        <span className="rounded bg-muted-foreground/20 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-muted-foreground">
          Sugestão
        </span>
        <span className="ml-auto truncate font-mono text-[9px] text-muted-foreground">
          {sugestao.service_order_code || order?.code || ''}
        </span>
      </div>

      <p className="mt-1 truncate text-[10px] font-semibold leading-tight text-foreground/80">
        {order?.equipment_name || 'Equipamento'}
      </p>
      <p className="truncate text-[9px] leading-tight text-muted-foreground">
        não é agendamento · {tecnico?.name || sugestao.tecnico_sugerido_nome || 'sem técnico'}
      </p>

      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onAceitar?.(sugestao, order)}
          className="flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Check className="w-2.5 h-2.5" /> Aceitar
        </button>
        <button
          type="button"
          onClick={() => onDispensar?.(sugestao)}
          className="flex items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="w-2.5 h-2.5" /> Dispensar
        </button>
      </div>
    </div>
  );
}