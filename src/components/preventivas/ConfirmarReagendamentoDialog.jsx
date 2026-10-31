import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

function Linha({ rotulo, valor, destaque = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className={`text-right text-sm ${destaque ? 'font-semibold text-primary' : 'text-foreground'}`}>{valor}</span>
    </div>
  );
}

const formatarData = (valor) => {
  if (!valor) return 'Sem data programada';
  const data = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(data.getTime())) return String(valor);
  return String(valor).includes('T') ? format(data, "dd/MM/yyyy 'às' HH:mm") : format(data, 'dd/MM/yyyy');
};

/**
 * Confirmação do agendamento/reagendamento feito no calendário.
 * Para OS de prioridade Crítica a confirmação é reforçada (exige marcação
 * explícita). Aceitar uma sugestão passa por aqui antes de virar agendamento.
 */
export default function ConfirmarReagendamentoDialog({ dados, onConfirmar, onCancelar }) {
  const [reforcado, setReforcado] = useState(false);

  useEffect(() => {
    setReforcado(false);
  }, [dados?.order?.id, dados?.novaData]);

  if (!dados) return null;

  const { order, equipment, tecnico, dataAtual, novaData, avisos = [], origem = 'calendario', motivoSugestao } = dados;
  const critica = order?.priority === 'Crítica';
  const bloqueado = critica && !reforcado;

  const titulo = origem === 'sugestao'
    ? 'Aceitar a data sugerida'
    : origem === 'sem-data'
      ? 'Agendar manutenção'
      : 'Reagendar manutenção';

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {order?.code ? <span className="font-mono">{order.code}</span> : 'Ordem de serviço'} ·{' '}
            {equipment?.name || order?.equipment_name || 'Equipamento'}
          </DialogDescription>
        </DialogHeader>

        {origem === 'sugestao' && motivoSugestao && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <p className="text-xs leading-snug text-foreground/80">{motivoSugestao}</p>
          </div>
        )}

        <div className="space-y-0">
          <Linha
            rotulo="Equipamento"
            valor={
              equipment?.codigo_equipamento
                ? `${equipment.name || order?.equipment_name} · ${equipment.codigo_equipamento}`
                : order?.equipment_name || '—'
            }
          />
          <Linha rotulo="Prioridade" valor={order?.priority || '—'} />
          <Linha rotulo="Técnico" valor={tecnico?.name || order?.technician_name || 'Não atribuída'} />
          <Linha rotulo="Data atual" valor={formatarData(dataAtual)} />
          <div className="flex items-center justify-end gap-2 py-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-primary">{formatarData(novaData)}</span>
          </div>
        </div>

        {avisos.length > 0 && (
          <div className="space-y-1 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <AlertTriangle className="h-3.5 w-3.5" /> Atenção antes de confirmar
            </p>
            {avisos.map((aviso) => (
              <p key={aviso} className="text-xs leading-snug text-foreground/80">{aviso}</p>
            ))}
          </div>
        )}

        {critica && (
          <div className="space-y-2 rounded-lg border border-accent bg-accent/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <AlertTriangle className="h-3.5 w-3.5" /> Ordem de serviço de prioridade Crítica
            </p>
            <p className="text-xs leading-snug text-foreground/80">
              Mudar a data de uma OS crítica pode deixar um equipamento essencial sem cobertura. Confirme
              apenas se o novo dia estiver combinado com a engenharia clínica.
            </p>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="confirmacao-reforcada"
                checked={reforcado}
                onCheckedChange={(valor) => setReforcado(valor === true)}
              />
              <Label htmlFor="confirmacao-reforcada" className="text-xs leading-snug text-foreground">
                Confirmo o reagendamento desta OS de prioridade Crítica
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button onClick={onConfirmar} disabled={bloqueado}>
            {origem === 'sugestao' ? 'Aceitar e agendar' : 'Confirmar nova data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}