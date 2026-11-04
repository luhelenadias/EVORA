import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';

/**
 * Regras da triagem da OS corretiva.
 * Quem abre o chamado descreve o problema; quem decide o destino é a gestão.
 * A OS nasce "Novo" (sem técnico e sem rota) e só sai desse estado pela triagem.
 */

export const URGENCIAS = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const ROTULOS_URGENCIA = {
  Baixa: 'Baixa',
  Média: 'Média',
  Alta: 'Alta',
  Crítica: 'Crítica',
};

/** Peso de ordenação da fila: crítica primeiro. */
export const PESO_PRIORIDADE = { Crítica: 0, Alta: 1, Média: 2, Baixa: 3 };

export const ROTULO_AGUARDANDO_TRIAGEM = 'Aguardando triagem';
export const ROTULO_DEVOLVIDA = 'Devolvida para complemento';

/** Somente administração e gestão triam ou reatribuem chamados. */
export function podeTriar(role) {
  return role === 'admin' || role === 'gestor';
}

/** OS corretiva recém-aberta, ainda sem destino e sem técnico. */
export function aguardandoTriagem(order) {
  if (!order || order.type !== 'Corretiva') return false;
  if (order.status !== 'Novo') return false;
  if (order.technician_id || order.rota_atendimento) return false;
  return order.execution_by !== 'Fornecedor Externo';
}

/** Fila de triagem: prioridade primeiro, depois o chamado mais antigo. */
export function filaTriagem(orders = []) {
  return [...(orders || [])]
    .filter(aguardandoTriagem)
    .sort((a, b) => {
      const pesoA = PESO_PRIORIDADE[a.priority] ?? 9;
      const pesoB = PESO_PRIORIDADE[b.priority] ?? 9;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return new Date(a.open_date || 0) - new Date(b.open_date || 0);
    });
}

/** Já triada e ainda não iniciada: a gestão pode reabrir para trocar técnico ou rota. */
export function podeReabrirTriagem(order) {
  if (!order || order.start_date) return false;
  if (order.status === 'Concluído' || order.type !== 'Corretiva') return false;
  if (!order.triagem_em) return false;
  return ['Pendente', 'Aguardando Orçamento', 'Aguardando Aprovação', 'Aguardando Fornecedor'].includes(order.status);
}

/** Tempo de espera em texto curto: "3d 4h", "5h 20min", "18 min". */
export function esperaTexto(order, agora = new Date()) {
  const desde = order?.open_date ? new Date(order.open_date) : null;
  if (!desde || Number.isNaN(desde.getTime())) return '—';
  const minutos = Math.max(differenceInMinutes(agora, desde), 0);
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  if (dias >= 1) return `${dias}d ${horas}h`;
  if (horas >= 1) return `${horas}h ${minutos % 60}min`;
  return `${minutos} min`;
}

/** Dias inteiros de espera (para alertas e ordenação). */
export function diasEsperando(order, agora = new Date()) {
  const desde = order?.open_date ? new Date(order.open_date) : null;
  if (!desde || Number.isNaN(desde.getTime())) return 0;
  return Math.max(Math.floor((agora.getTime() - desde.getTime()) / 86400000), 0);
}

/** Rótulo do status na interface, sem mudar o valor do enum. */
export function rotuloStatusOS(order) {
  if (!order) return '';
  if (order.status !== 'Novo') return order.status;
  if (order.triagem_devolucao_motivo) return ROTULO_DEVOLVIDA;
  return aguardandoTriagem(order) ? ROTULO_AGUARDANDO_TRIAGEM : order.status;
}

/** Status gravado ao concluir a triagem. */
export function statusAposTriagem(rota) {
  return rota === 'Equipe interna' ? 'Pendente' : 'Aguardando Orçamento';
}

/** Contratos vigentes que cobrem o equipamento (vínculo direto ou lista de cobertos). */
export function contratosDoEquipamento(contracts = [], equipment) {
  if (!equipment) return [];
  const hoje = new Date();
  return (contracts || []).filter((contrato) => {
    if (contrato.status === 'Cancelado') return false;
    const cobre =
      contrato.id === equipment.contract_id ||
      (contrato.covered_equipment_ids || []).includes(equipment.id);
    if (!cobre) return false;
    const fim = contrato.end_date ? parseISO(String(contrato.end_date).slice(0, 10)) : null;
    return !fim || Number.isNaN(fim.getTime()) || fim >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  });
}

/** Últimas corretivas do equipamento, da mais recente para a mais antiga. */
export function ultimasCorretivas(orders = [], equipmentId, limite = 5) {
  if (!equipmentId) return [];
  return (orders || [])
    .filter((ordem) => ordem.equipment_id === equipmentId && ordem.type === 'Corretiva')
    .sort((a, b) => new Date(b.open_date || 0) - new Date(a.open_date || 0))
    .slice(0, limite);
}

/**
 * Rechamada: nova corretiva aberta até `janelaDias` depois de uma corretiva
 * concluída no mesmo equipamento (parâmetro já existente em Configurações).
 */
export function ehRechamada(ordem, historico = [], janelaDias = 30) {
  if (!ordem?.open_date) return false;
  const abertura = new Date(ordem.open_date).getTime();
  const janela = Math.max(Number(janelaDias) || 0, 0) * 86400000;
  return (historico || []).some((outra) => {
    if (outra.id === ordem.id) return false;
    if (outra.status !== 'Concluído' || !outra.completion_date) return false;
    const conclusao = new Date(outra.completion_date).getTime();
    return conclusao <= abertura && abertura - conclusao <= janela;
  });
}

/** Outra OS aberta no mesmo equipamento (a triagem avisa antes de duplicar esforço). */
export function osAbertaNoEquipamento(orders = [], equipmentId, ignorarId) {
  return (orders || []).find(
    (ordem) =>
      ordem.equipment_id === equipmentId &&
      ordem.id !== ignorarId &&
      ordem.status !== 'Concluído'
  ) || null;
}

/** Carga de cada técnico: OS abertas e se já tem agenda no dia. */
export function cargaDoTecnico(orders = [], tecnicoId, dia = new Date()) {
  const abertas = (orders || []).filter(
    (ordem) => ordem.technician_id === tecnicoId && ordem.status !== 'Concluído'
  );
  const agendaNoDia = abertas.some((ordem) => {
    if (!ordem.scheduled_date) return false;
    const data = new Date(ordem.scheduled_date);
    return !Number.isNaN(data.getTime()) && isSameDay(data, dia);
  });
  return { abertas: abertas.length, agendaNoDia };
}