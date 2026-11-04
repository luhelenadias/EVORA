import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { MOTIVOS_PAUSA, minutosPausados, pausaAberta, podeMexerNaPausa, statusDaPausa } from '../../shared/pausas.ts';

/**
 * Pausa e retomada da manutenção.
 * Uma pausa por vez, só em OS em andamento, feita pelo técnico da OS ou pela gestão.
 * A pausa NÃO suspende o SLA: o prazo de resolução continua correndo.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, acao } = body || {};
    if (!id) return Response.json({ error: 'id é obrigatório' }, { status: 400 });
    if (!['pausar', 'retomar'].includes(acao)) {
      return Response.json({ error: 'acao deve ser "pausar" ou "retomar"' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const ordem = await db.ServiceOrder.get(id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordem) return Response.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });

    if (!podeMexerNaPausa(user, ordem)) {
      return Response.json(
        { error: 'Somente o técnico responsável pela OS, a gestão ou a administração pausam a manutenção.' },
        { status: 403 }
      );
    }

    const agora = new Date().toISOString();
    const pausas = Array.isArray(ordem.pausas) ? [...ordem.pausas] : [];
    const aberta = pausaAberta(pausas);
    const pausada = !!ordem.pausa_ativa || !!aberta;

    const log = (dados: any) => db.LogAuditoria.create({
      entidade_tipo: 'ServiceOrder',
      entidade_id: id,
      entidade_codigo: ordem.code || '',
      origem: 'Usuário',
      usuario_id: user.id || null,
      usuario_nome: user.full_name || '',
      usuario_email: user.email || '',
      usuario_perfil: user.role || null,
      tecnico_atribuido_id: ordem.technician_id || null,
      data_hora: agora,
      ...dados,
    });

    if (acao === 'pausar') {
      if (pausada) return Response.json({ error: 'Esta OS já está pausada. Retome antes de pausar de novo.' }, { status: 409 });
      if (ordem.status !== 'Em Andamento') {
        return Response.json(
          { error: `Só é possível pausar uma OS em andamento (esta está em "${ordem.status}").` },
          { status: 409 }
        );
      }
      const motivo = String(body.motivo || '').trim();
      if (!MOTIVOS_PAUSA.includes(motivo)) {
        return Response.json({ error: 'Escolha o motivo da pausa.' }, { status: 400 });
      }

      const pausa = {
        id: crypto.randomUUID(),
        inicio: agora,
        fim: '',
        motivo,
        observacao: String(body.observacao || '').trim(),
        pedido_peca_id: '',
        usuario_id: user.id || '',
        usuario_nome: user.full_name || user.email || '',
      };
      const atualizada = await db.ServiceOrder.update(id, {
        pausas: [...pausas, pausa],
        pausa_ativa: true,
        status: statusDaPausa(motivo),
      });

      await log({
        acao: 'Pausa',
        campo: 'pausa_ativa',
        valor_anterior: ordem.status,
        valor_novo: motivo,
        motivo: pausa.observacao || `Pausa por ${motivo.toLowerCase()}`,
      });

      return Response.json({ ok: true, order: atualizada, pausa });
    }

    // ── Retomar ────────────────────────────────────────────────────
    if (!pausada) return Response.json({ error: 'Esta OS não está pausada.' }, { status: 409 });
    if (ordem.status === 'Concluído') {
      return Response.json({ error: 'A OS já foi concluída.' }, { status: 409 });
    }

    const encerradas = pausas.map((pausa: any) =>
      pausa && pausa.inicio && !pausa.fim ? { ...pausa, fim: agora } : pausa
    );
    const inicioAberto = aberta?.inicio || '';
    const duracao = aberta ? Math.round(minutosPausados([{ inicio: aberta.inicio, fim: agora }], new Date(agora))) : 0;

    const atualizada = await db.ServiceOrder.update(id, {
      pausas: encerradas,
      pausa_ativa: false,
      status: 'Em Andamento',
      tempo_pausado_minutos: Math.round(minutosPausados(encerradas, new Date(agora))),
    });

    await log({
      acao: 'Retomada',
      campo: 'pausa_ativa',
      valor_anterior: aberta?.motivo || 'Pausada',
      valor_novo: 'Em Andamento',
      motivo: duracao ? `Pausa de ${duracao} min (início ${inicioAberto})` : '',
    });

    return Response.json({ ok: true, order: atualizada });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha na pausa da manutenção' }, { status: 500 });
  }
}