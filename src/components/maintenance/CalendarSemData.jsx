import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Inbox } from 'lucide-react';
import CalendarCard from '@/components/maintenance/CalendarCard';

/**
 * Bandeja "Sem data": corretivas abertas ainda não agendadas.
 * Arrastar um card para um dia do calendário agenda a OS.
 */
export default function CalendarSemData({ ordens = [], technicianById = {}, onAbrir }) {
  return (
    <Droppable droppableId="sem-data" isDropDisabled>
      {(provido, estado) => (
        <div
          ref={provido.innerRef}
          {...provido.droppableProps}
          className={`rounded-xl border bg-card p-3 ${estado.isDraggingOver ? 'ring-1 ring-primary/30' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground">Sem data</h3>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {ordens.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Corretivas abertas ainda não agendadas. Arraste um card para um dia para agendar.
          </p>

          <div className="mt-2 max-h-[540px] space-y-1.5 overflow-y-auto pr-0.5">
            {ordens.map((ordem, indice) => (
              <Draggable key={ordem.id} draggableId={`item-${ordem.id}`} index={indice}>
                {(arraste, instantaneo) => (
                  <div ref={arraste.innerRef} {...arraste.draggableProps} {...arraste.dragHandleProps}>
                    <CalendarCard
                      item={{ kind: 'corretiva', order: ordem }}
                      tecnico={technicianById[ordem.technician_id]}
                      onClick={onAbrir}
                      arrastavel
                      arrastando={instantaneo.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provido.placeholder}
          </div>

          {ordens.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Nenhuma corretiva sem data.</p>
          )}
        </div>
      )}
    </Droppable>
  );
}