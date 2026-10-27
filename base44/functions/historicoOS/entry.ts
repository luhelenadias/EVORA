import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PERFIS_COM_ACESSO_TOTAL = ['admin', 'gestor'];

/**
 * Linha do tempo de uma ordem de serviço. A leitura do log é restrita a
 * admin/gestor na entidade; o técnico recebe o histórico apenas das OS dele
 * (e quem abriu o chamado vê o do próprio chamado).
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return Response.json({ error: 'order_id é obrigatório' }, { status: 400 });

    const order = await base44.asServiceRole.entities.ServiceOrder.get(order_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!order) return Response.json({ error: 'Ordem não encontrada' }, { status: 404 });

    const autorizado =
      PERFIS_COM_ACESSO_TOTAL.includes(user.role) ||
      order.technician_id === user.id ||
      order.requester_id === user.id;
    if (!autorizado) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { items } = await base44.asServiceRole.entities.LogAuditoria.filter(
      { entidade_tipo: 'ServiceOrder', entidade_id: order_id },
      { sort: 'data_hora', limit: 300 }
    );

    return Response.json({
      itens: items || [],
      abertura_registrada: (items || []).some((i) => i.acao === 'Abertura'),
      open_date: order.open_date || null,
      code: order.code || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}