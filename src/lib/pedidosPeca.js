/** Regras de exibição e ordenação dos pedidos de peça. */

export const STATUS_PEDIDO = ['Solicitada', 'Em compra', 'Chegou', 'Retirada', 'Cancelada'];

export const URGENCIAS_PEDIDO = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const PESO_URGENCIA = { Crítica: 0, Alta: 1, Média: 2, Baixa: 3 };

export const ESTILO_STATUS = {
  Solicitada: 'border-primary/30 bg-primary/5 text-primary',
  'Em compra': 'border-warning/40 bg-warning/10 text-warning-foreground',
  Chegou: 'border-accent/40 bg-accent/10 text-accent-foreground',
  Retirada: 'border-border bg-muted text-muted-foreground',
  Cancelada: 'border-border bg-muted text-muted-foreground line-through',
};

/** Urgência primeiro (crítica no topo), depois o pedido mais antigo. */
export function ordenarPedidos(pedidos = []) {
  return [...(pedidos || [])].sort((a, b) => {
    const pesoA = PESO_URGENCIA[a.urgencia] ?? 9;
    const pesoB = PESO_URGENCIA[b.urgencia] ?? 9;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return new Date(a.solicitado_em || 0) - new Date(b.solicitado_em || 0);
  });
}

/** Nome da peça: catálogo (com fallback no cache) ou descrição livre. */
export function nomeDaPeca(pedido, pecasById = {}) {
  return pecasById[pedido?.spare_part_id]?.name || pedido?.descricao_livre || 'Peça';
}

export const pedidoAberto = (pedido) => !['Retirada', 'Cancelada'].includes(pedido?.status);

/** Gestão move Em compra/Chegou/Cancelada; o técnico da OS marca Retirada. */
export function podeMover(pedido, user, order) {
  if (!pedido || !pedidoAberto(pedido)) return false;
  if (['admin', 'gestor'].includes(user?.role)) return true;
  return user?.role === 'tecnico' && !!order?.technician_id && order.technician_id === user.id;
}

export function pedidosDaOS(pedidos = [], orderId) {
  return ordenarPedidos((pedidos || []).filter((pedido) => pedido.service_order_id === orderId));
}