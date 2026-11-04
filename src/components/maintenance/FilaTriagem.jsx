import React from 'react';
import { Clock, Inbox, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { esperaTexto, filaTriagem, rotuloStatusOS } from '@/lib/triagem';

function Linha({ order, equipment, onAbrir, acao }) {
  return (
    <div
      className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2.5 last:border-0 hover:bg-muted/40"
      onClick={() => onAbrir(order)}
    >
      <span className="font-mono text-xs font-medium">{order.code || '—'}</span>
      <span className="min-w-0 flex-1 truncate text-sm">{order.equipment_name || equipment?.name || '—'}</span>
      <span className="hidden text-[11px] text-muted-foreground sm:block">{order.sector || equipment?.location_sector || '—'}</span>
      {order.urgencia_percebida ? (
        <StatusBadge value={order.urgencia_percebida} type="priority" />
      ) : (
        <span className="text-[11px] text-muted-foreground">urgência não informada</span>
      )}
      <span className="hidden text-[11px] text-muted-foreground md:block">{order.requester_name || '—'}</span>
      <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-[11px] text-warning-foreground">
        <Clock className="h-2.5 w-2.5" /> {esperaTexto(order)}
      </Badge>
      <StatusBadge value={order.status} rotulo={rotuloStatusOS(order)} />
      {acao && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={(evento) => { evento.stopPropagation(); onAbrir(order); }}
        >
          {acao}
        </Button>
      )}
    </div>
  );
}

/** Fila de triagem e reabertura de triagem (aba visível só para admin e gestão). */
export default function FilaTriagem({ orders = [], equipmentById = {}, onAbrir, triadas = [] }) {
  const fila = filaTriagem(orders);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold text-foreground">
            Aguardando triagem
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {fila.length}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">Prioridade primeiro, depois o mais antigo</p>
        </div>
        {fila.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nenhum chamado aguardando triagem"
            description="Toda OS corretiva aberta aparece aqui até a gestão definir o destino."
          />
        ) : (
          <div>
            {fila.map((order) => (
              <Linha
                key={order.id}
                order={order}
                equipment={equipmentById[order.equipment_id]}
                onAbrir={onAbrir}
                acao="Triar"
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold text-foreground">
            Triadas, ainda sem início
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {triadas.length}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">Reabra para trocar técnico ou rota (motivo obrigatório)</p>
        </div>
        {triadas.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
            Nenhuma OS triada aguardando início.
          </p>
        ) : (
          <div>
            {triadas.map((order) => (
              <Linha
                key={order.id}
                order={order}
                equipment={equipmentById[order.equipment_id]}
                onAbrir={onAbrir}
                acao={<><RotateCcw className="h-3 w-3" /> Reabrir</>}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}