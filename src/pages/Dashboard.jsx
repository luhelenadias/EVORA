import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Monitor, ClipboardList, AlertTriangle, FileText, Wrench,
  CheckCircle, Clock, Activity, AlertCircle
} from 'lucide-react';
import TermoTooltip from '@/components/shared/TermoTooltip';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ChartSection from '@/components/dashboard/ChartSection';
import AlertsList from '@/components/dashboard/AlertsList';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { differenceInDays, parseISO } from 'date-fns';

export default function Dashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { config } = useConfiguracao();

  const { data: equipment = [], isLoading: loadingEq } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list(),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['maintenancePlans'],
    queryFn: () => base44.entities.MaintenancePlan.list(),
  });

  const isLoading = loadingEq || loadingOrders || loadingContracts;

  const stats = useMemo(() => {
    const activeEq = equipment.filter(e => e.operational_status === 'Ativo').length;
    const total = equipment.length || 1;
    const availability = Math.round((activeEq / total) * 100);
    const openOrders = orders.filter(o => o.status !== 'Concluído').length;
    const completedOrders = orders.filter(o => o.status === 'Concluído').length;
    const stoppedEq = equipment.filter(e => e.operational_status === 'Parado' || e.operational_status === 'Em Manutenção').length;

    return [
      { label: 'Disponibilidade', value: `${availability}%`, icon: Activity, color: 'bg-success', bgColor: 'bg-success/10', iconColor: 'text-success', subtitle: `${activeEq} de ${total} ativos` },
      { label: 'Chamados Abertos', value: openOrders, icon: ClipboardList, color: 'bg-primary', bgColor: 'bg-primary/10', iconColor: 'text-primary', subtitle: `${completedOrders} concluídos` },
      { label: 'Equipamentos Parados', value: stoppedEq, icon: AlertTriangle, color: 'bg-destructive', bgColor: 'bg-destructive/10', iconColor: 'text-destructive', subtitle: 'Necessitam atenção' },
      { label: 'Contratos Ativos', value: contracts.filter(c => c.status === 'Ativo' || c.status === 'Vencendo').length, icon: FileText, color: 'bg-warning', bgColor: 'bg-warning/10', iconColor: 'text-warning', subtitle: `${contracts.length} total` },
    ];
  }, [equipment, orders, contracts]);

  const ordersByType = useMemo(() => {
    const counts = {};
    orders.forEach(o => { counts[o.type] = (counts[o.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const ordersBySector = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const sector = o.sector || 'Não informado';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [orders]);

  const pendingCount = useMemo(
    () => equipment.filter(e => e.status_priorizacao === 'pendente_atualizacao').length,
    [equipment]
  );
  const showPendingCard = config?.modelo_priorizacao === 'avancado' && pendingCount > 0;

  const alerts = useMemo(() => {
    const result = [];
    const today = new Date();

    // Contracts expiring in 60 days
    contracts.forEach(c => {
      if (c.end_date) {
        const days = differenceInDays(parseISO(c.end_date), today);
        if (days <= 60 && days > 0) {
          result.push({
            type: 'contract',
            message: `Contrato ${c.contract_number} vence em ${days} dias`,
            detail: c.supplier_name,
          });
        }
      }
    });

    // Maintenance plans overdue
    plans.forEach(p => {
      if (p.next_execution_date) {
        const days = differenceInDays(parseISO(p.next_execution_date), today);
        if (days <= 7) {
          result.push({
            type: 'maintenance',
            message: days < 0
              ? `Manutenção preventiva atrasada: ${p.equipment_name}`
              : `Manutenção preventiva em ${days} dias: ${p.equipment_name}`,
            detail: `Frequência: ${p.frequency}`,
          });
        }
      }
    });

    // AI suggestions
    plans.filter(p => p.ai_suggestion).forEach(p => {
      result.push({
        type: 'critical',
        message: `Sugestão IA: ${p.equipment_name}`,
        detail: p.ai_suggestion?.substring(0, 80) + '...',
      });
    });

    // Calibration alerts
    equipment.forEach(e => {
      if (e.next_calibration_date) {
        const days = differenceInDays(parseISO(e.next_calibration_date), today);
        if (days <= 30 && days > 0) {
          result.push({
            type: 'calibration',
            message: `Calibração de ${e.name} vence em ${days} dias`,
            detail: `Patrimônio: ${e.patrimony_number || 'N/I'}`,
          });
        }
      }
    });

    return result;
  }, [contracts, plans, equipment]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da engenharia clínica</p>
      </div>

      <StatsGrid stats={stats} />

      {showPendingCard && (
        <button
          onClick={() => navigate('/manutencoes?view=pendencias')}
          className="flex items-center gap-3 w-full p-4 rounded-xl bg-destructive/5 border border-destructive/30 text-left hover:bg-destructive/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {pendingCount} equipamento{pendingCount !== 1 ? 's' : ''}{' '}
              <TermoTooltip termo="pendente" as="span" className="font-semibold">
                pendente{pendingCount !== 1 ? 's' : ''} de atualização
              </TermoTooltip>{' '}
              para o modelo avançado
            </p>
            <p className="text-xs text-muted-foreground">Clique para ver a lista na aba de Manutenção e completar os dados de priorização.</p>
          </div>
        </button>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ChartSection ordersByType={ordersByType} ordersBySector={ordersBySector} />
        </div>
        <div>
          <AlertsList alerts={alerts} />
        </div>
      </div>
    </div>
  );
}