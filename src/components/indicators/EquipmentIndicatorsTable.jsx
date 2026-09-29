import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { ArrowUpDown, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { CRITICALITY_WEIGHT, formatHours } from '@/lib/maintenance';
import { cn } from '@/lib/utils';

export default function EquipmentIndicatorsTable({ rows, avgMttr, avgMtbf, onRowClick }) {
  const [sortKey, setSortKey] = useState('mttr');
  const [sortDir, setSortDir] = useState('desc'); // MTTR desc = piores primeiro

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // default direction: MTTR desc (piores), MTBF asc (piores), criticidade desc
      setSortDir(key === 'mtbf' ? 'asc' : 'desc');
    }
  };

  const avgAtendimento = useMemo(() => {
    const vals = rows.map((r) => r.avg_response_time_hours).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [rows]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let av, bv;
      if (sortKey === 'mttr') { av = a.mttr_hours ?? -1; bv = b.mttr_hours ?? -1; }
      else if (sortKey === 'mtbf') { av = a.mtbf_hours ?? Infinity; bv = b.mtbf_hours ?? Infinity; }
      else if (sortKey === 'criticality') { av = CRITICALITY_WEIGHT[a.criticality] || 0; bv = CRITICALITY_WEIGHT[b.criticality] || 0; }
      else return 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const SortHeader = ({ label, k, align = 'left' }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead className={cn('text-xs font-semibold', align === 'right' && 'text-right')}>
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
          {label}
          <Icon className={cn('w-3 h-3', active ? 'text-primary' : 'text-muted-foreground/50')} />
        </button>
      </TableHead>
    );
  };

  const mttrColor = (v) => {
    if (v == null) return 'text-muted-foreground';
    if (avgMttr && v > avgMttr * 1.5) return 'text-destructive font-bold';
    if (avgMttr && v > avgMttr) return 'text-warning font-semibold';
    return 'text-success';
  };
  const mtbfColor = (v) => {
    if (v == null) return 'text-muted-foreground';
    if (avgMtbf && v < avgMtbf * 0.5) return 'text-destructive font-bold';
    if (avgMtbf && v < avgMtbf) return 'text-warning font-semibold';
    return 'text-success';
  };

  return (
    <Card>
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" /> MTTR / MTBF por Equipamento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ordenado por {sortKey === 'mttr' ? 'MTTR (maior = pior)' : sortKey === 'mtbf' ? 'MTBF (menor = pior)' : 'criticidade'} · MTTR = duração do reparo · Atendimento = espera até o início do reparo · MTBF = intervalo entre falhas.
          </p>
        </div>
        <div className="hidden sm:flex gap-4 text-xs text-muted-foreground">
          <span>Tempo médio de atendimento: <strong className="text-foreground">{formatHours(avgAtendimento)}</strong></span>
          <span>Média MTTR: <strong className="text-foreground">{formatHours(avgMttr)}</strong></span>
          <span>Média MTBF: <strong className="text-foreground">{formatHours(avgMtbf)}</strong></span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortHeader label="Equipamento" k="name" />
              <SortHeader label="Criticidade" k="criticality" />
              <SortHeader label="MTTR" k="mttr" align="right" />
              <SortHeader label="MTBF" k="mtbf" align="right" />
              <TableHead className="text-xs font-semibold text-right">Atendimento</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum plano com indicadores registrados.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r, idx) => (
                <TableRow
                  key={r.equipment_id}
                  onClick={() => onRowClick?.(r.equipment_id, r.equipment_name)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell className="font-medium text-sm">
                    {sortKey === 'mttr' && sortDir === 'desc' && idx === 0 && (
                      <span className="mr-1.5 text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">PIOR</span>
                    )}
                    {r.equipment_name}
                  </TableCell>
                  <TableCell><StatusBadge value={r.criticality} type="criticality" /></TableCell>
                  <TableCell className={cn('text-sm text-right tabular-nums', mttrColor(r.mttr_hours))}>
                    {formatHours(r.mttr_hours)}
                  </TableCell>
                  <TableCell className={cn('text-sm text-right tabular-nums', mtbfColor(r.mtbf_hours))}>
                    {formatHours(r.mtbf_hours)}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-foreground">
                    {formatHours(r.avg_response_time_hours)}
                  </TableCell>
                  <TableCell><StatusBadge value={r.operational_status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}