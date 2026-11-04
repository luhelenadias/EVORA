import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { montarEmail, conviteCalendario } from '../../shared/notificacaoEmail.ts';

const LOTE = 25;

/**
 * Despacha as notificações de agenda já vencidas (a fila aguarda alguns minutos
 * para consolidar mudanças em sequência). Roda pela automação agendada.
 * Cada envio gera uma entrada no LogAuditoria.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const agora = new Date().toISOString();
    const fila = await base44.asServiceRole.entities.NotificacaoAgenda.filter(
      { status: 'Pendente', enviar_em: { $lte: agora } },
      { limit: LOTE }
    );
    const pendentes: any[] = fila?.items || fila || [];

    if (!pendentes.length) return Response.json({ enviados: 0, erros: 0, ignorados: 0 });

    const config = (await base44.asServiceRole.entities.ConfiguracaoInstituicao.list())[0] || {};
    const modoTeste = config?.email_modo_teste !== false;
    const destinoTeste = config?.email_teste_destino || '';

    let enviados = 0;
    let erros = 0;
    let ignorados = 0;

    for (const notificacao of pendentes) {
      const destinatarioReal = notificacao.tecnico_email || '';

      if (!destinatarioReal) {
        await base44.asServiceRole.entities.NotificacaoAgenda.update(notificacao.id, {
          status: 'Ignorado',
          erro: 'Técnico sem e-mail cadastrado',
          tentativas: (notificacao.tentativas || 0) + 1,
        });
        ignorados += 1;
        continue;
      }

      const destino = modoTeste ? destinoTeste : destinatarioReal;
      if (!destino) {
        await base44.asServiceRole.entities.NotificacaoAgenda.update(notificacao.id, {
          status: 'Ignorado',
          erro: 'Modo teste ligado sem endereço de teste configurado',
          tentativas: (notificacao.tentativas || 0) + 1,
        });
        ignorados += 1;
        continue;
      }

      // Prioridade e problema relatado entram no corpo do e-mail de designação.
      const ordem = await base44.asServiceRole.entities.ServiceOrder
        .get(notificacao.service_order_id)
        .catch(() => null);
      const { assunto, html, texto } = montarEmail(notificacao, {
        modoTeste,
        destinatarioReal,
        ordem,
      });
      const convite = conviteCalendario(notificacao);

      try {
        const resposta = await base44.asServiceRole.integrations.Core.SendEmail({
          to: destino,
          subject: assunto,
          body: html,
          text: texto,
          category: 'transactional',
          ...(convite ? { attachments: [convite] } : {}),
        });

        if (resposta && resposta.success === false) {
          throw new Error(resposta.message || resposta.reason || 'Envio recusado');
        }

        await base44.asServiceRole.entities.NotificacaoAgenda.update(notificacao.id, {
          status: 'Enviado',
          enviado_em: new Date().toISOString(),
          destino_usado: destino,
          modo_teste: modoTeste,
          erro: '',
          tentativas: (notificacao.tentativas || 0) + 1,
        });

        await base44.asServiceRole.entities.LogAuditoria.create({
          entidade_tipo: 'ServiceOrder',
          entidade_id: notificacao.service_order_id,
          entidade_codigo: notificacao.service_order_code || '',
          acao: 'Notificação ao técnico',
          origem: 'Sistema',
          campo: 'scheduled_date',
          valor_anterior: notificacao.data_anterior || '',
          valor_novo: notificacao.data_nova || '',
          motivo: modoTeste
            ? `${notificacao.evento} avisado por e-mail em modo teste (destinatário real: ${destinatarioReal})`
            : `${notificacao.evento} avisado por e-mail`,
          tecnico_atribuido_id: notificacao.tecnico_id || null,
          data_hora: new Date().toISOString(),
        });

        enviados += 1;
      } catch (falha: any) {
        const mensagem = String(falha?.message || falha || 'Falha no envio');
        await base44.asServiceRole.entities.NotificacaoAgenda.update(notificacao.id, {
          status: (notificacao.tentativas || 0) >= 2 ? 'Erro' : 'Pendente',
          erro: mensagem.slice(0, 400),
          tentativas: (notificacao.tentativas || 0) + 1,
          enviar_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        erros += 1;
      }
    }

    return Response.json({ enviados, erros, ignorados, total: pendentes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}