import React from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Mic, Play, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GRUPOS_CENTRAL, motivoDaOrdem } from '@/lib/central';
import { rotuloScore } from '@/lib/priorizacao';
import TermoTooltip from '@/components/shared/TermoTooltip';
import ResponseTimeInfo from '@/components/maintenance/ResponseTimeInfo';
import { aguardandoTriagem } from '@/lib/triagem';

const ESTILOS = {
  Preventiva: {
    icon: Wrench,
    box: 'bg-primary/10 text-primary',
    barra: 'border-l-primary',
    chip: 'border-primary/30 text-primary bg-primary/5',
  },
  Corretiva: {
    icon: AlertTriangle,
    box: 'bg-destructive/10 text-destructive',
    barra: 'border-l-destructive',
    chip: 'border-destructive/30 text-destructive bg-destructive/5',
  },
};

const ESTILO_PADRAO = {
  icon: CalendarPlus,
  box: 'bg-muted text-muted-foreground',
  barra: 'border-l-border',
  chip: 'border-border text-muted-foreground bg-muted',
};

export default function CentralOrderCard({ order, equipment, onStart, onFinish, onOpen, onRecord, isStarting }) {
  const estilo = ESTILOS[order.type] || ESTILO_PADRAO;
  const Icon = estilo.icon;
  const concluida = order.status === 'Concluído';
  const score = order.prioridade_score_equipamento;
  // Sem destino definido, a OS espera a triagem da gestão: não há o que iniciar.
  const semDestino = aguardandoTriagem(order);

  return (
    <Card
      className={cn('p-4 border-l-4 cursor-pointer transition-colors hover:bg-muted/40', estilo.barra)}
      onClick={() => onOpen?.(order)}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', estilo.box)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{order.equipment_name || '—'}</span>
            {equipment?.codigo_equipamento && (
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5"
              >
                {equipment.codigo_equipamento}
              </Badge>
            )}
            <Badge variant="outline" className={estilo.chip}>{order.type}</Badge>
            {semDestino && (
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-[11px] text-warning-foreground">
                Aguardando triagem
              </Badge>
            )}
            {score != null && (
              <TermoTooltip
                termo={equipment?.prioridade_modelo || 'EM'}
                as="span"
                className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {rotuloScore(score, equipment?.prioridade_modelo)}
              </TermoTooltip>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{motivoDaOrdem(order, equipment)}</p>

          {concluida && order.technical_report && (
            <p className="text-xs bg-muted/50 rounded-md p-2 leading-relaxed">{order.technical_report}</p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            {order.code && <span className="font-mono">{order.code}</span>}
            {order.origin === 'Agendada' && <span>Gerada automaticamente</span>}
            {GRUPOS_CENTRAL.andamento.includes(order.status) && order.start_date && (
              <span>Iniciada em {format(parseISO(order.start_date), 'dd/MM/yy HH:mm')}</span>
            )}
            {order.relatorio_audio_em && <span className="text-primary">Rascunho de IA para revisar</span>}
            {concluida && order.completion_date && (
              <span>Concluída em {format(parseISO(order.completion_date), 'dd/MM/yy HH:mm')}</span>
            )}
            {concluida && order.duracao_total_minutos != null && (
              <span>{Math.round(order.duracao_total_minutos)} min</span>
            )}
            <ResponseTimeInfo order={order} />
          </div>
        </div>

        {!concluida && !semDestino && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {GRUPOS_CENTRAL.andamento.includes(order.status) ? (
              <div className="flex flex-col sm:flex-row gap-2">
                {onRecord && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onRecord(order)}>
                    <Mic className="w-3.5 h-3.5" /> {order.transcricao_audio ? 'Gravar mais' : 'Gravar relato'}
                  </Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => onFinish(order)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Manutenção
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 w-full sm:w-auto"
                onClick={() => onStart(order)}
                disabled={isStarting}
              >
                <Play className="w-3.5 h-3.5" /> Iniciar Manutenção
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}