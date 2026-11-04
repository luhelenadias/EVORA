import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Triagem da OS corretiva: decide o destino (equipe interna, garantia, contrato ou
 * fornecedor sem contrato), confirma a prioridade e, quando necessário, devolve o
 * chamado a quem abriu. Só admin e gestor executam — a regra vale aqui, no servidor.
 *
 * A OS nasce sem técnico e sem rota (status "Novo" = aguardando triagem). É esta
 * função que grava os campos de destino, o carimbo da triagem (data/hora do
 * servidor) e as entradas correspondentes no log de auditoria.
 */

const ROTAS = ['Garantia', 'Contrato', 'Equipe interna', 'Fornecedor sem contrato'];
const ROTAS_EXTERNAS = ['Garantia', 'Contrato', 'Fornecedor sem contrato'];
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
const PERFIS_TRIAGEM = ['admin', 'gestor'];

/** Status que ainda aceitam triagem ou reabertura (nada foi iniciado). */
const STATUS_TRIAGEM = ['Novo', 'Pendente', 'Aguardando Orçamento'];
const STATUS_TRIAGEM_RETRIAGEM = [
  'Novo',
  'Pendente',
  'Aguardando Orçamento',
  'Aguardando Aprovação',
  'Aguardando Fornecedor',
];

function statusAposTriagem(rota: string) {
  // Escopo enxuto: rota externa registra o fornecedor e aguarda o retorno dele.
  return rota === 'Equipe interna' ? 'Pendente' : 'Aguardando Fornecedor';
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Permissão: quem decide o destino é a gestão, nunca o técnico.
    if (!PERFIS_TRIAGEM.includes(user.role)) {
      return Response.json({ error: 'Somente administração e gestão podem triar chamados.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      service_order_id,
      rota,
      rota_sugerida,
      rota_alterada_motivo,
      motivo,
      contrato_id,
      fornecedor_nome,
      technician_id,
      scheduled_date,
      priority,
      priority_override_reason,
      devolver,
      devolucao_motivo,
    } = body || {};

    if (!service_order_id) return Response.json({ error: 'service_order_id é obrigatório' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const ordem = await db.ServiceOrder.get(service_order_id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordem) return Response.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });

    if (ordem.start_date) {
      return Response.json({ error: 'O atendimento já foi iniciado: a triagem não pode mais ser alterada.' }, { status: 409 });
    }

    const retriagem = !!ordem.triagem_em;
    const aceitos = retriagem ? STATUS_TRIAGEM_RETRIAGEM : STATUS_TRIAGEM;
    if (!aceitos.includes(ordem.status)) {
      return Response.json({ error: `A OS está em "${ordem.status}" e não entra na triagem.` }, { status: 409 });
    }

    const agora = new Date().toISOString();
    const autor = { triagem_por_id: user.id || '', triagem_por_nome: user.full_name || user.email || '' };
    const motivoGeral = String(motivo || '').trim();

    if (retriagem && !motivoGeral) {
      return Response.json({ error: 'Informe o motivo da reabertura da triagem.' }, { status: 400 });
    }

    // ── Devolução ao solicitante: a OS continua "Novo" até ser complementada ──
    if (devolver) {
      const texto = String(devolucao_motivo || motivoGeral || '').trim();
      if (!texto) return Response.json({ error: 'Descreva o que falta para o chamado seguir.' }, { status: 400 });

      const atualizada = await db.ServiceOrder.update(service_order_id, {
        status: 'Novo',
        triagem_devolucao_motivo: texto,
        rota_atendimento: '',
        rota_sugerida: ordem.rota_sugerida || rota_sugerida || '',
        execution_by: 'Equipe Interna',
        technician_id: '',
        technician_name: '',
        fornecedor_nome: '',
        contrato_id: '',
        triagem_em: agora,
        ...autor,
      });

      await db.LogAuditoria.create({
        entidade_tipo: 'ServiceOrder',
        entidade_id: service_order_id,
        entidade_codigo: ordem.code || '',
        acao: 'Devolução ao solicitante',
        origem: 'Usuário',
        campo: 'triagem_devolucao_motivo',
        valor_anterior: ordem.triagem_devolucao_motivo || '',
        valor_novo: texto,
        motivo: texto,
        tecnico_atribuido_id: ordem.technician_id || null,
        usuario_id: user.id || null,
        usuario_nome: user.full_name || '',
        usuario_email: user.email || '',
        usuario_perfil: user.role || null,
        data_hora: agora,
      });

      return Response.json({ ok: true, devolvida: true, order: atualizada, anterior: ordem });
    }

    // ── Destino ────────────────────────────────────────────────────
    if (!ROTAS.includes(rota)) return Response.json({ error: 'Escolha o destino do chamado.' }, { status: 400 });

    const sugestao = ROTAS.includes(rota_sugerida) ? rota_sugerida : ordem.rota_sugerida || '';
    const externa = ROTAS_EXTERNAS.includes(rota);
    const motivoTroca = String(rota_alterada_motivo || motivoGeral || '').trim();

    if (sugestao && rota !== sugestao && !motivoTroca) {
      return Response.json({ error: 'A rota escolhida difere da sugerida: informe o motivo.' }, { status: 400 });
    }

    const fornecedor = externa ? String(fornecedor_nome || '').trim() : '';
    if (externa && !fornecedor) {
      return Response.json({ error: 'Informe o fornecedor responsável pelo atendimento externo.' }, { status: 400 });
    }

    // Técnico: precisa existir e ser da equipe técnica.
    let tecnico: any = null;
    if (!externa) {
      const id = String(technician_id || '').trim();
      if (!id) return Response.json({ error: 'Escolha o técnico responsável.' }, { status: 400 });
      tecnico = await db.User.get(id).catch(() => null);
      if (!tecnico || tecnico.role !== 'tecnico') {
        return Response.json({ error: 'O responsável escolhido não é um usuário da equipe técnica.' }, { status: 400 });
      }
    }

    // Prioridade: a sugestão vem da criticidade; divergir exige justificativa.
    const prioridadeFinal = PRIORIDADES.includes(priority) ? priority : ordem.priority || 'Média';
    const prioridadeSugerida = PRIORIDADES.includes(body?.priority_sugerida)
      ? body.priority_sugerida
      : ordem.priority || 'Média';
    const justificativaPrioridade = String(priority_override_reason || '').trim();
    if (prioridadeFinal !== prioridadeSugerida && !justificativaPrioridade) {
      return Response.json({ error: 'A prioridade difere da sugerida: informe o motivo.' }, { status: 400 });
    }

    const dados: any = {
      rota_atendimento: rota,
      rota_sugerida: sugestao || rota,
      rota_motivo: ordem.rota_motivo || body?.rota_motivo || '',
      rota_alterada_motivo: sugestao && rota !== sugestao ? motivoTroca : '',
      execution_by: externa ? 'Fornecedor Externo' : 'Equipe Interna',
      fornecedor_nome: fornecedor,
      contrato_id: rota === 'Contrato' || rota === 'Garantia' ? String(contrato_id || '').trim() : '',
      technician_id: tecnico?.id || '',
      technician_name: tecnico ? tecnico.nome_completo || tecnico.full_name || tecnico.email || '' : '',
      priority: prioridadeFinal,
      priority_override_reason: prioridadeFinal !== prioridadeSugerida ? justificativaPrioridade : '',
      status: statusAposTriagem(rota),
      triagem_em: agora,
      triagem_devolucao_motivo: '',
      ...autor,
    };

    const dataAgendada = String(scheduled_date || '').trim();
    if (dataAgendada) dados.scheduled_date = new Date(dataAgendada).toISOString();

    const atualizada = await db.ServiceOrder.update(service_order_id, dados);

    // ── Log de auditoria (data/hora do servidor) ───────────────────
    const base = {
      entidade_tipo: 'ServiceOrder',
      entidade_id: service_order_id,
      entidade_codigo: ordem.code || '',
      origem: 'Usuário',
      usuario_id: user.id || null,
      usuario_nome: user.full_name || '',
      usuario_email: user.email || '',
      usuario_perfil: user.role || null,
      tecnico_atribuido_id: tecnico?.id || ordem.technician_id || null,
      data_hora: agora,
    };
    const registros: any[] = [];

    registros.push({
      ...base,
      acao: 'Triagem',
      campo: 'rota_atendimento',
      valor_anterior: ordem.rota_atendimento || '',
      valor_novo: rota,
      motivo: retriagem ? `Reabertura da triagem: ${motivoGeral}` : 'Triagem concluída',
    });

    registros.push({
      ...base,
      acao: sugestao && rota !== sugestao ? 'Alteração de rota' : 'Definição de rota',
      campo: 'rota_atendimento',
      valor_anterior: ordem.rota_atendimento || '',
      valor_novo: rota,
      motivo: sugestao && rota !== sugestao
        ? motivoTroca
        : ordem.rota_motivo || body?.rota_motivo || 'Aceita a rota sugerida pelo sistema',
    });

    if (tecnico && ordem.technician_id !== tecnico.id) {
      registros.push({
        ...base,
        acao: ordem.technician_id ? 'Reatribuição' : 'Atribuição',
        campo: 'technician_id',
        valor_anterior: ordem.technician_name || '',
        valor_novo: dados.technician_name,
        motivo: retriagem ? motivoGeral : rota === 'Equipe interna' ? 'Destino: equipe interna' : '',
      });
    }

    if (prioridadeFinal !== (ordem.priority || '')) {
      registros.push({
        ...base,
        acao: 'Mudança de prioridade',
        campo: 'priority',
        valor_anterior: ordem.priority || '',
        valor_novo: prioridadeFinal,
        motivo: justificativaPrioridade || 'Prioridade confirmada na triagem',
      });
    }

    for (const registro of registros) {
      await db.LogAuditoria.create(registro);
    }

    return Response.json({ ok: true, retriagem, order: atualizada, anterior: ordem });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha na triagem' }, { status: 500 });
  }
}