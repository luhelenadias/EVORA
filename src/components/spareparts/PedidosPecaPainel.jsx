import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import PedidoPecaAcoes from '@/components/maintenance/PedidoPecaAcoes';
import { Package } from 'lucide-react';
import { STATUS_PEDIDO, URGENCIAS_PEDIDO, ESTILO_STATUS, nomeDaPeca, ordenarPedidos } from '@/lib/pedidosPeca';

const dataCurta = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
};

/** Painel "Pedidos de peça" dentro de Peças (admin e gestão). */
export default function PedidosPecaPainel({ pedidos = [], pecasById = {}, ordersById = {}, user }) {
  const [status, setStatus] = useState('todos');
  const [urgencia, setUrgencia] = useState('todas');

  const lista = useMemo(() => {
    const filtrados = pedidos.filter(
      (pedido) =>
        (status === 'todos' || pedido.status === status) &&
        (urgencia === 'todas' || pedido.urgencia === urgencia)
    );
    return ordenarPedidos(filtrados);
  }, [pedidos, status, urgencia]);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap gap-2 p-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_PEDIDO.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={urgencia} onValueChange={setUrgencia}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as urgências</SelectItem>
              {URGENCIAS_PEDIDO.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto self-center text-[11px] text-muted-foreground">
            {lista.length} pedido(s) · ordenados por urgência
          </span>
        </div>
      </Card>

      {lista.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum pedido de peça" description="Ajuste os filtros ou aguarde os pedidos abertos pelos técnicos." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Peça</TableHead>
                  <TableHead className="text-xs font-semibold">OS</TableHead>
                  <TableHead className="text-xs font-semibold">Qtd</TableHead>
                  <TableHead className="text-xs font-semibold">Urgência</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Solicitado</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Por</TableHead>
                  <TableHead className="text-xs font-semibold">Andamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((pedido) => {
                  const ordem = ordersById[pedido.service_order_id] || null;
                  return (
                    <TableRow key={pedido.id}>
                      <TableCell className="text-sm font-medium">
                        {nomeDaPeca(pedido, pecasById)}
                        {pedido.em_estoque_no_pedido && (
                          <span className="ml-1 text-[10px] text-primary">em estoque</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{pedido.os_codigo || '—'}</TableCell>
                      <TableCell className="text-sm">{pedido.quantidade}</TableCell>
                      <TableCell className="text-sm">{pedido.urgencia}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ESTILO_STATUS[pedido.status] || ''}`}>
                          {pedido.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {dataCurta(pedido.solicitado_em)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {pedido.solicitante_nome || '—'}
                      </TableCell>
                      <TableCell>
                        <PedidoPecaAcoes pedido={pedido} order={ordem} user={user} compacto />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}