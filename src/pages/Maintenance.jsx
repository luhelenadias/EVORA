import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import CentralList from '@/components/maintenance/CentralList';
import OrderDetailDialog from '@/components/maintenance/OrderDetailDialog';
import FinalizarManutencaoDialog from '@/components/maintenance/FinalizarManutencaoDialog';
import GravadorAudioDialog from '@/components/maintenance/GravadorAudioDialog';
import MaintenanceCalendar from '@/components/maintenance/MaintenanceCalendar';
import FiltrosLista from '@/components/maintenance/FiltrosLista';
import FiltrosCalendario from '@/components/maintenance/FiltrosCalendario';
import ConfirmarReagendamentoDialog from '@/components/preventivas/ConfirmarReagendamentoDialog';
import ReagendarOrdemDialog from '@/components/preventivas/ReagendarOrdemDialog';
import { dataProgramada, preventivasAbertas } from '@/lib/preventivas';
import { avisosDeAgenda, corretivasSemData, dataDoAgendamento, ehManutencaoExterna, nomeResponsavel, novaDataDoArraste, semResponsavel } from '@/lib/agenda';
import { eventoDaMudanca, notificarMudancaDeAgenda } from '@/lib/notificacoes';
import {
  FILTROS_CALENDARIO_INICIAIS, FILTROS_LISTA_INICIAIS,
  filtrarOrdens, semSelecao, setoresDisponiveis,
} from '@/lib/filtros';
import { calcularPreventivasAGerar, calcularProximaPreventiva } from '@/lib/preventiva';
import { calcularMtbf, calcularMttr, calcularTempoMedioAtendimento, frequenciaPorDias } from '@/lib/indicadores';
import { minutosDeAtendimento, slaDeAtendimento } from '@/lib/atendimento';
import { GRUPOS_CENTRAL, ORDENACOES, ordemAtrasada } from '@/lib/central';
import { registrarAuditoria } from '@/lib/auditoria';
import { useTecnicos } from '@/lib/tecnicos';

const RECORTES_VAZIOS = { abertas: false, atrasadas: false, semTecnico: false };

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [aba, setAba] = useState('lista');
  const [filtrosLista, setFiltrosLista] = useState(FILTROS_LISTA_INICIAIS);
  const [filtrosCalendario, setFiltrosCalendario] = useState(FILTROS_CALENDARIO_INICIAIS);
  // Recortes vindos dos Indicadores (só abertas, atrasadas, sem técnico).
  const [recortes, setRecortes] = useState(RECORTES_VAZIOS);
  const [ordemLista, setOrdemLista] = useState('prioridade');
  const [visao, setVisao] = useState('mes');
  const [referencia, setReferencia] = useState(new Date());

  const [iniciandoId, setIniciandoId] = useState(null);
  const [finalizando, setFinalizando] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [gravando, setGravando] = useState(null);
  const [trechosPorOrdem, setTrechosPorOrdem] = useState({});
  const [agenda, setAgenda] = useState(null);
  const [reagendando, setReagendando] = useState(null);
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false);
  const geradasRef = useRef(new Set());
  const sugestoesPedidasRef = useRef(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

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

  // Fabricantes/serviços externos já cadastrados em contratos servem de sugestão.
  const fornecedores = useMemo(
    () => [...new Set(contracts.map((c) => c.supplier_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [contracts]
  );

  // Equipe técnica = usuários com perfil técnico (ver src/lib/tecnicos.js).
  const { tecnicos } = useTecnicos();
  // Quem está Inativo sai da equipe: aparece no histórico, não recebe atribuição.
  const tecnicosAtribuiveis = useMemo(
    () => tecnicos.filter((tecnico) => tecnico.status !== 'Inativo'),
    [tecnicos]
  );

  const { data: sugestoes = [] } = useQuery({
    queryKey: ['sugestoesAgenda'],
    queryFn: () => base44.entities.SugestaoAgenda.filter({ status: 'Pendente' }),
  });

  // ── Geração automática de preventivas ──────────────────────────
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

  const technicianById = useMemo(() => {
    const mapa = {};
    tecnicos.forEach((t) => { mapa[t.id] = t; });
    return mapa;
  }, [tecnicos]);

  const ordensPorId = useMemo(() => {
    const mapa = {};
    orders.forEach((o) => { mapa[o.id] = o; });
    return mapa;
  }, [orders]);

  const setores = useMemo(() => setoresDisponiveis(orders, equipmentById), [orders, equipmentById]);

  const role = user?.role || 'clinico';

  // Técnico é o próprio usuário: as OS atribuídas a ele guardam o ID da conta.
  const meuTecnicoId = role === 'tecnico' ? user?.id || null : null;

  // Quem é da equipe técnica abre o calendário já em "Minha agenda".
  useEffect(() => {
    if (!meuTecnicoId) return;
    setFiltrosCalendario((atual) =>
      (atual.tecnico || []).length ? atual : { ...atual, tecnico: [meuTecnicoId] }
    );
  }, [meuTecnicoId]);

  const recalcularAlertas = async () => {
    await base44.functions.invoke('verificarAlertas', {}).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['alertas'] });
  };

  // ── Aba ativa (aceita link direto ?view=) ───────────────────────
  const viewParam = searchParams.get('view');
  useEffect(() => {
    if (viewParam === 'calendario') setAba('calendario');
    else if (viewParam === 'lista') setAba('lista');
  }, [viewParam]);

  const abaAtiva = viewParam === 'calendario' ? 'calendario' : viewParam === 'lista' ? 'lista' : aba;

  const trocarAba = (valor) => {
    setAba(valor);
    setSearchParams(valor === 'calendario' ? { view: 'calendario' } : {});
  };

  // Links dos indicadores: /manutencoes?abertas=1&atrasadas=1&tipo=Corretiva&tecnico=<id>&equipamento=<id>
  useEffect(() => {
    const marcados = (chave) => String(searchParams.get(chave) || '').split(',').filter(Boolean);
    const ajustes = {};
    ['status', 'tipo', 'tecnico', 'equipamento', 'setor'].forEach((chave) => {
      const valores = marcados(chave);
      if (valores.length) ajustes[chave] = valores;
    });
    // Compatibilidade com o atalho antigo ?equipment=<id>
    const equipamentoAntigo = searchParams.get('equipment');
    if (equipamentoAntigo && !ajustes.equipamento) ajustes.equipamento = [equipamentoAntigo];
    if (searchParams.get('periodo')) ajustes.periodo = searchParams.get('periodo');

    const novosRecortes = {
      abertas: searchParams.get('abertas') === '1',
      atrasadas: searchParams.get('atrasadas') === '1',
      semTecnico: searchParams.get('sem-tecnico') === '1',
    };
    setRecortes(novosRecortes);
    if (Object.keys(ajustes).length) setFiltrosLista({ ...FILTROS_LISTA_INICIAIS, ...ajustes });
    if (Object.keys(ajustes).length || novosRecortes.abertas || novosRecortes.atrasadas || novosRecortes.semTecnico) {
      setAba('lista');
    }
  }, [searchParams]);

  // ── Lista ──────────────────────────────────────────────────────
  const ordemFiltradas = useMemo(
    () => filtrarOrdens(orders, filtrosLista, equipmentById),
    [orders, filtrosLista, equipmentById]
  );

  const lista = useMemo(() => {
    const abertas = GRUPOS_CENTRAL.pendentes.concat(GRUPOS_CENTRAL.andamento);
    let base = semSelecao(filtrosLista.status)
      ? ordemFiltradas.filter((o) => abertas.includes(o.status) || o.status === 'Concluído')
      : ordemFiltradas;
    if (recortes.abertas) base = base.filter((o) => o.status !== 'Concluído');
    if (recortes.atrasadas) base = base.filter(ordemAtrasada);
    if (recortes.semTecnico) base = base.filter((o) => o.status !== 'Concluído' && semResponsavel(o));
    return base;
  }, [ordemFiltradas, filtrosLista.status, recortes]);

  const contagem = useMemo(() => ({
    pendentes: orders.filter((o) => GRUPOS_CENTRAL.pendentes.includes(o.status)).length,
    andamento: orders.filter((o) => GRUPOS_CENTRAL.andamento.includes(o.status)).length,
    concluidas: orders.filter((o) => GRUPOS_CENTRAL.concluidas.includes(o.status)).length,
  }), [orders]);

  // ── Calendário ─────────────────────────────────────────────────
  const ordemCalendario = useMemo(
    () => filtrarOrdens(orders, filtrosCalendario, equipmentById),
    [orders, filtrosCalendario, equipmentById]
  );

  const itensCalendario = useMemo(
    () => ordemCalendario
      .filter((ordem) => ordem.scheduled_date && ordem.status !== 'Concluído')
      .map((ordem) => ({ kind: ordem.type === 'Corretiva' ? 'corretiva' : 'preventiva', order: ordem })),
    [ordemCalendario]
  );

  const semData = useMemo(() => corretivasSemData(ordemCalendario), [ordemCalendario]);

  const sugestoesVisiveis = useMemo(
    () => sugestoes.filter((sugestao) => ordensPorId[sugestao.service_order_id] &&
      ordemCalendario.some((ordem) => ordem.id === sugestao.service_order_id)),
    [sugestoes, ordemCalendario, ordensPorId]
  );

  const gerarSugestoes = async (silencioso = false) => {
    if (!silencioso) setGerandoSugestoes(true);
    try {
      const resposta = await base44.functions.invoke('sugerirAgenda', {});
      const geradas = resposta?.data?.geradas || 0;
      const expiradas = resposta?.data?.expiradas || 0;
      // Sugestões vencidas saem da lista mesmo quando nada novo é gerado.
      if (geradas || expiradas) queryClient.invalidateQueries({ queryKey: ['sugestoesAgenda'] });
      if (geradas) {
        toast.success(`${geradas} sugestão(ões) de data geradas`);
      } else if (!silencioso) {
        toast.info('Nenhuma OS sem data ou atrasada precisa de sugestão agora');
      }
    } catch {
      if (!silencioso) toast.error('Não foi possível gerar as sugestões agora');
    } finally {
      if (!silencioso) setGerandoSugestoes(false);
    }
  };

  useEffect(() => {
    if (abaAtiva !== 'calendario' || sugestoesPedidasRef.current || !orders.length) return;
    sugestoesPedidasRef.current = true;
    gerarSugestoes(true);
  }, [abaAtiva, orders.length]);

  // Vindo de um alerta (/manutencoes?os=<id>): abre a ordem direto.
  const ordemParam = searchParams.get('os');
  useEffect(() => {
    if (!ordemParam || !orders.length) return;
    const alvo = orders.find((o) => o.id === ordemParam);
    if (alvo) setDetalhe(alvo);
  }, [ordemParam, orders]);

  // ── Fluxo de execução ──────────────────────────────────────────
  const iniciar = async (order) => {
    setIniciandoId(order.id);
    try {
      const inicio = new Date();
      const resposta = slaDeAtendimento(order, contracts);
      // Preventiva agendada não tem espera de atendimento: o prazo dela é a data programada.
      const medeEspera = order.type !== 'Preventiva' || order.origin !== 'Agendada';
      await base44.entities.ServiceOrder.update(order.id, {
        status: 'Em Andamento',
        start_date: inicio.toISOString(),
        ...(medeEspera ? { response_time_minutes: minutosDeAtendimento(order.open_date, inicio) } : {}),
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

  // ── Agenda: uma única porta para agendar, reagendar e trocar técnico ──
  const registrarAlteracoes = async (order, alteracoes) => {
    for (const alteracao of alteracoes) {
      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: order.id,
        entidade_codigo: order.code || '',
        tecnico_atribuido_id: order.technician_id || null,
        ...alteracao,
      });
    }
  };

  const aplicarMudancaDeAgenda = async ({ order, novaData, tecnicoNovo, responsavel, sugestao, motivo }) => {
    const antes = {
      scheduled_date: order.scheduled_date || '',
      technician_id: order.technician_id || '',
      technician_name: order.technician_name || '',
      execution_by: order.execution_by || 'Equipe Interna',
      fornecedor_nome: order.fornecedor_nome || '',
    };
    const depois = {
      scheduled_date: novaData || '',
      technician_id: tecnicoNovo ? tecnicoNovo.id : order.technician_id || '',
      technician_name: tecnicoNovo ? tecnicoNovo.name : order.technician_name || '',
      execution_by: tecnicoNovo ? 'Equipe Interna' : order.execution_by || 'Equipe Interna',
      fornecedor_nome: tecnicoNovo ? '' : order.fornecedor_nome || '',
      ...(responsavel || {}),
    };
    const mudouData = antes.scheduled_date !== depois.scheduled_date;
    // Responsável muda quando troca o técnico, o tipo de execução ou o fornecedor externo.
    const mudouTecnico =
      antes.technician_id !== depois.technician_id ||
      antes.execution_by !== depois.execution_by ||
      (antes.fornecedor_nome || '') !== (depois.fornecedor_nome || '');
    if (!mudouData && !mudouTecnico) return;

    const alteracoes = [];
    if (mudouData) {
      alteracoes.push({
        acao: 'Edição de campo',
        campo: 'scheduled_date',
        valor_anterior: antes.scheduled_date,
        valor_novo: depois.scheduled_date,
        motivo,
      });
    }
    if (mudouTecnico) {
      alteracoes.push({
        acao: semResponsavel(antes) ? 'Atribuição' : 'Reatribuição',
        campo: ehManutencaoExterna(depois) ? 'execution_by' : 'technician_id',
        valor_anterior: nomeResponsavel(antes),
        valor_novo: nomeResponsavel(depois),
        tecnico_atribuido_id: depois.technician_id || null,
      });
    }

    // A tela registra antes da alteração: a automação do servidor deduplica pelo que já foi gravado.
    await registrarAlteracoes(order, alteracoes);

    await base44.entities.ServiceOrder.update(order.id, {
      scheduled_date: depois.scheduled_date,
      ...(mudouTecnico
        ? {
            technician_id: depois.technician_id,
            technician_name: depois.technician_name,
            execution_by: depois.execution_by || 'Equipe Interna',
            fornecedor_nome: depois.fornecedor_nome || '',
          }
        : {}),
    });

    // Sugestões pendentes desta OS deixam de valer.
    const pendentesDaOS = sugestoes.filter((s) => s.service_order_id === order.id);
    for (const pendente of pendentesDaOS) {
      await base44.entities.SugestaoAgenda.update(pendente.id, {
        status: sugestao && pendente.id === sugestao.id ? 'Aceita' : 'Expirada',
        resolvida_em: new Date().toISOString(),
      });
    }

    const evento = eventoDaMudanca(antes, depois);
    if (evento) await notificarMudancaDeAgenda({ order, antes, depois, evento });

    queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
    queryClient.invalidateQueries({ queryKey: ['sugestoesAgenda'] });

    const quando = depois.scheduled_date
      ? new Date(depois.scheduled_date).toLocaleDateString('pt-BR')
      : '';
    toast.success(
      !depois.scheduled_date
        ? 'Agendamento removido'
        : `${sugestao ? 'Sugestão aceita: ' : ''}agendada para ${quando}`
    );
    await recalcularAlertas();
  };

  const reagendar = (order, dia) => {
    setReagendando({ order, novaData: novaDataDoArraste(order, dia), origem: 'calendario' });
  };

  const agendarSemData = (order, dia) => {
    setReagendando({ order, novaData: dataDoAgendamento(dia), origem: 'sem-data' });
  };

  const aceitarSugestao = (sugestao, order) => {
    if (!order) return;
    setReagendando({
      order,
      novaData: sugestao.data_sugerida,
      tecnicoSugerido: technicianById[sugestao.tecnico_sugerido_id] || null,
      sugestao,
      origem: 'sugestao',
    });
  };

  const dispensarSugestao = async (sugestao) => {
    await base44.entities.SugestaoAgenda.update(sugestao.id, {
      status: 'Dispensada',
      resolvida_em: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['sugestoesAgenda'] });
    toast.success('Sugestão dispensada');
  };

  const confirmarReagendamento = async () => {
    const dados = reagendando;
    setReagendando(null);
    if (!dados) return;
    await aplicarMudancaDeAgenda({
      order: dados.order,
      novaData: dados.novaData,
      tecnicoNovo: dados.tecnicoSugerido,
      sugestao: dados.sugestao,
      motivo: dados.origem === 'sugestao'
        ? 'Sugestão de data aceita no calendário'
        : dados.origem === 'sem-data'
          ? 'Corretiva agendada a partir da bandeja sem data'
          : 'Reagendamento pelo calendário de manutenções',
    });
  };

  const salvarAgendamento = async (order, dados) => {
    setAgenda(null);
    const tecnicoNovo = dados.technician_id && dados.technician_id !== order.technician_id
      ? { id: dados.technician_id, name: dados.technician_name || technicianById[dados.technician_id]?.name || '' }
      : null;
    await aplicarMudancaDeAgenda({
      order,
      novaData: dados.scheduled_date ?? order.scheduled_date ?? '',
      tecnicoNovo,
      responsavel: {
        technician_id: dados.technician_id || '',
        technician_name: dados.technician_name || '',
        execution_by: dados.execution_by || 'Equipe Interna',
        fornecedor_nome: dados.fornecedor_nome || '',
      },
      motivo: 'Agendamento ajustado no painel da OS',
    });
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

      // Indicadores automáticos (MTTR / MTBF)
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

  const ordemDetalhe = detalhe ? orders.find((o) => o.id === detalhe.id) || detalhe : null;
  const ordemAgenda = agenda ? orders.find((o) => o.id === agenda.id) || agenda : null;
  const tecnicoDoDrop = reagendando
    ? (reagendando.tecnicoSugerido || technicianById[reagendando.order.technician_id] || null)
    : null;
  const avisosDoDrop = reagendando
    ? avisosDeAgenda({
        order: reagendando.order,
        novaData: reagendando.novaData,
        tecnicoId: tecnicoDoDrop?.id || '',
        ordens: orders,
        tecnicos,
      })
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Central de Manutenções"
        subtitle={`${contagem.pendentes} pendente(s) · ${contagem.andamento} em andamento · ${contagem.concluidas} concluída(s)`}
      />

      <Tabs value={abaAtiva} onValueChange={trocarAba}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="lista" className="gap-1.5">
            <List className="h-3.5 w-3.5" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4">
              <FiltrosLista
                filtros={filtrosLista}
                onChange={setFiltrosLista}
                tecnicos={tecnicos}
                equipamentos={equipment}
                setores={setores}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {ordemFiltradas.length} manutenção(ões) com os filtros atuais
            </p>
            <div className="flex gap-2">
              {ORDENACOES.map((opcao) => (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => setOrdemLista(opcao.value)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    ordemLista === opcao.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          {(recortes.abertas || recortes.atrasadas || recortes.semTecnico) && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-[11px] font-medium text-primary">Recorte dos indicadores:</span>
              {recortes.abertas && <span className="rounded-full bg-card px-2 py-0.5 text-[11px]">somente abertas</span>}
              {recortes.atrasadas && <span className="rounded-full bg-card px-2 py-0.5 text-[11px]">atrasadas</span>}
              {recortes.semTecnico && <span className="rounded-full bg-card px-2 py-0.5 text-[11px]">sem técnico</span>}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => setRecortes(RECORTES_VAZIOS)}
              >
                <X className="h-3 w-3" /> limpar
              </Button>
            </div>
          )}

          <CentralList
            orders={lista}
            equipmentById={equipmentById}
            ordem={ordemLista}
            iniciandoId={iniciandoId}
            onStart={iniciar}
            onFinish={setFinalizando}
            onRecord={setGravando}
            onOpen={setDetalhe}
            title="Nenhuma manutenção com esses filtros"
            description="Ajuste o status, o período ou os demais filtros para encontrar a manutenção."
          />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4">
              <FiltrosCalendario
                filtros={filtrosCalendario}
                onChange={setFiltrosCalendario}
                tecnicos={tecnicos}
                setores={setores}
                mostrarMinhaAgenda={role === 'tecnico' && !!meuTecnicoId}
                minhaAgendaAtiva={!!meuTecnicoId && (filtrosCalendario.tecnico || []).includes(meuTecnicoId)}
                onMinhaAgenda={() => setFiltrosCalendario((atual) => ({
                  ...atual,
                  tecnico: (atual.tecnico || []).includes(meuTecnicoId) ? [] : [meuTecnicoId],
                }))}
                sugestoesPendentes={sugestoesVisiveis.length}
                onGerarSugestoes={() => gerarSugestoes(false)}
                gerandoSugestoes={gerandoSugestoes}
              />
            </CardContent>
          </Card>

          <MaintenanceCalendar
            items={itensCalendario}
            semData={semData}
            sugestoes={sugestoesVisiveis}
            ordensPorId={ordensPorId}
            technicianById={technicianById}
            visao={visao}
            onVisaoChange={setVisao}
            referencia={referencia}
            onReferenciaChange={setReferencia}
            onAbrir={setAgenda}
            onReagendar={reagendar}
            onAgendarSemData={agendarSemData}
            onSugestaoAceitar={aceitarSugestao}
            onSugestaoDispensar={dispensarSugestao}
          />
        </TabsContent>

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

      {ordemAgenda && (
        <ReagendarOrdemDialog
          ordem={ordemAgenda}
          equipment={equipmentById[ordemAgenda.equipment_id]}
          tecnicos={tecnicosAtribuiveis}
          fornecedores={fornecedores}
          ordens={orders}
          onSalvar={salvarAgendamento}
          onAbrirOS={(order) => {
            setAgenda(null);
            setSearchParams({ os: order.id });
          }}
          onClose={() => setAgenda(null)}
        />
      )}

      {reagendando && (
        <ConfirmarReagendamentoDialog
          dados={{
            order: reagendando.order,
            equipment: equipmentById[reagendando.order.equipment_id],
            tecnico: tecnicoDoDrop,
            dataAtual: reagendando.origem === 'sem-data' ? null : dataProgramada(reagendando.order),
            novaData: reagendando.novaData,
            avisos: avisosDoDrop,
            origem: reagendando.origem,
            motivoSugestao: reagendando.sugestao?.motivo || '',
          }}
          onConfirmar={confirmarReagendamento}
          onCancelar={() => setReagendando(null)}
        />
      )}
    </div>
  );
}