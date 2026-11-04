import { differenceInDays, parseISO } from 'date-fns';

/** Mapeamento status da ServiceOrder → aba da Central de Manutenções. */
export const GRUPOS_CENTRAL = {
  pendentes: [
    'Novo',
    'Aguardando Orçamento',
    'Aguardando Aprovação',
    'Aguardando Teste de Qualidade',
    'Aguardando Aceite',
    'Aguardando Peça',
    'Aguardando Fornecedor',
    'Pendente',
  ],
  andamento: ['Em Andamento', 'Em Transporte (ida)', 'Em Conserto Externo', 'Em Transporte (volta)'],
  concluidas: ['Concluído'],
};

export const ORDENACOES = [
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'data', label: 'Data prevista' },
  { value: 'equipamento', label: 'Equipamento' },
];

/** OS aberta com a data programada vencida ou o prazo de SLA estourado. */
export function ordemAtrasada(order) {
  if (!order || order.status === 'Concluído') return false;
  const agora = Date.now();
  const agendada = order.scheduled_date ? new Date(order.scheduled_date).getTime() : null;
  const prazo = order.sla_deadline ? new Date(order.sla_deadline).getTime() : null;
  return (agendada != null && agendada < agora) || (prazo != null && prazo < agora);
}

export function dataReferencia(order) {
  if (order.status === 'Concluído') return order.completion_date || order.open_date || null;
  return order.scheduled_date || order.open_date || null;
}

export function ordenarOrdens(orders = [], ordem = 'prioridade', equipmentById = {}) {
  const lista = [...(orders || [])];
  // As concluídas ficam sempre no fim da lista; dentro de cada grupo vale a ordenação escolhida.
  const abertasPrimeiro = (a, b) =>
    (a.status === 'Concluído' ? 1 : 0) - (b.status === 'Concluído' ? 1 : 0);
  if (ordem === 'data') {
    return lista.sort(
      (a, b) =>
        abertasPrimeiro(a, b) ||
        new Date(dataReferencia(a) || 0) - new Date(dataReferencia(b) || 0)
    );
  }
  if (ordem === 'equipamento') {
    return lista.sort(
      (a, b) =>
        abertasPrimeiro(a, b) ||
        (a.equipment_name || '').localeCompare(b.equipment_name || '', 'pt-BR')
    );
  }
  // Colocação atual do equipamento no ranking de prioridade (sem posição por último),
  // e entre iguais o chamado aberto há mais tempo.
  return lista.sort((a, b) => {
    if (abertasPrimeiro(a, b) !== 0) return abertasPrimeiro(a, b);
    const posA = equipmentById?.[a.equipment_id]?.prioridade_posicao ?? Infinity;
    const posB = equipmentById?.[b.equipment_id]?.prioridade_posicao ?? Infinity;
    if (posA !== posB) return posA - posB;
    return new Date(a.open_date || 0) - new Date(b.open_date || 0);
  });
}

/** Motivo resumido exibido no card da Central. */
export function motivoDaOrdem(order, equipment) {
  if (order.type === 'Preventiva') {
    const periodicidade = order.periodicidade_referencia ?? equipment?.periodicidade_preventiva_dias;
    const desde = equipment?.data_ultima_preventiva
      ? `última há ${Math.max(differenceInDays(new Date(), parseISO(equipment.data_ultima_preventiva)), 0)} dias`
      : 'sem preventiva anterior';
    return periodicidade ? `${desde} · periodicidade ${periodicidade} dias` : desde;
  }
  const descricao = order.problem_description || 'Sem descrição informada';
  return descricao.length > 140 ? `${descricao.slice(0, 140)}…` : descricao;
}