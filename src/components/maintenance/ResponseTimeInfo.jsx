import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatarDuracao } from '@/lib/orderDetail';
import { ATRASADO, DENTRO_DO_PRAZO } from '@/lib/atendimento';
import { cn } from '@/lib/utils';

/** Tempo até o primeiro atendimento + badge de SLA (sla_response_status). */
export function ResponseTimeValue({ order }) {
  const comSla = order.sla_response_status === ATRASADO || order.sla_response_status === DENTRO_DO_PRAZO;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium text-foreground">{formatarDuracao(order.response_time_minutes)}</span>
      {comSla && <StatusBadge value={order.sla_response_status} />}
    </span>
  );
}

export default function ResponseTimeInfo({ order, className }) {
  if (order?.response_time_minutes == null) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      Tempo de atendimento: <ResponseTimeValue order={order} />
    </span>
  );
}