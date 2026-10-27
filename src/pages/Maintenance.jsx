import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BarChart2, CheckCircle2, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import CentralList from '@/components/maintenance/CentralList';
import OrderDetailDialog from '@/components/maintenance/OrderDetailDialog';
import FinalizarManutencaoDialog from '@/components/maintenance/FinalizarManutencaoDialog';
import GravadorAudioDialog from '@/components/maintenance/GravadorAudioDialog';
import MaintenanceIndicators from '@/components/maintenance/MaintenanceIndicators';
import MaintenancePending from '@/components/maintenance/MaintenancePending';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { calcularPreventivasAGerar, calcularProximaPreventiva } from '@/lib/preventiva';
import { calcularMtbf, calcularMttr, calcularTempoMedioAtendimento, frequenciaPorDias } from '@/lib/indicadores';
import { minutosDeAtendimento, slaDeAtendimento } from '@/lib/atendimento';
import { GRUPOS_CENTRAL, ORDENACOES } from '@/lib/central';
import { registrarAuditoria } from '@/lib/auditoria';

export default function Maintenance() {
  const queryClient = useQueryClient();
  const { config } = useConfiguracao();
  const [searchParams, setSearchParams] = useSearchParams();

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todas');
  const [ordem, setOrdem] = useState('prioridade');
  const [abaCentral, setAbaCentral] = useState('pendentes');
  const [iniciandoId, setIniciandoId] = useState(null);
  const [finalizando, setFinalizando] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [gravando, setGravando] = useState(null);
  const [trechosPorOrdem, setTrechosPorOrdem] = useState({});
  const geradasRef = useRef(new Set());

  const { data: equipment = [], isLoading: carregandoEquip } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: orders = [], isLoading: carregandoOrdens } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  // ── 1. Geração automática de preventivas ────────────────────────
  useEffect(() => {
    if (carregandoEquip || carregandoOrdens) return;
    const novas = calcularPreventivasAGerar(equipment, orders).filter(
      (p) => !geradasRef.current.has(p.equipment_id)
    );
    if (!novas.length) return;
    novas.forEach((p) => geradasRef.current.add(p.equipment_id));
    base44.entities.ServiceOrder.bulkCreate(novas).then(async (criadas) => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success(`${novas.length} manutenção(ões) preventiva(s) agendada(s)`);
      for (const criada of criadas || []) {
        await registrarAuditoria({
          entidade_tipo: 'ServiceOrder',
          entidade_id: criada.id,
          entidade_codigo: criada.code || '',
          acao: 'Abertura',
          origem: 'Sistema',
          valor_novo: `${criada.type} · ${criada.problem_description || ''}`.trim(),
          motivo: 'Gerada automaticamente pela periodicidade do equipamento',
          tecnico_atribuido_id: criada.technician_id || null,
        });
      }
    });
  }, [equipment, orders, carregandoEquip, carregandoOrdens, queryClient]);

  const equipmentById = useMemo(() => {
    const mapa = {};
    equipment.forEach((e) => { mapa[e.id] = e; });
    return mapa;
  }, [equipment]);

  const pendingCount = equipment.filter((e) => e.status_priorizacao === 'pendente_atualizacao').length;
  const showPendingTab = config?.modelo_priorizacao === 'avancado' && pendingCount > 0;

  const viewParam = searchParams.get('view');
  const equipmentParam = searchParams.get('equipment');
  const activeTab =
    viewParam === 'indicators' ? 'indicators'
      : viewParam === 'pendencias' && showPendingTab ? 'pending'
        : abaCentral;

  const handleTabChange = (value) => {
    if (value === 'indicators') {
      setSearchParams({ view: 'indicators' });
    } else if (value === 'pending') {
      setSearchParams({ view: 'pendencias' });
    } else {
      setAbaCentral(value);
      setSearchParams({});
    }
  };

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return orders.filter((o) => {
      if (tipo !== 'Todas' && o.type !== tipo) return false;
      if (!termo) return true;
      return (
        (o.equipment_name || '').toLowerCase().includes(termo) ||
        (o.problem_description || '').toLowerCase().includes(termo) ||
        (o.code || '').toLowerCase().includes(termo) ||
        (equipmentById[o.equipment_id]?.codigo_equipamento || '').toLowerCase().includes(termo)
      );
    });
  }, [orders, tipo, busca, equipmentById]);

  const grupos = useMemo(() => ({
    pendentes: filtradas.filter((o) => GRUPOS_CENTRAL.pendentes.includes(o.status)),
    andamento: filtradas.filter((o) => GRUPOS_CENTRAL.andamento.includes(o.status)),
    concluidas: filtradas.filter((o) => GRUPOS_CENTRAL.concluidas.includes(o.status)),
  }), [filtradas]);

  const ordemDetalhe = detalhe ? orders.find((o) => o.id === detalhe.id) || detalhe : null;

  // Vindo de um alerta (/manutencoes?os=<id>): abre a ordem direto.
  const ordemParam = searchParams.get('os');
  useEffect(() => {
    if (!ordemParam || !orders.length) return;
    const alvo = orders.find((o) => o.id === ordemParam);
    if (alvo) setDetalhe(alvo);
  }, [ordemParam, orders]);

  // ── 5. Fluxo de execução ────────────────────────────────────────
  const iniciar = async (order) => {
    setIniciandoId(order.id);
    try {
      const inicio = new Date();
      const resposta = slaDeAtendimento(order, contracts);
      await base44.entities.ServiceOrder.update(order.id, {
        status: 'Em Andamento',
        start_date: inicio.toISOString(),
        response_time_minutes: minutosDeAtendimento(order.open_date, inicio),
        ...(resposta.deadline ? { sla_response_deadline: resposta.deadline.toISOString() } : {}),
        sla_response_status: resposta.status,
      });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success('Manutenção iniciada');
      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: order.id,
        entidade_codigo: order.code || '',
        acao: 'Início do atendimento',
        campo: 'start_date',
        valor_novo: inicio.toISOString(),
        tecnico_atribuido_id: order.technician_id || null,
      });
    } finally {
      setIniciandoId(null);
    }
  };

  // Rascunho de IA: grava nos campos da OS sem concluir nem dar baixa em estoque.
  const aplicarRascunho = async ({ rascunho, transcricao }) => {
    const order = gravando;
    if (!order) return;
    const catalogo = await base44.entities.SparePart.list();
    const sugeridas = (rascunho.pecas || [])
      .map((item) => {
        const peca = catalogo.find((s) => s.id === item.spare_part_id);
        if (!peca) return null;
        return {
          spare_part_id: peca.id,
          name: peca.name,
          quantity: Math.max(Number(item.quantidade) || 1, 1),
          cost: peca.unit_cost || 0,
        };
      })
      .filter(Boolean);
    const existentes = order.parts_used || [];
    const novas = sugeridas.filter((s) => !existentes.some((e) => e.spare_part_id === s.spare_part_id));

    await base44.entities.ServiceOrder.update(order.id, {
      causa_falha: order.causa_falha || rascunho.causa_falha || '',
      technical_report: order.technical_report || rascunho.acao_realizada || '',
      testes_finais: order.testes_finais || rascunho.testes_finais || '',
      pendencias: order.pendencias || rascunho.pendencias || '',
      parts_used: [...existentes, ...novas],
      campos_revisar: rascunho.campos_revisar || [],
      transcricao_audio: transcricao,
      relatorio_audio_em: new Date().toISOString(),
    });

    setTrechosPorOrdem((prev) => ({ ...prev, [order.id]: [] }));
    setGravando(null);
    queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
    toast.success('Rascunho gerado — revise os campos antes de finalizar');
    await registrarAuditoria({
      entidade_tipo: 'ServiceOrder',
      entidade_id: order.id,
      entidade_codigo: order.code || '',
      acao: 'Rascunho de relatório gerado por IA',
      campo: 'relatorio_audio_em',
      valor_novo: 'Rascunho a partir do relato em áudio',
      motivo: (rascunho.campos_revisar || []).length
        ? `Campos a revisar: ${rascunho.campos_revisar.join(', ')}`
        : 'Todos os campos com leitura firme',
      origem: 'IA',
      tecnico_atribuido_id: order.technician_id || null,
    });
  };

  const concluir = async (dados) => {
    const order = finalizando;
    if (!order) return;
    setSalvando(true);
    try {
      await base44.entities.ServiceOrder.update(order.id, { ...dados, status: 'Concluído' });

      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: order.id,
        entidade_codigo: order.code || '',
        acao: 'Fechamento',
        campo: 'completion_date',
        valor_novo: dados.completion_date,
        motivo: `Duração ${Math.round(dados.duracao_total_minutos || 0)} min`,
        tecnico_atribuido_id: order.technician_id || null,
      });
      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: order.id,
        entidade_codigo: order.code || '',
        acao: 'Relatório confirmado',
        campo: 'technical_report',
        valor_novo: dados.technical_report,
        tecnico_atribuido_id: order.technician_id || null,
      });

      // Baixa automática de estoque das peças utilizadas
      const pecas = dados.parts_used || [];
      const baixas = [];
      if (pecas.length) {
        const catalogo = await base44.entities.SparePart.list();
        await Promise.all(pecas.map((item) => {
          const peca = catalogo.find((s) => s.id === item.spare_part_id);
          if (!peca) return null;
          const novoEstoque = Math.max((peca.current_stock ?? 0) - item.quantity, 0);
          const minimo = peca.minimum_stock ?? 0;
          baixas.push({
            nome: peca.name,
            quantidade: item.quantity,
            anterior: peca.current_stock ?? 0,
            novo: novoEstoque,
          });
          return base44.entities.SparePart.update(peca.id, {
            current_stock: novoEstoque,
            status: novoEstoque <= 0 ? 'Sem Estoque' : novoEstoque <= minimo ? 'Estoque Baixo' : 'Em Estoque',
          });
        }));
        queryClient.invalidateQueries({ queryKey: ['spareParts'] });

        for (const baixa of baixas) {
          await registrarAuditoria({
            entidade_tipo: 'ServiceOrder',
            entidade_id: order.id,
            entidade_codigo: order.code || '',
            acao: 'Peça utilizada',
            campo: 'parts_used',
            valor_novo: `${baixa.quantidade}× ${baixa.nome}`,
            motivo: `Baixa de estoque: ${baixa.anterior} → ${baixa.novo}`,
            tecnico_atribuido_id: order.technician_id || null,
          });
        }
      }

      const eq = equipmentById[order.equipment_id];

      // Preventiva concluída: reprograma o ciclo do equipamento
      if (order.type === 'Preventiva' && eq) {
        const proxima = calcularProximaPreventiva(dados.completion_date, eq.periodicidade_preventiva_dias);
        await base44.entities.Equipment.update(eq.id, {
          data_ultima_preventiva: dados.completion_date.slice(0, 10),
          ...(proxima ? { data_proxima_preventiva: proxima } : {}),
        });
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
      }

      // ── 6. Indicadores automáticos (MTTR / MTBF) ─────────────────
      if (order.type === 'Corretiva') {
        const atualizadas = orders.map((o) =>
          o.id === order.id ? { ...o, ...dados, status: 'Concluído' } : o
        );
        const doEquipamento = atualizadas.filter((o) => o.equipment_id === order.equipment_id);
        const indicadores = {
          mttr_hours: calcularMttr(doEquipamento),
          mtbf_hours: calcularMtbf(doEquipamento),
          avg_response_time_hours: calcularTempoMedioAtendimento(doEquipamento),
          equipment_name: order.equipment_name || eq?.name || '',
        };
        const planos = await base44.entities.MaintenancePlan.filter({
          equipment_id: order.equipment_id,
        });
        if (planos.length) {
          await base44.entities.MaintenancePlan.update(planos[0].id, indicadores);
        } else {
          await base44.entities.MaintenancePlan.create({
            equipment_id: order.equipment_id,
            frequency: frequenciaPorDias(eq?.periodicidade_preventiva_dias),
            status: 'Ativo',
            ...indicadores,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['maintenancePlans'] });
      }

      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success('Manutenção concluída');
      setFinalizando(null);
    } catch (erro) {
      toast.error(`Não foi possível concluir: ${erro?.message || erro}`);
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoEquip || carregandoOrdens) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Manutenções"
        subtitle={`${grupos.pendentes.length} pendente(s) · ${grupos.andamento.length} em andamento · ${grupos.concluidas.length} concluída(s)`}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamento, código ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todos os tipos</SelectItem>
                <SelectItem value="Preventiva">Preventiva</SelectItem>
                <SelectItem value="Corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ordem} onValueChange={setOrdem}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDENACOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>Ordenar por {o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pendentes" className="gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Pendentes
            {grupos.pendentes.length > 0 && (
              <Badge className="ml-1 h-5 text-[10px]">{grupos.pendentes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="andamento" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Em Andamento
            {grupos.andamento.length > 0 && (
              <Badge className="ml-1 h-5 text-[10px] bg-warning/20 text-warning-foreground">
                {grupos.andamento.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluídas
          </TabsTrigger>
          <TabsTrigger value="indicators" className="gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" /> Indicadores por Equipamento
          </TabsTrigger>
          {showPendingTab && (
            <TabsTrigger value="pending" className="gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Pendências
              <Badge className="ml-1 h-5 text-[10px] bg-destructive/15 text-destructive">{pendingCount}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          <CentralList
            orders={grupos.pendentes}
            equipmentById={equipmentById}
            ordem={ordem}
            iniciandoId={iniciandoId}
            onStart={iniciar}
            onFinish={setFinalizando}
            onRecord={setGravando}
            onOpen={setDetalhe}
            title="Nenhuma manutenção pendente"
            description="As preventivas são agendadas automaticamente conforme a periodicidade de cada equipamento."
          />
        </TabsContent>

        <TabsContent value="andamento" className="mt-4">
          <CentralList
            orders={grupos.andamento}
            equipmentById={equipmentById}
            ordem={ordem}
            iniciandoId={iniciandoId}
            onStart={iniciar}
            onFinish={setFinalizando}
            onRecord={setGravando}
            onOpen={setDetalhe}
            title="Nenhuma manutenção em andamento"
            description="Inicie uma manutenção na aba Pendentes para acompanhá-la aqui."
          />
        </TabsContent>

        <TabsContent value="concluidas" className="mt-4">
          <CentralList
            orders={grupos.concluidas}
            equipmentById={equipmentById}
            ordem={ordem}
            iniciandoId={iniciandoId}
            onStart={iniciar}
            onFinish={setFinalizando}
            onRecord={setGravando}
            onOpen={setDetalhe}
            title="Nenhuma manutenção concluída"
            description="As manutenções finalizadas aparecem aqui com o laudo técnico."
          />
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <MaintenanceIndicators initialEquipmentId={equipmentParam} />
        </TabsContent>

        {showPendingTab && (
          <TabsContent value="pending" className="mt-4">
            <MaintenancePending />
          </TabsContent>
        )}
      </Tabs>

      <FinalizarManutencaoDialog
        open={!!finalizando}
        order={finalizando}
        equipment={finalizando ? equipmentById[finalizando.equipment_id] : null}
        onClose={() => setFinalizando(null)}
        onConfirm={concluir}
        isSaving={salvando}
      />

      {gravando && (
        <GravadorAudioDialog
          open
          order={gravando}
          equipment={equipmentById[gravando.equipment_id]}
          trechos={trechosPorOrdem[gravando.id] || []}
          onTrechosChange={(lista) => setTrechosPorOrdem((prev) => ({ ...prev, [gravando.id]: lista }))}
          onRascunho={aplicarRascunho}
          onClose={() => setGravando(null)}
        />
      )}

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