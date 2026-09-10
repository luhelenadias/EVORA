import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import EquipmentIndicatorsTable from '@/components/indicators/EquipmentIndicatorsTable';
import { Activity, DollarSign, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { formatHours } from '@/lib/maintenance';

export default function MaintenanceIndicators({ initialEquipmentId }) {
  const [selectedEq, setSelectedEq] = useState(null);

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list(),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['maintenancePlans'],
    queryFn: () => base44.entities.MaintenancePlan.list(),
  });

  useEffect(() => {
    if (initialEquipmentId) {
      const eq = equipment.find((e) => e.id === initialEquipmentId);
      if (eq) setSelectedEq({ id: eq.id, name: eq.name });
    }
  }, [initialEquipmentId, equipment]);

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

  const inactiveEquipment = useMemo(
    () => equipment.filter((e) => e.operational_status !== 'Ativo'),
    [equipment]
  );

  const costOrders = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    return orders
      .filter((o) => o.total_cost && o.open_date && parseISO(o.open_date) > twelveMonthsAgo)
      .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
  }, [orders]);

  const selectedOrders = useMemo(() => {
    if (!selectedEq) return [];
    return orders
      .filter((o) => o.equipment_id === selectedEq.id)
      .sort((a, b) => (b.open_date || '').localeCompare(a.open_date || ''));
  }, [orders, selectedEq]);

  return (
    <div className="space-y-4">
      {/* Drill-down: OS history for selected equipment */}
      {selectedEq && (
        <Card className="border-primary/30">
          <div className="p-4 border-b flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedEq(null)}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div>
              <h3 className="text-sm font-semibold">Chamados — {selectedEq.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedOrders.length} chamado(s) registrado(s)</p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {selectedOrders.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Nenhum chamado registrado" description="Este equipamento ainda não possui ordens de serviço." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Código</TableHead>
                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">Abertura</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.code || `OS-${o.id?.substring(0, 6)}`}</TableCell>
                      <TableCell className="text-sm">{o.type}</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {o.open_date ? format(parseISO(o.open_date), 'dd/MM/yy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {o.total_cost ? `R$ ${o.total_cost.toLocaleString('pt-BR')}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      )}

      {/* MTTR/MTBF table */}
      <EquipmentIndicatorsTable
        rows={equipmentIndicators}
        avgMttr={avgMttr}
        avgMtbf={avgMtbf}
        onRowClick={(id, name) => setSelectedEq({ id, name })}
      />

      {/* Availability breakdown */}
      <Card>
        <div className="p-4 border-b flex items-center gap-2">
          <Activity className="w-4 h-4 text-success" />
          <div>
            <h3 className="text-sm font-semibold">Disponibilidade — {availability}%</h3>
            <p className="text-xs text-muted-foreground">Equipamentos parados / em manutenção / inativos</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {inactiveEquipment.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Todos os equipamentos estão ativos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveEquipment.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.name}</TableCell>
                    <TableCell><StatusBadge value={e.operational_status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Cost breakdown */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-warning" />
            <div>
              <h3 className="text-sm font-semibold">Custo de Manutenção (12 meses)</h3>
              <p className="text-xs text-muted-foreground">Ordens com custo no período</p>
            </div>
          </div>
          <p className="text-lg font-bold text-warning">
            R$ {totalCost12m.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          {costOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma ordem com custo registrado no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.code || `OS-${o.id?.substring(0, 6)}`}</TableCell>
                    <TableCell className="text-sm">{o.equipment_name || '—'}</TableCell>
                    <TableCell className="text-sm">{o.type}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">
                      R$ {(o.total_cost || 0).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}