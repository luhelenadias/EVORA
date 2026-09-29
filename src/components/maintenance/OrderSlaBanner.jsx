import React from 'react';
import { ShieldAlert } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatarDataHora } from '@/lib/orderDetail';
import { cn } from '@/lib/utils';

/** Destaque do SLA contratual (ordens corretivas). */
export default function OrderSlaBanner({ sla }) {
  const atrasado = sla?.status === 'Atrasado';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border p-3',
        atrasado ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30'
      )}
    >
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className={cn('w-3.5 h-3.5', atrasado && 'text-destructive')} /> SLA contratual
        </p>
        <p className="text-sm">
          {sla
            ? `Prazo: ${formatarDataHora(sla.prazo)}${sla.horas ? ` · ${sla.horas}h` : ''}`
            : 'Equipamento sem contrato vigente com SLA de resolução definido'}
        </p>
        {sla?.congelado && (
          <p className="text-[11px] text-muted-foreground">Situação registrada no encerramento da OS</p>
        )}
      </div>
      <StatusBadge value={sla?.status || 'Sem SLA Definido'} />
    </div>
  );
}