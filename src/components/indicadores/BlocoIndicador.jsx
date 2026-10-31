import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Seção recolhível da página de indicadores: título, resumo em uma linha e conteúdo. */
export default function BlocoIndicador({ titulo, icone: Icone, resumo, children, abertoInicial = false }) {
  const [aberto, setAberto] = useState(abertoInicial);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {Icone && <Icone className="h-4 w-4 text-primary" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold">{titulo}</span>
          {resumo && <span className="block truncate text-[11px] text-muted-foreground">{resumo}</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && <div className="space-y-3 border-t p-4">{children}</div>}
    </section>
  );
}