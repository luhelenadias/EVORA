import { differenceInHours, parseISO } from 'date-fns';

const corretivasConcluidas = (orders = []) =>
  (orders || [])
    .filter((o) => o.type === 'Corretiva' && o.status === 'Concluído')
    .sort((a, b) => new Date(a.completion_date || 0) - new Date(b.completion_date || 0));

/** MTTR (horas): média de duracao_total_minutos/60 das corretivas concluídas. */
export function calcularMttr(orders) {
  const concluidas = corretivasConcluidas(orders).filter((o) => o.duracao_total_minutos != null);
  if (!concluidas.length) return null;
  const soma = concluidas.reduce((total, o) => total + o.duracao_total_minutos / 60, 0);
  return Number((soma / concluidas.length).toFixed(2));
}

/** MTBF (horas): intervalo médio entre conclusões de corretivas consecutivas. */
export function calcularMtbf(orders) {
  const concluidas = corretivasConcluidas(orders).filter((o) => o.completion_date);
  if (concluidas.length < 2) return null;
  let soma = 0;
  for (let i = 1; i < concluidas.length; i += 1) {
    soma += differenceInHours(
      parseISO(concluidas[i].completion_date),
      parseISO(concluidas[i - 1].completion_date)
    );
  }
  return Number((soma / (concluidas.length - 1)).toFixed(2));
}

/**
 * Tempo médio de ATENDIMENTO (horas): média de response_time_minutes/60 das
 * corretivas concluídas. Mede quanto o chamado esperou até ser iniciado —
 * diferente do MTTR (mttr_hours), que mede a duração do reparo em si.
 */
export function calcularTempoMedioAtendimento(orders) {
  const concluidas = corretivasConcluidas(orders).filter((o) => o.response_time_minutes != null);
  if (!concluidas.length) return null;
  const soma = concluidas.reduce((total, o) => total + o.response_time_minutes / 60, 0);
  return Number((soma / concluidas.length).toFixed(2));
}

/** Frequência do MaintenancePlan derivada da periodicidade em dias do equipamento. */
export function frequenciaPorDias(dias) {
  if (!dias) return 'Anual';
  if (dias <= 31) return 'Mensal';
  if (dias <= 95) return 'Trimestral';
  if (dias <= 190) return 'Semestral';
  return 'Anual';
}