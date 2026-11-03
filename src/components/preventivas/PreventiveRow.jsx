import React from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import AssignTechnicianSelect from '@/components/preventivas/AssignTechnicianSelect';
import { dataProgramada, horarioProgramado, temHorario } from '@/lib/preventivas';
import { semResponsavel } from '@/lib/agenda';
import { cn } from '@/lib/utils';

/** Linha da visão por técnico: dia, equipamento, status e atribuição quando pendente. */
export default function PreventiveRow({ order, equipment, tecnicos, onOpen, onAtribuir, atribuindo }) {
  const data = dataProgramada(order);
  const semTecnico = semResponsavel(order);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(order)}
      onKeyDown={(evento) => { if (evento.key === 'Enter') onOpen?.(order); }}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer transition-colors hover:bg-muted/50',
        semTecnico && 'border-dashed border-warning/60 bg-warning/5'
      )}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{order.equipment_name || '—'}</span>
          {equipment?.codigo_equipamento && (
            <Badge variant="outline" className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5">
              {equipment.codigo_equipamento}
            </Badge>
          )}
          <StatusBadge value={order.status} />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {data ? format(data, 'dd/MM/yyyy') : 'Sem data programada'}
          </span>
          {temHorario(order) && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {horarioProgramado(order)}
            </span>
          )}
          {order.code && <span className="font-mono">{order.code}</span>}
        </div>
      </div>

      {semTecnico && (
        <AssignTechnicianSelect
          tecnicos={tecnicos}
          disabled={atribuindo}
          onSelect={(tecnicoId) => onAtribuir?.(order, tecnicoId)}
        />
      )}
    </div>
  );
}