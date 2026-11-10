import React from 'react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

/** Peça de reposição em cartão, para a lista no celular. */
export default function PecaCard({ peca }) {
  const baixo = peca.current_stock <= peca.minimum_stock;

  return (
    <Card className={cn('p-3', baixo && 'border-destructive/30 bg-destructive/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{peca.name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{peca.code}</p>
        </div>
        <div className="text-right">
          <p className={cn('text-sm font-semibold tabular-nums', baixo && 'text-destructive')}>
            {peca.current_stock ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">mín. {peca.minimum_stock ?? 0}</p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge value={peca.status || 'Em Estoque'} />
        {peca.supplier && (
          <span className="truncate text-[11px] text-muted-foreground">{peca.supplier}</span>
        )}
      </div>
    </Card>
  );
}