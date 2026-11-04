import React from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CalendarClock, FileText, ShieldCheck } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { dataLegivel, resumoContrato } from '@/lib/rota';
import { rotuloScore } from '@/lib/priorizacao';
import {
  contratosDoEquipamento, ehRechamada, osAbertaNoEquipamento, ultimasCorretivas,
} from '@/lib/triagem';

function Bloco({ icone: Icone, rotulo, children }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icone && <Icone className="h-3 w-3" />} {rotulo}
      </p>
      <div className="mt-1 text-xs text-foreground">{children}</div>
    </div>
  );
}

/** Contexto do equipamento que a gestão precisa para decidir o destino do chamado. */
export default function ContextoEquipamento({ order, equipment, contracts = [], orders = [], rechamadaDias = 30 }) {
  if (!equipment) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        Equipamento não encontrado no cadastro.
      </p>
    );
  }

  const contrato = contratosDoEquipamento(contracts, equipment)[0] || null;
  const outraAberta = osAbertaNoEquipamento(orders, equipment.id, order?.id);
  const ultimas = ultimasCorretivas(orders, equipment.id, 5);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Bloco icone={ShieldCheck} rotulo="Garantia">
          {equipment.warranty_end ? `até ${dataLegivel(equipment.warranty_end)}` : 'sem garantia cadastrada'}
        </Bloco>
        <Bloco icone={FileText} rotulo="Contrato vigente">
          {contrato ? contrato.contract_number || contrato.supplier_name : 'nenhum contrato cobre o equipamento'}
        </Bloco>
        <Bloco icone={AlertTriangle} rotulo="Criticidade">
          <StatusBadge value={equipment.criticality || 'Apoio'} type="criticality" />
        </Bloco>
        <Bloco icone={CalendarClock} rotulo="Prioridade calculada">
          {equipment.prioridade_faixa ? (
            <span>
              {equipment.prioridade_faixa}
              {equipment.prioridade_score != null && (
                <span className="text-muted-foreground">
                  {' '}· {rotuloScore(equipment.prioridade_score, equipment.prioridade_modelo)}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">priorização pendente</span>
          )}
        </Bloco>
      </div>

      {contrato && (
        <p className="text-[11px] text-muted-foreground">
          {resumoContrato(contrato)}
          {contrato.start_date && contrato.end_date
            ? ` · vigência ${dataLegivel(contrato.start_date)} a ${dataLegivel(contrato.end_date)}`
            : ''}
        </p>
      )}

      {outraAberta && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] font-medium text-warning-foreground">
          Este equipamento já tem a OS {outraAberta.code || ''} aberta ({outraAberta.status}
          {outraAberta.technician_name ? ` · ${outraAberta.technician_name}` : ''}).
        </p>
      )}

      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Últimas 5 corretivas do equipamento
        </p>
        {ultimas.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhuma corretiva anterior registrada.</p>
        ) : (
          <ul className="space-y-1">
            {ultimas.map((anterior) => {
              const rechamada = ehRechamada(order, [anterior], rechamadaDias)
                || (anterior.id === order?.id && ehRechamada(anterior, ultimas, rechamadaDias));
              return (
                <li
                  key={anterior.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1 text-[11px]"
                >
                  <span className="font-mono">{anterior.code || '—'}</span>
                  <span className="text-muted-foreground">
                    {anterior.open_date ? format(parseISO(anterior.open_date), 'dd/MM/yy') : '—'}
                  </span>
                  <span className="text-muted-foreground">{anterior.status}</span>
                  {anterior.technician_name && <span>{anterior.technician_name}</span>}
                  {rechamada && (
                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      Rechamada em até {rechamadaDias} dias
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}