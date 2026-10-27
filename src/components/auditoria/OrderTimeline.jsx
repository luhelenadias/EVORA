import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import TimelineItem from '@/components/auditoria/TimelineItem';
import { resumoDaLinhaDoTempo } from '@/lib/auditoria';

/**
 * Linha do tempo da OS com quem fez cada ação, data/hora do servidor e origem.
 * A leitura passa pelo servidor: o técnico recebe só o histórico das OS dele.
 */
export default function OrderTimeline({ order }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['historicoOS', order?.id],
    queryFn: async () => {
      const resposta = await base44.functions.invoke('historicoOS', { order_id: order.id });
      return resposta.data;
    },
    enabled: !!order?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        Não foi possível carregar o histórico desta ordem.
      </p>
    );
  }

  const entradas = data?.itens || [];
  const recentesPrimeiro = entradas.slice().reverse();
  const resumo = resumoDaLinhaDoTempo(entradas);

  return (
    <div className="space-y-4">
      {resumo && (
        <p className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {resumo}
        </p>
      )}

      {!entradas.length ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <History className="mt-px h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Anterior à auditoria — esta ordem não tem ações registradas no log (foi criada
            antes de a auditoria entrar em operação). Nada é inventado para trás.
          </span>
        </div>
      ) : (
        <ul className="mt-1">
          {recentesPrimeiro.map((entrada, index) => (
            <TimelineItem
              key={entrada.id}
              entrada={entrada}
              ultimo={index === recentesPrimeiro.length - 1 && data?.abertura_registrada}
            />
          ))}
          {!data?.abertura_registrada && (
            <li className="relative pl-8">
              <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-dashed bg-card">
                <History className="h-3 w-3 text-muted-foreground" />
              </span>
              <div className="pb-4">
                <p className="text-sm text-muted-foreground">Anterior à auditoria</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Abertura do chamado sem registro no log.
                </p>
              </div>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}