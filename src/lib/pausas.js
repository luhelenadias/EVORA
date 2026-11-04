import { differenceInMinutes } from 'date-fns';

/**
 * Regras da pausa da manutenção na tela.
 * O reparo ativo é (conclusão − início) − pausas; o tempo do chamado é
 * (conclusão − abertura) e é ele que conta para o SLA.
 */

export const MOTIVOS_PAUSA = [
  'Aguardando peça',
  'Aguardando fornecedor',
  'Equipamento em uso pela clínica',
  'Aguardando decisão da gestão',
  'Outro',
];

export const MOTIVO_PAUSA_PECA = 'Aguardando peça';

/** Status que a OS assume enquanto está pausada. */
export function statusDaPausa(motivo) {
  if (motivo === 'Aguardando peça') return 'Aguardando Peça';
  if (motivo === 'Aguardando fornecedor') return 'Aguardando Fornecedor';
  return 'Pendente';
}

export function pausaAberta(order) {
  return (order?.pausas || []).find((pausa) => pausa && pausa.inicio && !pausa.fim) || null;
}

export const estaPausada = (order) => !!order?.pausa_ativa || !!pausaAberta(order);

/** Só o técnico designado, a gestão e a administração pausam/retomam. */
export function podeMexerNaPausa(user, order) {
  if (!user || !order || order.status === 'Concluído') return false;
  if (['admin', 'gestor'].includes(user.role)) return true;
  return user.role === 'tecnico' && !!order.technician_id && order.technician_id === user.id;
}

function minutos(de, ate) {
  if (!de || !ate) return 0;
  const inicio = new Date(de).getTime();
  const fim = new Date(ate).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return 0;
  return Math.max((fim - inicio) / 60000, 0);
}

export function minutosPausados(pausas = [], agora = new Date()) {
  return (pausas || []).reduce(
    (soma, pausa) => soma + (pausa?.fim ? minutos(pausa.inicio, pausa.fim) : minutos(pausa.inicio, agora)),
    0
  );
}

/** Os dois tempos de uma OS: reparo ativo (MTTR) e chamado total (equipamento parado). */
export function temposDaOS({ start_date, open_date, completion_date, pausas = [] }, agora = new Date()) {
  const referencia = completion_date || agora;
  const bruto = Math.round(minutos(start_date, referencia));
  const pausado = Math.round(minutosPausados(pausas, new Date(referencia)));
  return {
    brutoMinutos: bruto,
    pausadoMinutos: pausado,
    reparoMinutos: Math.max(bruto - pausado, 0),
    chamadoMinutos: Math.round(minutos(open_date, referencia)),
  };
}

/** "2 h 15 min", "45 min", "3 min". */
export function duracaoTexto(valorMinutos) {
  const total = Math.max(Math.round(Number(valorMinutos) || 0), 0);
  const horas = Math.floor(total / 60);
  const min = total % 60;
  if (!horas) return `${min} min`;
  return min ? `${horas} h ${min} min` : `${horas} h`;
}

/** Pausa (motivo + tempo) para o selo da Central. */
export function resumoDaPausa(order, agora = new Date()) {
  const aberta = pausaAberta(order);
  if (!aberta) return '';
  return `${aberta.motivo} há ${duracaoTexto(minutos(aberta.inicio, agora))}`;
}

/** Tempo desde a abertura até agora, ou até a conclusão. */
export function minutosDoChamado(order, agora = new Date()) {
  return Math.round(minutos(order?.open_date, order?.completion_date || agora));
}

/** Minutos corridos de uma pausa (aberta conta até agora). */
export function minutosDaPausa(pausa, agora = new Date()) {
  return Math.round(minutos(pausa?.inicio, pausa?.fim || agora));
}

/** Chamadas ao servidor da pausa (permissão e pausa única validadas lá). */
export async function pausarManutencao(base44, order, dados) {
  const { data } = await base44.functions.invoke('pausaOS', { id: order.id, acao: 'pausar', ...dados });
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function retomarManutencao(base44, order) {
  const { data } = await base44.functions.invoke('pausaOS', { id: order.id, acao: 'retomar' });
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Diferença em minutos entre duas datas (usada nos textos). */
export const minutosEntre = (de, ate) => (de && ate ? Math.max(differenceInMinutes(new Date(ate), new Date(de)), 0) : 0);