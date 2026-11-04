import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { MOTIVO_PAUSA_PECA, pausaAberta, podeMexerNaPausa, statusDaPausa } from '../../shared/pausas.ts';

/**
 * Pedido de peça dentro da OS.
 * - criar: técnico responsável, gestão ou administração. Peça do catálogo com saldo
 *   não pede pausa; sem saldo (ou peça fora do catálogo) a pausa é opcional, com
 *   padrão "sim", e nasce ligada ao pedido.
 * - atualizar: gestão move Em compra/Chegou/Cancelada; o técnico da OS marca Retirada.
 *   Em "Chegou" o técnico recebe alerta no sino; a retomada é sempre dele.
 */

const URGENCIAS = ['Baixa', 'Média', 'Alta', 'Crítica'];
const STATUS = ['Solicitada', 'Em compra', 'Chegou', 'Retirada', 'Cancelada'];
const DA_GESTAO = ['Em compra', 'Chegou', 'Cancelada'];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;
    const agora = new Date().toISOString();
    const gestao = ['admin', 'gestor'].includes(user.role);

    const log = (ordem: any, dados: any) => db.LogAuditoria.create({
      entidade_tipo: 'ServiceOrder',
      entidade_id: ordem.id,
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

    // ── Criar pedido ───────────────────────────────────────────────
    if ((body?.acao || 'criar') === 'criar') {
      const ordem = await db.ServiceOrder.get(body.service_order_id).catch((e: any) =>
        (e.status === 404 ? null : Promise.reject(e)));
      if (!ordem) return Response.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });

      const responsavel = user.role === 'tecnico' && ordem.technician_id === user.id;
      if (!gestao && !responsavel) {
        return Response.json(
          { error: 'Só o técnico responsável pela OS, a gestão ou a administração pedem peça.' },
          { status: 403 }
        );
      }

      const quantidade = Math.max(Math.round(Number(body.quantidade) || 1), 1);
      const urgencia = URGENCIAS.includes(body.urgencia) ? body.urgencia : 'Média';

      let peca: any = null;
      if (body.spare_part_id) {
        peca = await db.SparePart.get(body.spare_part_id).catch(() => null);
        if (!peca) return Response.json({ error: 'Peça do catálogo não encontrada.' }, { status: 400 });
      }
      const descricaoLivre = String(body.descricao_livre || '').trim();
      if (!peca && !descricaoLivre) {
        return Response.json({ error: 'Descreva a peça ou escolha uma do catálogo.' }, { status: 400 });
      }

      const emEstoque = !!peca && Number(peca.current_stock ?? 0) >= quantidade;
      const nome = peca?.name || descricaoLivre;

      const pedido = await db.PedidoPeca.create({
        service_order_id: ordem.id,
        os_codigo: ordem.code || '',
        equipment_id: ordem.equipment_id || '',
        equipment_name: ordem.equipment_name || '',
        spare_part_id: peca?.id || '',
        descricao_livre: peca ? '' : descricaoLivre,
        quantidade,
        urgencia,
        status: 'Solicitada',
        em_estoque_no_pedido: emEstoque,
        solicitante_id: user.id || '',
        solicitante_nome: user.full_name || user.email || '',
        solicitado_em: agora,
        observacao: String(body.observacao || '').trim(),
        pausa_id: '',
        tecnico_responsavel_id: ordem.technician_id || '',
      });

      // Pausa: só em OS em andamento, e nunca quando o almoxarifado já tem a peça.
      let pausa: any = null;
      let aviso = '';
      const querPausar = body.pausar === undefined ? !emEstoque : !!body.pausar;
      if (querPausar && !emEstoque) {
        if (ordem.status !== 'Em Andamento' || ordem.pausa_ativa || pausaAberta(ordem.pausas || [])) {
          aviso = 'O pedido foi registrado. A OS não está em andamento para ser pausada agora.';
        } else {
          const pausas = [...(ordem.pausas || [])];
          pausa = {
            id: crypto.randomUUID(),
            inicio: agora,
            fim: '',
            motivo: MOTIVO_PAUSA_PECA,
            observacao: String(body.observacao || '').trim() || `Pedido de ${quantidade}× ${nome}`,
            pedido_peca_id: pedido.id,
            usuario_id: user.id || '',
            usuario_nome: user.full_name || user.email || '',
          };
          await db.ServiceOrder.update(ordem.id, {
            pausas: [...pausas, pausa],
            pausa_ativa: true,
            status: statusDaPausa(MOTIVO_PAUSA_PECA),
          });
          await db.PedidoPeca.update(pedido.id, { pausa_id: pausa.id });
        }
      }

      await log(ordem, {
        acao: 'Pedido de peça',
        campo: 'pedido_peca',
        valor_novo: `${quantidade}× ${nome} · urgência ${urgencia}`,
        motivo: [
          emEstoque ? 'Em estoque: o almoxarifado separa a peça' : 'Sem estoque / fora do catálogo',
          pausa ? 'manutenção pausada até a peça chegar' : '',
          String(body.observacao || '').trim(),
        ].filter(Boolean).join(' · '),
      });

      return Response.json({
        ok: true,
        pedido: { ...pedido, pausa_id: pausa?.id || '' },
        em_estoque: emEstoque,
        pausado: !!pausa,
        aviso,
      });
    }

    // ── Atualizar andamento ────────────────────────────────────────
    const pedido = await db.PedidoPeca.get(body.pedido_id).catch((e: any) =>
      (e.status === 404 ? null : Promise.reject(e)));
    if (!pedido) return Response.json({ error: 'Pedido de peça não encontrado' }, { status: 404 });

    const ordem = await db.ServiceOrder.get(pedido.service_order_id).catch(() => null);
    if (!ordem) return Response.json({ error: 'Ordem de serviço do pedido não encontrada' }, { status: 404 });

    const novoStatus = body.status;
    if (!STATUS.includes(novoStatus)) return Response.json({ error: 'Status inválido.' }, { status: 400 });
    if (novoStatus === pedido.status) return Response.json({ ok: true, pedido });

    const responsavel = user.role === 'tecnico' && ordem.technician_id === user.id;
    if (!gestao) {
      if (novoStatus !== 'Retirada' || !responsavel) {
        return Response.json(
          { error: novoStatus === 'Retirada' ? 'Só o técnico responsável pela OS marca a retirada.' : 'Somente administração e gestão movem o pedido.' },
          { status: 403 }
        );
      }
    }
    const dados: any = { status: novoStatus };
    if (novoStatus === 'Em compra') {
      dados.em_compra_em = agora;
      const previsao = String(body.previsao_chegada || '').trim();
      if (previsao) dados.previsao_chegada = previsao.slice(0, 10);
    }
    if (novoStatus === 'Chegou') dados.chegou_em = agora;
    if (novoStatus === 'Retirada') dados.retirada_em = agora;
    if (body.observacao !== undefined) dados.observacao = String(body.observacao || '').trim();

    const atualizado = await db.PedidoPeca.update(pedido.id, dados);
    const nome = pedido.spare_part_id
      ? (await db.SparePart.get(pedido.spare_part_id).catch(() => null))?.name || pedido.descricao_livre || 'peça'
      : pedido.descricao_livre || 'peça';

    // Peça chegou: avisa o técnico da OS (a retomada é dele, nunca automática).
    if (novoStatus === 'Chegou') {
      await db.Alerta.create({
        tipo: 'Peça chegou',
        nivel: 'Atenção',
        titulo: `A peça chegou: ${nome} — ${ordem.code || 'OS'}`,
        mensagem: `Pedido de ${pedido.quantidade}× ${nome}. Retome a manutenção quando retirar a peça.`,
        entidade_tipo: 'ServiceOrder',
        entidade_id: ordem.id,
        entidade_codigo: ordem.code || '',
        equipment_id: ordem.equipment_id || '',
        tecnico_id: ordem.technician_id || '',
        destinatario_perfis: ['admin', 'gestor', 'tecnico'],
        status: 'Novo',
        resolucao: 'Manual',
        prazo_referencia: agora,
        dias_referencia: 0,
      }).catch(() => {});
    }

    // Retirada de peça do catálogo: entra nas peças utilizadas da OS (sem baixar estoque aqui).
    let incluidaNaOS = false;
    if (novoStatus === 'Retirada' && body.incluir_na_os && pedido.spare_part_id) {
      const partes = [...(ordem.parts_used || [])];
      const existente = partes.find((parte: any) => parte.spare_part_id === pedido.spare_part_id);
      if (existente) existente.quantity = Number(existente.quantity || 0) + Number(pedido.quantidade || 0);
      else {
        partes.push({
          spare_part_id: pedido.spare_part_id,
          name: nome,
          quantity: Number(pedido.quantidade) || 1,
          cost: Number((await db.SparePart.get(pedido.spare_part_id).catch(() => null))?.unit_cost) || 0,
        });
      }
      await db.ServiceOrder.update(ordem.id, { parts_used: partes });
      incluidaNaOS = true;
    }

    await log(ordem, {
      acao: 'Atualização de pedido de peça',
      campo: 'status',
      valor_anterior: pedido.status,
      valor_novo: novoStatus,
      motivo: [
        `Pedido ${pedido.quantidade}× ${nome}`,
        dados.previsao_chegada ? `previsão ${dados.previsao_chegada}` : '',
        incluidaNaOS ? 'peça incluída nas peças utilizadas da OS' : '',
      ].filter(Boolean).join(' · '),
    });

    return Response.json({ ok: true, pedido: atualizado, incluida_na_os: incluidaNaOS });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha no pedido de peça' }, { status: 500 });
  }
}