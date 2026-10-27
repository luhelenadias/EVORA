// Regras de exibição dos alertas no app (níveis, agrupamento e perfil).

export const PESO_NIVEL = { Urgente: 3, 'Atenção': 2, Informativo: 1 };

/** Tipos ligados por padrão enquanto a instituição não personaliza (garantia e calibração desligados). */
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

/** Nomes exatos dos tipos (espelham o enum da entidade Alerta). */
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

export const NIVEIS = ['Urgente', 'Atenção', 'Informativo'];

/** Identidade EVORA: coral só para o que exige ação. */
export const NIVEL_UI = {
  Urgente: {
    badge: 'border-transparent bg-accent text-accent-foreground',
    dot: 'bg-accent-foreground',
    borda: 'border-l-accent',
  },
  'Atenção': {
    badge: 'border-accent/50 bg-accent/10 text-accent',
    dot: 'bg-accent',
    borda: 'border-l-accent/50',
  },
  Informativo: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
    borda: 'border-l-border',
  },
};

export const STATUS_ALERTA = ['Novo', 'Visto', 'Adiado', 'Resolvido'];

export const ROTULOS_COLETIVOS = {
  'Contrato vencendo': 'contratos vencendo',
  'Contrato vencido': 'contratos vencidos',
  'Preventiva próxima': 'preventivas próximas',
  'Preventiva atrasada': 'preventivas atrasadas',
  'Preventiva muito atrasada': 'preventivas muito atrasadas',
  'SLA em risco': 'SLAs em risco',
  'SLA estourado': 'SLAs estourados',
  'Estoque baixo': 'peças com estoque baixo',
  'OS sem técnico': 'OS sem técnico',
  'Chamado parado': 'chamados parados',
  'Garantia vencendo': 'garantias vencendo',
  'Calibração vencida': 'calibrações vencidas',
};

/** O alerta é destinado ao perfil? Técnico só vê o que é das suas OS. */
export function alertaVisivel(alerta, role, tecnicoId) {
  if (!alerta || !role) return false;
  const perfis = alerta.destinatario_perfis || [];
  if (!perfis.includes(role)) return false;
  if (role === 'tecnico') return !!tecnicoId && alerta.tecnico_id === tecnicoId;
  return true;
}

/** Em aberto e sem adiamento vigente. */
export function alertaAtivo(alerta) {
  if (!alerta || alerta.status === 'Resolvido') return false;
  if (alerta.adiado_ate && new Date(alerta.adiado_ate) > new Date()) return false;
  return true;
}

/** Tela de origem do alerta. */
export function destinoDoAlerta(alerta) {
  if (!alerta) return '/alertas';
  if (alerta.entidade_tipo === 'Contract') return `/contratos?contrato=${alerta.entidade_id}`;
  if (alerta.entidade_tipo === 'ServiceOrder') return `/manutencoes?os=${alerta.entidade_id}`;
  if (alerta.entidade_tipo === 'SparePart') return '/pecas';
  if (alerta.entidade_tipo === 'Equipment') return `/equipamentos/${alerta.entidade_id}`;
  return '/alertas';
}

export function nivelMaisGrave(itens) {
  return [...itens].sort((a, b) => (PESO_NIVEL[b.nivel] || 0) - (PESO_NIVEL[a.nivel] || 0))[0]?.nivel || 'Informativo';
}

/**
 * Agrupa os alertas do mesmo tipo quando passam de `minimo` — "5 preventivas
 * atrasadas" em vez de cinco linhas soltas.
 */
export function agruparAlertas(itens, minimo = 3) {
  const porTipo = new Map();
  itens.forEach((alerta) => {
    if (!porTipo.has(alerta.tipo)) porTipo.set(alerta.tipo, []);
    porTipo.get(alerta.tipo).push(alerta);
  });

  const grupos = [];
  porTipo.forEach((lista, tipo) => {
    if (lista.length >= minimo) {
      grupos.push({ chave: `tipo-${tipo}`, tipo, itens: lista, nivel: nivelMaisGrave(lista) });
    } else {
      lista.forEach((alerta) => grupos.push({ chave: alerta.id, tipo, itens: [alerta], nivel: alerta.nivel }));
    }
  });

  return grupos.sort(
    (a, b) => (PESO_NIVEL[b.nivel] || 0) - (PESO_NIVEL[a.nivel] || 0) || a.tipo.localeCompare(b.tipo, 'pt-BR')
  );
}