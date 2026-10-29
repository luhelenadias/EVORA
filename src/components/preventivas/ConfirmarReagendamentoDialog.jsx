import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function Linha({ rotulo, valor, destaque = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className={`text-right text-sm ${destaque ? 'font-semibold text-primary' : 'text-foreground'}`}>{valor}</span>
    </div>
  );
}

/** Confirmação do reagendamento feito arrastando o card para outro dia. */
export default function ConfirmarReagendamentoDialog({ dados, onConfirmar, onCancelar }) {
  if (!dados) return null;
  const { order, equipment, tecnico, dataAtual, novaData, avisos = [] } = dados;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar manutenção</DialogTitle>
          <DialogDescription>
            {order.code ? <span className="font-mono">{order.code}</span> : 'Ordem de serviço'} ·{' '}
            {equipment?.name || order.equipment_name || 'Equipamento'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-0">
          <Linha
            rotulo="Equipamento"
            valor={
              equipment?.codigo_equipamento
                ? `${equipment.name || order.equipment_name} · ${equipment.codigo_equipamento}`
                : order.equipment_name || '—'
            }
          />
          <Linha rotulo="Técnico" valor={tecnico?.name || order.technician_name || 'Sem técnico'} />
          <Linha rotulo="Data atual" valor={dataAtual ? format(dataAtual, 'dd/MM/yyyy') : 'Sem data programada'} />
          <div className="flex items-center justify-end gap-2 py-2">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-primary">{format(novaData, 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {avisos.length > 0 && (
          <div className="space-y-1 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <AlertTriangle className="w-3.5 h-3.5" /> Atenção antes de confirmar
            </p>
            {avisos.map((aviso) => (
              <p key={aviso} className="text-xs leading-snug text-foreground/80">{aviso}</p>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button onClick={onConfirmar}>Confirmar nova data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}