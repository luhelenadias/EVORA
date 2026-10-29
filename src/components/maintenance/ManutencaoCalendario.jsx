import React, { useState } from 'react';
import { startOfMonth } from 'date-fns';
import { CalendarDays, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/shared/EmptyState';
import PreventiveCalendarView from '@/components/preventivas/PreventiveCalendarView';
import PreventiveByTechnician from '@/components/preventivas/PreventiveByTechnician';

/** Visão de agenda dentro da Central de Manutenções: calendário mensal e por técnico. */
export default function ManutencaoCalendario({
  preventivas,
  equipmentById,
  tecnicos,
  technicianById,
  onAbrir,
  onReagendar,
  onAtribuir,
  atribuindoId,
}) {
  const [modo, setModo] = useState('calendario');
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const semTecnico = preventivas.filter((o) => !o.technician_id).length;

  if (!preventivas.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhuma preventiva programada"
        description="As preventivas aparecem aqui conforme a periodicidade de cada equipamento, com a data prevista, o responsável e os pendentes de atribuição."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={modo} onValueChange={setModo}>
          <TabsList>
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="tecnico" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Por técnico
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          {preventivas.length} em aberto{semTecnico ? ` · ${semTecnico} sem técnico` : ''}
          {modo === 'calendario' ? ' · arraste um card para outro dia para reagendar' : ''}
        </p>
      </div>

      {modo === 'calendario' ? (
        <PreventiveCalendarView
          preventivas={preventivas}
          equipmentById={equipmentById}
          technicianById={technicianById}
          mes={mes}
          onMesChange={setMes}
          onOpen={onAbrir}
          onDrop={onReagendar}
        />
      ) : (
        <PreventiveByTechnician
          preventivas={preventivas}
          equipmentById={equipmentById}
          tecnicos={tecnicos}
          onOpen={onAbrir}
          onAtribuir={onAtribuir}
          atribuindoId={atribuindoId}
        />
      )}
    </div>
  );
}