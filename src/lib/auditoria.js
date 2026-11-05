import { base44 } from '@/api/base44Client';

/** Ações do log de auditoria (espelham o enum da entidade LogAuditoria). */
export const ACOES = [
  'Abertura', 'Atribuição', 'Reatribuição', 'Início do atendimento', 'Mudança de status',
  'Mudança de prioridade', 'Definição de rota', 'Alteração de rota',
  'Triagem', 'Devolução ao solicitante', 'Pausa', 'Retomada',
  'Pedido de peça', 'Atualização de pedido de peça', 'Edição de campo',
  'Peça utilizada', 'Rascunho de relatório gerado por IA',
  'Relatório confirmado', 'Fechamento', 'Reabertura', 'Cancelamento', 'Upload de documento',
  'Extração por IA', 'Notificação ao técnico', 'Mudança de perfil', 'Ajuste administrativo',
  'Exclusão de conta',
];

export const ENTIDADES = [
  { valor: 'ServiceOrder', label: 'Ordem de Serviço' },
  { valor: 'Contract', label: 'Contrato' },
  { valor: 'Equipment', label: 'Equipamento' },
  { valor: 'SparePart', label: 'Peça' },
  { valor: 'MaintenancePlan', label: 'Plano de manutenção' },
  { valor: 'Acquisition', label: 'Aquisição' },
  { valor: 'ConfiguracaoInstituicao', label: 'Configuração' },
  { valor: 'User', label: 'Usuário' },
  { valor: 'LogAuditoria', label: 'Auditoria' },
];

export const ORIGENS = ['Usuário', 'IA', 'Sistema', 'Ajuste administrativo'];

const VERBOS = {
  Abertura: 'abriu o chamado',
  Atribuição: 'atribuiu o técnico',
  Reatribuição: 'reatribuiu o técnico',
  'Início do atendimento': 'iniciou o atendimento',
  'Mudança de status': 'mudou o status',
  'Mudança de prioridade': 'mudou a prioridade',
  'Definição de rota': 'definiu a rota de atendimento',
  'Alteração de rota': 'alterou a rota de atendimento',
  Triagem: 'concluiu a triagem',
  'Devolução ao solicitante': 'devolveu o chamado ao solicitante',
  Pausa: 'pausou a manutenção',
  Retomada: 'retomou a manutenção',
  'Pedido de peça': 'pediu peça',
  'Atualização de pedido de peça': 'atualizou o pedido de peça',
  'Edição de campo': 'editou',
  'Peça utilizada': 'registrou peça utilizada',
  'Rascunho de relatório gerado por IA': 'gerou rascunho do relatório por IA',
  'Relatório confirmado': 'confirmou o relatório',
  Fechamento: 'fechou o chamado',
  Reabertura: 'reabriu o chamado',
  Cancelamento: 'cancelou o chamado',
  'Upload de documento': 'enviou novo documento',
  'Extração por IA': 'extraiu dados do PDF por IA',
  'Notificação ao técnico': 'notificou o técnico',
  'Mudança de perfil': 'alterou o perfil',
  'Ajuste administrativo': 'fez ajuste administrativo',
  'Exclusão de conta': 'excluiu a própria conta',
};

/** Rótulos legíveis dos campos citados no log. */
export const ROTULOS_CAMPO = {
  status: 'Status',
  priority: 'Prioridade',
  rota_atendimento: 'Rota de atendimento',
  rota_sugerida: 'Rota sugerida',
  rota_motivo: 'Motivo da rota',
  rota_alterada_motivo: 'Motivo da troca de rota',
  triagem_em: 'Triagem',
  triagem_por_nome: 'Triado por',
  triagem_devolucao_motivo: 'Motivo da devolução',
  pausa_ativa: 'Pausa',
  pausas: 'Pausas',
  pedido_peca: 'Pedido de peça',
  urgencia_percebida: 'Urgência percebida',
  contrato_id: 'Contrato',
  technician_id: 'Técnico',
  start_date: 'Início',
  completion_date: 'Conclusão',
  parts_used: 'Peças',
  type: 'Tipo',
  problem_description: 'Descrição do problema',
  technical_report: 'Laudo técnico',
  causa_falha: 'Causa da falha',
  pendencias: 'Pendências',
  testes_finais: 'Testes finais',
  scheduled_date: 'Agendamento',
  execution_by: 'Execução por',
  total_cost: 'Custo total',
  duracao_total_minutos: 'Duração',
  attachments: 'Anexos',
  transcricao_audio: 'Transcrição do relato',
  priority_override_reason: 'Motivo da prioridade',
  relatorio_audio_em: 'Rascunho de IA',
  equipment_id: 'Equipamento',
  fornecedor: 'Fornecedor',
  supplier_name: 'Fornecedor',
  cnpj: 'CNPJ',
  contract_number: 'Nº do contrato',
  start_date_contrato: 'Início da vigência',
  end_date: 'Fim da vigência',
  monthly_value: 'Valor mensal',
  total_value: 'Valor total',
  included_services: 'Serviços inclusos',
  preventive_frequency: 'Preventiva inclusa',
  sla_response_hours: 'SLA de resposta',
  sla_resolution_hours: 'SLA de resolução',
  warranty_months: 'Garantia',
  warranty_terms: 'Termos de garantia',
  notes: 'Observações',
  covered_equipment_ids: 'Equipamentos cobertos',
  series_no_contrato: 'Números de série',
  series_nao_encontradas: 'Séries não encontradas',
  versoes_documento: 'Versão do PDF',
  documento_atual_url: 'PDF vigente',
  fontes_extracao: 'Extração por IA',
  extracao_status: 'Situação da extração',
  campos_revisar: 'Campos a revisar',
  role: 'Tipo de usuário',
  situacao: 'Situação',
  nome_completo: 'Nome completo',
  exportacao_csv: 'Exportação em CSV',
};

export function rotuloCampo(campo) {
  if (!campo) return '';
  return ROTULOS_CAMPO[campo] || campo;
}

export function quemFez(entrada) {
  if (entrada.origem === 'Sistema') return 'Sistema';
  if (entrada.usuario_nome) return entrada.usuario_nome;
  if (entrada.usuario_email) return entrada.usuario_email;
  return entrada.origem === 'IA' ? 'IA' : 'Usuário';
}

/** "Carlos iniciou o atendimento às 14:20" — o detalhe vem do que mudou. */
export function fraseDaEntrada(entrada) {
  const verbo = VERBOS[entrada.acao] || entrada.acao;
  const quem = quemFez(entrada);
  const detalhe = (() => {
    switch (entrada.acao) {
      case 'Mudança de status':
      case 'Mudança de prioridade':
      case 'Definição de rota':
        return entrada.valor_novo ? `para ${entrada.valor_novo}` : '';
      case 'Alteração de rota':
        return entrada.valor_novo
          ? `de ${entrada.valor_anterior || '—'} para ${entrada.valor_novo}${entrada.motivo ? ` (${entrada.motivo})` : ''}`
          : '';
      case 'Atribuição':
      case 'Reatribuição':
        return entrada.valor_novo ? `${entrada.valor_novo}` : '';
      case 'Triagem':
        return entrada.valor_novo ? `para ${entrada.valor_novo}` : '';
      case 'Devolução ao solicitante':
        return entrada.valor_novo ? `: ${entrada.valor_novo}` : '';
      case 'Pausa':
        return entrada.valor_novo
          ? `por ${entrada.valor_novo}${entrada.motivo ? ` (${entrada.motivo})` : ''}`
          : entrada.motivo || '';
      case 'Retomada':
        return `— ${entrada.valor_novo || 'Em Andamento'}${entrada.motivo ? ` (${entrada.motivo})` : ''}`;
      case 'Pedido de peça':
        return entrada.valor_novo || '';
      case 'Atualização de pedido de peça':
        return entrada.valor_anterior
          ? `de ${entrada.valor_anterior} para ${entrada.valor_novo}`
          : `para ${entrada.valor_novo}`;
      case 'Edição de campo':
        return entrada.campo ? `${rotuloCampo(entrada.campo)}: ${entrada.valor_novo}` : entrada.valor_novo;
      case 'Abertura':
      case 'Ajuste administrativo':
      case 'Peça utilizada':
      case 'Upload de documento':
      case 'Extração por IA':
        return entrada.valor_novo || '';
      default:
        return '';
    }
  })();

  return `${quem} ${verbo}${detalhe ? ` ${detalhe}` : ''}`.trim();
}

/** Resumo cronológico curto: "Beatriz abriu o chamado · Carlos iniciou o atendimento". */
export function resumoDaLinhaDoTempo(entradas = []) {
  return entradas
    .slice()
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))
    .map((e) => fraseDaEntrada(e))
    .join(' · ');
}

/**
 * Registra a ação com data/hora do servidor. A auditoria nunca bloqueia a
 * operação do usuário: se a gravação falhar, a ação já foi concluída.
 */
export async function registrarAuditoria(dados) {
  try {
    await base44.functions.invoke('registrarAuditoria', dados);
  } catch {
    /* a automação do servidor ainda registra a alteração */
  }
}

/** Registra, de uma vez, as mudanças de uma edição de OS. */
export async function registrarAlteracoesDaOS(ordem, alteracoes = []) {
  for (const alteracao of alteracoes) {
    await registrarAuditoria({
      entidade_tipo: 'ServiceOrder',
      entidade_id: ordem.id,
      entidade_codigo: ordem.code || '',
      tecnico_atribuido_id: ordem.technician_id || null,
      ...alteracao,
    });
  }
}

const CAMPOS_EDITAVEIS_OS = [
  'type', 'problem_description', 'technical_report', 'causa_falha', 'pendencias',
  'testes_finais', 'scheduled_date', 'execution_by', 'total_cost', 'attachments',
  'priority_override_reason',
];

const igual = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

/** Diferença entre a OS antes e depois de uma edição, em linhas do log. */
export function alteracoesDaOS(antes, depois) {
  if (!antes || !depois) return [];
  const lista = [];

  if (depois.status && !igual(depois.status, antes.status)) {
    const coberto =
      (depois.status === 'Em Andamento' && depois.start_date && !igual(depois.start_date, antes.start_date)) ||
      (depois.status === 'Concluído' && depois.completion_date && !igual(depois.completion_date, antes.completion_date));
    if (!coberto) {
      lista.push({
        acao: antes.status === 'Concluído' ? 'Reabertura' : 'Mudança de status',
        campo: 'status',
        valor_anterior: antes.status,
        valor_novo: depois.status,
      });
    }
  }

  if (depois.priority && !igual(depois.priority, antes.priority)) {
    lista.push({
      acao: 'Mudança de prioridade',
      campo: 'priority',
      valor_anterior: antes.priority,
      valor_novo: depois.priority,
      motivo: depois.priority_override_reason || '',
    });
  }

  if ('rota_atendimento' in depois && !igual(depois.rota_atendimento || '', antes.rota_atendimento || '')) {
    lista.push({
      acao: antes.rota_atendimento ? 'Alteração de rota' : 'Definição de rota',
      campo: 'rota_atendimento',
      valor_anterior: antes.rota_atendimento || '',
      valor_novo: depois.rota_atendimento || '',
      motivo: depois.rota_alterada_motivo || depois.rota_motivo || '',
    });
  }

  if ('technician_id' in depois && !igual(depois.technician_id || '', antes.technician_id || '')) {
    lista.push({
      acao: antes.technician_id ? 'Reatribuição' : 'Atribuição',
      campo: 'technician_id',
      valor_anterior: antes.technician_name || antes.technician_id || '(não atribuída)',
      valor_novo: depois.technician_name || depois.technician_id || '(não atribuída)',
      tecnico_atribuido_id: depois.technician_id || null,
    });
  }

  if (depois.start_date && !igual(depois.start_date, antes.start_date)) {
    lista.push({
      acao: 'Início do atendimento',
      campo: 'start_date',
      valor_novo: depois.start_date,
      tecnico_atribuido_id: depois.technician_id || antes.technician_id || null,
    });
  }

  if (depois.completion_date && !igual(depois.completion_date, antes.completion_date)) {
    lista.push({ acao: 'Fechamento', campo: 'completion_date', valor_novo: depois.completion_date });
  }

  CAMPOS_EDITAVEIS_OS.forEach((campo) => {
    if (!(campo in depois) || igual(depois[campo], antes[campo])) return;
    lista.push({
      acao: 'Edição de campo',
      campo,
      valor_anterior: antes[campo],
      valor_novo: depois[campo],
      motivo: `Campo: ${rotuloCampo(campo)}`,
    });
  });

  return lista;
}