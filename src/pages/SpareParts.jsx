import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Search, Pencil, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PedidosPecaPainel from '@/components/spareparts/PedidosPecaPainel';
import { cn } from '@/lib/utils';

export default function SpareParts() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  // Pedidos de peça: aba visível apenas para administração e gestão.
  const podeVerPedidos = ['admin', 'gestor'].includes(user?.role);
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidosPeca'],
    queryFn: () => base44.entities.PedidoPeca.list('-solicitado_em'),
    enabled: podeVerPedidos,
  });
  const { data: ordens = [] } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
    enabled: podeVerPedidos,
  });
  const pecasById = Object.fromEntries(parts.map((peca) => [peca.id, peca]));
  const ordersById = Object.fromEntries(ordens.map((ordem) => [ordem.id, ordem]));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SparePart.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['spareParts'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SparePart.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['spareParts'] }); setShowForm(false); setEditingItem(null); },
  });

  const [form, setForm] = useState({});

  const openForm = (item) => {
    setEditingItem(item);
    setForm({
      name: item?.name || '',
      code: item?.code || '',
      current_stock: item?.current_stock ?? 0,
      minimum_stock: item?.minimum_stock ?? 1,
      unit_cost: item?.unit_cost || '',
      supplier: item?.supplier || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    data.current_stock = parseInt(data.current_stock);
    data.minimum_stock = parseInt(data.minimum_stock);
    if (data.unit_cost) data.unit_cost = parseFloat(data.unit_cost);
    data.status = data.current_stock <= 0 ? 'Sem Estoque' : data.current_stock <= data.minimum_stock ? 'Estoque Baixo' : 'Em Estoque';
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = parts.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = parts.filter(p => p.current_stock <= p.minimum_stock).length;

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Peças de Reposição" subtitle={`${parts.length} itens`} onAdd={() => openForm(null)} addLabel="Nova Peça">
        {lowStock > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {lowStock} com estoque baixo
          </div>
        )}
      </PageHeader>

      <Tabs defaultValue="estoque">
        <TabsList>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          {podeVerPedidos && <TabsTrigger value="pedidos">Pedidos de peça</TabsTrigger>}
        </TabsList>

        <TabsContent value="estoque" className="mt-4 space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar peça..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Nenhuma peça encontrada" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Estoque</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Mínimo</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Custo Unit.</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Fornecedor</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className={cn(p.current_stock <= p.minimum_stock && "bg-destructive/5")}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm font-mono">{p.code}</TableCell>
                    <TableCell className={cn("text-sm font-semibold", p.current_stock <= p.minimum_stock && "text-destructive")}>{p.current_stock}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.minimum_stock}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{p.unit_cost ? `R$ ${p.unit_cost.toLocaleString('pt-BR')}` : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.supplier || '—'}</TableCell>
                    <TableCell><StatusBadge value={p.status || 'Em Estoque'} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
        </TabsContent>

        {podeVerPedidos && (
          <TabsContent value="pedidos" className="mt-4">
            <PedidosPecaPainel
              pedidos={pedidos}
              pecasById={pecasById}
              ordersById={ordersById}
              user={user}
            />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Editar Peça' : 'Nova Peça'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código *</Label>
                <Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estoque Atual</Label>
                <Input type="number" value={form.current_stock} onChange={e => setForm(p => ({...p, current_stock: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estoque Mínimo</Label>
                <Input type="number" value={form.minimum_stock} onChange={e => setForm(p => ({...p, minimum_stock: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Custo Unitário (R$)</Label>
                <Input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(p => ({...p, unit_cost: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Input value={form.supplier} onChange={e => setForm(p => ({...p, supplier: e.target.value}))} />
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