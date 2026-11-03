import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { corDoTecnico, horarioProgramado, temHorario } from '@/lib/preventivas';
import { nomeResponsavel, semResponsavel } from '@/lib/agenda';

/** Item dentro do dia do calendário: código, equipamento, horário e cor do técnico. */
export default function PreventiveChip({ order, equipment, tecnico, onClick, arrastavel = false, arrastando = false }) {
  const nomeTecnico = nomeResponsavel(order, tecnico);

  return (
    <button
      type="button"
      onClick={() => onClick?.(order)}
      title={arrastavel ? 'Arraste para outro dia ou clique para editar' : 'Clique para ver os detalhes'}
      className={cn(
        'w-full text-left rounded-md border px-1.5 py-1.5 transition-colors bg-card hover:bg-muted/70',
        semResponsavel(order) ? 'border-dashed border-warning/70 bg-warning/10' : 'border-border',
        arrastavel && 'cursor-grab active:cursor-grabbing',
        arrastando && 'shadow-lg ring-2 ring-primary/40'
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
        {arrastavel && <GripVertical className="ml-auto w-3 h-3 flex-shrink-0 text-muted-foreground/50" />}
      </div>

      <p className="text-[11px] font-medium leading-tight text-foreground truncate">
        {order.equipment_name || '—'}
      </p>

      <p className="text-[10px] leading-tight text-muted-foreground truncate">
        {temHorario(order) && <span>{horarioProgramado(order)} · </span>}
        {nomeTecnico}
      </p>
    </button>
  );
}