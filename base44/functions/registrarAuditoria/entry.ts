import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ACOES, ENTIDADES, montarEntrada } from '../../shared/auditoria.ts';

/**
 * Grava uma linha do log de auditoria. A data/hora é sempre a do servidor,
 * nunca a do navegador — o cliente manda apenas o que aconteceu.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entidade_tipo, entidade_id, acao } = body || {};

    if (!entidade_tipo || !entidade_id || !acao) {
      return Response.json({ error: 'entidade_tipo, entidade_id e acao são obrigatórios' }, { status: 400 });
    }
    if (!ENTIDADES.includes(entidade_tipo)) {
      return Response.json({ error: 'entidade_tipo inválido' }, { status: 400 });
    }
    if (!ACOES.includes(acao)) {
      return Response.json({ error: 'acao inválida' }, { status: 400 });
    }

    const entrada = montarEntrada(body, user);
    const registro = await base44.asServiceRole.entities.LogAuditoria.create(entrada);
    return Response.json({ id: registro?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}