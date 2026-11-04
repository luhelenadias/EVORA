import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { pausaAberta, temposDaOS } from '../../shared/pausas.ts';

/**
 * Gravação da OS com validação no SERVIDOR (item 5 da Onda 1).
 *
 * A regra de acesso da entidade não restringe campo, então toda gravação
 * sensível passa por aqui:
 * - admin e gestor alteram tudo;
 * - técnico só altera OS designada a ele, e nunca destino, técnico ou prioridade;
 * - clínico só complementa o próprio chamado (descrição, urgência, setor, anexos);
 * - finalizar exige pausa encerrada e grava os dois tempos (reparo ativo e chamado total).
 */

// Campos que definem destino, responsável e prioridade: só admnistração e gestão.
const SENSIVEIS = [
  'technician_id', 'technician_name', 'rota_atendimento', 'rota_sugerida', 'execution_by',
  'fornecedor_nome', 'priority', 'priority_override_reason', 'contrato_id',
  'rota_alterada_motivo', 'rota_motivo', 'triagem_em', 'triagem_por_id', 'triagem_por_nome',
  'triagem_devolucao_motivo',
];

// Campos de execução da manutenção: equipe técnica (designada) e gestão.
const EXECUCAO = [
  'status', 'start_date', 'completion_date', 'technical_report', 'causa_falha', 'testes_finais',
  'pendencias', 'parts_used', 'total_cost', 'duracao_total_minutos', 'tempo_pausado_minutos',
  'tempo_total_chamado_minutos', 'attachments', 'transcricao_audio', 'relatorio_audio_em',
  'campos_revisar', 'response_time_minutes', 'sla_response_deadline', 'sla_response_status',
  'sla_status', 'sla_deadline', 'supplier_rating', 'type', 'scheduled_date',
];

const ROTULOS = {
  technician_id: 'técnico',
  technician_name: 'técnico',
  rota_atendimento: 'rota de atendimento',
  rota_sugerida: 'rota sugerida',
  execution_by: 'execução',
  fornecedor_nome: 'fornecedor',
  priority: 'prioridade',
  priority_override_reason: 'justificativa de prioridade',
  contrato_id: 'contrato',
};

const igual = (a: any, b: any) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id } = body || {};
    if (!id) return Response.json({ error: 'id é obrigatório' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const ordem = await db.ServiceOrder.get(id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordem) return Response.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });

    // Pausas são gravadas só pela função pausaOS (uma por vez, com auditoria própria).
    const patch: any = { ...((body || {}).patch || {}) };
    delete patch.pausas;
    delete patch.pausa_ativa;

    const alterados = Object.keys(patch).filter((campo) => !igual(patch[campo], ordem[campo]));
    if (!alterados.length) return Response.json({ ok: true, order: ordem, anterior: ordem });

    const role = user.role;
    if (!['admin', 'gestor'].includes(role)) {
      if (role === 'tecnico') {
        if (!ordem.technician_id || ordem.technician_id !== user.id) {
          return Response.json({ error: 'Esta OS não está designada a você.' }, { status: 403 });
        }
      } else if (role === 'clinico') {
        if (!ordem.requester_id || ordem.requester_id !== user.id) {
          return Response.json({ error: 'Você só pode editar os chamados que abriu.' }, { status: 403 });
        }
        const foraDoEscopo = alterados.filter((campo) => EXECUCAO.includes(campo));
        if (foraDoEscopo.length) {
          return Response.json(
            { error: 'A execução da manutenção é registrada pela equipe técnica.' },
            { status: 403 }
          );
        }
      } else {
        return Response.json({ error: 'Sem permissão para alterar esta OS.' }, { status: 403 });
      }

      const sensiveis = alterados.filter((campo) => SENSIVEIS.includes(campo));
      if (sensiveis.length) {
        const nomes = sensiveis.map((campo) => ROTULOS[campo] || campo).join(', ');
        return Response.json(
          { error: `Somente administração e gestão alteram ${nomes}.` },
          { status: 403 }
        );
      }
    }

    // ── Finalização: pausa encerrada e os dois tempos calculados ──
    if (patch.status === 'Concluído') {
      if (ordem.pausa_ativa || pausaAberta(ordem.pausas || [])) {
        return Response.json(
          { error: 'Retome a manutenção antes de finalizar: existe pausa em aberto.' },
          { status: 409 }
        );
      }
      const completion = patch.completion_date
        ? new Date(patch.completion_date).toISOString()
        : new Date().toISOString();
      const tempos = temposDaOS({ ...ordem, ...patch, completion_date: completion });
      patch.completion_date = completion;
      patch.pausa_ativa = false;
      patch.tempo_pausado_minutos = tempos.pausadoMinutos;
      patch.tempo_total_chamado_minutos = tempos.chamadoMinutos;
      patch.duracao_total_minutos = patch.duracao_total_minutos === '' || patch.duracao_total_minutos == null
        ? tempos.reparoMinutos
        : Math.max(Math.round(Number(patch.duracao_total_minutos) || 0), 0);
    }

    const atualizada = await db.ServiceOrder.update(id, patch);
    return Response.json({ ok: true, order: atualizada, anterior: ordem, campos: alterados });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao salvar a OS' }, { status: 500 });
  }
}