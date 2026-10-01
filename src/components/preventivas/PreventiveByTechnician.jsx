import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PreventiveRow from '@/components/preventivas/PreventiveRow';
import TechnicianGroup from '@/components/preventivas/TechnicianGroup';
import { agruparPorTecnico } from '@/lib/preventivas';

/** Modo "Por técnico": agenda de cada responsável e a fila de preventivas sem atribuição. */
export default function PreventiveByTechnician({
  preventivas,
  equipmentById,
  tecnicos,
  onOpen,
  onAtribuir,
  atribuindoId,
}) {
  const { grupos, naoAtribuidas } = useMemo(
    () => agruparPorTecnico(preventivas, tecnicos),
    [preventivas, tecnicos]
  );

  const ativos = useMemo(() => tecnicos.filter((t) => t.status === 'Ativo'), [tecnicos]);

  return (
    <div className="space-y-4">
      {naoAtribuidas.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-sm">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Não atribuído
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground">
                {naoAtribuidas.length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Preventivas sem técnico responsável — escolha um técnico ativo para encaminhar a programação.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {naoAtribuidas.map((order) => (
              <PreventiveRow
                key={order.id}
                order={order}
                equipment={equipmentById[order.equipment_id]}
                tecnicos={ativos}
                onOpen={onOpen}
                onAtribuir={onAtribuir}
                atribuindo={atribuindoId === order.id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum técnico cadastrado na equipe para receber preventivas.
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {grupos.map((grupo) => (
            <TechnicianGroup
              key={grupo.id}
              grupo={grupo}
              equipmentById={equipmentById}
              tecnicos={ativos}
              onOpen={onOpen}
              onAtribuir={onAtribuir}
              atribuindoId={atribuindoId}
            />
          ))}
        </div>
      )}
    </div>
  );
}