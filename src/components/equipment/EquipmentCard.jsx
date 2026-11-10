import React from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import PrioridadeBadge from '@/components/equipment/PrioridadeBadge';
import { cn } from '@/lib/utils';

/** Equipamento em cartão, para a lista no celular. */
export default function EquipmentCard({ equipment, total, onOpen }) {
  return (
    <Card
      onClick={onOpen}
      className={cn(
        'cursor-pointer border-l-4 p-3 transition-colors active:bg-muted/60',
        equipment.prioridade_alta ? 'border-l-destructive' : 'border-l-transparent'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {equipment.prioridade_alta && <Flame className="h-3.5 w-3.5 shrink-0 text-destructive" />}
            <span className="truncate text-sm font-medium">{equipment.name}</span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {equipment.codigo_equipamento ? (
              <span className="font-mono font-semibold text-primary">{equipment.codigo_equipamento}</span>
            ) : (
              'Sem código'
            )}
            {equipment.location_sector ? ` · ${equipment.location_sector}` : ''}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge value={equipment.operational_status} />
            <StatusBadge value={equipment.criticality} type="criticality" />
            <PrioridadeBadge equipment={equipment} total={total} showScore={false} />
          </div>
        </div>
      </div>
    </Card>
  );
}