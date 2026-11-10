import React from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { findContractForEquipment, computeSlaStatus, SLA_STYLES } from '@/lib/maintenance';
import { rotuloStatusOS } from '@/lib/triagem';
import { cn } from '@/lib/utils';

/**
 * Chamado em cartão, para a lista no celular: sem colunas cortadas e com
 * informação suficiente para reconhecer o chamado antes de abrir.
 */
export default function ChamadoCard({ order, contracts = [], posicao, onOpen }) {
  const sla = computeSlaStatus(order, findContractForEquipment(contracts, order.equipment_id));

  return (
    <Card
      onClick={onOpen}
      className={cn(
        'cursor-pointer p-3 transition-colors active:bg-muted/60',
        posicao === 1 && 'border-primary/40'
      )}
    >
      <div className="flex items-start gap-2">
        {posicao != null && (
          <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-[11px] font-bold text-primary">
            {posicao}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{order.equipment_name || 'Equipamento'}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="font-mono">{order.code || `OS-${order.id?.substring(0, 6)}`}</span>
            {order.open_date ? ` · ${format(parseISO(order.open_date), 'dd/MM/yy HH:mm')}` : ''}
            {order.sector ? ` · ${order.sector}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge value={order.status} rotulo={rotuloStatusOS(order)} />
            <StatusBadge value={order.priority} type="priority" />
            {sla && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  SLA_STYLES[sla.status]
                )}
              >
                <Clock className="h-2.5 w-2.5" />
                {sla.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}