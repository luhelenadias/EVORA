import React from 'react';
import InfoField from '@/components/shared/InfoField';
import StatusBadge from '@/components/shared/StatusBadge';

/** Bloco fixo do detalhe: identificação, criticidade, localização e prioridade. */
export default function OrderEquipmentSummary({ order, equipment }) {
  const criticidade = equipment?.criticality || order.equipment_criticality;
  const localizacao = [equipment?.location_sector, equipment?.location_unit].filter(Boolean).join(' · ');
  const fabricante = [equipment?.manufacturer, equipment?.model].filter(Boolean).join(' ');
  const score = order.prioridade_score_equipamento;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
      <InfoField label="Criticidade">
        {criticidade ? <StatusBadge value={criticidade} type="criticality" /> : null}
      </InfoField>

      <InfoField label="Localização" value={localizacao} />

      <InfoField label="Fabricante / modelo" value={fabricante} />

      <InfoField label="Prioridade da OS">
        <div className="flex items-center gap-2 flex-wrap">
          {order.priority ? <StatusBadge value={order.priority} type="priority" /> : null}
          {score != null && (
            <span className="text-xs text-muted-foreground">
              Score de priorização <span className="font-semibold text-foreground">{Math.round(score)}</span>
            </span>
          )}
        </div>
      </InfoField>
    </div>
  );
}