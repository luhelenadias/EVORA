import React, { useMemo } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreventiveChip from '@/components/preventivas/PreventiveChip';
import { dataProgramada, ordenarCronologico } from '@/lib/preventivas';
import { podeReagendar } from '@/lib/agenda';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Visão mensal das preventivas, navegável mês a mês. Os cards das preventivas
 * ainda não iniciadas podem ser arrastados para outro dia (onDrop); os demais
 * abrem o painel de detalhes ao clique.
 */
export default function PreventiveCalendarView({ preventivas, equipmentById, technicianById, mes, onMesChange, onOpen, onDrop }) {
  const dias = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(mes), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(mes), { weekStartsOn: 0 }),
      }),
    [mes]
  );

  const porDia = useMemo(() => {
    const mapa = {};
    preventivas.forEach((ordem) => {
      const data = dataProgramada(ordem);
      if (!data) return;
      const chave = format(data, 'yyyy-MM-dd');
      mapa[chave] = [...(mapa[chave] || []), ordem];
    });
    Object.keys(mapa).forEach((chave) => {
      mapa[chave] = ordenarCronologico(mapa[chave]);
    });
    return mapa;
  }, [preventivas]);

  const totalMes = useMemo(
    () => preventivas.filter((ordem) => {
      const data = dataProgramada(ordem);
      return data && isSameMonth(data, mes);
    }).length,
    [preventivas, mes]
  );

  const aoSoltar = (resultado) => {
    const { draggableId, source, destination } = resultado;
    if (!destination || destination.droppableId === source.droppableId) return;
    const ordem = preventivas.find((o) => o.id === draggableId);
    if (!ordem || !podeReagendar(ordem)) return;
    onDrop?.(ordem, parseISO(destination.droppableId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Mês anterior"
            onClick={() => onMesChange(addMonths(mes, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Próximo mês"
            onClick={() => onMesChange(addMonths(mes, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => onMesChange(startOfMonth(new Date()))}>
            Hoje
          </Button>
        </div>

        <p className="font-heading text-sm font-semibold text-foreground">
          {capitalizar(format(mes, "MMMM 'de' yyyy", { locale: ptBR }))}
        </p>

        <span className="text-xs text-muted-foreground">
          {totalMes} preventiva(s) no mês
        </span>
      </div>

      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={aoSoltar}>
          <div className="min-w-[720px] rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-border">
              {dias.map((dia) => {
                const chave = format(dia, 'yyyy-MM-dd');
                const itens = porDia[chave] || [];
                const foraDoMes = !isSameMonth(dia, mes);

                return (
                  <Droppable droppableId={chave} key={chave}>
                    {(provido, estado) => (
                      <div
                        ref={provido.innerRef}
                        {...provido.droppableProps}
                        className={cn(
                          'min-h-[118px] bg-card p-1.5 space-y-1.5',
                          foraDoMes && 'bg-muted/30',
                          estado.isDraggingOver && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                        )}
                      >
                        <div className="flex items-center justify-between px-0.5">
                          <span
                            className={cn(
                              'text-[11px] font-semibold text-foreground',
                              foraDoMes && 'text-muted-foreground/70',
                              isToday(dia) && 'bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center'
                            )}
                          >
                            {format(dia, 'd')}
                          </span>
                          {itens.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{itens.length}</span>
                          )}
                        </div>

                        {itens.map((ordem, indice) => {
                          const arrastavel = podeReagendar(ordem);
                          return (
                            <Draggable
                              key={ordem.id}
                              draggableId={ordem.id}
                              index={indice}
                              isDragDisabled={!arrastavel}
                            >
                              {(arraste, instantaneo) => (
                                <div
                                  ref={arraste.innerRef}
                                  {...arraste.draggableProps}
                                  {...arraste.dragHandleProps}
                                >
                                  <PreventiveChip
                                    order={ordem}
                                    equipment={equipmentById[ordem.equipment_id]}
                                    tecnico={technicianById[ordem.technician_id]}
                                    onClick={onOpen}
                                    arrastavel={arrastavel}
                                    arrastando={instantaneo.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provido.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      </div>

      {totalMes === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma preventiva programada neste mês — navegue pelos meses ou confira o modo “Por técnico”.
        </p>
      )}
    </div>
  );
}