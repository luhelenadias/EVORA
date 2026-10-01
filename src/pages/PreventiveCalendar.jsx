import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfMonth } from 'date-fns';
import { CalendarDays, Users } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import OrderDetailDialog from '@/components/maintenance/OrderDetailDialog';
import PreventiveCalendarView from '@/components/preventivas/PreventiveCalendarView';
import PreventiveByTechnician from '@/components/preventivas/PreventiveByTechnician';
import { preventivasAbertas } from '@/lib/preventivas';

/** Calendário de Preventivas: visão mensal e agenda por técnico das preventivas em aberto. */
export default function PreventiveCalendar() {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState('calendario');
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [detalhe, setDetalhe] = useState(null);
  const [atribuindoId, setAtribuindoId] = useState(null);

  const { data: orders = [], isLoading: carregandoOrdens } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });

  const { data: equipment = [], isLoading: carregandoEquip } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['techTeam'],
    queryFn: () => base44.entities.TechTeam.list(),
  });

  const preventivas = useMemo(() => preventivasAbertas(orders), [orders]);

  const equipmentById = useMemo(
    () => Object.fromEntries(equipment.map((item) => [item.id, item])),
    [equipment]
  );

  const technicianById = useMemo(
    () => Object.fromEntries(tecnicos.map((item) => [item.id, item])),
    [tecnicos]
  );

  const semTecnico = preventivas.filter((o) => !o.technician_id).length;

  const ordemDetalhe = detalhe ? orders.find((o) => o.id === detalhe.id) || detalhe : null;

  const atribuir = async (order, tecnicoId) => {
    const tecnico = technicianById[tecnicoId];
    if (!tecnico) return;
    setAtribuindoId(order.id);
    try {
      await base44.entities.ServiceOrder.update(order.id, {
        technician_id: tecnico.id,
        technician_name: tecnico.name,
      });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success(`Preventiva de ${order.equipment_name || 'equipamento'} atribuída a ${tecnico.name}`);
    } catch (erro) {
      toast.error(`Não foi possível atribuir: ${erro?.message || erro}`);
    } finally {
      setAtribuindoId(null);
    }
  };

  if (carregandoOrdens || carregandoEquip) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Preventivas"
        subtitle={`${preventivas.length} preventiva(s) em aberto${semTecnico ? ` · ${semTecnico} sem técnico` : ''}`}
      />

      <Tabs value={modo} onValueChange={setModo}>
        <TabsList>
          <TabsTrigger value="calendario" className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="tecnico" className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> Por técnico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4">
          {preventivas.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma preventiva programada"
              description="As preventivas aparecem aqui conforme a periodicidade de cada equipamento, com a data prevista, o responsável e os pendentes de atribuição."
            />
          ) : (
            <PreventiveCalendarView
              preventivas={preventivas}
              equipmentById={equipmentById}
              technicianById={technicianById}
              mes={mes}
              onMesChange={setMes}
              onOpen={setDetalhe}
            />
          )}
        </TabsContent>

        <TabsContent value="tecnico" className="mt-4">
          {preventivas.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhuma preventiva programada"
              description="Quando houver preventivas em aberto, elas aparecem agrupadas por técnico — incluindo as ainda sem responsável."
            />
          ) : (
            <PreventiveByTechnician
              preventivas={preventivas}
              equipmentById={equipmentById}
              tecnicos={tecnicos}
              onOpen={setDetalhe}
              onAtribuir={atribuir}
              atribuindoId={atribuindoId}
            />
          )}
        </TabsContent>
      </Tabs>

      {ordemDetalhe && (
        <OrderDetailDialog
          order={ordemDetalhe}
          equipment={equipmentById[ordemDetalhe.equipment_id]}
          orders={orders}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}