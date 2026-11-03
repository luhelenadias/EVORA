import { format, isSameDay, parseISO } from 'date-fns';
import { dataProgramada, horarioProgramado, temHorario } from '@/lib/preventivas';
import { dataReferencia } from '@/lib/central';

/**
 * Agenda da manutenção. Só o que ainda não começou pode ser movido: em
 * andamento e concluídas ficam travadas no calendário.
 */
export function podeReagendar(order) {
  if (!order) return false;
  return order.status !== 'Em Andamento' && order.status !== 'Concluído';
}

/** Corretivas abertas que ainda não têm data — vão para a bandeja "Sem data". */
export function corretivasSemData(orders = []) {
  return (orders || []).filter(
    (ordem) => ordem.type === 'Corretiva' && ordem.status !== 'Concluído' && !ordem.scheduled_date
  );
}

export function prioridadeCritica(order) {
  return order?.priority === 'Crítica';
}

/** OS encaminhada ao fabricante/serviço externo em vez de um técnico interno. */
export function ehManutencaoExterna(order) {
  return order?.execution_by === 'Fornecedor Externo';
}

/** Quem responde pela OS: técnico interno, fabricante/serviço externo ou ninguém. */
export function nomeResponsavel(order, tecnico) {
  if (tecnico?.name) return tecnico.name;
  if (ehManutencaoExterna(order)) return order?.fornecedor_nome || 'Manutenção externa';
  return order?.technician_name || 'Não atribuída';
}

/** Verdadeiro só quando a OS não tem técnico nem serviço externo definido. */
export function semResponsavel(order) {
  return !order?.technician_id && !ehManutencaoExterna(order);
}

/** Data escolhida (dia) no mesmo formato da OS: com horário quando ela já tinha um. */
export function novaDataDoArraste(order, dia) {
  const atual = dataProgramada(order);
  const hora = temHorario(order) && atual ? format(atual, 'HH:mm') : '';
  const base = format(dia, 'yyyy-MM-dd');
  return hora ? new Date(`${base}T${hora}:00`).toISOString() : base;
}

/** Primeiro agendamento de uma OS que estava sem data. */
export function dataDoAgendamento(dia, hora = '08:00') {
  const base = format(dia, 'yyyy-MM-dd');
  return new Date(`${base}T${hora}:00`).toISOString();
}

/** Junta dia + hora digitados no painel no formato gravado em scheduled_date. */
export function isoDaData(dia, hora) {
  if (!dia) return '';
  return hora ? new Date(`${dia}T${hora}:00`).toISOString() : dia;
}

/** Avisos exibidos antes de confirmar (férias/afastamento e choque de agenda). */
export function avisosDeAgenda({ order, novaData, tecnicoId, ordens = [], tecnicos = [] }) {
  const avisos = [];
  const tecnico = tecnicos.find((t) => t.id === tecnicoId);

  if (tecnico?.status && tecnico.status !== 'Ativo') {
    avisos.push(`${tecnico.name} está ${tecnico.status} — confirme a disponibilidade antes de manter a data.`);
  }

  const nova = typeof novaData === 'string' ? parseISO(novaData) : novaData;
  if (!tecnicoId || !nova || Number.isNaN(nova.getTime())) return avisos;

  const conflitos = ordens.filter((outra) => {
    if (!outra || outra.id === order.id) return false;
    if (outra.technician_id !== tecnicoId) return false;
    if (outra.status === 'Concluído') return false;
    const quando = dataProgramada(outra);
    return quando && isSameDay(quando, nova);
  });

  conflitos.slice(0, 2).forEach((outra) => {
    const hora = horarioProgramado(outra);
    const quem = tecnico?.name || 'O técnico';
    avisos.push(
      `${quem} já tem ${outra.code || 'outra manutenção'} nesse dia${hora ? ` (${hora})` : ''} — ${outra.equipment_name || 'equipamento'}.`
    );
  });

  return avisos;
}