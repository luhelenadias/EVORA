import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Search, Pencil, AlertTriangle, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Contracts() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();
  const isReadOnly = user?.role !== 'admin';

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contracts'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contracts'] }); setShowForm(false); setEditingItem(null); },
  });

  const [form, setForm] = useState({});

  const openForm = (item) => {
    setEditingItem(item);
    setForm({
      supplier_name: item?.supplier_name || '',
      cnpj: item?.cnpj || '',
      contract_number: item?.contract_number || '',
      start_date: item?.start_date || '',
      end_date: item?.end_date || '',
      monthly_value: item?.monthly_value || '',
      total_value: item?.total_value || '',
      preventive_frequency: item?.preventive_frequency || '',
      sla_response_hours: item?.sla_response_hours || '',
      sla_resolution_hours: item?.sla_resolution_hours || '',
      warranty_terms: item?.warranty_terms || '',
      status: item?.status || 'Ativo',
      notes: item?.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.monthly_value) data.monthly_value = parseFloat(data.monthly_value);
    if (data.total_value) data.total_value = parseFloat(data.total_value);
    if (data.sla_response_hours) data.sla_response_hours = parseFloat(data.sla_response_hours);
    if (data.sla_resolution_hours) data.sla_resolution_hours = parseFloat(data.sla_resolution_hours);
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = contracts.filter(c =>
    !search ||
    c.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_number?.toLowerCase().includes(search.toLowerCase())
  );

  const expiringSoon = useMemo(() =>
    contracts.filter(c => {
      if (!c.end_date) return false;
      const days = differenceInDays(parseISO(c.end_date), new Date());
      return days > 0 && days <= 60;
    }).length,
  [contracts]);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={`${contracts.length} contratos`}
        onAdd={isReadOnly ? undefined : () => openForm(null)}
        addLabel="Novo Contrato"
      >
        {expiringSoon > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {expiringSoon} vencendo em 60 dias
          </div>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por fornecedor ou nº contrato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum contrato encontrado" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Fornecedor</TableHead>
                  <TableHead className="text-xs font-semibold">Nº Contrato</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Vigência</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Valor Mensal</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Frequência MP</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const daysToExpire = c.end_date ? differenceInDays(parseISO(c.end_date), new Date()) : null;
                  const expiring = daysToExpire !== null && daysToExpire <= 60 && daysToExpire > 0;
                  return (
                    <TableRow key={c.id} className={cn(expiring && "bg-amber-50/50")}>
                      <TableCell className="font-medium text-sm">{c.supplier_name}</TableCell>
                      <TableCell className="text-sm font-mono">{c.contract_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {c.start_date && format(parseISO(c.start_date), 'dd/MM/yy')} — {c.end_date && format(parseISO(c.end_date), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {c.monthly_value ? `R$ ${c.monthly_value.toLocaleString('pt-BR')}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{c.preventive_frequency || '—'}</TableCell>
                      <TableCell><StatusBadge value={c.status} /></TableCell>
                      <TableCell>
                        {!isReadOnly && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditingItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor *</Label>
                <Input value={form.supplier_name} onChange={e => setForm(p => ({...p, supplier_name: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({...p, cnpj: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Contrato *</Label>
                <Input value={form.contract_number} onChange={e => setForm(p => ({...p, contract_number: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência Preventiva</Label>
                <Select value={form.preventive_frequency} onValueChange={v => setForm(p => ({...p, preventive_frequency: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Início Vigência *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim Vigência *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.monthly_value} onChange={e => setForm(p => ({...p, monthly_value: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={form.total_value} onChange={e => setForm(p => ({...p, total_value: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Vencendo">Vencendo</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/40 border">
              <div className="col-span-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> SLA Contratual
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resposta (horas)</Label>
                <Input type="number" step="1" placeholder="Ex: 4" value={form.sla_response_hours} onChange={e => setForm(p => ({...p, sla_response_hours: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resolução / SLA (horas)</Label>
                <Input type="number" step="1" placeholder="Ex: 48" value={form.sla_resolution_hours} onChange={e => setForm(p => ({...p, sla_resolution_hours: e.target.value}))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Termos de Garantia</Label>
                <Input value={form.warranty_terms} onChange={e => setForm(p => ({...p, warranty_terms: e.target.value}))} placeholder="Ex: 12 meses sobre peças e mão de obra" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}