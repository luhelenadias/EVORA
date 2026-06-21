import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Search, Eye, Pencil, Sparkles } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import OrderForm from '@/components/orders/OrderForm';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function ServiceOrders() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const isClinical = user?.role === 'clinico';
  const isTechnician = user?.role === 'tecnico';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      setShowForm(false);
      toast.success('Chamado criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      setShowForm(false);
      setEditingItem(null);
      toast.success('Chamado atualizado!');
    },
  });

  const filtered = useMemo(() => {
    return orders.filter(o => {
      // Role-based filtering
      if (isClinical && o.requester_id !== user?.id) return false;
      if (isTechnician && o.technician_id !== user?.id) return false;

      const matchSearch = !search ||
        o.code?.toLowerCase().includes(search.toLowerCase()) ||
        o.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.problem_description?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchType = typeFilter === 'all' || o.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [orders, search, statusFilter, typeFilter, user, isClinical, isTechnician]);

  const handleSubmit = async (data) => {
    if (editingItem) {
      // If completing a corrective order, add completion date
      if (data.status === 'Concluído' && editingItem.status !== 'Concluído') {
        data.completion_date = new Date().toISOString();
      }
      if (data.status === 'Em Andamento' && !editingItem.start_date) {
        data.start_date = new Date().toISOString();
      }
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      if (isClinical) {
        data.type = 'Corretiva';
        data.origin = 'Manual';
      }
      createMutation.mutate(data);
    }
  };

  const canEdit = (order) => {
    if (user?.role === 'admin' || user?.role === 'gestor') return true;
    if (isTechnician && order.technician_id === user?.id) return true;
    if (isClinical && order.requester_id === user?.id && order.status === 'Novo') return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  const title = isClinical ? 'Meus Chamados' : isTechnician ? 'Meus Chamados' : 'Chamados';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={`${filtered.length} chamado${filtered.length !== 1 ? 's' : ''}`}
        onAdd={() => { setEditingItem(null); setShowForm(true); }}
        addLabel={isClinical ? 'Abrir Chamado' : 'Novo Chamado'}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por código, equipamento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                <SelectItem value="Aguardando Fornecedor">Aguardando Fornecedor</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
            {!isClinical && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                  <SelectItem value="Calibração">Calibração</SelectItem>
                  <SelectItem value="Instalação">Instalação</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum chamado encontrado"
          description={isClinical ? "Abra um novo chamado corretivo quando necessário." : "Ajuste os filtros ou crie um novo chamado."}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Equipamento</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Setor</TableHead>
                  <TableHead className="text-xs font-semibold">Prioridade</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Abertura</TableHead>
                  <TableHead className="text-xs font-semibold w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        {o.code || `OS-${o.id?.substring(0, 6)}`}
                        {o.origin === 'Sugerida por IA' && <Sparkles className="w-3 h-3 text-primary" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{o.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{o.equipment_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{o.sector || '—'}</TableCell>
                    <TableCell><StatusBadge value={o.priority} type="priority" /></TableCell>
                    <TableCell><StatusBadge value={o.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {o.open_date ? format(parseISO(o.open_date), 'dd/MM/yy HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      {canEdit(o) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(o); setShowForm(true); }}>
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
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditingItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? 'Editar Chamado' : isClinical ? 'Abrir Chamado Corretivo' : 'Novo Chamado'}
            </DialogTitle>
          </DialogHeader>
          <OrderForm
            order={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            user={user}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}