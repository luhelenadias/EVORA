import { parseISO, startOfMonth, subDays } from 'date-fns';
import { dataReferencia } from '@/lib/central';

/** Filtros das três abas de Manutenções (Lista, Calendário e Indicadores). */

export const PERIODOS = [
  { value: 'todos', label: 'Todo o período' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'mes', label: 'Este mês' },
];

export const STATUS_ORDEM = [
  'Novo',
  'Em Andamento',
  'Aguardando Peça',
  'Aguardando Fornecedor',
  'Pendente',
  'Concluído',
];

export const TIPOS_ORDEM = ['Preventiva', 'Corretiva', 'Calibração', 'Instalação'];

export const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const FILTROS_LISTA_INICIAIS = {
  status: 'Todos',
  tecnico: 'todos',
  periodo: 'todos',
  tipo: 'Todas',
  prioridade: 'Todas',
  setor: 'todos',
  equipamento: 'todos',
  busca: '',
};

export const FILTROS_CALENDARIO_INICIAIS = {
  tecnico: 'todos',
  tipo: 'Todas',
  status: 'Todos',
  setor: 'todos',
};

export const FILTROS_INDICADORES_INICIAIS = {
  periodo: '90',
  tecnico: 'todos',
  tipo: 'Todas',
  equipamento: 'todos',
};

export function periodoInicial(periodo) {
  if (periodo === 'todos') return null;
  const agora = new Date();
  if (periodo === 'hoje') return { de: subDays(agora, 1), ate: null };
  if (periodo === 'mes') return { de: startOfMonth(agora), ate: null };
  const dias = Number(periodo);
  if (!Number.isFinite(dias)) return null;
  return { de: subDays(agora, dias), ate: null };
}

function dentroDoPeriodo(ordem, periodo) {
  const faixa = periodoInicial(periodo);
  if (!faixa) return true;
  const referencia = dataReferencia(ordem);
  if (!referencia) return false;
  const data = parseISO(referencia);
  if (Number.isNaN(data.getTime())) return false;
  return data >= faixa.de;
}

export function setorDaOrdem(ordem, equipmentById = {}) {
  return ordem.sector || equipmentById[ordem.equipment_id]?.location_sector || '';
}

/** Aplica os filtros que existirem no objeto (campos ausentes não filtram). */
export function filtrarOrdens(ordens = [], filtros = {}, equipmentById = {}) {
  const termo = String(filtros.busca || '').trim().toLowerCase();
  return (ordens || []).filter((ordem) => {
    if (filtros.status && filtros.status !== 'Todos' && ordem.status !== filtros.status) return false;
    if (filtros.tipo && filtros.tipo !== 'Todas' && ordem.type !== filtros.tipo) return false;
    if (filtros.prioridade && filtros.prioridade !== 'Todas' && ordem.priority !== filtros.prioridade) return false;
    if (filtros.tecnico && filtros.tecnico !== 'todos' && ordem.technician_id !== filtros.tecnico) return false;
    if (filtros.equipamento && filtros.equipamento !== 'todos' && ordem.equipment_id !== filtros.equipamento) return false;
    if (filtros.setor && filtros.setor !== 'todos' && setorDaOrdem(ordem, equipmentById) !== filtros.setor) return false;
    if (filtros.periodo && !dentroDoPeriodo(ordem, filtros.periodo)) return false;
    if (!termo) return true;
    const equipamento = equipmentById[ordem.equipment_id];
    return (
      (ordem.equipment_name || '').toLowerCase().includes(termo) ||
      (ordem.problem_description || '').toLowerCase().includes(termo) ||
      (ordem.code || '').toLowerCase().includes(termo) ||
      (equipamento?.codigo_equipamento || '').toLowerCase().includes(termo)
    );
  });
}

export function setoresDisponiveis(ordens = [], equipmentById = {}) {
  const setores = new Set();
  (ordens || []).forEach((ordem) => {
    const setor = setorDaOrdem(ordem, equipmentById);
    if (setor) setores.add(setor);
  });
  return Array.from(setores).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Agrupa ordens abertas por status, para os contadores da Lista. */
export function contarPorStatus(ordens = []) {
  return ordens.reduce((mapa, ordem) => {
    mapa[ordem.status] = (mapa[ordem.status] || 0) + 1;
    return mapa;
  }, {});
}