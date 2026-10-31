import React from 'react';
import { CalendarCheck, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { corDoTecnico } from '@/lib/preventivas';

/**
 * Card do calendário de manutenções. Tamanho fixo: a duração real não é
 * estimada pelo tempo médio de reparo (essa ideia ficou em espera).
 */

const TIPOS = {
  preventiva: { Icone: CalendarCheck, rotulo: 'Preventiva', barra: 'bg-primary', cor: 'text-primary' },
  corretiva: { Icone: Wrench, rotulo: 'Corretiva', barra: 'bg-warning', cor: 'text-warning' },
};

const PRIORIDADES = {
  'Crítica': 'bg-accent text-accent-foreground',
  Alta: 'bg-warning/20 text-warning-foreground',
  'Média': 'bg-muted text-muted-foreground',
  Baixa: 'bg-muted text-muted-foreground',
};

function horario(valor) {
  const texto = String(valor || '');
  if (!texto.includes('T')) return '';
  const data = parseISO(texto);
  return Number.isNaN(data.getTime()) ? '' : format(data, 'HH:mm');
}

export default function CalendarCard({ item, tecnico, onClick, arrastavel = false, arrastando = false }) {
  const order = item.order;
  const tipo = TIPOS[item.kind] || TIPOS.preventiva;
  const Icone = tipo.Icone;
  const critica = order.priority === 'Crítica';
  // OS sem técnico nunca quebra o card: aparece como "Não atribuída".
  const nomeTecnico = tecnico?.name || order.technician_name || 'Não atribuída';
  const hora = horario(order.scheduled_date);

  return (
    <button
      type="button"
      onClick={() => onClick?.(order)}
      title={`${tipo.rotulo} · ${order.code || ''} ${order.equipment_name || ''}${arrastavel ? ' — arraste para outro dia' : ''}`}
      className={cn(
        'relative block h-[74px] w-full overflow-hidden rounded-md border border-border bg-card py-1 pl-2.5 pr-1.5 text-left transition-colors hover:bg-muted/60',
        arrastavel && 'cursor-grab active:cursor-grabbing',
        arrastando && 'shadow-lg ring-2 ring-primary/40'
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', critica ? 'bg-accent' : tipo.barra)} />

      <span className="flex items-center gap-1">
        <Icone className={cn('h-3 w-3 flex-shrink-0', tipo.cor)} />
        <span className="truncate font-mono text-[10px] font-bold text-foreground">
          {order.code || tipo.rotulo}
        </span>
        <span
          className={cn(
            'ml-auto flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none',
            PRIORIDADES[order.priority] || PRIORIDADES['Média']
          )}
        >
          {order.priority || 'Média'}
        </span>
      </span>

      <span className="mt-0.5 block truncate text-[11px] font-semibold leading-tight text-foreground">
        {order.equipment_name || '—'}
      </span>

      <span className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: corDoTecnico(order.technician_id) }}
        />
        <span className="truncate">
          {hora ? `${hora} · ` : ''}
          {nomeTecnico}
        </span>
      </span>
    </button>
  );
}