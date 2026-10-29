import React, { useMemo } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameMonth, isToday, parseISO, startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CalendarCard from '@/components/maintenance/CalendarCard';
import SuggestionCard from '@/components/maintenance/SuggestionCard';
import CalendarSemData from '@/components/maintenance/CalendarSemData';
import { podeReagendar } from '@/lib/agenda';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const LIMITE_MES = 4;

const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '');

const chaveDoDia = (valor) => {
  const data = typeof valor === 'string' ? parseISO(valor) : valor;
  return Number.isNaN(data?.getTime?.()) ? '' : format(data, 'yyyy-MM-dd');
};

/**
 * Calendário de manutenções: preventivas e corretivas agendadas, sugestões de
 * data (cinza, não são agendamento) e a bandeja "Sem data" ao lado.
 */
export default function MaintenanceCalendar({
  items = [],
  semData = [],
  sugestoes = [],
  ordensPorId = {},
  technicianById = {},
  visao = 'mes',
  onVisaoChange,
  referencia,
  onReferenciaChange,
  onAbrir,
  onReagendar,
  onAgendarSemData,
  onSugestaoAceitar,
  onSugestaoDispensar,
}) {
  const dias = useMemo(() => {
    if (visao === 'dia') return [startOfDay(referencia)];
    if (visao === 'semana') {
      return eachDayOfInterval({
        start: startOfWeek(referencia, { weekStartsOn: 0 }),
        end: endOfWeek(referencia, { weekStartsOn: 0 }),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(referencia), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(referencia), { weekStartsOn: 0 }),
    });
  }, [visao, referencia]);

  const porDia = useMemo(() => {
    const mapa = {};
    items.forEach((item) => {
      const chave = chaveDoDia(item.order?.scheduled_date);
      if (!chave) return;
      mapa[chave] = [...(mapa[chave] || []), item];
    });
    Object.keys(mapa).forEach((chave) => {
      mapa[chave].sort((a, b) => String(a.order.scheduled_date).localeCompare(String(b.order.scheduled_date)));
    });
    return mapa;
  }, [items]);

  const sugestoesPorDia = useMemo(() => {
    const mapa = {};
    sugestoes.forEach((sugestao) => {
      const chave = chaveDoDia(sugestao.data_sugerida);
      if (!chave) return;
      mapa[chave] = [...(mapa[chave] || []), sugestao];
    });
    return mapa;
  }, [sugestoes]);

  const totalPeriodo = useMemo(() => {
    return dias.reduce((total, dia) => total + (porDia[chaveDoDia(dia)] || []).length, 0);
  }, [dias, porDia]);

  const navegar = (direcao) => {
    if (visao === 'dia') onReferenciaChange(addDays(referencia, direcao));
    else if (visao === 'semana') onReferenciaChange(addWeeks(referencia, direcao));
    else onReferenciaChange(addMonths(referencia, direcao));
  };

  const titulo = () => {
    if (visao === 'mes') return capitalizar(format(referencia, "MMMM 'de' yyyy", { locale: ptBR }));
    if (visao === 'semana') {
      return `${format(dias[0], 'dd/MM')} a ${format(dias[6], 'dd/MM/yyyy')}`;
    }
    return capitalizar(format(referencia, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }));
  };

  const aoSoltar = (resultado) => {
    const { draggableId, source, destination } = resultado;
    if (!destination || destination.droppableId === source.droppableId) return;
    const ordem = ordensPorId[String(draggableId).replace('item-', '')];
    if (!ordem) return;
    const dia = parseISO(destination.droppableId);

    if (source.droppableId === 'sem-data') {
      onAgendarSemData?.(ordem, dia);
      return;
    }
    if (destination.droppableId !== 'sem-data' && podeReagendar(ordem)) {
      onReagendar?.(ordem, dia);
    }
  };

  return (
    <DragDropContext onDragEnd={aoSoltar}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_248px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Anterior" onClick={() => navegar(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Próximo" onClick={() => navegar(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => onReferenciaChange(new Date())}>
                Hoje
              </Button>
            </div>

            <p className="font-heading text-sm font-semibold text-foreground">{titulo()}</p>

            <Tabs value={visao} onValueChange={onVisaoChange}>
              <TabsList className="h-8">
                <TabsTrigger value="dia" className="text-xs">Dia</TabsTrigger>
                <TabsTrigger value="semana" className="text-xs">Semana</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-primary" /> Preventiva agendada
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-warning" /> Corretiva agendada
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm border border-dashed border-muted-foreground/60 bg-muted" /> Sugestão
              (não é agendamento)
            </span>
            <span className="ml-auto">{totalPeriodo} agendada(s) no período</span>
          </div>

          <div className="overflow-x-auto">
            <div className={cn(visao === 'dia' ? 'min-w-[320px]' : 'min-w-[720px]')}>
              {visao !== 'dia' && (
                <div className="grid grid-cols-7 overflow-hidden rounded-t-xl border border-b-0 bg-muted/50">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {dia}
                    </div>
                  ))}
                </div>
              )}

              <div
                className={cn(
                  'overflow-hidden rounded-b-xl border bg-border',
                  visao === 'dia' ? 'grid grid-cols-1 rounded-t-xl' : 'grid grid-cols-7 gap-px'
                )}
              >
                {dias.map((dia) => {
                  const chave = chaveDoDia(dia);
                  const itens = porDia[chave] || [];
                  const sugestoesDoDia = sugestoesPorDia[chave] || [];
                  const visiveis = visao === 'mes' ? itens.slice(0, LIMITE_MES) : itens;
                  const excedente = itens.length - visiveis.length;
                  const foraDoMes = visao === 'mes' && !isSameMonth(dia, referencia);
                  const altura = visao === 'mes' ? 'min-h-[132px]' : visao === 'semana' ? 'min-h-[300px]' : 'min-h-[220px]';

                  return (
                    <Droppable droppableId={chave} key={chave}>
                      {(provido, estado) => (
                        <div
                          ref={provido.innerRef}
                          {...provido.droppableProps}
                          className={cn(
                            'space-y-1.5 bg-card p-1.5',
                            altura,
                            foraDoMes && 'bg-muted/30',
                            estado.isDraggingOver && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                          )}
                        >
                          <div className="flex items-center justify-between px-0.5">
                            <span
                              className={cn(
                                'text-[11px] font-semibold text-foreground',
                                foraDoMes && 'text-muted-foreground/70',
                                isToday(dia) && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                              )}
                            >
                              {visao === 'dia' ? format(dia, "d 'de' MMMM", { locale: ptBR }) : format(dia, 'd')}
                            </span>
                            {(itens.length > 0 || sugestoesDoDia.length > 0) && (
                              <span className="text-[10px] text-muted-foreground">
                                {itens.length + sugestoesDoDia.length}
                              </span>
                            )}
                          </div>

                          {visiveis.map((item, indice) => {
                            const arrastavel = podeReagendar(item.order);
                            return (
                              <Draggable
                                key={item.order.id}
                                draggableId={`item-${item.order.id}`}
                                index={indice}
                                isDragDisabled={!arrastavel}
                              >
                                {(arraste, instantaneo) => (
                                  <div ref={arraste.innerRef} {...arraste.draggableProps} {...arraste.dragHandleProps}>
                                    <CalendarCard
                                      item={item}
                                      tecnico={technicianById[item.order.technician_id]}
                                      onClick={onAbrir}
                                      arrastavel={arrastavel}
                                      arrastando={instantaneo.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}

                          {sugestoesDoDia.map((sugestao) => (
                            <SuggestionCard
                              key={sugestao.id}
                              sugestao={sugestao}
                              order={ordensPorId[sugestao.service_order_id]}
                              tecnico={technicianById[sugestao.tecnico_sugerido_id]}
                              onAceitar={onSugestaoAceitar}
                              onDispensar={onSugestaoDispensar}
                            />
                          ))}

                          {excedente > 0 && (
                            <p className="px-0.5 text-[10px] text-muted-foreground">+{excedente} agendada(s)</p>
                          )}

                          {provido.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <CalendarSemData ordens={semData} technicianById={technicianById} onAbrir={onAbrir} />
      </div>
    </DragDropContext>
  );
}