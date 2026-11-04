import React from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import PedidoPecaAcoes from '@/components/maintenance/PedidoPecaAcoes';
import { ESTILO_STATUS, nomeDaPeca, pedidosDaOS } from '@/lib/pedidosPeca';

const dataCurta = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : format(data, 'dd/MM/yy');
};

/** Pedidos de peça da OS, com o andamento de cada um. */
export default function PedidosPecaOS({ order, pedidos = [], pecasById = {}, user }) {
  const meus = pedidosDaOS(pedidos, order?.id);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pedidos de peça
        </p>
        {meus.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {meus.filter((p) => !['Retirada', 'Cancelada'].includes(p.status)).length} em aberto
          </span>
        )}
      </div>

      {meus.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-3 text-center text-[11px] text-muted-foreground">
          Nenhum pedido de peça nesta OS.
        </p>
      ) : (
        <ul className="space-y-2">
          {meus.map((pedido) => (
            <li key={pedido.id} className="rounded-lg border bg-card p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{nomeDaPeca(pedido, pecasById)}</span>
                <span className="text-xs text-muted-foreground">{pedido.quantidade}×</span>
                <Badge variant="outline" className="text-[10px]">Urgência {pedido.urgencia}</Badge>
                <Badge variant="outline" className={`text-[10px] ${ESTILO_STATUS[pedido.status] || ''}`}>
                  {pedido.status}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {dataCurta(pedido.solicitado_em)}
                  {pedido.previsao_chegada ? ` · previsão ${dataCurta(pedido.previsao_chegada)}` : ''}
                </span>
              </div>
              {pedido.observacao && (
                <p className="mt-1 text-[11px] text-muted-foreground">{pedido.observacao}</p>
              )}
              {pedido.status === 'Chegou' && pedido.pausa_id && (
                <p className="mt-1 rounded-md border border-accent/50 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent-foreground">
                  Peça chegou: retome a manutenção.
                </p>
              )}
              <div className="mt-1.5">
                <PedidoPecaAcoes pedido={pedido} order={order} user={user} compacto />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}