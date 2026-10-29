import { parseISO, startOfMonth, subDays } from 'date-fns';
import { dataReferencia } from '@/lib/central';

/** Filtros das três abas de Manutenções (Lista, Calendário e Indicadores). */

export const PERIODOS = [
  { value: 'todos', label: 'Período' },
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

/** Cada filtro é uma lista de opções marcadas; lista vazia = sem filtro. */
export const FILTROS_LISTA_INICIAIS = {
  status: [],
  tecnico: [],
  periodo: 'todos',
  tipo: [],
  prioridade: [],
  setor: [],
  equipamento: [],
  busca: '',
};

export const FILTROS_CALENDARIO_INICIAIS = {
  tecnico: [],
  tipo: [],
  status: [],
  setor: [],
};

export const FILTROS_INDICADORES_INICIAIS = {
  periodo: '90',
  tecnico: [],
  tipo: [],
  equipamento: [],
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

/** Verdadeiro quando o filtro está desligado (nenhuma opção marcada). */
export function semSelecao(selecao) {
  if (Array.isArray(selecao)) return selecao.length === 0;
  return !selecao || ['todos', 'Todos', 'Todas'].includes(selecao);
}

/** Valor aceito quando a opção está entre as marcadas (ou nada está marcado). */
function corresponde(valor, selecao) {
  if (semSelecao(selecao)) return true;
  return Array.isArray(selecao) ? selecao.includes(valor) : valor === selecao;
}

/** Aplica os filtros que existirem no objeto (campos ausentes não filtram). */
export function filtrarOrdens(ordens = [], filtros = {}, equipmentById = {}) {
  const termo = String(filtros.busca || '').trim().toLowerCase();
  return (ordens || []).filter((ordem) => {
    if (!corresponde(ordem.status, filtros.status)) return false;
    if (!corresponde(ordem.type, filtros.tipo)) return false;
    if (!corresponde(ordem.priority, filtros.prioridade)) return false;
    if (!corresponde(ordem.technician_id, filtros.tecnico)) return false;
    if (!corresponde(ordem.equipment_id, filtros.equipamento)) return false;
    if (!corresponde(setorDaOrdem(ordem, equipmentById), filtros.setor)) return false;
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