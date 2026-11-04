import { differenceInDays, parseISO, startOfMonth } from 'date-fns';
import { ordemAtrasada } from '@/lib/central';
import { statusPorVigencia } from '@/lib/contratos';
import { calcularMtbf } from '@/lib/indicadores';
import { aguardandoTriagem } from '@/lib/triagem';

// ── Bases ───────────────────────────────────────────────────────────
export const ABERTAS = [
  'Novo',
  'Em Andamento',
  'Aguardando Orçamento',
  'Aguardando Aprovação',
  'Em Transporte (ida)',
  'Em Conserto Externo',
  'Em Transporte (volta)',
  'Aguardando Teste de Qualidade',
  'Aguardando Aceite',
  'Aguardando Peça',
  'Aguardando Fornecedor',
  'Pendente',
];
export const EM_ESPERA = ['Aguardando Peça', 'Aguardando Fornecedor', 'Pendente'];
export const STATUS_PARQUE = ['Ativo', 'Em Manutenção', 'Parado', 'Inativo/Baixado'];
export const CRITICIDADES = ['Suporte à Vida', 'Terapêutico', 'Diagnóstico', 'Apoio'];
export const TIPOS_MANUTENCAO = ['Preventiva', 'Corretiva', 'Calibração', 'Instalação'];

export const FILTROS_INICIAIS = {
  periodo: '90',
  setor: [],
  tipoEquipamento: [],
  tipoManutencao: [],
  tecnico: [],
};

export const PERIODOS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Últimos 12 meses' },
  { value: 'mes', label: 'Este mês' },
  { value: 'todos', label: 'Todo o período' },
];

const num = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0);

export const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

export const media = (valores = []) => {
  const lista = valores.filter((v) => v != null && Number.isFinite(Number(v)));
  return lista.length ? lista.reduce((soma, v) => soma + Number(v), 0) / lista.length : null;
};

/** Dias cobertos pelo período (null = todo o período, sem janela). */
export function diasDoPeriodo(periodo) {
  if (periodo === 'mes') {
    return Math.max(differenceInDays(new Date(), startOfMonth(new Date())), 1);
  }
  const dias = Number(periodo);
  return Number.isFinite(dias) && dias > 0 ? dias : null;
}

export function inicioDoPeriodo(periodo) {
  if (periodo === 'mes') return startOfMonth(new Date());
  const dias = diasDoPeriodo(periodo);
  if (!dias) return null;
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  return inicio;
}

/**
 * Aplica os filtros globais. `escopo` ignora o período (situação atual: OS abertas,
 * equipamentos parados); `ordens` é o recorte do período (produção, tempos, custos).
 */
export function filtrarDados({ orders = [], equipment = [], filtros = FILTROS_INICIAIS }) {
  const equipamentos = equipment.filter(
    (e) =>
      (!filtros.setor?.length || filtros.setor.includes(e.location_sector)) &&
      (!filtros.tipoEquipamento?.length || filtros.tipoEquipamento.includes(e.tipo_equipamento_id))
  );
  const ids = new Set(equipamentos.map((e) => e.id));

  const escopo = orders.filter((o) => {
    if (!ids.has(o.equipment_id)) return false;
    if (filtros.tipoManutencao?.length && !filtros.tipoManutencao.includes(o.type)) return false;
    if (filtros.tecnico?.length && !filtros.tecnico.includes(o.technician_id)) return false;
    return true;
  });

  const de = inicioDoPeriodo(filtros.periodo);
  const ordens = de
    ? escopo.filter((o) => {
        if (!o.open_date) return false;
        const abertura = parseISO(o.open_date);
        return !Number.isNaN(abertura.getTime()) && abertura >= de;
      })
    : escopo;

  return { ordens, escopo, equipamentos };
}

// ── Formatação ──────────────────────────────────────────────────────
export const formatarHoras = (valor) => {
  if (valor == null) return '—';
  if (valor < 48) return `${valor.toFixed(1)} h`;
  return `${(valor / 24).toFixed(1)} dias`;
};

export const formatarDias = (valor) => (valor == null ? '—' : `${valor.toFixed(valor < 10 ? 1 : 0)} d`);

export const formatarMoeda = (valor) =>
  valor == null ? '—' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const formatarPct = (valor) => (valor == null ? '—' : `${valor}%`);

export const nomeDoEquipamento = (equipmentById, id, alternativa) =>
  equipmentById?.[id]?.name || alternativa || '—';

// ── Links para o detalhe ────────────────────────────────────────────
export function linkManutencoes(params = {}) {
  const busca = new URLSearchParams();
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor == null || valor === '' || valor === false) return;
    if (Array.isArray(valor)) {
      if (valor.length) busca.set(chave, valor.join(','));
      return;
    }
    busca.set(chave, valor === true ? '1' : String(valor));
  });
  const consulta = busca.toString();
  return `/manutencoes${consulta ? `?${consulta}` : ''}`;
}

export const linkOrdem = (id) => linkManutencoes({ os: id });
export const linkEquipamento = (id) => `/equipamentos/${id}`;

// ── Faixa "Agora" ───────────────────────────────────────────────────
export function indicadoresAgora({ escopo = [], equipamentos = [], alertasUrgentes = 0 }) {
  const abertas = escopo.filter((o) => o.status !== 'Concluído');
  return {
    osAbertas: abertas.length,
    osAtrasadas: abertas.filter(ordemAtrasada).length,
    semTecnico: abertas.filter((o) => !o.technician_id && o.execution_by !== 'Fornecedor Externo').length,
    alertasUrgentes,
    equipamentosParados: equipamentos.filter((e) => e.operational_status === 'Parado').length,
    emManutencao: equipamentos.filter((e) => e.operational_status === 'Em Manutenção').length,
  };
}

// ── 1. Parque ───────────────────────────────────────────────────────
export function indicadoresParque(equipamentos = []) {
  const treinados = equipamentos.reduce((soma, e) => soma + num(e.trained_operators), 0);
  const operadores = equipamentos.reduce((soma, e) => soma + num(e.total_operators), 0);
  return {
    total: equipamentos.length,
    porStatus: STATUS_PARQUE.map((status) => ({
      rotulo: status,
      total: equipamentos.filter((e) => e.operational_status === status).length,
    })),
    porCriticidade: CRITICIDADES.map((criticidade) => ({
      rotulo: criticidade,
      total: equipamentos.filter((e) => e.criticality === criticidade).length,
    })),
    parados: equipamentos.filter((e) => e.operational_status === 'Parado').length,
    emManutencao: equipamentos.filter((e) => e.operational_status === 'Em Manutenção').length,
    treinados,
    operadores,
    pctTreinados: pct(treinados, operadores),
  };
}

// ── 2. Atendimento e reparo ─────────────────────────────────────────
export function indicadoresAtendimento({ ordens = [], escopo = [], equipamentos = [], esperaPorOS = {}, pedidosPeca = [] }) {
  const corretivas = ordens.filter((o) => o.type === 'Corretiva');
  // Preventiva agendada fica de fora: o prazo dela é a data programada, não a abertura.
  const comAtendimento = corretivas.filter((o) => o.response_time_minutes != null && o.origin !== 'Agendada');
  const mediaAtendimentoMin = media(comAtendimento.map((o) => o.response_time_minutes));

  const concluidas = corretivas.filter((o) => o.status === 'Concluído' && o.duracao_total_minutos != null);
  const mediaReparoMin = media(concluidas.map((o) => o.duracao_total_minutos));

  const mttrPorEquipamento = equipamentos
    .map((e) => {
      const doEquipamento = concluidas.filter((o) => o.equipment_id === e.id);
      const mediaMinutos = media(doEquipamento.map((o) => o.duracao_total_minutos));
      return {
        equipment_id: e.id,
        nome: e.name,
        os: doEquipamento.length,
        mttr: mediaMinutos == null ? null : mediaMinutos / 60,
      };
    })
    .filter((linha) => linha.mttr != null)
    .sort((a, b) => b.mttr - a.mttr);

  const comEspera = escopo.filter((o) => esperaPorOS[o.id] > 0);
  const esperaPorEquipamentoMapa = {};
  comEspera.forEach((o) => {
    const atual = esperaPorEquipamentoMapa[o.equipment_id] || {
      equipment_id: o.equipment_id,
      nome: nomeDoEquipamento(null, o.equipment_id, o.equipment_name),
      dias: 0,
      os: 0,
    };
    atual.dias += esperaPorOS[o.id] / 1440;
    atual.os += 1;
    esperaPorEquipamentoMapa[o.equipment_id] = atual;
  });

  const abertas = escopo.filter((o) => o.status !== 'Concluído');
  const idade = (ordem) =>
    ordem.open_date ? Math.max(differenceInDays(new Date(), parseISO(ordem.open_date)), 0) : null;
  const faixas = [
    { rotulo: 'Até 7 dias', de: 0, ate: 7 },
    { rotulo: '8 a 30 dias', de: 8, ate: 30 },
    { rotulo: '31 a 90 dias', de: 31, ate: 90 },
    { rotulo: 'Mais de 90 dias', de: 91, ate: null },
  ].map((faixa) => ({
    rotulo: faixa.rotulo,
    total: abertas.filter((o) => {
      const dias = idade(o);
      if (dias == null) return false;
      return dias >= faixa.de && (faixa.ate == null || dias <= faixa.ate);
    }).length,
  }));

  // Tempos da triagem: separam a espera até a triagem e da triagem até o início.
  // OS antigas sem triagem_em ficam fora dos dois cálculos.
  const comTriagem = corretivas.filter((o) => o.triagem_em && o.open_date);
  const minutosAteTriagem = comTriagem
    .map((o) => (new Date(o.triagem_em).getTime() - new Date(o.open_date).getTime()) / 60000)
    .filter((valor) => Number.isFinite(valor) && valor >= 0);
  const comInicioPosTriagem = corretivas.filter((o) => o.triagem_em && o.start_date);
  const minutosTriagemAteInicio = comInicioPosTriagem
    .map((o) => (new Date(o.start_date).getTime() - new Date(o.triagem_em).getTime()) / 60000)
    .filter((valor) => Number.isFinite(valor) && valor >= 0);

  // Fila de triagem hoje: corretivas ainda sem destino e sem técnico.
  const naFilaTriagem = escopo.filter((o) => aguardandoTriagem(o));
  const diasDaFila = naFilaTriagem
    .map((o) => (o.open_date ? Math.max(differenceInDays(new Date(), parseISO(o.open_date)), 0) : null))
    .filter((dias) => dias != null);

  // ── Pausas: tempo parado por motivo, pausadas agora e espera de peça ──
  const agoraPausa = new Date();
  const minutosDaPausa = (pausa) => {
    if (!pausa?.inicio) return 0;
    const inicio = parseISO(pausa.inicio);
    const fim = pausa.fim ? parseISO(pausa.fim) : agoraPausa;
    return Math.max((fim - inicio) / 60000, 0);
  };
  const porMotivo = {};
  escopo.forEach((ordem) => {
    (ordem.pausas || []).forEach((pausa) => {
      const motivo = pausa.motivo || 'Outro';
      const atual = porMotivo[motivo] || { motivo, minutos: 0, os: 0 };
      atual.minutos += minutosDaPausa(pausa);
      atual.os += 1;
      porMotivo[motivo] = atual;
    });
  });
  const paradoPorMotivo = Object.values(porMotivo)
    .filter((linha) => linha.minutos > 0)
    .sort((a, b) => b.minutos - a.minutos);

  const pausadasAgora = escopo.filter((o) => o.pausa_ativa || (o.pausas || []).some((p) => p?.inicio && !p.fim));
  const diasPausadas = pausadasAgora
    .map((o) => {
      const aberta = (o.pausas || []).find((p) => p?.inicio && !p.fim);
      return aberta ? Math.max(differenceInDays(agoraPausa, parseISO(aberta.inicio)), 0) : null;
    })
    .filter((dias) => dias != null);

  // Espera de peça: do pedido até a chegada.
  const pedidosChegados = (pedidosPeca || []).filter((p) => p.solicitado_em && p.chegou_em);
  const esperaPecaHoras = pedidosChegados.length
    ? media(pedidosChegados.map((p) => (parseISO(p.chegou_em) - parseISO(p.solicitado_em)) / 3600000))
    : null;

  return {
    tempoMedioAtendimento: mediaAtendimentoMin == null ? null : mediaAtendimentoMin / 60,
    osComAtendimento: comAtendimento.length,
    paradoPorMotivo,
    pausadasAgora: {
      quantidade: pausadasAgora.length,
      maisAntigaDias: diasPausadas.length ? Math.max(...diasPausadas) : null,
    },
    esperaPecaHoras,
    pedidosComChegada: pedidosChegados.length,
    tempoMedioTriagem: minutosAteTriagem.length ? media(minutosAteTriagem) / 60 : null,
    osComTriagem: comTriagem.length,
    tempoMedioTriagemAteInicio: minutosTriagemAteInicio.length ? media(minutosTriagemAteInicio) / 60 : null,
    osComTriagemAteInicio: comInicioPosTriagem.length,
    filaTriagem: {
      quantidade: naFilaTriagem.length,
      maisAntigaDias: diasDaFila.length ? Math.max(...diasDaFila) : null,
    },
    mttr: mediaReparoMin == null ? null : mediaReparoMin / 60,
    osComReparo: concluidas.length,
    mttrPorEquipamento,
    esperaTotalDias: comEspera.length
      ? comEspera.reduce((soma, o) => soma + esperaPorOS[o.id] / 1440, 0)
      : null,
    esperaPorEquipamento: Object.values(esperaPorEquipamentoMapa).sort((a, b) => b.dias - a.dias),
    esperaDisponivel: Object.keys(esperaPorOS).length > 0,
    osComEspera: comEspera.length,
    idadeFaixas: faixas,
    maisAntigas: abertas
      .filter((o) => o.open_date)
      .sort((a, b) => new Date(a.open_date) - new Date(b.open_date))
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        code: o.code,
        equipment_name: o.equipment_name,
        tipo: o.type,
        dias: idade(o),
      })),
  };
}

// ── 3. Preventivas ──────────────────────────────────────────────────
export function indicadoresPreventivas({ ordens = [], escopo = [] }) {
  const preventivas = ordens.filter((o) => o.type === 'Preventiva');
  const concluidas = preventivas.filter(
    (o) => o.status === 'Concluído' && o.start_date && o.scheduled_date
  );
  // Pontualidade: início do atendimento em relação à data programada (nunca a abertura).
  const noPrazo = concluidas.filter(
    (o) => parseISO(o.start_date) <= parseISO(o.scheduled_date)
  ).length;

  const abertas = escopo.filter((o) => o.type === 'Preventiva' && o.status !== 'Concluído');
  const comData = abertas.filter((o) => o.scheduled_date);
  const agora = new Date();
  const atrasadas = comData.filter((o) => parseISO(o.scheduled_date) < agora);
  const proximas = comData.filter((o) => {
    const dias = differenceInDays(parseISO(o.scheduled_date), agora);
    return dias >= 0 && dias <= 30;
  });

  const corretivas = ordens.filter((o) => o.type === 'Corretiva');
  return {
    concluidas: concluidas.length,
    noPrazo,
    atrasadas: atrasadas.length,
    proximas: proximas.length,
    pctNoPrazo: pct(noPrazo, concluidas.length),
    preventivas: preventivas.length,
    corretivas: corretivas.length,
    pctPreventiva: pct(preventivas.length, preventivas.length + corretivas.length),
    proximasLista: proximas
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        code: o.code,
        equipment_name: o.equipment_name,
        technician_name: o.technician_name,
        data: o.scheduled_date,
      })),
  };
}

// ── 4. Confiabilidade ───────────────────────────────────────────────
export function indicadoresConfiabilidade({ ordens = [], todas = [], equipamentos = [], diasRechamada = 30 }) {
  const concluidas = ordens
    .filter((o) => o.type === 'Corretiva' && o.status === 'Concluído' && o.completion_date)
    .sort((a, b) => new Date(a.completion_date) - new Date(b.completion_date));

  const porEquipamento = {};
  concluidas.forEach((o) => {
    if (!o.equipment_id) return;
    porEquipamento[o.equipment_id] = [...(porEquipamento[o.equipment_id] || []), o];
  });

  const mtbfRanking = equipamentos
    .map((e) => ({
      equipment_id: e.id,
      nome: e.name,
      os: (porEquipamento[e.id] || []).length,
      mtbf: calcularMtbf(porEquipamento[e.id] || []),
    }))
    .filter((linha) => linha.mtbf != null)
    .sort((a, b) => a.mtbf - b.mtbf);

  // Rechamada: nova corretiva no mesmo equipamento até X dias após uma concluída.
  const reincidentes12m = [];
  let totalRechamadas = 0;
  equipamentos.forEach((e) => {
    const lista = porEquipamento[e.id] || [];
    let rechamadas = 0;
    for (let i = 1; i < lista.length; i += 1) {
      if (!lista[i].open_date) continue;
      const dias = differenceInDays(parseISO(lista[i].open_date), parseISO(lista[i - 1].completion_date));
      if (dias >= 0 && dias <= diasRechamada) rechamadas += 1;
    }
    totalRechamadas += rechamadas;
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 12);
    const nosUltimos12m = (todas.length ? todas : ordens).filter(
      (o) =>
        o.equipment_id === e.id &&
        o.type === 'Corretiva' &&
        o.open_date &&
        parseISO(o.open_date) >= limite
    ).length;
    if (rechamadas > 0 || nosUltimos12m >= 3) {
      reincidentes12m.push({
        equipment_id: e.id,
        nome: e.name,
        rechamadas,
        corretivas12m: nosUltimos12m,
      });
    }
  });
  reincidentes12m.sort((a, b) => b.rechamadas - a.rechamadas || b.corretivas12m - a.corretivas12m);

  const faixaCritica = equipamentos
    .filter((e) => e.prioridade_faixa === 'Crítica')
    .map((e) => ({ equipment_id: e.id, nome: e.name, score: e.prioridade_score }));

  return {
    mtbfMedio: media(mtbfRanking.map((linha) => linha.mtbf)),
    mtbfRanking,
    totalRechamadas,
    diasRechamada,
    reincidentes12m,
    faixaCritica,
  };
}

// ── 5. SLA e contratos ──────────────────────────────────────────────
export function indicadoresSla({ ordens = [], contratos = [] }) {
  const referenciaResposta = (ordem) => (ordem.start_date ? parseISO(ordem.start_date) : new Date());
  const referenciaResolucao = (ordem) => (ordem.completion_date ? parseISO(ordem.completion_date) : new Date());

  const comResposta = ordens.filter((o) => o.sla_response_deadline);
  const respostaOk = comResposta.filter(
    (o) => referenciaResposta(o) <= parseISO(o.sla_response_deadline)
  ).length;

  const comResolucao = ordens.filter((o) => o.sla_deadline);
  const resolucaoOk = comResolucao.filter(
    (o) => referenciaResolucao(o) <= parseISO(o.sla_deadline)
  ).length;

  const porVigencia = contratos.map((c) => ({ contrato: c, situacao: statusPorVigencia(c) }));
  const vigentes = porVigencia.filter(({ situacao }) => ['Ativo', 'Vencendo'].includes(situacao));

  return {
    pctResposta: pct(respostaOk, comResposta.length),
    respostaOk,
    comResposta: comResposta.length,
    semSlaResposta: ordens.length - comResposta.length,
    pctResolucao: pct(resolucaoOk, comResolucao.length),
    resolucaoOk,
    comResolucao: comResolucao.length,
    semSlaResolucao: ordens.length - comResolucao.length,
    vencendo: porVigencia.filter(({ situacao }) => situacao === 'Vencendo').length,
    vencidos: porVigencia.filter(({ situacao }) => situacao === 'Vencido').length,
    valorMensal: vigentes.reduce((soma, { contrato }) => soma + num(contrato.monthly_value), 0),
    notaFornecedores: media(ordens.filter((o) => o.supplier_rating).map((o) => o.supplier_rating)),
    semSlaContrato: contratos.filter((c) => !num(c.sla_response_hours) && !num(c.sla_resolution_hours)).length,
  };
}

// ── 6. Custos ───────────────────────────────────────────────────────
export function indicadoresCustos({ ordens = [], equipamentos = [], pecas = [], periodo = '90' }) {
  const custoPecas = ordens.reduce(
    (soma, o) => soma + (o.parts_used || []).reduce((total, p) => total + num(p.cost) * num(p.quantity), 0),
    0
  );
  const interno = ordens
    .filter((o) => o.execution_by !== 'Fornecedor Externo')
    .reduce((soma, o) => soma + num(o.total_cost), 0);
  const externo = ordens
    .filter((o) => o.execution_by === 'Fornecedor Externo')
    .reduce((soma, o) => soma + num(o.total_cost), 0);

  const total = custoPecas + interno + externo;
  const valorParque = equipamentos.reduce((soma, e) => soma + num(e.acquisition_value), 0);
  const dias = diasDoPeriodo(periodo);
  const custoAnual = dias && total ? total * (365 / dias) : null;
  const pctParque = custoAnual && valorParque ? (custoAnual / valorParque) * 100 : null;

  return {
    custoPecas,
    interno,
    externo,
    total,
    custoAnual,
    valorParque,
    pctParque,
    semCustos: total === 0,
    equipamentosComValor: equipamentos.filter((e) => num(e.acquisition_value) > 0).length,
    valorEstoque: pecas.reduce((soma, p) => soma + num(p.current_stock) * num(p.unit_cost), 0),
    pecasAbaixoMinimo: pecas.filter((p) => num(p.current_stock) <= num(p.minimum_stock)).length,
    pecasSemCusto: pecas.filter((p) => !num(p.unit_cost)).length,
  };
}

// ── 7. Equipe ───────────────────────────────────────────────────────
export function indicadoresEquipe({ ordens = [], tecnicos = [], config, periodo = '90' }) {
  const dias = diasDoPeriodo(periodo);
  const meses = dias ? dias / 30 : null;
  const custoHora = num(config?.custo_hora_tecnica);

  const linhas = tecnicos.map((tecnico) => {
    const minhas = ordens.filter((o) => o.technician_id === tecnico.id);
    const horas = minhas.reduce((soma, o) => soma + num(o.duracao_total_minutos) / 60, 0);
    const carga = num(tecnico.carga_horaria_mensal_h);
    const tempoPago = carga && meses ? carga * meses : null;
    return {
      id: tecnico.id,
      nome: tecnico.name,
      os: minhas.length,
      concluidas: minhas.filter((o) => o.status === 'Concluído').length,
      horas,
      carga,
      tempoPago,
      produtividade: tempoPago ? Math.round((horas / tempoPago) * 100) : null,
      custo: custoHora ? horas * custoHora : null,
    };
  });

  return {
    linhas: linhas.sort((a, b) => b.os - a.os),
    comCarga: linhas.filter((l) => l.carga > 0).length,
    semCarga: linhas.filter((l) => !l.carga).length,
    custoHora,
    custoTotalInterno: custoHora ? linhas.reduce((soma, l) => soma + l.custo, 0) : null,
  };
}

// ── 8. Qualidade dos dados ──────────────────────────────────────────
export function indicadoresQualidade({ equipamentos = [], escopo = [], contratos = [] }) {
  const calculados = equipamentos.filter((e) => e.status_priorizacao === 'calculado').length;
  const abertas = escopo.filter((o) => o.status !== 'Concluído');
  return {
    pctPrioridade: pct(calculados, equipamentos.length),
    pendentesPrioridade: equipamentos.length - calculados,
    osSemTecnico: abertas.filter((o) => !o.technician_id && o.execution_by !== 'Fornecedor Externo').length,
    osSemTecnicoLista: abertas
      .filter((o) => !o.technician_id && o.execution_by !== 'Fornecedor Externo')
      .slice(0, 6)
      .map((o) => ({ id: o.id, code: o.code, equipment_name: o.equipment_name, tipo: o.type })),
    contratosSemSla: contratos.filter((c) => !num(c.sla_response_hours) && !num(c.sla_resolution_hours)).length,
    equipamentosSemCusto: equipamentos.filter((e) => !num(e.acquisition_value)).length,
    pctEquipamentosComCusto: pct(
      equipamentos.filter((e) => num(e.acquisition_value) > 0).length,
      equipamentos.length
    ),
  };
}