/**
 * Motor de regras dos alertas automáticos.
 * Funções puras: recebem os dados já carregados e devolvem a lista de alertas
 * que deveriam existir agora. Quem grava é a função verificarAlertas.
 */

export const TIPOS_ALERTA = [
  'Contrato vencendo',
  'Contrato vencido',
  'Preventiva próxima',
  'Preventiva atrasada',
  'Preventiva muito atrasada',
  'SLA em risco',
  'SLA estourado',
  'Estoque baixo',
  'OS sem técnico',
  'Chamado parado',
  'Garantia vencendo',
  'Calibração vencida',
];

/** Tipos ligados por padrão (garantia e calibração começam desligados). */
export const ALERTAS_ATIVOS_PADRAO = [
  'Contrato vencendo',
  'Contrato vencido',
  'Preventiva próxima',
  'Preventiva atrasada',
  'Preventiva muito atrasada',
  'SLA em risco',
  'SLA estourado',
  'Estoque baixo',
  'OS sem técnico',
  'Chamado parado',
];

/** Roteamento por perfil: quem vê cada tipo de alerta. */
export const DESTINATARIOS = {
  'Contrato vencendo': ['admin', 'gestor'],
  'Contrato vencido': ['admin', 'gestor'],
  'Preventiva próxima': ['admin', 'tecnico'],
  'Preventiva atrasada': ['admin', 'tecnico'],
  'Preventiva muito atrasada': ['admin', 'gestor', 'tecnico'],
  'SLA em risco': ['admin', 'gestor', 'tecnico'],
  'SLA estourado': ['admin', 'gestor', 'tecnico'],
  'Estoque baixo': ['admin', 'gestor'],
  'OS sem técnico': ['admin', 'gestor'],
  'Chamado parado': ['admin', 'gestor', 'tecnico'],
  'Garantia vencendo': ['admin', 'gestor'],
  'Calibração vencida': ['admin', 'gestor'],
};

/** Mesma regra da tela: contrato entra em "Vencendo" a 60 dias do fim. */
export const DIAS_VENCENDO = 60;

export const CONFIG_PADRAO = {
  alerta_contrato_dias: [90, 60, 30],
  alerta_preventiva_antecedencia_dias: 7,
  alerta_preventiva_muito_atrasada_dias: 30,
  alerta_sla_risco_pct: 80,
  alerta_chamado_parado_dias: 5,
  alertas_ativos: ALERTAS_ATIVOS_PADRAO,
};

const MS_DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
export const STATUS_AGUARDANDO = ['Aguardando Peça', 'Aguardando Fornecedor', 'Pendente'];

/** Alerta único que agrupa as OS abertas sem técnico responsável. */
export const SEM_TECNICO_ID = 'os-sem-tecnico';

/** Chave de deduplicação: um alerta por tipo + registro + nível. */
export function chaveAlerta(tipo, entidadeId, nivel) {
  return `${tipo}|${entidadeId}|${nivel}`;
}

function diaUtc(valor) {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Dias inteiros de `de` até `ate` (positivo = futuro). */
export function diasEntre(de, ate) {
  const a = diaUtc(de);
  const b = diaUtc(ate);
  if (a === null || b === null) return null;
  return Math.round((b - a) / MS_DIA);
}

function paraIso(valor) {
  if (!valor) return undefined;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function dataBr(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dataHoraBr(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Faixas de antecedência do contrato: o corte mais próximo é Urgente, o mais
 * distante é Informativo e os intermediários são Atenção (90/60/30 por padrão).
 */
export function faixasDeAntecedencia(valores) {
  const lista = (Array.isArray(valores) && valores.length ? valores : CONFIG_PADRAO.alerta_contrato_dias)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!lista.length) return [];
  return lista.map((dias, i) => ({
    dias,
    nivel: lista.length === 1 ? 'Informativo' : i === 0 ? 'Urgente' : i === lista.length - 1 ? 'Informativo' : 'Atenção',
  }));
}

/** Faixa em que `dias` restantes se encaixam (a mais próxima que ainda cabe). */
export function faixaParaDias(dias, valores) {
  return faixasDeAntecedencia(valores).find((faixa) => dias <= faixa.dias) || null;
}

function contratoVigente(contrato, agora) {
  if (contrato.status === 'Cancelado') return false;
  const fim = diasEntre(agora, contrato.end_date);
  return fim !== null && fim >= 0;
}

/**
 * Lista de alertas desejados no momento.
 * @returns Array<{tipo, nivel, entidade_tipo, entidade_id, entidade_codigo, equipment_id, tecnico_id, titulo, mensagem, prazo_referencia, dias_referencia, destinatario_perfis}>
 */
export function gerarAlertas({ config, contratos = [], equipamentos = [], ordens = [], pecas = [], agora = new Date() }) {
  const cfg = { ...CONFIG_PADRAO, ...(config || {}) };
  const ativos = Array.isArray(cfg.alertas_ativos) ? cfg.alertas_ativos : CONFIG_PADRAO.alertas_ativos;
  const lista = [];

  const add = (alerta) => {
    if (!ativos.includes(alerta.tipo)) return;
    lista.push({ ...alerta, destinatario_perfis: DESTINATARIOS[alerta.tipo] || ['admin'] });
  };

  const equipamentoPorId = new Map(equipamentos.map((e) => [e.id, e]));
  const contratosPorEquipamento = new Map();
  contratos.forEach((c) => {
    (c.covered_equipment_ids || []).forEach((id) => {
      if (!contratosPorEquipamento.has(id)) contratosPorEquipamento.set(id, []);
      contratosPorEquipamento.get(id).push(c);
    });
  });

  // ── Contratos ──────────────────────────────────────────────────
  for (const contrato of contratos) {
    if (contrato.status === 'Cancelado' || !contrato.end_date) continue;
    const dias = diasEntre(agora, contrato.end_date);
    if (dias === null) continue;
    const codigo = contrato.contract_number || contrato.id;
    const fornecedor = contrato.supplier_name ? ` — ${contrato.supplier_name}` : '';
    const base = {
      entidade_tipo: 'Contract',
      entidade_id: contrato.id,
      entidade_codigo: contrato.contract_number,
      prazo_referencia: paraIso(contrato.end_date),
      dias_referencia: dias,
    };

    if (dias < 0) {
      add({
        ...base,
        tipo: 'Contrato vencido',
        nivel: 'Urgente',
        titulo: `Contrato ${codigo} vencido`,
        mensagem: `Venceu em ${dataBr(contrato.end_date)}${fornecedor} (${Math.abs(dias)} dia(s) de atraso).`,
      });
      continue;
    }

    const faixa = faixaParaDias(dias, cfg.alerta_contrato_dias);
    if (!faixa) continue;
    add({
      ...base,
      tipo: 'Contrato vencendo',
      nivel: faixa.nivel,
      titulo: `Contrato ${codigo} vence em ${dias} dia(s)`,
      mensagem: `Vigência até ${dataBr(contrato.end_date)}${fornecedor}. Aviso configurado para ${faixa.dias} dias de antecedência.`,
    });
  }

  // ── Preventivas (OS tipo Preventiva por scheduled_date) ────────
  for (const ordem of ordens) {
    if (ordem.type !== 'Preventiva') continue;
    if (!['Novo', 'Em Andamento'].includes(ordem.status)) continue;
    if (!ordem.scheduled_date) continue;
    const dias = diasEntre(agora, ordem.scheduled_date);
    if (dias === null) continue;

    const nome = ordem.equipment_name || equipamentoPorId.get(ordem.equipment_id)?.name || 'Equipamento';
    const base = {
      entidade_tipo: 'ServiceOrder',
      entidade_id: ordem.id,
      entidade_codigo: ordem.code,
      equipment_id: ordem.equipment_id,
      tecnico_id: ordem.technician_id,
      prazo_referencia: paraIso(ordem.scheduled_date),
      dias_referencia: dias,
    };

    if (dias >= 0) {
      if (dias > cfg.alerta_preventiva_antecedencia_dias) continue;
      add({
        ...base,
        tipo: 'Preventiva próxima',
        nivel: 'Informativo',
        titulo: `Preventiva em ${dias} dia(s) — ${nome}`,
        mensagem: `Agendada para ${dataBr(ordem.scheduled_date)}.`,
      });
      continue;
    }

    const atraso = -dias;
    if (atraso > cfg.alerta_preventiva_muito_atrasada_dias) {
      add({
        ...base,
        tipo: 'Preventiva muito atrasada',
        nivel: 'Urgente',
        titulo: `Preventiva ${atraso} dias atrasada — ${nome}`,
        mensagem: `Agendada para ${dataBr(ordem.scheduled_date)} e ainda não concluída.`,
      });
    } else {
      add({
        ...base,
        tipo: 'Preventiva atrasada',
        nivel: 'Atenção',
        titulo: `Preventiva atrasada — ${nome}`,
        mensagem: `Agendada para ${dataBr(ordem.scheduled_date)} (${atraso} dia(s) de atraso).`,
      });
    }
  }

  // ── SLA das ordens em aberto ───────────────────────────────────
  for (const ordem of ordens) {
    if (ordem.status === 'Concluído' || !ordem.open_date) continue;
    const abertura = new Date(ordem.open_date).getTime();
    if (Number.isNaN(abertura)) continue;

    const prazos = [];
    if (ordem.sla_response_deadline) prazos.push({ rotulo: 'primeiro atendimento', deadline: ordem.sla_response_deadline });
    if (ordem.sla_deadline) prazos.push({ rotulo: 'resolução', deadline: ordem.sla_deadline });

    if (!prazos.length) {
      const contrato = (contratosPorEquipamento.get(ordem.equipment_id) || []).find((c) => contratoVigente(c, agora));
      if (contrato?.sla_response_hours)
        prazos.push({ rotulo: 'primeiro atendimento', deadline: new Date(abertura + contrato.sla_response_hours * HORA).toISOString() });
      if (contrato?.sla_resolution_hours)
        prazos.push({ rotulo: 'resolução', deadline: new Date(abertura + contrato.sla_resolution_hours * HORA).toISOString() });
    }
    if (!prazos.length) continue;

    let estourado = null;
    let emRisco = null;
    for (const prazo of prazos) {
      const limite = new Date(prazo.deadline).getTime();
      if (Number.isNaN(limite)) continue;
      const duracao = limite - abertura;
      const consumido = duracao > 0 ? ((agora.getTime() - abertura) / duracao) * 100 : 100;
      if (agora.getTime() > limite) {
        if (!estourado) estourado = { ...prazo, limite, consumido };
      } else if (consumido >= cfg.alerta_sla_risco_pct) {
        if (!emRisco || consumido > emRisco.consumido) emRisco = { ...prazo, limite, consumido };
      }
    }
    if (!estourado && !emRisco) continue;

    const nome = ordem.equipment_name || equipamentoPorId.get(ordem.equipment_id)?.name || 'Equipamento';
    const base = {
      entidade_tipo: 'ServiceOrder',
      entidade_id: ordem.id,
      entidade_codigo: ordem.code,
      equipment_id: ordem.equipment_id,
      tecnico_id: ordem.technician_id,
      dias_referencia: diasEntre(agora, new Date((estourado || emRisco).limite)),
    };

    if (estourado) {
      add({
        ...base,
        tipo: 'SLA estourado',
        nivel: 'Urgente',
        titulo: `SLA estourado — ${nome}`,
        mensagem: `O prazo de ${estourado.rotulo} venceu em ${dataHoraBr(estourado.limite)}.`,
        prazo_referencia: new Date(estourado.limite).toISOString(),
      });
    } else {
      add({
        ...base,
        tipo: 'SLA em risco',
        nivel: 'Atenção',
        titulo: `SLA em risco — ${nome}`,
        mensagem: `${Math.round(emRisco.consumido)}% do prazo de ${emRisco.rotulo} consumido (limite ${dataHoraBr(emRisco.limite)}).`,
        prazo_referencia: new Date(emRisco.limite).toISOString(),
      });
    }
  }

  // ── Estoque, OS sem técnico e chamados parados ─────────────────
  for (const peca of pecas) {
    const atual = Number(peca.current_stock ?? 0);
    const minimo = Number(peca.minimum_stock ?? 0);
    if (!(atual < minimo)) continue;
    add({
      tipo: 'Estoque baixo',
      nivel: atual <= 0 ? 'Urgente' : 'Atenção',
      entidade_tipo: 'SparePart',
      entidade_id: peca.id,
      entidade_codigo: peca.code,
      titulo: `${peca.name}: ${atual} em estoque`,
      mensagem: `Mínimo configurado de ${minimo} unidade(s).`,
      dias_referencia: 0,
    });
  }

  for (const ordem of ordens) {
    if (ordem.status === 'Concluído') continue;
    const nome = ordem.equipment_name || equipamentoPorId.get(ordem.equipment_id)?.name || 'Equipamento';
    const base = {
      entidade_tipo: 'ServiceOrder',
      entidade_id: ordem.id,
      entidade_codigo: ordem.code,
      equipment_id: ordem.equipment_id,
      tecnico_id: ordem.technician_id,
    };

    if (STATUS_AGUARDANDO.includes(ordem.status)) {
      const diasParado = diasEntre(ordem.updated_date || ordem.open_date, agora);
      if (diasParado !== null && diasParado > cfg.alerta_chamado_parado_dias) {
        add({
          ...base,
          tipo: 'Chamado parado',
          nivel: 'Atenção',
          titulo: `Chamado parado há ${diasParado} dias — ${nome}`,
          mensagem: `Situação "${ordem.status}" desde ${dataBr(ordem.updated_date || ordem.open_date)}.`,
          prazo_referencia: paraIso(ordem.updated_date || ordem.open_date),
          dias_referencia: diasParado,
        });
      }
    }
  }

  // ── OS sem técnico: um único alerta agrupado, para não virar enxurrada ──
  const semTecnico = ordens.filter((ordem) => ordem.status === 'Novo' && !ordem.technician_id);
  if (semTecnico.length) {
    const codigos = semTecnico.map((ordem) => ordem.code || ordem.equipment_name || '').filter(Boolean);
    const lista = codigos.slice(0, 6).join(', ');
    add({
      tipo: 'OS sem técnico',
      nivel: 'Atenção',
      entidade_tipo: 'ServiceOrder',
      entidade_id: SEM_TECNICO_ID,
      entidade_codigo: `${semTecnico.length} OS`,
      titulo: `${semTecnico.length} OS sem técnico`,
      mensagem: `Abertas sem responsável: ${lista}${codigos.length > 6 ? ` e mais ${codigos.length - 6}` : ''}.`,
    });
  }

  // ── Garantia e calibração (desligados por padrão) ──────────────
  for (const equipamento of equipamentos) {
    if (equipamento.operational_status === 'Inativo/Baixado') continue;
    const base = {
      entidade_tipo: 'Equipment',
      entidade_id: equipamento.id,
      entidade_codigo: equipamento.codigo_equipamento,
      equipment_id: equipamento.id,
    };

    if (equipamento.warranty_end) {
      const dias = diasEntre(agora, equipamento.warranty_end);
      if (dias !== null && dias >= 0 && dias <= 30) {
        add({
          ...base,
          tipo: 'Garantia vencendo',
          nivel: 'Informativo',
          titulo: `Garantia termina em ${dias} dia(s) — ${equipamento.name}`,
          mensagem: `Fim da garantia em ${dataBr(equipamento.warranty_end)}.`,
          prazo_referencia: paraIso(equipamento.warranty_end),
          dias_referencia: dias,
        });
      }
    }

    if (equipamento.next_calibration_date) {
      const dias = diasEntre(agora, equipamento.next_calibration_date);
      if (dias !== null && dias < 0) {
        add({
          ...base,
          tipo: 'Calibração vencida',
          nivel: 'Atenção',
          titulo: `Calibração vencida — ${equipamento.name}`,
          mensagem: `Prevista para ${dataBr(equipamento.next_calibration_date)} (${Math.abs(dias)} dia(s) de atraso).`,
          prazo_referencia: paraIso(equipamento.next_calibration_date),
          dias_referencia: dias,
        });
      }
    }
  }

  return lista;
}

/** Status do contrato calculado pela vigência (Cancelado continua manual). */
export function statusPorVigenciaContrato(contrato, diasCorte = DIAS_VENCENDO) {
  if (contrato?.status === 'Cancelado') return 'Cancelado';
  const dias = diasEntre(new Date(), contrato?.end_date);
  if (dias === null) return contrato?.status || 'Ativo';
  if (dias < 0) return 'Vencido';
  if (dias <= diasCorte) return 'Vencendo';
  return 'Ativo';
}