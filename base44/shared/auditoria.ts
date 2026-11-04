// Regras compartilhadas do log de auditoria (Ordens de Serviço e Contratos).
// A entidade LogAuditoria define os campos; aqui ficam os vocabulários e os
// rótulos legíveis usados tanto pelas funções do servidor quanto pela tela.

export const ACOES = [
  'Abertura',
  'Atribuição',
  'Reatribuição',
  'Início do atendimento',
  'Mudança de status',
  'Mudança de prioridade',
  'Definição de rota',
  'Alteração de rota',
  'Edição de campo',
  'Peça utilizada',
  'Rascunho de relatório gerado por IA',
  'Relatório confirmado',
  'Fechamento',
  'Reabertura',
  'Cancelamento',
  'Upload de documento',
  'Extração por IA',
  'Notificação ao técnico',
  'Mudança de perfil',
  'Ajuste administrativo',
];

export const ORIGENS = ['Usuário', 'IA', 'Sistema', 'Ajuste administrativo'];

export const PERFIS = ['admin', 'tecnico', 'clinico', 'gestor'];

export const ENTIDADES = [
  'ServiceOrder',
  'Contract',
  'Equipment',
  'SparePart',
  'MaintenancePlan',
  'Acquisition',
  'ConfiguracaoInstituicao',
  'User',
  'LogAuditoria',
];

/** Campos de texto/valor da OS que entram como "Edição de campo". */
export const CAMPOS_OS = {
  type: 'Tipo',
  problem_description: 'Descrição do problema',
  technical_report: 'Laudo técnico',
  causa_falha: 'Causa da falha',
  pendencias: 'Pendências',
  testes_finais: 'Testes finais',
  scheduled_date: 'Agendamento',
  execution_by: 'Execução por',
  total_cost: 'Custo total',
  duracao_total_minutos: 'Duração (min)',
  attachments: 'Anexos',
  transcricao_audio: 'Transcrição do relato',
  priority_override_reason: 'Motivo da prioridade',
  equipment_id: 'Equipamento',
};

/** Campos do contrato que entram como "Edição de campo". */
export const CAMPOS_CONTRATO = {
  supplier_name: 'Fornecedor',
  cnpj: 'CNPJ',
  contract_number: 'Nº do contrato',
  start_date: 'Início da vigência',
  end_date: 'Fim da vigência',
  monthly_value: 'Valor mensal',
  total_value: 'Valor total',
  included_services: 'Serviços inclusos',
  preventive_frequency: 'Preventiva inclusa',
  sla_response_hours: 'SLA de resposta (h)',
  sla_resolution_hours: 'SLA de resolução (h)',
  warranty_months: 'Garantia (meses)',
  warranty_terms: 'Termos de garantia',
  notes: 'Observações',
  covered_equipment_ids: 'Equipamentos cobertos',
  series_no_contrato: 'Números de série',
  series_nao_encontradas: 'Séries não encontradas',
  status: 'Status',
  campos_revisar: 'Campos a revisar',
};

/** Texto legível de qualquer valor gravado. */
export function texto(valor) {
  if (valor === null || valor === undefined || valor === '') return '(vazio)';
  if (Array.isArray(valor)) {
    return valor.length ? valor.map((v) => texto(v)).join(', ') : '(vazio)';
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  return String(valor);
}

/**
 * Monta a entrada já com data_hora do SERVIDOR. Em ações do sistema não há
 * pessoa a identificar; em rascunho de IA mantém-se quem pediu a geração.
 */
export function montarEntrada(dados: any, usuario: any) {
  const origem = ORIGENS.includes(dados.origem) ? dados.origem : 'Usuário';
  const pessoa = origem === 'Sistema' ? null : usuario;
  return {
    entidade_tipo: dados.entidade_tipo,
    entidade_id: dados.entidade_id,
    entidade_codigo: dados.entidade_codigo || '',
    acao: dados.acao,
    origem,
    campo: dados.campo || '',
    valor_anterior: dados.valor_anterior != null ? texto(dados.valor_anterior) : '',
    valor_novo: dados.valor_novo != null ? texto(dados.valor_novo) : '',
    motivo: dados.motivo || '',
    tecnico_atribuido_id: dados.tecnico_atribuido_id || null,
    usuario_id: pessoa?.id || null,
    usuario_nome: pessoa?.full_name || '',
    usuario_email: pessoa?.email || '',
    usuario_perfil: pessoa && PERFIS.includes(usuario?.role) ? usuario.role : null,
    data_hora: new Date().toISOString(),
  };
}

/** Chave de deduplicação entre o log da tela e o log automático. */
export function chaveDe(acao: string, campo: string) {
  return `${acao}|${campo || ''}`;
}