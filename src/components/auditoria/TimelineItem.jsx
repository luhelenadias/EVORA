import React from 'react';
import { format, parseISO } from 'date-fns';
import { Bot, Cpu, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fraseDaEntrada, quemFez } from '@/lib/auditoria';

const ESTILO_ORIGEM = {
  'Usuário': { icon: User, chip: 'border-border bg-muted text-muted-foreground' },
  IA: { icon: Bot, chip: 'border-primary/30 bg-primary/10 text-primary' },
  Sistema: { icon: Cpu, chip: 'border-border bg-card text-muted-foreground' },
  'Ajuste administrativo': { icon: Cpu, chip: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

function dataHora(valor) {
  if (!valor) return '—';
  try {
    return format(parseISO(valor), "dd/MM/yyyy 'às' HH:mm");
  } catch {
    return valor;
  }
}

/** Uma linha da linha do tempo: quem, o que, quando e por qual origem. */
export default function TimelineItem({ entrada, ultimo }) {
  const estilo = ESTILO_ORIGEM[entrada.origem] || ESTILO_ORIGEM['Usuário'];
  const Icon = estilo.icon;

  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-card">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </span>
      {!ultimo && <span className="absolute left-3 top-7 bottom-0 w-px bg-border" />}

      <div className="pb-4">
        <p className="text-sm leading-snug">{fraseDaEntrada(entrada)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{dataHora(entrada.data_hora)}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', estilo.chip)}>
            {entrada.origem === 'Usuário' ? quemFez(entrada) : entrada.origem}
          </Badge>
          {entrada.motivo && <span className="italic">{entrada.motivo}</span>}
        </div>
      </div>
    </li>
  );
}