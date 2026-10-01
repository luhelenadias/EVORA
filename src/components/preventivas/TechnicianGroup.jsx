import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import PreventiveRow from '@/components/preventivas/PreventiveRow';
import { iniciaisDoNome } from '@/lib/preventivas';

/** Preventivas de um técnico, em ordem cronológica. */
export default function TechnicianGroup({ grupo, equipmentById, tecnicos, onOpen, onAtribuir, atribuindoId }) {
  const indisponivel = grupo.status !== 'Ativo';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0"
            style={{ backgroundColor: grupo.cor }}
          >
            {iniciaisDoNome(grupo.nome)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-foreground truncate">{grupo.nome}</p>
            <p className="text-[11px] text-muted-foreground">
              {grupo.ordens.length} preventiva(s) programada(s)
            </p>
          </div>

          {indisponivel && (
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground flex-shrink-0">
              {grupo.status === 'Desconhecido' ? 'Técnico não cadastrado' : `Indisponível · ${grupo.status}`}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {grupo.ordens.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma preventiva atribuída.</p>
        ) : (
          grupo.ordens.map((order) => (
            <PreventiveRow
              key={order.id}
              order={order}
              equipment={equipmentById[order.equipment_id]}
              tecnicos={tecnicos}
              onOpen={onOpen}
              onAtribuir={onAtribuir}
              atribuindo={atribuindoId === order.id}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}