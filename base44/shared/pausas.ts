/**
 * Regras da pausa da manutenção, compartilhadas pelas funções do servidor.
 * Uma pausa ativa por vez, sempre ligada a uma OS em andamento. O tempo pausado
 * sai do tempo de reparo (MTTR) e fica guardado à parte, para disponibilidade e SLA.
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
export function statusDaPausa(motivo: string) {
  if (motivo === 'Aguardando peça') return 'Aguardando Peça';
  if (motivo === 'Aguardando fornecedor') return 'Aguardando Fornecedor';
  return 'Pendente';
}

/** Pausa ainda aberta (sem fim). */
export function pausaAberta(pausas: any[] = []) {
  return (pausas || []).find((pausa) => pausa && pausa.inicio && !pausa.fim) || null;
}

function minutos(de: any, ate: any) {
  if (!de || !ate) return 0;
  const inicio = new Date(de).getTime();
  const fim = new Date(ate).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return 0;
  return Math.max((fim - inicio) / 60000, 0);
}

/** Soma das pausas encerradas + a pausa aberta até `agora`. */
export function minutosPausados(pausas: any[] = [], agora: Date = new Date()) {
  return (pausas || []).reduce(
    (soma, pausa) => soma + (pausa?.fim ? minutos(pausa.inicio, pausa.fim) : minutos(pausa.inicio, agora)),
    0
  );
}

/**
 * Os dois tempos de uma OS finalizada:
 * - reparo = (conclusão − início) − pausas  → duracao_total_minutos (MTTR)
 * - chamado = conclusão − abertura          → tempo_total_chamado_minutos (equipamento parado)
 */
export function temposDaOS({ start_date, open_date, completion_date, pausas = [] }: any) {
  const bruto = minutos(start_date, completion_date);
  const pausado = Math.round(minutosPausados(pausas, completion_date ? new Date(completion_date) : new Date()));
  return {
    brutoMinutos: Math.round(bruto),
    pausadoMinutos: pausado,
    reparoMinutos: Math.max(Math.round(bruto) - pausado, 0),
    chamadoMinutos: Math.round(minutos(open_date, completion_date)),
  };
}

/** Usuário pode pausar/retomar esta OS? Admin, gestão ou o técnico designado. */
export function podeMexerNaPausa(usuario: any, ordem: any) {
  if (!usuario || !ordem) return false;
  if (usuario.role === 'admin' || usuario.role === 'gestor') return true;
  return usuario.role === 'tecnico' && !!ordem.technician_id && ordem.technician_id === usuario.id;
}