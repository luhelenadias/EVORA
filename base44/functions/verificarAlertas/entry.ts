import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { chaveAlerta, gerarAlertas, statusPorVigenciaContrato } from '../../shared/alertas.ts';

/**
 * Verificação de alertas automáticos (abertura do app e rotina diária).
 * - cria os alertas que faltam, sem repetir tipo + registro + nível
 * - resolve automaticamente os que perderam a causa
 * - mantém Contract.status calculado pela vigência
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = base44.asServiceRole.entities;
    const [configs, contratos, equipamentos, ordens, pecas, alertas] = await Promise.all([
      db.ConfiguracaoInstituicao.list(),
      db.Contract.list(),
      db.Equipment.list(),
      db.ServiceOrder.list(),
      db.SparePart.list(),
      db.Alerta.list(),
    ]);

    const agora = new Date();
    const config = configs[0] || null;

    const desejados = gerarAlertas({ config, contratos, equipamentos, ordens, pecas, agora });

    // Deduplicação: um alerta por tipo + registro + nível enquanto não resolvido.
    const abertos = new Map();
    alertas
      .filter((a) => a.status !== 'Resolvido')
      .forEach((a) => {
        if (a.chave_dedupe && !abertos.has(a.chave_dedupe)) abertos.set(a.chave_dedupe, a);
      });

    const chavesDesejadas = new Set();
    const novos = [];
    for (const desejado of desejados) {
      const chave = chaveAlerta(desejado.tipo, desejado.entidade_id, desejado.nivel);
      if (chavesDesejadas.has(chave)) continue;
      chavesDesejadas.add(chave);
      if (abertos.has(chave)) continue;
      novos.push({ ...desejado, chave_dedupe: chave, status: 'Novo' });
    }

    const paraResolver = alertas.filter(
      (a) => a.status !== 'Resolvido' && a.chave_dedupe && !chavesDesejadas.has(a.chave_dedupe)
    );

    const emLotes = (itens, tamanho = 100) => {
      const lotes = [];
      for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
      return lotes;
    };

    const inserir = async () => {
      for (const lote of emLotes(novos)) await db.Alerta.bulkCreate(lote);
    };

    const resolver = async () => {
      const agoraIso = agora.toISOString();
      for (const lote of emLotes(paraResolver)) {
        await db.Alerta.bulkUpdate(
          lote.map((a) => ({
            id: a.id,
            status: 'Resolvido',
            resolucao: 'Automática',
            resolvido_em: agoraIso,
          }))
        );
      }
    };

    const contratosParaAtualizar = contratos
      .map((c) => ({
        id: c.id,
        codigo: c.contract_number || '',
        status: statusPorVigenciaContrato(c),
        atual: c.status,
      }))
      .filter((c) => c.status !== c.atual);

    await Promise.all([
      inserir(),
      resolver(),
      contratosParaAtualizar.length
        ? db.Contract.bulkUpdate(contratosParaAtualizar.map(({ id, status }) => ({ id, status })))
        : null,
    ]);

    // Status recalculado pela vigência é ação do sistema: entra no log de auditoria.
    for (const contrato of contratosParaAtualizar) {
      await db.LogAuditoria.create({
        entidade_tipo: 'Contract',
        entidade_id: contrato.id,
        entidade_codigo: contrato.codigo,
        acao: 'Edição de campo',
        origem: 'Sistema',
        campo: 'status',
        valor_anterior: contrato.atual || '',
        valor_novo: contrato.status,
        motivo: 'Status recalculado pela vigência do contrato',
        usuario_id: null,
        usuario_nome: '',
        usuario_email: '',
        usuario_perfil: null,
        anterior_a_auditoria: false,
        data_hora: new Date().toISOString(),
      });
    }

    return Response.json({
      ok: true,
      criados: novos.length,
      resolvidos: paraResolver.length,
      desejados: desejados.length,
      contratosAtualizados: contratosParaAtualizar.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}