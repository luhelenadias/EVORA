import { differenceInHours, parseISO } from 'date-fns';

// ── Priorização inteligente ──────────────────────────────────────
export const CRITICALITY_PRIORITY = {
  'Suporte à Vida': 'Crítica',
  'Terapêutico': 'Alta',
  'Diagnóstico': 'Média',
  'Apoio': 'Baixa',
};

export const CRITICALITY_WEIGHT = {
  'Suporte à Vida': 4,
  'Terapêutico': 3,
  'Diagnóstico': 2,
  'Apoio': 1,
};

export const PRIORITY_WEIGHT = {
  'Crítica': 4,
  'Alta': 3,
  'Média': 2,
  'Baixa': 1,
};

export function suggestPriority(criticality) {
  return CRITICALITY_PRIORITY[criticality] || 'Média';
}

// ── SLA de Contratos ──────────────────────────────────────────────
export function findContractForEquipment(contracts, equipmentId) {
  if (!contracts || !equipmentId) return null;
  return contracts.find(
    (c) =>
      (c.status === 'Ativo' || c.status === 'Vencendo') &&
      c.covered_equipment_ids?.includes(equipmentId)
  ) || null;
}

export function computeSlaStatus(order, contract) {
  if (!contract || !contract.sla_resolution_hours || !order.open_date) return null;
  if (order.status === 'Concluído') return { status: 'ok', label: 'Concluído', hours: 0 };
  const elapsed = (Date.now() - new Date(order.open_date).getTime()) / (1000 * 60 * 60);
  const sla = contract.sla_resolution_hours;
  if (elapsed > sla)
    return { status: 'overdue', label: `SLA vencido (${Math.round(elapsed)}h/${sla}h)`, hours: elapsed };
  if (elapsed > sla * 0.8)
    return { status: 'risk', label: `SLA em risco (${Math.round(elapsed)}h/${sla}h)`, hours: elapsed };
  return { status: 'ok', label: `Dentro do SLA (${Math.round(elapsed)}h/${sla}h)`, hours: elapsed };
}

export const SLA_STYLES = {
  overdue: 'bg-red-100 text-red-700 border-red-200',
  risk: 'bg-amber-100 text-amber-700 border-amber-200',
  ok: 'bg-green-100 text-green-700 border-green-200',
};

// ── Fila de atendimento (score de prioridade) ─────────────────────
export function queueScore(order, equipment, contracts) {
  const contract = findContractForEquipment(contracts, order.equipment_id);
  const crit = equipment?.criticality;
  let score = (CRITICALITY_WEIGHT[crit] || 0) + (PRIORITY_WEIGHT[order.priority] || 0);
  const sla = computeSlaStatus(order, contract);
  if (sla?.status === 'overdue') score += 2;
  else if (sla?.status === 'risk') score += 1;
  // older open orders get a small boost
  if (order.open_date) {
    const daysOpen = (Date.now() - new Date(order.open_date).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(daysOpen / 10, 1);
  }
  return score;
}

// ── KPIs de manutenção ─────────────────────────────────────────────
export function computeMTTR(orders) {
  const completed = orders.filter(
    (o) => o.status === 'Concluído' && o.start_date && o.completion_date
  );
  if (!completed.length) return null;
  const total = completed.reduce(
    (sum, o) => sum + differenceInHours(parseISO(o.completion_date), parseISO(o.start_date)),
    0
  );
  return total / completed.length;
}

export function computeMTBF(equipment, orders) {
  const corrective = orders.filter(
    (o) => o.equipment_id === equipment.id && o.type === 'Corretiva'
  );
  if (!corrective.length || !equipment.acquisition_date) return null;
  const ageHours = differenceInHours(new Date(), parseISO(equipment.acquisition_date));
  return ageHours / corrective.length;
}

export function formatHours(hours) {
  if (hours == null) return '—';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} dias`;
}