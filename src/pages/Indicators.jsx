import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { differenceInDays, parseISO, subMonths } from 'date-fns';
import KpiCards from '@/components/indicators/KpiCards';
import CostBySector from '@/components/indicators/CostBySector';
import PreventiveCompliance from '@/components/indicators/PreventiveCompliance';
import EquipmentPerformanceTable from '@/components/indicators/EquipmentPerformanceTable';
import { Skeleton } from '@/components/ui/skeleton';
import { computeMTTR, computeMTBF } from '@/lib/maintenance';

export default function Indicators() {
  useOutletContext();

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

  const kpis = useMemo(() => {
    const mttr = computeMTTR(orders);

    const mtbfValues = equipment
      .map((eq) => computeMTBF(eq, orders))
      .filter((v) => v != null);
    const avgMtbf = mtbfValues.length ? mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length : null;

    const activeEq = equipment.filter((e) => e.operational_status === 'Ativo').length;
    const availability = equipment.length ? Math.round((activeEq / equipment.length) * 100) : 0;

    const twelveMonthsAgo = subMonths(new Date(), 12);
    const totalCost12m = orders
      .filter((o) => o.open_date && parseISO(o.open_date) > twelveMonthsAgo)
      .reduce((sum, o) => sum + (o.total_cost || 0), 0);

    return { mttr, avgMtbf, availability, totalCost12m };
  }, [equipment, orders]);

  const costBySector = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.total_cost) return;
      const sector = o.sector || 'Não informado';
      map[sector] = (map[sector] || 0) + o.total_cost;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const costByEquipment = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.total_cost || !o.equipment_name) return;
      map[o.equipment_name] = (map[o.equipment_name] || 0) + o.total_cost;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
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

  const perfRows = useMemo(() => {
    return equipment.map((eq) => {
      const eqOrders = orders.filter((o) => o.equipment_id === eq.id);
      const completed = eqOrders.filter((o) => o.status === 'Concluído' && o.start_date && o.completion_date);
      const eqMttr = completed.length
        ? completed.reduce((s, o) => s + (parseISO(o.completion_date) - parseISO(o.start_date)) / (1000 * 60 * 60), 0) / completed.length
        : null;
      const correctiveCount = eqOrders.filter((o) => o.type === 'Corretiva').length;
      const cost = eqOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
      return {
        id: eq.id,
        name: eq.name,
        criticality: eq.criticality,
        mttr: eqMttr,
        mtbf: computeMTBF(eq, orders),
        correctiveCount,
        cost,
        status: eq.operational_status,
      };
    }).filter((r) => r.correctiveCount > 0 || r.mttr != null || r.cost > 0)
      .sort((a, b) => b.correctiveCount - a.correctiveCount);
  }, [equipment, orders]);

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
        <p className="text-sm text-muted-foreground mt-0.5">KPIs de engenharia clínica — MTTR, MTBF, disponibilidade e custos</p>
      </div>

      <KpiCards {...kpis} />

      <PreventiveCompliance {...preventive} />

      <CostBySector costBySector={costBySector} costByEquipment={costByEquipment} />

      <EquipmentPerformanceTable rows={perfRows} />
    </div>
  );
}