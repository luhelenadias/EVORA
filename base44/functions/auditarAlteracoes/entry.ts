import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { CAMPOS_CONTRATO, CAMPOS_OS, chaveDe, texto } from '../../shared/auditoria.ts';

const JANELA_DEDUPE_MS = 3 * 60 * 1000;

/** Ações da OS derivadas dos campos que mudaram no registro. */
function candidatosOS(evento, atual, anterior, campos) {
  const codigo = atual?.code || '';
  const base = { entidade_tipo: 'ServiceOrder', entidade_id: atual?.id, entidade_codigo: codigo, origem: 'Sistema' };

  if (evento === 'create') {
    return [{
      ...base,
      acao: 'Abertura',
      campo: '',
      valor_novo: `${atual?.type || ''} · ${atual?.problem_description || ''}`.trim(),
      motivo: atual?.origin === 'Agendada' ? 'Gerada automaticamente pela periodicidade do equipamento' : '',
      tecnico_atribuido_id: atual?.technician_id || null,
    }];
  }

  const mudou = (f) => campos.includes(f);
  const lista = [];

  if (mudou('status')) {
    const reabertura = anterior?.status === 'Concluído' && atual?.status !== 'Concluído';
    // Início e fechamento já descrevem a transição: não duplica como "mudança de status".
    const coberto =
      (atual?.status === 'Em Andamento' && mudou('start_date')) ||
      (atual?.status === 'Concluído' && mudou('completion_date'));
    if (!coberto) {
      lista.push({
        ...base,
        acao: reabertura ? 'Reabertura' : 'Mudança de status',
        campo: 'status',
        valor_anterior: anterior?.status,
        valor_novo: atual?.status,
      });
    }
  }

  if (mudou('technician_id')) {
    lista.push({
      ...base,
      acao: anterior?.technician_id ? 'Reatribuição' : 'Atribuição',
      campo: 'technician_id',
      valor_anterior: anterior?.technician_name || anterior?.technician_id,
      valor_novo: atual?.technician_name || atual?.technician_id,
      tecnico_atribuido_id: atual?.technician_id || null,
    });
  }

  if (mudou('start_date')) {
    lista.push({
      ...base,
      acao: 'Início do atendimento',
      campo: 'start_date',
      valor_anterior: anterior?.start_date,
      valor_novo: atual?.start_date,
      tecnico_atribuido_id: atual?.technician_id || null,
    });
  }

  if (mudou('completion_date')) {
    lista.push({
      ...base,
      acao: 'Fechamento',
      campo: 'completion_date',
      valor_anterior: anterior?.completion_date,
      valor_novo: atual?.completion_date,
      tecnico_atribuido_id: atual?.technician_id || null,
    });
  }

  if (mudou('parts_used')) {
    lista.push({
      ...base,
      acao: 'Peça utilizada',
      campo: 'parts_used',
      valor_anterior: texto(anterior?.parts_used),
      valor_novo: texto(atual?.parts_used),
      tecnico_atribuido_id: atual?.technician_id || null,
    });
  }

  if (mudou('priority')) {
    lista.push({
      ...base,
      acao: 'Mudança de prioridade',
      campo: 'priority',
      valor_anterior: anterior?.priority,
      valor_novo: atual?.priority,
      motivo: atual?.priority_override_reason || '',
    });
  }

  for (const campo of campos) {
    if (!CAMPOS_OS[campo]) continue;
    lista.push({
      ...base,
      acao: 'Edição de campo',
      campo,
      valor_anterior: texto(anterior?.[campo]),
      valor_novo: texto(atual?.[campo]),
      motivo: `Campo: ${CAMPOS_OS[campo]}`,
    });
  }

  return lista;
}

/** Ações do contrato derivadas dos campos que mudaram. */
function candidatosContrato(evento, atual, anterior, campos) {
  const base = {
    entidade_tipo: 'Contract',
    entidade_id: atual?.id,
    entidade_codigo: atual?.contract_number || '',
    origem: 'Sistema',
  };

  if (evento === 'create') {
    return [{
      ...base,
      acao: 'Edição de campo',
      campo: 'contract_number',
      valor_novo: atual?.contract_number || atual?.supplier_name,
      motivo: 'Contrato cadastrado',
    }];
  }

  const mudou = (f) => campos.includes(f);
  const lista = [];

  if (mudou('documento_atual_url') || mudou('versoes_documento')) {
    const versoes = atual?.versoes_documento || [];
    const vigente = versoes[versoes.length - 1];
    lista.push({
      ...base,
      acao: 'Upload de documento',
      campo: 'versoes_documento',
      valor_novo: vigente ? `${vigente.tipo || 'Nova versão'}${vigente.nota ? ` — ${vigente.nota}` : ''}` : 'Nova versão',
    });
  }

  if (mudou('fontes_extracao') || mudou('extracao_status') || mudou('campos_revisar')) {
    lista.push({
      ...base,
      acao: 'Extração por IA',
      campo: 'fontes_extracao',
      origem: 'IA',
      valor_novo: `${(atual?.fontes_extracao || []).length} campo(s) com fonte no PDF`,
      motivo: `Situação da extração: ${atual?.extracao_status || '—'}`,
    });
  }

  if (mudou('status')) {
    lista.push({
      ...base,
      acao: 'Edição de campo',
      campo: 'status',
      valor_anterior: anterior?.status,
      valor_novo: atual?.status,
      motivo: 'Status recalculado pela vigência do contrato',
    });
  }

  for (const campo of campos) {
    if (!CAMPOS_CONTRATO[campo]) continue;
    if (['status', 'campos_revisar'].includes(campo)) continue;
    lista.push({
      ...base,
      acao: 'Edição de campo',
      campo,
      valor_anterior: texto(anterior?.[campo]),
      valor_novo: texto(atual?.[campo]),
      motivo: `Campo: ${CAMPOS_CONTRATO[campo]}`,
    });
  }

  return lista;
}

/**
 * Automation de auditoria: disparada por gatilho de mudança em ServiceOrder e
 * Contract, grava no log o que foi alterado fora da tela. Entradas humanas
 * (com quem fez) são gravadas pela tela; aqui há deduplicação por ação+campo
 * numa janela curta para não duplicar a mesma ação.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      entity_name,
      entity_id,
      event_type,
      changed_fields = [],
      data,
      old_data,
      payload_too_large,
    } = body || {};

    if (!entity_name || !entity_id || !event_type) {
      return Response.json({ error: 'entity_name, entity_id e event_type são obrigatórios' }, { status: 400 });
    }
    if (!['ServiceOrder', 'Contract'].includes(entity_name)) {
      return Response.json({ error: 'Entidade sem auditoria automática' }, { status: 400 });
    }

    let atual = data;
    if (!atual || payload_too_large) {
      atual = await base44.asServiceRole.entities[entity_name]
        .get(entity_id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    }
    if (!atual) return Response.json({ error: 'Registro não encontrado' }, { status: 404 });

    const campos = Array.isArray(changed_fields) ? changed_fields : [];
    const candidatos = entity_name === 'ServiceOrder'
      ? candidatosOS(event_type, atual, old_data, campos)
      : candidatosContrato(event_type, atual, old_data, campos);

    if (!candidatos.length) return Response.json({ registrados: 0, ignorados: 0 });

    // Deduplica com o que a tela gravou nos últimos minutos.
    const desde = new Date(Date.now() - JANELA_DEDUPE_MS).toISOString();
    const { items: recentes } = await base44.asServiceRole.entities.LogAuditoria.filter(
      { entidade_tipo: entity_name, entidade_id: entity_id, data_hora: { $gte: desde } },
      { sort: '-data_hora', limit: 100 }
    );
    const jaGravado = new Set((recentes || []).map((r) => chaveDe(r.acao, r.campo)));

    let registrados = 0;
    let ignorados = 0;
    const vistos = new Set();
    for (const candidato of candidatos) {
      const chave = chaveDe(candidato.acao, candidato.campo);
      if (jaGravado.has(chave) || vistos.has(chave)) {
        ignorados += 1;
        continue;
      }
      vistos.add(chave);
      await base44.asServiceRole.entities.LogAuditoria.create({
        ...candidato,
        valor_anterior: candidato.valor_anterior != null ? texto(candidato.valor_anterior) : '',
        valor_novo: candidato.valor_novo != null ? texto(candidato.valor_novo) : '',
        motivo: candidato.motivo || '',
        tecnico_atribuido_id: candidato.tecnico_atribuido_id || null,
        usuario_id: null,
        usuario_nome: '',
        usuario_email: '',
        usuario_perfil: null,
        anterior_a_auditoria: false,
        data_hora: new Date().toISOString(),
      });
      registrados += 1;
    }

    return Response.json({ registrados, ignorados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}