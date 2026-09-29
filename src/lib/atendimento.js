import { addHours, differenceInMinutes, parseISO } from 'date-fns';
import { findContractForEquipment } from '@/lib/maintenance';

export const DENTRO_DO_PRAZO = 'Dentro do Prazo';
export const ATRASADO = 'Atrasado';
export const SEM_SLA = 'Sem SLA Definido';

/** Minutos entre a abertura do chamado e o início do atendimento. */
export function minutosDeAtendimento(openDate, startDate) {
  if (!openDate || !startDate) return null;
  return Math.max(differenceInMinutes(parseISO(startDate), parseISO(openDate)), 0);
}

/**
 * Prazo limite e situação do PRIMEIRO ATENDIMENTO (sla_response_*), distintos do
 * prazo de resolução (sla_deadline/sla_status). Usa o sla_response_hours do
 * contrato vigente do equipamento; a referência é o start_date quando existe
 * (situação congelada no atendimento) ou o momento atual se ainda não iniciou.
 */
export function slaDeAtendimento(order, contracts) {
  const horas = findContractForEquipment(contracts, order.equipment_id)?.sla_response_hours;
  if (!horas || !order.open_date) return { deadline: null, status: SEM_SLA, horas: null };

  const deadline = addHours(parseISO(order.open_date), horas);
  const referencia = order.start_date ? parseISO(order.start_date) : new Date();

  return {
    deadline,
    horas,
    status: referencia <= deadline ? DENTRO_DO_PRAZO : ATRASADO,
  };
}