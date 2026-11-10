import React from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Clock, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import ChamadoCard from '@/components/orders/ChamadoCard';
import { findContractForEquipment, computeSlaStatus, SLA_STYLES } from '@/lib/maintenance';
import { rotuloStatusOS } from '@/lib/triagem';

/** Chamados abertos pelo próprio usuário logado: cartões no celular, tabela no desktop. */
export default function MeusChamadosLista({ orders, contracts, podeEditar, onEditar, onAbrir }) {
  if (!orders.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhum chamado seu encontrado"
        description="Os chamados que você abrir aparecem aqui para acompanhamento."
      />
    );
  }

  const renderSla = (order) => {
    const sla = computeSlaStatus(order, findContractForEquipment(contracts, order.equipment_id));
    if (!sla) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${SLA_STYLES[sla.status]}`}>
        <Clock className="w-2.5 h-2.5" />
        {sla.label}
      </span>
    );
  };

  return (
    <>
      {/* Celular: um cartão por chamado, sem colunas cortadas */}
      <div className="space-y-2 md:hidden">
        {orders.map((o) => (
          <ChamadoCard key={o.id} order={o} contracts={contracts} onOpen={() => onAbrir(o)} />
        ))}
      </div>

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Código</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Equipamento</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Setor</TableHead>
                <TableHead className="text-xs font-semibold">Prioridade</TableHead>
                <TableHead className="text-xs font-semibold hidden xl:table-cell">SLA</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Abertura</TableHead>
                <TableHead className="text-xs font-semibold w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onAbrir(o)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {o.code || `OS-${o.id?.substring(0, 6)}`}
                  </TableCell>
                  <TableCell className="text-sm hidden md:table-cell">{o.equipment_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{o.sector || '—'}</TableCell>
                  <TableCell><StatusBadge value={o.priority} type="priority" /></TableCell>
                  <TableCell className="hidden xl:table-cell">{renderSla(o)}</TableCell>
                  <TableCell><StatusBadge value={o.status} rotulo={rotuloStatusOS(o)} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {o.open_date ? format(parseISO(o.open_date), 'dd/MM/yy HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    {podeEditar(o) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onEditar(o); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}