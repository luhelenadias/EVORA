import React from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatHours } from '@/lib/maintenance';

export default function EquipmentPerformanceTable({ rows }) {
  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Desempenho por Equipamento</h3>
        <p className="text-xs text-muted-foreground mt-0.5">MTTR, MTBF, corretivas e custo de manutenção acumulado</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Equipamento</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">Criticidade</TableHead>
              <TableHead className="text-xs font-semibold">MTTR</TableHead>
              <TableHead className="text-xs font-semibold hidden lg:table-cell">MTBF</TableHead>
              <TableHead className="text-xs font-semibold">Corretivas</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">Custo Manut.</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum equipamento com dados de manutenção.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge value={r.criticality} type="criticality" />
                  </TableCell>
                  <TableCell className="text-sm">{formatHours(r.mttr)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatHours(r.mtbf)}</TableCell>
                  <TableCell className="text-sm">
                    <span className={r.correctiveCount >= 3 ? 'font-bold text-destructive' : ''}>{r.correctiveCount}</span>
                  </TableCell>
                  <TableCell className="text-sm hidden md:table-cell">
                    {r.cost > 0 ? `R$ ${r.cost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}
                  </TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}