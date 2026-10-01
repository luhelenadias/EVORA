import React from 'react';
import { cn } from '@/lib/utils';
import { corDoTecnico, horarioProgramado, temHorario } from '@/lib/preventivas';

/** Item dentro do dia do calendário: código, equipamento, horário e cor do técnico. */
export default function PreventiveChip({ order, equipment, tecnico, onClick }) {
  const nomeTecnico = tecnico?.name || order.technician_name;

  return (
    <button
      type="button"
      onClick={() => onClick?.(order)}
      className={cn(
        'w-full text-left rounded-md border px-1.5 py-1.5 transition-colors bg-card hover:bg-muted/70',
        order.technician_id ? 'border-border' : 'border-dashed border-warning/70 bg-warning/10'
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: corDoTecnico(order.technician_id) }}
        />
        {equipment?.codigo_equipamento && (
          <span className="font-mono text-[10px] font-bold text-primary truncate">
            {equipment.codigo_equipamento}
          </span>
        )}
      </div>

      <p className="text-[11px] font-medium leading-tight text-foreground truncate">
        {order.equipment_name || '—'}
      </p>

      <p className="text-[10px] leading-tight text-muted-foreground truncate">
        {temHorario(order) && <span>{horarioProgramado(order)} · </span>}
        {order.technician_id ? nomeTecnico || 'Técnico atribuído' : 'Sem técnico'}
      </p>
    </button>
  );
}