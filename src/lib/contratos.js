import { addMonths, differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Perfis que podem ver o PDF e os valores do contrato (mesmo sistema de perfis do app).
export const PERFIS_CONTRATO = ['admin', 'gestor'];
export const podeVerContrato = (role) => PERFIS_CONTRATO.includes(role);

/** Janela de antecedência do alerta de renovação. */
export const DIAS_ALERTA_RENOVACAO = 60;

export const FREQUENCIAS = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];
export const SERVICOS = ['Manutenção Preventiva', 'Manutenção Corretiva', 'Peças', 'Calibração'];

/** Campos do contrato editáveis na tela, com o tipo de entrada de cada um. */
export const CAMPOS_CONTRATO = [
  { key: 'supplier_name', label: 'Fornecedor', tipo: 'texto' },
  { key: 'cnpj', label: 'CNPJ', tipo: 'texto' },
  { key: 'contract_number', label: 'Nº do contrato', tipo: 'texto' },
  { key: 'start_date', label: 'Início da vigência', tipo: 'data' },
  { key: 'end_date', label: 'Fim da vigência', tipo: 'data' },
  { key: 'monthly_value', label: 'Valor mensal (R$)', tipo: 'numero' },
  { key: 'total_value', label: 'Valor total (R$)', tipo: 'numero' },
  { key: 'preventive_frequency', label: 'Preventiva inclusa', tipo: 'opcao', opcoes: FREQUENCIAS },
  { key: 'included_services', label: 'Serviços inclusos', tipo: 'multiopcao', opcoes: SERVICOS },
  { key: 'sla_response_hours', label: 'SLA de resposta (horas)', tipo: 'numero' },
  { key: 'sla_resolution_hours', label: 'SLA de resolução (horas)', tipo: 'numero' },
  { key: 'warranty_months', label: 'Garantia (meses)', tipo: 'numero' },
  { key: 'warranty_terms', label: 'Termos de garantia', tipo: 'texto_longo' },
];

/** Chaves que podem aparecer marcadas como "revisar". */
export const CHAVES_REVISAO = [...CAMPOS_CONTRATO.map((c) => c.key), 'series_no_contrato'];

const campoPorChave = (key) => CAMPOS_CONTRATO.find((c) => c.key === key);

/** Converte dd/mm/aaaa, dd.mm.aa ou ISO em aaaa-mm-dd. Devolve '' quando não reconhece. */
export function dataIso(valor) {
  if (!valor) return '';
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const partes = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!partes) return '';
  const [, dia, mes, ano] = partes;
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
  return `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export function diasParaVencer(end_date) {
  if (!end_date) return null;
  try {
    return differenceInDays(parseISO(end_date), new Date());
  } catch {
    return null;
  }
}

/** Status do contrato pela vigência. Cancelado é sempre manual e prevalece. */
export function statusPorVigencia(contrato) {
  if (contrato?.status === 'Cancelado') return 'Cancelado';
  const dias = diasParaVencer(contrato?.end_date);
  if (dias === null) return contrato?.status || 'Ativo';
  if (dias < 0) return 'Vencido';
  if (dias <= DIAS_ALERTA_RENOVACAO) return 'Vencendo';
  return 'Ativo';
}

export function formatarData(iso) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

export function formatarMoeda(valor) {
  if (valor == null || valor === '') return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const vazio = (valor) => valor == null || valor === '' || (Array.isArray(valor) && valor.length === 0);

/** Valor pronto para exibição, de acordo com o tipo do campo. */
export function rotuloValor(key, valor) {
  if (vazio(valor)) return '—';
  if (Array.isArray(valor)) return valor.join(', ');
  if (key === 'monthly_value' || key === 'total_value') return formatarMoeda(valor);
  if (campoPorChave(key)?.tipo === 'data') return formatarData(valor);
  return String(valor);
}

const comparavel = (valor) => {
  if (Array.isArray(valor)) return JSON.stringify([...valor].sort());
  return vazio(valor) ? '' : String(valor);
};

// ── Extração por IA ─────────────────────────────────────────────────
const MAPA_EXTRAIDO = {
  fornecedor: 'supplier_name',
  cnpj: 'cnpj',
  numero_contrato: 'contract_number',
  vigencia_inicio: 'start_date',
  vigencia_fim: 'end_date',
  valor_mensal: 'monthly_value',
  valor_total: 'total_value',
  periodicidade_preventiva: 'preventive_frequency',
  servicos_inclusos: 'included_services',
  sla_resposta_horas: 'sla_response_hours',
  sla_resolucao_horas: 'sla_resolution_hours',
  termos_garantia: 'warranty_terms',
  garantia_meses: 'warranty_months',
  numeros_serie: 'series_no_contrato',
};

function servicoPadrao(texto) {
  const t = String(texto || '').toLowerCase();
  if (t.includes('prevent')) return 'Manutenção Preventiva';
  if (t.includes('corretiv')) return 'Manutenção Corretiva';
  if (t.includes('calibra')) return 'Calibração';
  if (t.includes('peça') || t.includes('peca') || t.includes('insumo')) return 'Peças';
  return null;
}

/**
 * Converte a saída da IA no formato usado pela tela: valores já tipados,
 * fontes (página + trecho + certeza) e a lista de chaves a revisar.
 * Nada aqui é aplicado ao contrato — a decisão é sempre do usuário.
 */
export function normalizarExtracao(saida = {}) {
  const valores = {};

  Object.entries(MAPA_EXTRAIDO).forEach(([origem, key]) => {
    const bruto = saida[origem];
    const campo = campoPorChave(key);

    if (campo?.tipo === 'data') {
      const iso = dataIso(bruto);
      if (iso) valores[key] = iso;
    } else if (campo?.tipo === 'numero') {
      const numero = Number(String(bruto ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
      if (Number.isFinite(numero) && numero > 0) valores[key] = numero;
    } else if (key === 'included_services') {
      const lista = (Array.isArray(bruto) ? bruto : []).map(servicoPadrao).filter(Boolean);
      if (lista.length) valores[key] = [...new Set(lista)];
    } else if (key === 'series_no_contrato') {
      const lista = (Array.isArray(bruto) ? bruto : []).map((v) => String(v).trim()).filter(Boolean);
      if (lista.length) valores[key] = lista;
    } else if (key === 'preventive_frequency') {
      const frequencia = FREQUENCIAS.find((f) => String(bruto || '').toLowerCase().includes(f.toLowerCase()));
      if (frequencia) valores[key] = frequencia;
    } else if (!vazio(bruto)) {
      const texto = String(bruto).trim();
      if (texto) valores[key] = texto;
    }
  });

  const fontes = (saida.fontes || [])
    .map((fonte) => ({
      campo: MAPA_EXTRAIDO[fonte?.campo] || fonte?.campo,
      pagina: Number(fonte?.pagina) || null,
      trecho: String(fonte?.trecho || '').trim(),
      certeza: ['Alta', 'Média', 'Baixa'].includes(fonte?.certeza) ? fonte.certeza : 'Baixa',
    }))
    .filter((fonte) => fonte.trecho && CHAVES_REVISAO.includes(fonte.campo));

  const revisar = new Set((saida.campos_revisar || []).map((c) => MAPA_EXTRAIDO[c] || c));
  fontes.filter((f) => f.certeza === 'Baixa').forEach((f) => revisar.add(f.campo));
  CHAVES_REVISAO.forEach((key) => {
    if (vazio(valores[key])) revisar.add(key);
  });

  return {
    valores,
    fontes,
    camposRevisar: [...revisar].filter((key) => CHAVES_REVISAO.includes(key)),
    qualidade: saida.qualidade_leitura === 'Ruim' ? 'Ruim' : 'Boa',
  };
}

// ── Séries e garantia ───────────────────────────────────────────────
const chaveSerie = (serie) => String(serie || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

/** Casa as séries do contrato com Equipment.serial_number. Nunca cria equipamento. */
export function casamentoDeSeries(series = [], equipamentos = []) {
  const vistos = new Set();
  const vinculos = [];
  const naoEncontradas = [];

  series.forEach((serie) => {
    const chave = chaveSerie(serie);
    if (!chave || vistos.has(chave)) return;
    vistos.add(chave);
    const equipment = equipamentos.find((e) => chaveSerie(e.serial_number) === chave);
    if (equipment) vinculos.push({ serie, equipment });
    else naoEncontradas.push(serie);
  });

  return { vinculos, naoEncontradas };
}

/**
 * Fim da garantia a partir da entrega/instalação do equipamento.
 * Sem installation_date não há como calcular: devolve null (fica "revisar").
 */
export function garantiaFim(equipment, meses) {
  if (!equipment?.installation_date || !meses) return null;
  try {
    return format(addMonths(parseISO(equipment.installation_date), Number(meses)), 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

// ── Histórico ───────────────────────────────────────────────────────
/** Registros de alteração para os campos que mudaram entre o salvo e o novo. */
export function historicoDeAlteracoes(antes, depois, autor) {
  const agora = new Date().toISOString();
  const registro = (campo, key, anterior, novo) => ({
    campo,
    chave: key,
    valor_anterior: rotuloValor(key, anterior),
    valor_novo: rotuloValor(key, novo),
    alterado_por: autor || 'Usuário',
    alterado_em: agora,
  });

  const registros = CAMPOS_CONTRATO.flatMap(({ key, label }) =>
    comparavel(antes?.[key]) === comparavel(depois?.[key]) ? [] : [registro(label, key, antes?.[key], depois?.[key])]
  );

  if (comparavel(antes?.series_no_contrato) !== comparavel(depois?.series_no_contrato)) {
    registros.push(
      registro('Números de série', 'series_no_contrato', antes?.series_no_contrato, depois?.series_no_contrato)
    );
  }

  return registros;
}

/**
 * Campos que vão para o banco: campos vazios de data/número/opção são omitidos
 * (um '' quebraria a validação do schema) e texto vazio continua limpando o dado.
 */
export function dadosDoContrato(valores) {
  const dados = {};
  CAMPOS_CONTRATO.forEach(({ key, tipo }) => {
    const valor = valores?.[key];
    if (valor === '' && ['data', 'numero', 'opcao'].includes(tipo)) return;
    dados[key] = valor;
  });
  if (Array.isArray(valores?.series_no_contrato)) dados.series_no_contrato = valores.series_no_contrato;
  return dados;
}

/** Valores do contrato prontos para o formulário. */
export function valoresDoContrato(contrato) {
  const valores = {};
  CAMPOS_CONTRATO.forEach(({ key }) => {
    valores[key] = contrato?.[key] ?? (campoPorChave(key)?.tipo === 'multiopcao' ? [] : '');
  });
  valores.series_no_contrato = contrato?.series_no_contrato || [];
  return valores;
}