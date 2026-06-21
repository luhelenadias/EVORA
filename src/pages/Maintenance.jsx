import React, { useState } from 'react';
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
import { Wrench, Sparkles, AlertTriangle, Calendar, Search } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Maintenance() {
  const { user } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const isReadOnly = user?.role === 'tecnico';

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['maintenancePlans'],
    queryFn: () => base44.entities.MaintenancePlan.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenancePlan.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenancePlans'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenancePlan.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenancePlans'] }); setShowForm(false); setEditingItem(null); },
  });

  const [form, setForm] = useState({});

  const openForm = (item) => {
    setEditingItem(item);
    setForm({
      equipment_id: item?.equipment_id || '',
      equipment_name: item?.equipment_name || '',
      frequency: item?.frequency || 'Trimestral',
      last_execution_date: item?.last_execution_date || '',
      next_execution_date: item?.next_execution_date || '',
      status: item?.status || 'Ativo',
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (!editingItem && data.equipment_id) {
      const eq = equipment.find(eq => eq.id === data.equipment_id);
      if (eq) data.equipment_name = eq.name;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = plans.filter(p =>
    !search || p.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  const aiSuggestions = plans.filter(p => p.ai_suggestion);
  const overduePlans = plans.filter(p => {
    if (!p.next_execution_date) return false;
    return differenceInDays(parseISO(p.next_execution_date), new Date()) < 0;
  });
  const upcomingPlans = plans.filter(p => {
    if (!p.next_execution_date) return false;
    const days = differenceInDays(parseISO(p.next_execution_date), new Date());
    return days >= 0 && days <= 30;
  });

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manutenções"
        subtitle={`${plans.length} planos de manutenção`}
        onAdd={isReadOnly ? undefined : () => openForm(null)}
        addLabel="Novo Plano"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-destructive">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{overduePlans.length}</p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-warning" />
            <div>
              <p className="text-2xl font-bold">{upcomingPlans.length}</p>
              <p className="text-xs text-muted-foreground">Próximos 30 dias</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{aiSuggestions.length}</p>
              <p className="text-xs text-muted-foreground">Sugestões de IA</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planos de Manutenção</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Sugestões IA
            {aiSuggestions.length > 0 && (
              <Badge className="ml-1 h-5 text-[10px]">{aiSuggestions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar equipamento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="Nenhum plano encontrado" />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                      <TableHead className="text-xs font-semibold">Frequência</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Última Exec.</TableHead>
                      <TableHead className="text-xs font-semibold">Próxima Exec.</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">MTBF (h)</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">MTTR (h)</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => {
                      const isOverdue = p.next_execution_date && differenceInDays(parseISO(p.next_execution_date), new Date()) < 0;
                      return (
                        <TableRow key={p.id} className={cn(isOverdue && "bg-destructive/5")}>
                          <TableCell className="font-medium text-sm">{p.equipment_name || '—'}</TableCell>
                          <TableCell className="text-sm">{p.frequency}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {p.last_execution_date ? format(parseISO(p.last_execution_date), 'dd/MM/yy') : '—'}
                          </TableCell>
                          <TableCell className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
                            {p.next_execution_date ? format(parseISO(p.next_execution_date), 'dd/MM/yy') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.mtbf_hours || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.mttr_hours || '—'}</TableCell>
                          <TableCell><StatusBadge value={p.status} /></TableCell>
                          <TableCell>
                            {!isReadOnly && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(p)}>
                                <Wrench className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          {aiSuggestions.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nenhuma sugestão de IA" description="Sugestões serão geradas automaticamente com base no histórico de falhas." />
          ) : (
            <div className="space-y-3">
              {aiSuggestions.map(p => (
                <Card key={p.id} className="p-5 border-l-4 border-l-primary">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {p.equipment_name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Corretivas (12m): {p.corrective_count_12m || 0} | MTBF: {p.mtbf_hours || '—'}h | MTTR: {p.mttr_hours || '—'}h
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {p.ai_suggestion_date ? format(parseISO(p.ai_suggestion_date), 'dd/MM/yy') : ''}
                    </p>
                  </div>
                  <p className="text-sm bg-muted/50 rounded-lg p-3 leading-relaxed">{p.ai_suggestion}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Equipamento *</Label>
                <Select value={form.equipment_id} onValueChange={v => {
                  const eq = equipment.find(e => e.id === v);
                  setForm(p => ({...p, equipment_id: v, equipment_name: eq?.name || ''}));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência *</Label>
                <Select value={form.frequency} onValueChange={v => setForm(p => ({...p, frequency: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Suspenso">Suspenso</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Última Execução</Label>
                <Input type="date" value={form.last_execution_date} onChange={e => setForm(p => ({...p, last_execution_date: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Próxima Execução</Label>
                <Input type="date" value={form.next_execution_date} onChange={e => setForm(p => ({...p, next_execution_date: e.target.value}))} />
              </div>
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