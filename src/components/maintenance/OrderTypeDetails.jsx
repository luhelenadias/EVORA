import React from 'react';
import { AlertTriangle } from 'lucide-react';
import InfoField from '@/components/shared/InfoField';
import { formatarData, formatarDataHora, tempoDecorrido } from '@/lib/orderDetail';

/** Conteúdo específico do tipo e do status da ordem. */
export default function OrderTypeDetails({ order, equipment }) {
  if (order.type === 'Corretiva') {
    const abertaHa = order.status === 'Concluído' ? null : tempoDecorrido(order.open_date);

    return (
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Problema relatado
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
            {order.problem_description || 'Sem descrição informada.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoField label="Aberto por" value={order.requester_name} />
          <InfoField label="Setor de origem" value={order.sector} />
          <InfoField label="Abertura">
            <span>{formatarDataHora(order.open_date)}</span>
            {abertaHa && <span className="ml-1 text-xs text-muted-foreground">· aberta há {abertaHa}</span>}
          </InfoField>
        </div>

        {order.priority_override_reason && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Motivo da alteração manual de prioridade
            </p>
            <p className="mt-1 text-sm text-amber-900">{order.priority_override_reason}</p>
          </div>
        )}
      </div>
    );
  }

  if (order.type === 'Preventiva') {
    const periodicidade = order.periodicidade_referencia ?? equipment?.periodicidade_preventiva_dias;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoField label="Periodicidade" value={periodicidade ? `A cada ${periodicidade} dias` : null} />
        <InfoField label="Última preventiva" value={formatarData(equipment?.data_ultima_preventiva)} />
        <InfoField label="Próxima preventiva" value={formatarData(equipment?.data_proxima_preventiva)} />
      </div>
    );
  }

  return null;
}