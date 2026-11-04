import React from 'react';
import { History } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { rotuloStatusOS } from '@/lib/triagem';
import { dataReferencia } from '@/lib/central';
import { formatarData, historicoDoEquipamento } from '@/lib/orderDetail';

/** Últimas ordens do mesmo equipamento (o drill-down por equipamento da aba Indicadores). */
export default function OrderHistoryList({ orders, order }) {
  const historico = historicoDoEquipamento(orders, order.equipment_id, order.id);

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> Histórico recente do equipamento
      </p>

      {historico.length === 0 ? (
        <p className="rounded-lg border px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhuma outra ordem registrada para este equipamento.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {historico.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{o.type || '—'}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{o.code || '—'}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">{formatarData(dataReferencia(o))}</span>
                <StatusBadge value={o.status} rotulo={rotuloStatusOS(o)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}