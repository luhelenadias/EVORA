import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Activity, BadgeCheck, CalendarCheck, ClipboardList, Coins, Gauge, Package, PowerOff,
  Repeat, ShieldCheck, Timer, Users, Wrench,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { useAlertas } from '@/hooks/useAlertas';
import { useTecnicos } from '@/lib/tecnicos';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import AlertasDialog from '@/components/alertas/AlertasDialog';
import FiltrosGlobais from '@/components/indicadores/FiltrosGlobais';
import FaixaAgora from '@/components/indicadores/FaixaAgora';
import NumeroIndicador from '@/components/indicadores/NumeroIndicador';
import BlocoIndicador from '@/components/indicadores/BlocoIndicador';
import ListaRanking from '@/components/indicadores/ListaRanking';
import SecaoParque from '@/components/indicadores/SecaoParque';
import SecaoAtendimento from '@/components/indicadores/SecaoAtendimento';
import SecaoPreventivas from '@/components/indicadores/SecaoPreventivas';
import SecaoConfiabilidade from '@/components/indicadores/SecaoConfiabilidade';
import SecaoSlaContratos from '@/components/indicadores/SecaoSlaContratos';
import SecaoCustos from '@/components/indicadores/SecaoCustos';
import SecaoEquipe from '@/components/indicadores/SecaoEquipe';
import SecaoQualidade from '@/components/indicadores/SecaoQualidade';
import {
  FILTROS_INICIAIS, filtrarDados, formatarHoras, formatarPct, indicadoresAgora, indicadoresAtendimento,
  indicadoresConfiabilidade, indicadoresCustos, indicadoresEquipe, indicadoresParque, indicadoresPreventivas,
  indicadoresQualidade, indicadoresSla, linkManutencoes, linkOrdem,
} from '@/lib/indicadoresGerais';

export default function Indicadores() {
  const { user } = useOutletContext() || {};
  const role = user?.role || 'clinico';
  const eTecnico = role === 'tecnico';
  const podeVerContratos = ['admin', 'gestor'].includes(role);
  const podeVerCustos = role !== 'clinico';
  const podeVerEspera = ['admin', 'gestor'].includes(role);
  const podeVerEquipe = ['admin', 'gestor'].includes(role);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [alertasAbertos, setAlertasAbertos] = useState(false);

  const { config } = useConfiguracao();
  const { tecnicos } = useTecnicos();
  const { ativos: alertasAtivos } = useAlertas();

  const { data: equipment = [], isLoading: loadingEquip } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });
  const { data: orders = [], isLoading: loadingOrdens } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });
  const { data: pecas = [] } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });
  // Espera de peça: pedido solicitado → chegado.
  const { data: pedidosPeca = [] } = useQuery({
    queryKey: ['pedidosPeca'],
    queryFn: () => base44.entities.PedidoPeca.list('-solicitado_em'),
  });
  const { data: tiposEquipamento = [] } = useQuery({
    queryKey: ['codigos-tipo-equipamento'],
    queryFn: () => base44.entities.CodigoTipoEquipamento.filter({ ativo: true }),
  });
  // Tempo em espera vem do histórico de status (log) — calculado no servidor.
  const { data: espera } = useQuery({
    queryKey: ['indicadoresEspera'],
    queryFn: async () => (await base44.functions.invoke('indicadoresEspera', {})).data,
    enabled: podeVerEspera,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const filtrosEfetivos = useMemo(
    () => (eTecnico ? { ...filtros, tecnico: user?.id ? [user.id] : [] } : filtros),
    [filtros, eTecnico, user?.id]
  );

  const dados = useMemo(
    () => filtrarDados({ orders, equipment, filtros: filtrosEfetivos }),
    [orders, equipment, filtrosEfetivos]
  );

  const alertasUrgentes = alertasAtivos.filter((a) => a.nivel === 'Urgente').length;
  const periodo = filtrosEfetivos.periodo;
  const diasRechamada = Number(config?.rechamada_dias) || 30;

  const agora = useMemo(
    () => indicadoresAgora({ escopo: dados.escopo, equipamentos: dados.equipamentos, alertasUrgentes }),
    [dados.escopo, dados.equipamentos, alertasUrgentes]
  );
  const parque = useMemo(() => indicadoresParque(dados.equipamentos), [dados.equipamentos]);
  const atendimento = useMemo(
    () => indicadoresAtendimento({ ...dados, esperaPorOS: espera?.por_os || {}, pedidosPeca }),
    [dados, espera, pedidosPeca]
  );
  const preventivas = useMemo(() => indicadoresPreventivas(dados), [dados]);
  const confiabilidade = useMemo(
    () => indicadoresConfiabilidade({ ...dados, todas: dados.escopo, diasRechamada }),
    [dados, diasRechamada]
  );
  const sla = useMemo(() => indicadoresSla({ ordens: dados.ordens, contratos: contracts }), [dados.ordens, contracts]);
  const custos = useMemo(
    () => indicadoresCustos({ ordens: dados.ordens, equipamentos: dados.equipamentos, pecas, periodo }),
    [dados.ordens, dados.equipamentos, pecas, periodo]
  );
  const equipe = useMemo(
    () => indicadoresEquipe({ ordens: dados.ordens, tecnicos, config, periodo }),
    [dados.ordens, tecnicos, config, periodo]
  );
  const qualidade = useMemo(
    () => indicadoresQualidade({ equipamentos: dados.equipamentos, escopo: dados.escopo, contratos: contracts }),
    [dados.equipamentos, dados.escopo, contracts]
  );

  const destaques = useMemo(() => {
    const base = [
      {
        rotulo: 'OS abertas',
        valor: agora.osAbertas,
        detalhe: `${agora.osAtrasadas} atrasada(s) · ${agora.semTecnico} sem técnico`,
        para: linkManutencoes({ abertas: 1 }),
        icone: ClipboardList,
        tom: agora.osAtrasadas ? 'atencao' : 'neutro',
      },
      {
        rotulo: 'Tempo médio de atendimento',
        valor: formatarHoras(atendimento.tempoMedioAtendimento),
        detalhe: 'Abertura até início · só corretivas',
        para: linkManutencoes({ tipo: 'Corretiva' }),
        icone: Timer,
      },
      {
        rotulo: 'MTTR',
        valor: formatarHoras(atendimento.mttr),
        detalhe: 'Duração do reparo · corretivas concluídas',
        para: linkManutencoes({ tipo: 'Corretiva' }),
        icone: Wrench,
      },
      {
        rotulo: 'Preventivas no prazo',
        valor: formatarPct(preventivas.pctNoPrazo),
        detalhe: `${preventivas.noPrazo} de ${preventivas.concluidas} · ${preventivas.atrasadas} atrasada(s)`,
        para: linkManutencoes({ tipo: 'Preventiva' }),
        icone: CalendarCheck,
        tom: preventivas.pctNoPrazo != null && preventivas.pctNoPrazo < 80 ? 'atencao' : 'positivo',
      },
    ];
    if (eTecnico) return base;

    const extras = [];
    if (podeVerContratos) {
      extras.push({
        rotulo: 'SLA cumprido',
        valor: formatarPct(sla.pctResolucao),
        detalhe: `Resolução · ${sla.semSlaResolucao} OS sem SLA`,
        para: linkManutencoes({ abertas: 1 }),
        icone: ShieldCheck,
        tom: sla.pctResolucao != null && sla.pctResolucao < 90 ? 'atencao' : 'positivo',
      });
    }
    extras.push(
      {
        rotulo: 'Rechamadas',
        valor: confiabilidade.totalRechamadas,
        detalhe: `Nova corretiva em até ${diasRechamada} dias`,
        para: linkManutencoes({ tipo: 'Corretiva' }),
        icone: Repeat,
        tom: confiabilidade.totalRechamadas ? 'atencao' : 'positivo',
      },
      {
        rotulo: 'Equipamentos parados',
        valor: parque.parados,
        detalhe: `${parque.emManutencao} em manutenção agora`,
        para: '/equipamentos',
        icone: PowerOff,
        tom: parque.parados ? 'atencao' : 'positivo',
      }
    );
    if (podeVerCustos) {
      extras.push({
        rotulo: 'Custo anual / parque',
        valor: custos.pctParque == null ? '—' : formatarPct(Math.round(custos.pctParque)),
        detalhe: custos.semCustos ? 'custos não preenchidos' : 'referência ~7% ao ano',
        para: linkManutencoes({}),
        icone: Coins,
      });
    }
    return [...base, ...extras];
  }, [agora, atendimento, preventivas, sla, confiabilidade, parque, custos, podeVerContratos, podeVerCustos, eTecnico, diasRechamada]);

  const setores = useMemo(
    () => [...new Set(equipment.map((e) => e.location_sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [equipment]
  );
  const opcoesTipoEquipamento = useMemo(
    () => tiposEquipamento.map((tipo) => ({ value: tipo.id, label: tipo.nome || tipo.sigla })),
    [tiposEquipamento]
  );
  const opcoesTecnicos = useMemo(
    () => tecnicos.map((tecnico) => ({ value: tecnico.id, label: tecnico.name })),
    [tecnicos]
  );

  if (loadingEquip || loadingOrdens) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Indicadores"
        subtitle={
          eTecnico
            ? 'Suas OS e o que precisa de ação hoje'
            : 'Engenharia clínica em uma página — do parque ao custo, com o detalhe por equipamento e por OS'
        }
      />

      <FiltrosGlobais
        filtros={filtros}
        onChange={setFiltros}
        setores={setores}
        tiposEquipamento={opcoesTipoEquipamento}
        tecnicos={opcoesTecnicos}
        mostrarTecnico={podeVerEquipe}
      />

      <FaixaAgora agora={agora} onAbrirAlertas={() => setAlertasAbertos(true)} />

      <section className="space-y-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary">
          Indicadores em destaque
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {destaques.map((item) => (
            <NumeroIndicador key={item.rotulo} {...item} />
          ))}
        </div>
      </section>

      {eTecnico ? (
        <BlocoIndicador
          titulo="Minhas OS"
          icone={ClipboardList}
          resumo={`${agora.osAbertas} aberta(s) na sua agenda`}
          abertoInicial
        >
          <ListaRanking
            itens={atendimento.maisAntigas.map((ordem) => ({
              chave: ordem.id,
              label: `${ordem.code || 'OS'} · ${ordem.equipment_name || 'Equipamento'}`,
              hint: `${ordem.tipo} · aberta há ${ordem.dias} dia(s)`,
              valor: 'abrir',
              para: linkOrdem(ordem.id),
            }))}
            vazio="Nenhuma OS aberta atribuída a você"
          />
          <p className="text-[10px] text-muted-foreground">
            A visão completa do parque, contratos e custos fica disponível para gestão e administração.
          </p>
        </BlocoIndicador>
      ) : (
        <div className="space-y-3">
          <BlocoIndicador titulo="Parque" icone={Gauge} resumo={`${parque.total} equipamento(s) · ${parque.parados} parado(s)`}>
            <SecaoParque parque={parque} />
          </BlocoIndicador>

          <BlocoIndicador
            titulo="Atendimento e reparo"
            icone={Activity}
            resumo={`Atendimento ${formatarHoras(atendimento.tempoMedioAtendimento)} · MTTR ${formatarHoras(atendimento.mttr)}`}
          >
            <SecaoAtendimento
              atendimento={atendimento}
              corretivas={dados.ordens.filter((o) => o.type === 'Corretiva').length}
              podeVerEspera={podeVerEspera}
            />
          </BlocoIndicador>

          <BlocoIndicador
            titulo="Preventivas"
            icone={CalendarCheck}
            resumo={`${formatarPct(preventivas.pctNoPrazo)} no prazo · ${preventivas.atrasadas} atrasada(s)`}
          >
            <SecaoPreventivas preventivas={preventivas} />
          </BlocoIndicador>

          <BlocoIndicador
            titulo="Confiabilidade"
            icone={Repeat}
            resumo={`MTBF ${formatarHoras(confiabilidade.mtbfMedio)} · ${confiabilidade.totalRechamadas} rechamada(s)`}
          >
            <SecaoConfiabilidade confiabilidade={confiabilidade} />
          </BlocoIndicador>

          {podeVerContratos && (
            <BlocoIndicador
              titulo="SLA e contratos"
              icone={BadgeCheck}
              resumo={`Resposta ${formatarPct(sla.pctResposta)} · resolução ${formatarPct(sla.pctResolucao)}`}
            >
              <SecaoSlaContratos sla={sla} />
            </BlocoIndicador>
          )}

          {podeVerCustos && (
            <BlocoIndicador
              titulo="Custos"
              icone={Coins}
              resumo={custos.semCustos ? 'custos não preenchidos no período' : `Gasto no período: ${custos.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            >
              <SecaoCustos custos={custos} />
            </BlocoIndicador>
          )}

          {podeVerEquipe && (
            <BlocoIndicador titulo="Equipe" icone={Users} resumo={`${equipe.linhas.filter((l) => l.os > 0).length} técnico(s) com OS no período`}>
              <SecaoEquipe equipe={equipe} />
            </BlocoIndicador>
          )}

          <BlocoIndicador
            titulo="Qualidade dos dados"
            icone={Package}
            resumo={`${formatarPct(qualidade.pctPrioridade)} com prioridade calculada · ${qualidade.osSemTecnico} OS sem técnico`}
          >
            <SecaoQualidade qualidade={qualidade} />
          </BlocoIndicador>
        </div>
      )}

      <AlertasDialog open={alertasAbertos} onClose={() => setAlertasAbertos(false)} />
    </div>
  );
}