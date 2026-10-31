import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { EVENTOS, juntarEvento } from '../../shared/notificacaoEmail.ts';
import { listarTecnicos } from '../../shared/tecnicos.ts';

/** Espera antes do envio: várias mudanças seguidas na mesma OS viram um só e-mail. */
const ESPERA_MINUTOS = 3;

/**
 * Enfileira o aviso ao técnico quando a agenda de uma OS muda.
 * Consolida por (OS, destinatário, papel): mudanças em sequência atualizam o
 * mesmo registro pendente e só a situação final é enviada.
 * Não notifica o técnico de uma mudança que ele mesmo fez.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { service_order_id, evento, antes, depois } = body || {};

    if (!service_order_id) return Response.json({ error: 'service_order_id é obrigatório' }, { status: 400 });
    if (!EVENTOS.includes(evento)) return Response.json({ error: 'evento inválido' }, { status: 400 });

    const ordem = await base44.asServiceRole.entities.ServiceOrder
      .get(service_order_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordem) return Response.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });

    // O responsável pela OS é um usuário (perfil Equipe técnica): o e-mail vem da conta dele.
    const tecnicos = await listarTecnicos(base44);
    const encontrar = (id: string) => (id ? tecnicos.find((t: any) => t.id === id) || null : null);

    const novo = encontrar(depois?.technician_id);
    const antigo = encontrar(antes?.technician_id);
    const houveTroca = !!antigo && (antes?.technician_id || '') !== (depois?.technician_id || '');

    // Quem alterou não recebe aviso da própria mudança.
    const ehProprio = (tecnico: any) => {
      if (!tecnico) return false;
      if (tecnico.id && tecnico.id === user.id) return true;
      const emailTecnico = String(tecnico.email || '').toLowerCase();
      return !!emailTecnico && emailTecnico === String(user.email || '').toLowerCase();
    };

    const destinatarios = [];
    if (novo && !ehProprio(novo)) {
      destinatarios.push({ tecnico: novo, papel: 'Novo responsável' });
    }
    if (houveTroca && antigo && !ehProprio(antigo)) {
      destinatarios.push({ tecnico: antigo, papel: 'Anterior responsável' });
    }

    const comEmail = destinatarios.filter((d) => !!d.tecnico?.email);
    if (!comEmail.length) {
      return Response.json({ enfileirado: 0, motivo: 'Nenhum destinatário a avisar (sem e-mail ou mudança feita pelo próprio técnico)' });
    }

    const config = (await base44.asServiceRole.entities.ConfiguracaoInstituicao.list())[0] || {};
    const agora = new Date();
    const enviarEm = new Date(agora.getTime() + ESPERA_MINUTOS * 60 * 1000).toISOString();

    const pendentes = await base44.asServiceRole.entities.NotificacaoAgenda.filter({
      service_order_id,
      status: 'Pendente',
    });

    const dadosBase = {
      service_order_id,
      service_order_code: ordem.code || '',
      equipment_name: ordem.equipment_name || '',
      sector: ordem.sector || '',
      tipo_ordem: ordem.type || '',
      data_anterior: antes?.scheduled_date || '',
      data_nova: depois?.scheduled_date || '',
      tecnico_anterior_id: houveTroca ? antes?.technician_id || '' : '',
      tecnico_anterior_nome: houveTroca ? antigo?.name || '' : '',
      tecnico_anterior_email: houveTroca ? antigo?.email || '' : '',
      alterado_por: user.full_name || user.email || 'Usuário',
      alterado_por_email: user.email || '',
      alterado_por_id: user.id || '',
      enviar_em: enviarEm,
      status: 'Pendente',
      modo_teste: config?.email_modo_teste !== false,
      tentativas: 0,
      erro: '',
    };

    const criadas = [];
    for (const item of comEmail) {
      const existente = (pendentes || []).find(
        (n: any) => n.tecnico_email === item.tecnico.email && n.papel === item.papel
      );

      if (existente) {
        // Consolida: mantém a data anterior mais antiga e a mudança final.
        await base44.asServiceRole.entities.NotificacaoAgenda.update(existente.id, {
          ...dadosBase,
          evento: juntarEvento(existente.evento, evento),
          data_anterior: existente.data_anterior || dadosBase.data_anterior,
          alterado_por: dadosBase.alterado_por,
        });
        criadas.push(existente.id);
        continue;
      }

      const registro = await base44.asServiceRole.entities.NotificacaoAgenda.create({
        ...dadosBase,
        evento,
        papel: item.papel,
        tecnico_id: item.tecnico.id,
        tecnico_nome: item.tecnico.name || '',
        tecnico_email: item.tecnico.email,
      });
      criadas.push(registro?.id);
    }

    return Response.json({
      enfileirado: criadas.length,
      enviar_em: enviarEm,
      destinatarios: comEmail.map((d) => d.tecnico.email),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}