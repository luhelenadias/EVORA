import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { differenceInDays, parseISO, subMonths } from 'date-fns';
import KpiCards from '@/components/indicators/KpiCards';
import CostBySector from '@/components/indicators/CostBySector';
import PreventiveCompliance from '@/components/indicators/PreventiveCompliance';
import EquipmentIndicatorsTable from '@/components/indicators/EquipmentIndicatorsTable';
import IndicatorDetailDialog from '@/components/indicators/IndicatorDetailDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { computeMTTR } from '@/lib/maintenance';

export default function Indicators() {
  useOutletContext();
  const [dialog, setDialog] = useState({ open: false, view: null, equipmentId: null, equipmentName: null });

  const { data: equipment = [], isLoading: loadingEq } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list(),
  });
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['maintenancePlans'],
    queryFn: () => base44.entities.MaintenancePlan.list(),
  });

  const isLoading = loadingEq || loadingOrders || loadingPlans;

  // Indicadores por equipamento vindos do MaintenancePlan (mttr_hours / mtbf_hours)
  const equipmentIndicators = useMemo(() => {
    return plans
      .map((p) => {
        const eq = equipment.find((e) => e.id === p.equipment_id);
        return {
          equipment_id: p.equipment_id,
          equipment_name: p.equipment_name || eq?.name || '—',
          criticality: eq?.criticality,
          mttr_hours: p.mttr_hours,
          mtbf_hours: p.mtbf_hours,
          operational_status: eq?.operational_status,
        };
      })
      .filter((r) => r.mttr_hours != null || r.mtbf_hours != null);
  }, [plans, equipment]);

  const avgMttr = useMemo(() => {
    const vals = equipmentIndicators.map((r) => r.mttr_hours).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [equipmentIndicators]);

  const avgMtbf = useMemo(() => {
    const vals = equipmentIndicators.map((r) => r.mtbf_hours).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [equipmentIndicators]);

  const availability = useMemo(() => {
    if (!equipment.length) return 0;
    return Math.round((equipment.filter((e) => e.operational_status === 'Ativo').length / equipment.length) * 100);
  }, [equipment]);

  const totalCost12m = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    return orders
      .filter((o) => o.open_date && parseISO(o.open_date) > twelveMonthsAgo)
      .reduce((sum, o) => sum + (o.total_cost || 0), 0);
  }, [orders]);

  const costBySector = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.total_cost) return;
      const sector = o.sector || 'Não informado';
      map[sector] = (map[sector] || 0) + o.total_cost;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders]);

  const costByEquipment = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.total_cost || !o.equipment_name) return;
      map[o.equipment_name] = (map[o.equipment_name] || 0) + o.total_cost;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [orders]);

  const preventive = useMemo(() => {
    const activePlans = plans.filter((p) => p.status === 'Ativo');
    let onSchedule = 0, atRisk = 0, overdue = 0;
    activePlans.forEach((p) => {
      if (!p.next_execution_date) return;
      const days = differenceInDays(parseISO(p.next_execution_date), new Date());
      if (days < 0) overdue++;
      else if (days <= 30) atRisk++;
      else onSchedule++;
    });
    return { onSchedule, atRisk, overdue, total: activePlans.length };
  }, [plans]);

  const openDialog = (view, equipmentId = null, equipmentName = null) =>
    setDialog({ open: true, view, equipmentId, equipmentName });
  const closeDialog = () => setDialog({ open: false, view: null, equipmentId: null, equipmentName: null });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Indicadores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">KPIs de engenharia clínica por equipamento — MTTR, MTBF, disponibilidade e custos</p>
      </div>

      <KpiCards
        mttr={avgMttr}
        avgMtbf={avgMtbf}
        availability={availability}
        totalCost12m={totalCost12m}
        onCardClick={(key) => openDialog(key)}
      />

      <EquipmentIndicatorsTable
        rows={equipmentIndicators}
        avgMttr={avgMttr}
        avgMtbf={avgMtbf}
        onRowClick={(id, name) => openDialog('equipment-orders', id, name)}
      />

      <PreventiveCompliance {...preventive} />

      <CostBySector costBySector={costBySector} costByEquipment={costByEquipment} />

      <IndicatorDetailDialog
        open={dialog.open}
        onOpenChange={(o) => !o && closeDialog()}
        view={dialog.view}
        equipmentId={dialog.equipmentId}
        equipmentName={dialog.equipmentName}
        indicators={equipmentIndicators}
        equipment={equipment}
        orders={orders}
      />
    </div>
  );
}