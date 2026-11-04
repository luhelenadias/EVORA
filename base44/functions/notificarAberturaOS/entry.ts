import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { APP_URL, formatarQuando } from '../../shared/notificacaoEmail.ts';

/**
 * Confirmação de abertura de chamado para quem abriu a OS.
 * Disparada pela tela de Chamados logo após criar o registro.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return Response.json({ error: 'order_id é obrigatório' }, { status: 400 });

    const os = await base44.asServiceRole.entities.ServiceOrder
      .get(order_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!os) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });

    // Quem abre o próprio chamado ou a equipe que o registra para alguém.
    const podeNotificar = os.requester_id === user.id || ['admin', 'gestor', 'tecnico'].includes(user.role);
    if (!podeNotificar) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let destinatario = user.email;
    let nome = os.requester_name || user.full_name || '';
    if (os.requester_id && os.requester_id !== user.id) {
      const solicitante = await base44.asServiceRole.entities.User.get(os.requester_id).catch(() => null);
      if (solicitante?.email) {
        destinatario = solicitante.email;
        nome = solicitante.full_name || nome;
      }
    }

    const envio = await base44.integrations.Core.SendEmail({
      to: destinatario,
      template_name: 'ChamadoAberto',
      category: 'transactional',
      variables: {
        nome: nome || 'colega',
        codigo: os.code || `OS-${order_id.substring(0, 6)}`,
        equipamento: os.equipment_name || '—',
        setor: os.sector || '—',
        tipo: os.type || '—',
        prioridade: os.priority || '—',
        rota: os.rota_atendimento || 'Equipe interna',
        aberto_em: formatarQuando(os.open_date || new Date().toISOString()),
        link: `${APP_URL}/chamados`,
      },
    });

    if (envio && envio.success === false) {
      return Response.json({
        enviado: false,
        destinatario,
        codigo: os.code || '',
        motivo: envio.reason || envio.message || 'Envio bloqueado pelo serviço de e-mail',
      });
    }

    return Response.json({ enviado: true, destinatario, codigo: os.code || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}