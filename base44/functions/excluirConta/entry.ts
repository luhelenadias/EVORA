// Exclusão da própria conta pelo usuário (exigência de política do Google Play).
// Remove o cadastro do usuário no app e registra a ação na auditoria.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { montarEntrada } from '../../shared/auditoria.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sessão expirada. Entre novamente para excluir a conta.' }, { status: 401 });

    const corpo = await req.json().catch(() => ({}));
    const motivo = typeof corpo?.motivo === 'string' ? corpo.motivo.trim().slice(0, 300) : '';

    // A instituição não pode ficar sem administrador: o último não exclui a própria conta.
    if (user.role === 'admin') {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      if (admins.length <= 1) {
        return Response.json({
          error: 'Esta é a única conta de administrador. Antes de excluí-la, promova outra pessoa a administrador.',
        }, { status: 409 });
      }
    }

    // O log é gravado antes da exclusão: é o registro de que a conta deixou de existir.
    await base44.asServiceRole.entities.LogAuditoria.create(
      montarEntrada({
        entidade_tipo: 'User',
        entidade_id: user.id,
        entidade_codigo: user.email,
        acao: 'Exclusão de conta',
        origem: 'Usuário',
        motivo: motivo || 'Solicitada pelo próprio usuário',
        valor_anterior: user.role,
        valor_novo: 'conta excluída',
      }, user)
    );

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}