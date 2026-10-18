import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { suggestPriorityDeEquipamento } from '@/lib/maintenance';

// Antecedência com que a preventiva entra na fila da Central de Manutenções.
export const JANELA_PREVENTIVA_DIAS = 7;

// Situações que indicam preventiva já em aberto (evita duplicidade).
const STATUS_ABERTOS = ['Novo', 'Em Andamento'];

export function diasAteProximaPreventiva(equipment, hoje = new Date()) {
  if (!equipment?.data_proxima_preventiva) return null;
  return differenceInDays(parseISO(equipment.data_proxima_preventiva), hoje);
}

/** Dias restantes quando a preventiva já entrou na janela de geração; null caso contrário. */
export function preventivaNaJanela(equipment, hoje = new Date()) {
  if (equipment?.operational_status !== 'Ativo') return null;
  if (!equipment.periodicidade_preventiva_dias || !equipment.data_proxima_preventiva) return null;
  const dias = diasAteProximaPreventiva(equipment, hoje);
  return dias != null && dias <= JANELA_PREVENTIVA_DIAS ? dias : null;
}

export function temPreventivaAberta(orders, equipmentId) {
  return (orders || []).some(
    (o) =>
      o.equipment_id === equipmentId &&
      o.type === 'Preventiva' &&
      STATUS_ABERTOS.includes(o.status)
  );
}

/** Ordens preventivas que devem ser criadas agora, sem duplicar as já abertas. */
export function calcularPreventivasAGerar(equipment = [], orders = [], hoje = new Date()) {
  const stamp = Date.now();
  return (equipment || [])
    .filter((eq) => preventivaNaJanela(eq, hoje) != null && !temPreventivaAberta(orders, eq.id))
    .map((eq, i) => ({
      code: `OS-${(stamp + i).toString(36).toUpperCase()}`,
      type: 'Preventiva',
      origin: 'Agendada',
      status: 'Novo',
      equipment_id: eq.id,
      equipment_name: eq.name,
      equipment_criticality: eq.criticality,
      priority: suggestPriorityDeEquipamento(eq),
      problem_description: 'Manutenção preventiva programada',
      periodicidade_referencia: eq.periodicidade_preventiva_dias,
      prioridade_score_equipamento: eq.prioridade_score ?? null,
      sector: eq.location_sector || '',
      open_date: hoje.toISOString(),
      // Programada para o dia previsto no equipamento — alimenta o Calendário de Preventivas.
      scheduled_date: eq.data_proxima_preventiva,
      // Técnico padrão do equipamento; sem técnico definido no cadastro, a preventiva nasce
      // sem responsável, para o administrador atribuir na tela de Preventivas.
      ...(eq.tecnico_padrao_id ? { technician_id: eq.tecnico_padrao_id } : {}),
    }));
}

/** Nova data_proxima_preventiva após concluir uma preventiva. */
export function calcularProximaPreventiva(completionDate, periodicidadeDias) {
  if (!completionDate || !periodicidadeDias) return null;
  return format(addDays(parseISO(completionDate), periodicidadeDias), 'yyyy-MM-dd');
}