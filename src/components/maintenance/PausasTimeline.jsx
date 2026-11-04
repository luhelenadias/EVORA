import React from 'react';
import { Pause, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { duracaoTexto, minutosDaPausa } from '@/lib/pausas';

const dataHora = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : format(data, 'dd/MM/yy HH:mm');
};

/** Linha do tempo simples das pausas de uma OS. */
export default function PausasTimeline({ order }) {
  const pausas = order?.pausas || [];
  if (!pausas.length) return null;

  const total = pausas.reduce((soma, pausa) => soma + minutosDaPausa(pausa), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pausas da manutenção
        </p>
        <span className="text-[11px] text-muted-foreground">Total {duracaoTexto(total)}</span>
      </div>
      <ul className="space-y-1.5">
        {pausas.map((pausa, i) => {
          const aberta = !pausa.fim;
          return (
            <li
              key={pausa.id || i}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
            >
              {aberta
                ? <Pause className="h-3.5 w-3.5 text-accent" />
                : <Play className="h-3.5 w-3.5 text-primary" />}
              <span className="font-medium">{pausa.motivo}</span>
              <span className="text-muted-foreground">
                {dataHora(pausa.inicio)} → {aberta ? 'em andamento' : dataHora(pausa.fim)}
              </span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {duracaoTexto(minutosDaPausa(pausa))}
              </Badge>
              {pausa.observacao && (
                <span className="w-full text-[11px] text-muted-foreground">{pausa.observacao}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}