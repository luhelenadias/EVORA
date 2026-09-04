import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { format, parseISO } from 'date-fns';
import { formatHours, CRITICALITY_WEIGHT } from '@/lib/maintenance';
import { cn } from '@/lib/utils';

export default function IndicatorDetailDialog({ open, onOpenChange, view, equipmentId, equipmentName, indicators, equipment, orders }) {
  const titleMap = {
    mttr: 'Detalhamento — MTTR por Equipamento',
    mtbf: 'Detalhamento — MTBF por Equipamento',
    availability: 'Detalhamento — Disponibilidade',
    cost: 'Detalhamento — Custo de Manutenção (12m)',
    'equipment-orders': `Chamados — ${equipmentName || ''}`,
  };

  const renderMttrList = () => {
    const sorted = [...indicators]
      .filter((r) => r.mttr_hours != null)
      .sort((a, b) => (b.mttr_hours || 0) - (a.mttr_hours || 0));
    return (
      <Table>
        <TableHeader><TableRow className="bg-muted/50">
          <TableHead className="text-xs font-semibold">Equipamento</TableHead>
          <TableHead className="text-xs font-semibold">Criticidade</TableHead>
          <TableHead className="text-xs font-semibold text-right">MTTR</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.equipment_id}>
              <TableCell className="font-medium text-sm">{r.equipment_name}</TableCell>
              <TableCell><StatusBadge value={r.criticality} type="criticality" /></TableCell>
              <TableCell className="text-sm text-right tabular-nums font-semibold">{formatHours(r.mttr_hours)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMtbfList = () => {
    const sorted = [...indicators]
      .filter((r) => r.mtbf_hours != null)
      .sort((a, b) => (a.mtbf_hours || Infinity) - (b.mtbf_hours || Infinity));
    return (
      <Table>
        <TableHeader><TableRow className="bg-muted/50">
          <TableHead className="text-xs font-semibold">Equipamento</TableHead>
          <TableHead className="text-xs font-semibold">Criticidade</TableHead>
          <TableHead className="text-xs font-semibold text-right">MTBF</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.equipment_id}>
              <TableCell className="font-medium text-sm">{r.equipment_name}</TableCell>
              <TableCell><StatusBadge value={r.criticality} type="criticality" /></TableCell>
              <TableCell className="text-sm text-right tabular-nums font-semibold">{formatHours(r.mtbf_hours)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAvailability = () => {
    const active = equipment.filter((e) => e.operational_status === 'Ativo');
    const inactive = equipment.filter((e) => e.operational_status !== 'Ativo');
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-2xl font-bold text-green-700">{active.length}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-2xl font-bold text-red-700">{inactive.length}</p>
            <p className="text-xs text-muted-foreground">Parados / Em manutenção / Inativos</p>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Equipamento</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {inactive.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-sm">{e.name}</TableCell>
                  <TableCell><StatusBadge value={e.operational_status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderCost = () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const costOrders = orders
      .filter((o) => o.total_cost && o.open_date && parseISO(o.open_date) > twelveMonthsAgo)
      .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
    const total = costOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-xs text-muted-foreground">Custo total no período</p>
          <p className="text-2xl font-bold text-warning">R$ {total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Código</TableHead>
              <TableHead className="text-xs font-semibold">Equipamento</TableHead>
              <TableHead className="text-xs font-semibold">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-right">Custo</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {costOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.code || `OS-${o.id?.substring(0, 6)}`}</TableCell>
                  <TableCell className="text-sm">{o.equipment_name || '—'}</TableCell>
                  <TableCell className="text-sm">{o.type}</TableCell>
                  <TableCell className="text-sm text-right font-semibold">R$ {(o.total_cost || 0).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderEquipmentOrders = () => {
    const eqOrders = orders
      .filter((o) => o.equipment_id === equipmentId)
      .sort((a, b) => (b.open_date || '').localeCompare(a.open_date || ''));
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{eqOrders.length} chamado(s) registrado(s) para este equipamento.</p>
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Código</TableHead>
              <TableHead className="text-xs font-semibold">Tipo</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">Abertura</TableHead>
              <TableHead className="text-xs font-semibold text-right">Custo</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {eqOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.code || `OS-${o.id?.substring(0, 6)}`}</TableCell>
                  <TableCell className="text-sm">{o.type}</TableCell>
                  <TableCell><StatusBadge value={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {o.open_date ? format(parseISO(o.open_date), 'dd/MM/yy') : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-right">{o.total_cost ? `R$ ${o.total_cost.toLocaleString('pt-BR')}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{titleMap[view] || 'Detalhamento'}</DialogTitle>
        </DialogHeader>
        {view === 'mttr' && renderMttrList()}
        {view === 'mtbf' && renderMtbfList()}
        {view === 'availability' && renderAvailability()}
        {view === 'cost' && renderCost()}
        {view === 'equipment-orders' && renderEquipmentOrders()}
      </DialogContent>
    </Dialog>
  );
}