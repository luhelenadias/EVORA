import { addHours, differenceInHours, differenceInMinutes, format, parseISO } from 'date-fns';
import { findContractForEquipment } from '@/lib/maintenance';
import { dataReferencia } from '@/lib/central';

/**
 * Prazo e situação do SLA da OS. Usa os campos gravados na própria ordem quando
 * existem; caso contrário deriva do SLA de resolução do contrato vigente do
 * equipamento. Para ordens concluídas a referência é a data de conclusão, de
 * modo que a situação fica congelada no momento do encerramento.
 */
export function resolverSla(order, contracts) {
  const congelado = order.status === 'Concluído';

  if (order.sla_status && order.sla_deadline) {
    return { prazo: order.sla_deadline, status: order.sla_status, congelado };
  }

  const horas = findContractForEquipment(contracts, order.equipment_id)?.sla_resolution_hours;
  if (!horas || !order.open_date) return null;

  const prazo = addHours(parseISO(order.open_date), horas);
  const referencia = congelado ? parseISO(order.completion_date || order.open_date) : new Date();

  return {
    prazo: prazo.toISOString(),
    status: referencia > prazo ? 'Atrasado' : 'Dentro do Prazo',
    horas,
    congelado,
  };
}

export function formatarData(iso) {
  return iso ? format(parseISO(iso), 'dd/MM/yyyy') : '—';
}

export function formatarDataHora(iso) {
  return iso ? format(parseISO(iso), 'dd/MM/yyyy HH:mm') : '—';
}

export function formatarMoeda(valor) {
  if (valor == null) return '—';
  return `R$ ${Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatarDuracao(minutos) {
  if (minutos == null) return '—';
  const total = Math.max(Math.round(minutos), 0);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

/** Cronômetro do modal: aaaa hh:mm:ss (dias só quando houver). */
export function tempoAoVivo(ms) {
  const segundos = Math.max(Math.floor(ms / 1000), 0);
  const dias = Math.floor(segundos / 86400);
  const hh = String(Math.floor((segundos % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return dias ? `${dias}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** Há quanto tempo a ordem está aberta, em texto curto. */
export function tempoDecorrido(desde) {
  if (!desde) return null;
  const horas = differenceInHours(new Date(), parseISO(desde));
  if (horas < 1) {
    const minutos = Math.max(differenceInMinutes(new Date(), parseISO(desde)), 0);
    return `${minutos} min`;
  }
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

export function totalPecas(pecas = []) {
  return (pecas || []).reduce((soma, p) => soma + (p.cost || 0) * (p.quantity || 0), 0);
}

/**
 * Peças cujo consumo ultrapassa o estoque disponível. A soma é feita por peça,
 * pois a mesma peça pode aparecer em mais de uma linha da mesma ordem.
 * Retorna [] quando a baixa pode ser feita.
 */
export function pecasAcimaDoEstoque(pecas = [], spareParts = []) {
  const solicitado = {};
  (pecas || []).forEach((p) => {
    if (!p.spare_part_id) return;
    solicitado[p.spare_part_id] = (solicitado[p.spare_part_id] || 0) + (Number(p.quantity) || 0);
  });

  return Object.entries(solicitado)
    .map(([id, quantidade]) => {
      const peca = spareParts.find((s) => s.id === id);
      if (!peca) return null;
      const disponivel = peca.current_stock ?? 0;
      return quantidade > disponivel
        ? { name: peca.name || 'Peça', quantidade, disponivel }
        : null;
    })
    .filter(Boolean);
}

/** Últimas ordens do mesmo equipamento, exceto a que está aberta no modal. */
export function historicoDoEquipamento(orders, equipmentId, ordemAtualId, limite = 5) {
  return (orders || [])
    .filter((o) => o.equipment_id === equipmentId && o.id !== ordemAtualId)
    .sort((a, b) => String(dataReferencia(b) || '').localeCompare(String(dataReferencia(a) || '')))
    .slice(0, limite);
}