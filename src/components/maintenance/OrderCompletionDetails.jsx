import React from 'react';
import { Star } from 'lucide-react';
import InfoField from '@/components/shared/InfoField';
import { ResponseTimeValue } from '@/components/maintenance/ResponseTimeInfo';
import { formatarDataHora, formatarDuracao, formatarMoeda, totalPecas } from '@/lib/orderDetail';

/** Ordem concluída: laudo, tempos, peças utilizadas e avaliação do fornecedor. */
export default function OrderCompletionDetails({ order }) {
  const pecas = order.parts_used || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Laudo técnico — o que foi feito
        </p>
        <p className="mt-1 rounded-md bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {order.technical_report || 'Laudo não registrado.'}
        </p>
      </div>

      {order.causa_falha && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Causa provável da falha
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{order.causa_falha}</p>
        </div>
      )}

      {order.testes_finais && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Testes finais realizados
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{order.testes_finais}</p>
        </div>
      )}

      {order.pendencias && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pendências</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{order.pendencias}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoField label="Início do atendimento" value={formatarDataHora(order.start_date)} />
        <InfoField label="Conclusão" value={formatarDataHora(order.completion_date)} />
        <InfoField label="Duração do reparo" value={formatarDuracao(order.duracao_total_minutos)} />
        {order.response_time_minutes != null && (
          <InfoField label="Tempo de atendimento" value={<ResponseTimeValue order={order} />} />
        )}
      </div>

      {pecas.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Peças e insumos utilizados
          </p>
          <div className="divide-y rounded-lg border">
            {pecas.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name || 'Peça'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.quantity ?? 0} × {formatarMoeda(p.cost)}
                  </p>
                </div>
                <span className="tabular-nums">{formatarMoeda((p.cost || 0) * (p.quantity || 0))}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-sm font-semibold">
              <span>Total em peças</span>
              <span className="tabular-nums">{formatarMoeda(totalPecas(pecas))}</span>
            </div>
          </div>
        </div>
      )}

      {order.total_cost != null && (
        <InfoField label="Custo total da OS">
          <span className="font-semibold">{formatarMoeda(order.total_cost)}</span>
        </InfoField>
      )}

      {order.execution_by === 'Fornecedor Externo' && order.supplier_rating != null && (
        <InfoField label="Avaliação do fornecedor">
          <span className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={
                  n <= order.supplier_rating
                    ? 'w-4 h-4 fill-warning text-warning'
                    : 'w-4 h-4 text-muted-foreground/40'
                }
              />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">{order.supplier_rating}/5</span>
          </span>
        </InfoField>
      )}
    </div>
  );
}