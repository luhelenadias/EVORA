import { subMonths } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { CRITICALITY_WEIGHT, LIMIAR_PRIORIDADE_ALTA, computePriorizacao } from '@/lib/maintenance';

// ── Escalas de categorias (Fennigkoh & Smith / ECRI) ───────────────
export const OPCOES_FUNCAO_F = [
  { value: 10, label: 'Suporte à vida' },
  { value: 9, label: 'Cirurgia e terapia intensiva' },
  { value: 8, label: 'Fisioterapia e tratamento' },
  { value: 7, label: 'Monitorização em cirurgia e terapia intensiva' },
  { value: 6, label: 'Monitorização fisiológica adicional e diagnóstico' },
  { value: 5, label: 'Laboratório analítico' },
  { value: 4, label: 'Acessórios de laboratório' },
  { value: 3, label: 'Computadores e afins' },
  { value: 2, label: 'Relacionado ao paciente e outros' },
];

export const OPCOES_RISCO_PR = [
  { value: 5, label: 'Morte do paciente' },
  { value: 4, label: 'Lesão ao paciente ou operador' },
  { value: 3, label: 'Terapia inadequada ou erro de diagnóstico' },
  { value: 2, label: 'Intermediário (valor não definido na tabela original)' },
  { value: 1, label: 'Sem risco significativo' },
];

/** Mesma escala para Requisitos de Manutenção (MR) e Manutenção (M). */
export const OPCOES_MANUTENCAO = [
  { value: 5, label: 'Extensiva' },
  { value: 4, label: 'Intermediária (não definido na tabela original)' },
  { value: 3, label: 'Média' },
  { value: 2, label: 'Intermediária (não definido na tabela original)' },
  { value: 1, label: 'Mínima' },
];

export const OPCOES_RISCO_R = [
  {
    value: 'Alto',
    label: 'Alto (5)',
    apoio:
      'Suporte à vida, ressuscitação, monitorização crítica e outros equipamentos cuja falha ou mau uso provavelmente fere gravemente pacientes ou equipe.',
  },
  {
    value: 'Médio',
    label: 'Médio (3)',
    apoio:
      'Inclui muitos instrumentos diagnósticos, cuja falha, mau uso ou ausência (ex.: fora de serviço sem reposição) teria impacto significativo no cuidado, mas dificilmente causaria lesão grave direta.',
  },
  {
    value: 'Baixo',
    label: 'Baixo (1)',
    apoio: 'Falha ou mau uso improvável de causar consequências graves.',
  },
];

// ── Explicações das siglas e termos (tooltips) ─────────────────────
export const TOOLTIPS = {
  F: 'Função clínica do equipamento (Fennigkoh & Smith). De 2 (apoio e itens relacionados ao paciente) a 10 (suporte à vida).',
  PR: 'Risco ao paciente ou operador se o equipamento falhar. De 1 (sem risco significativo) a 5 (pode causar morte).',
  MR: 'Quão exigente o equipamento é de manter. De 1 (mínima) a 5 (extensiva).',
  EM: 'Índice de Gerenciamento de Equipamento: F + PR + MR. Com EM de 12 ou mais, o equipamento deve entrar no plano de manutenção.',
  MC: 'Quão essencial o equipamento é para a missão da instituição. Nota de 1 a 10 definida pelo próprio hospital.',
  R: 'Risco pelo critério ECRI: Baixo (1), Médio (3) ou Alto (5). Alto significa que falha ou mau uso pode ferir gravemente pacientes ou equipe.',
  M: 'Exigência de manutenção, na mesma escala do MR: de 1 (mínima) a 5 (extensiva).',
  U: 'Fração do tempo em que o equipamento é usado, de 0 a 1. Exemplo: 0,8 = usado 80% do tempo.',
  EMR: 'Índice de Wang-Levenson sem utilização: MC + 2×R + 2×M. Quanto maior, mais prioritário.',
  AEMR: 'Índice de Wang-Levenson com utilização: (MC + 2×M) × U + 2×R. Quanto maior, mais prioritário.',
  faixa:
    'Posição relativa do equipamento no parque, por quartis do ranking: Crítica, Alta, Média ou Baixa. Os cortes são configuráveis em Configurações.',
  posicao:
    'Colocação do equipamento no ranking de prioridade (1 = mais prioritário), entre os já calculados. Empates são desfeitos por criticidade e por número de corretivas nos últimos 12 meses.',
  pendente:
    'Faltam dados exigidos pelo modelo de priorização ativo. O equipamento fica fora do ranking até o preenchimento.',
};

export const CORTES_PADRAO = { critica: 25, alta: 50, media: 75 };

export function cortesDe(config) {
  return {
    critica: config?.faixa_critica_ate_pct ?? CORTES_PADRAO.critica,
    alta: config?.faixa_alta_ate_pct ?? CORTES_PADRAO.alta,
    media: config?.faixa_media_ate_pct ?? CORTES_PADRAO.media,
  };
}

/** faixa_critica_ate_pct < faixa_alta_ate_pct < faixa_media_ate_pct < 100 */
export function cortesValidos({ critica, alta, media }) {
  const c = Number(critica);
  const a = Number(alta);
  const m = Number(media);
  if ([c, a, m].some((v) => Number.isNaN(v))) return false;
  return c >= 1 && c < a && a < m && m < 100;
}

/** Fórmula que produz o score do modelo ativo. */
export function modeloDoScore(config) {
  if ((config?.modelo_priorizacao || 'simples') === 'simples') return 'EM';
  return config?.avancado_usa_utilizacao === true ? 'AEMR' : 'EMR';
}

/** "EM 14" · "AEMR 26,2" */
export function rotuloScore(score, modelo) {
  if (score == null) return null;
  const numero = Number(score).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return modelo ? `${modelo} ${numero}` : numero;
}

/** Quantos equipamentos caem em cada faixa, com N no ranking e os cortes informados. */
export function contarFaixas(total, cortes) {
  const n = Math.max(total || 0, 0);
  const criticaN = Math.ceil((n * Number(cortes.critica)) / 100);
  const altaN = Math.ceil((n * Number(cortes.alta)) / 100);
  const mediaN = Math.ceil((n * Number(cortes.media)) / 100);
  const critica = Math.min(criticaN, n);
  const alta = Math.max(Math.min(altaN, n) - critica, 0);
  const media = Math.max(Math.min(mediaN, n) - critica - alta, 0);
  const baixa = Math.max(n - critica - alta - media, 0);
  return { total: n, critica, alta, media, baixa, limites: { criticaN, altaN, mediaN } };
}

/** Equipamentos que participam do ranking. */
export function equipamentosDoRanking(equipamentos = [], config) {
  const modeloAtivo = modeloDoScore(config);
  return (equipamentos || []).filter(
    (e) =>
      e.status_priorizacao === 'calculado' &&
      e.operational_status !== 'Inativo/Baixado' &&
      e.prioridade_score != null &&
      (e.prioridade_modelo || modeloAtivo) === modeloAtivo
  );
}

/** Prévia das faixas com os scores atuais (não grava nada). */
export function previaFaixas(equipamentos = [], config) {
  const doRanking = equipamentosDoRanking(equipamentos, config);
  const pendentes = (equipamentos || []).filter(
    (e) => e.status_priorizacao === 'pendente_atualizacao'
  ).length;
  return { ...contarFaixas(doRanking.length, cortesDe(config)), pendentes };
}

function comparar(a, b, corretivas) {
  const score = (b.prioridade_score ?? -Infinity) - (a.prioridade_score ?? -Infinity);
  if (score !== 0) return score;
  const crit = (CRITICALITY_WEIGHT[b.criticality] || 0) - (CRITICALITY_WEIGHT[a.criticality] || 0);
  if (crit !== 0) return crit;
  const corretiva = (corretivas[b.id] || 0) - (corretivas[a.id] || 0);
  if (corretiva !== 0) return corretiva;
  return (a.codigo_equipamento || '').localeCompare(b.codigo_equipamento || '', 'pt-BR');
}

/**
 * Ranking e faixas: posição 1..N e quartis pelos cortes configurados.
 * Equipamentos empatados no score ficam na faixa do primeiro colocado entre eles.
 */
export function montarRanking(equipamentos = [], config, corretivas = {}) {
  const modelo = modeloDoScore(config);
  const cortes = cortesDe(config);
  const ordenados = [...equipamentosDoRanking(equipamentos, config)].sort((a, b) =>
    comparar(a, b, corretivas)
  );
  const { limites, total } = contarFaixas(ordenados.length, cortes);
  const itens = ordenados.map((eq, i) => {
    const posicao = i + 1;
    let faixa =
      posicao <= Math.min(limites.criticaN, total)
        ? 'Crítica'
        : posicao <= Math.min(limites.altaN, total)
          ? 'Alta'
          : posicao <= Math.min(limites.mediaN, total)
            ? 'Média'
            : 'Baixa';
    if (i > 0 && ordenados[i - 1].prioridade_score === eq.prioridade_score) faixa = itens[i - 1].faixa;
    return {
      id: eq.id,
      prioridade_posicao: posicao,
      prioridade_faixa: faixa,
      prioridade_alta:
        modelo === 'EM'
          ? (eq.prioridade_score ?? 0) >= LIMIAR_PRIORIDADE_ALTA
          : faixa === 'Crítica' || faixa === 'Alta',
    };
  });
  const porId = {};
  itens.forEach((item) => { porId[item.id] = item; });
  return { total, limites, itens, porId };
}

/** Corretivas abertas nos últimos 12 meses, por equipamento (desempate do ranking). */
export async function contarCorretivas12m() {
  const corte = subMonths(new Date(), 12).toISOString();
  const resultado = await base44.entities.ServiceOrder.aggregate({
    query: { type: 'Corretiva', open_date: { $gte: corte } },
    groupBy: 'equipment_id',
  });
  const mapa = {};
  (resultado?.rows || []).forEach((linha) => {
    if (linha?.equipment_id) mapa[linha.equipment_id] = linha.count || 0;
  });
  return mapa;
}

const iguais = (a, b) => (a ?? null) === (b ?? null);

/**
 * Recalcula score, modelo, posição e faixa de TODOS os equipamentos e grava o que mudou.
 * Usado ao criar/editar/baixar equipamento e ao mudar modelo, utilização ou cortes.
 */
export async function recalcularPrioridades(config) {
  const [equipamentos, corretivas] = await Promise.all([
    base44.entities.Equipment.list(),
    contarCorretivas12m(),
  ]);

  const avaliados = equipamentos.map((eq) => ({ ...eq, ...computePriorizacao(eq, config) }));
  const ranking = montarRanking(avaliados, config, corretivas);

  let pendentes = 0;
  const atualizacoes = [];
  avaliados.forEach((eq) => {
    if (eq.status_priorizacao === 'pendente_atualizacao') pendentes += 1;
    const item = ranking.porId[eq.id];
    const dados = {
      status_priorizacao: eq.status_priorizacao,
      prioridade_score: eq.prioridade_score,
      prioridade_modelo: eq.prioridade_modelo,
      prioridade_posicao: item?.prioridade_posicao ?? null,
      prioridade_faixa: item?.prioridade_faixa ?? null,
      prioridade_alta: item?.prioridade_alta ?? false,
    };
    const original = equipamentos.find((o) => o.id === eq.id) || {};
    const mudou = Object.entries(dados).some(([campo, valor]) => !iguais(original[campo], valor));
    if (mudou) atualizacoes.push({ id: eq.id, ...dados });
  });

  if (atualizacoes.length) await base44.entities.Equipment.bulkUpdate(atualizacoes);

  return {
    calculados: equipamentos.length - pendentes,
    pendentes,
    atualizados: atualizacoes.length,
  };
}