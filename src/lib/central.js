import { differenceInDays, parseISO } from 'date-fns';

/** Mapeamento status da ServiceOrder → aba da Central de Manutenções. */
export const GRUPOS_CENTRAL = {
  pendentes: ['Novo', 'Aguardando Peça', 'Aguardando Fornecedor', 'Pendente'],
  andamento: ['Em Andamento'],
  concluidas: ['Concluído'],
};

export const ORDENACOES = [
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'data', label: 'Data prevista' },
  { value: 'equipamento', label: 'Equipamento' },
];

export function dataReferencia(order) {
  if (order.status === 'Concluído') return order.completion_date || order.open_date || null;
  return order.scheduled_date || order.open_date || null;
}

export function ordenarOrdens(orders = [], ordem = 'prioridade') {
  const lista = [...(orders || [])];
  if (ordem === 'data') {
    return lista.sort(
      (a, b) => new Date(dataReferencia(a) || 0) - new Date(dataReferencia(b) || 0)
    );
  }
  if (ordem === 'equipamento') {
    return lista.sort((a, b) =>
      (a.equipment_name || '').localeCompare(b.equipment_name || '', 'pt-BR')
    );
  }
  return lista.sort(
    (a, b) => (b.prioridade_score_equipamento ?? -1) - (a.prioridade_score_equipamento ?? -1)
  );
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