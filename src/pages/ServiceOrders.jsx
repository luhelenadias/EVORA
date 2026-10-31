import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Search, Pencil, Sparkles, ListOrdered, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import OrderForm from '@/components/orders/OrderForm';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  queueScore, findContractForEquipment, computeSlaStatus, SLA_STYLES,
} from '@/lib/maintenance';
import { alteracoesDaOS, registrarAlteracoesDaOS, registrarAuditoria } from '@/lib/auditoria';

export default function ServiceOrders() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  // Atalho vindo da ficha do equipamento: já abre o formulário com ele escolhido.
  const equipamentoInicial = searchParams.get('equipamento') || '';
  const [showForm, setShowForm] = useState(Boolean(equipamentoInicial));
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  // Atalho com a tela já aberta (link entre abas): abre o formulário já preenchido.
  useEffect(() => {
    if (equipamentoInicial) setShowForm(true);
  }, [equipamentoInicial]);

  const fecharFormulario = () => {
    setShowForm(false);
    setEditingItem(null);
    if (equipamentoInicial) setSearchParams({}, { replace: true });
  };

  const isClinical = user?.role === 'clinico';
  const isTechnician = user?.role === 'tecnico';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const criado = await base44.entities.ServiceOrder.create(data);
      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: criado.id,
        entidade_codigo: criado.code || '',
        acao: 'Abertura',
        valor_novo: `${criado.type} · ${criado.problem_description || ''}`.trim(),
        tecnico_atribuido_id: criado.technician_id || null,
      });
      return criado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      fecharFormulario();
      toast.success('Chamado criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, antes }) => {
      const atualizado = await base44.entities.ServiceOrder.update(id, data);
      const depois = { ...antes, ...data };
      await registrarAlteracoesDaOS(atualizado || depois, alteracoesDaOS(antes, depois));
      return atualizado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      fecharFormulario();
      toast.success('Chamado atualizado!');
    },
  });

  const eqMap = useMemo(() => {
    const m = {};
    equipment.forEach((e) => (m[e.id] = e));
    return m;
  }, [equipment]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
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

  // Fila de atendimento: chamados abertos ordenados por score de prioridade
  const queue = useMemo(() => {
    return filtered
      .filter((o) => o.status !== 'Concluído')
      .map((o) => ({
        order: o,
        score: queueScore(o, eqMap[o.equipment_id], contracts),
        contract: findContractForEquipment(contracts, o.equipment_id),
        equipment: eqMap[o.equipment_id],
      }))
      .sort((a, b) => b.score - a.score);
  }, [filtered, eqMap, contracts]);

  const handleSubmit = async (data) => {
    if (editingItem) {
      if (data.status === 'Concluído' && editingItem.status !== 'Concluído') {
        data.completion_date = new Date().toISOString();
      }
      if (data.status === 'Em Andamento' && !editingItem.start_date) {
        data.start_date = new Date().toISOString();
      }
      updateMutation.mutate({ id: editingItem.id, data, antes: editingItem });
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
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  const title = isClinical ? 'Meus Chamados' : isTechnician ? 'Meus Chamados' : 'Chamados';

  const renderSlaBadge = (order) => {
    const contract = findContractForEquipment(contracts, order.equipment_id);
    const sla = computeSlaStatus(order, contract);
    if (!sla) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${SLA_STYLES[sla.status]}`}>
        <Clock className="w-2.5 h-2.5" />
        {sla.label}
      </span>
    );
  };

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
              <Input placeholder="Buscar por código, equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListOrdered className="w-3.5 h-3.5" /> Fila de Atendimento
            {queue.length > 0 && (
              <span className="ml-1 h-5 px-1.5 text-[10px] rounded-full bg-primary text-primary-foreground flex items-center">{queue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todos os Chamados</TabsTrigger>
        </TabsList>

        {/* Fila de Atendimento */}
        <TabsContent value="queue" className="mt-4">
          {queue.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="Fila vazia"
              description="Nenhum chamado aberto no momento."
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold w-10">#</TableHead>
                      <TableHead className="text-xs font-semibold">Código</TableHead>
                      <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Criticidade</TableHead>
                      <TableHead className="text-xs font-semibold">Prioridade</TableHead>
                      <TableHead className="text-xs font-semibold">SLA</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map(({ order, equipment: eq }, idx) => (
                      <TableRow key={order.id} className={idx === 0 ? 'bg-primary/5' : ''}>
                        <TableCell className="text-xs font-bold text-primary">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            {order.code || `OS-${order.id?.substring(0, 6)}`}
                            {order.origin === 'Sugerida por IA' && <Sparkles className="w-3 h-3 text-primary" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.equipment_name || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {eq?.criticality ? <StatusBadge value={eq.criticality} type="criticality" /> : '—'}
                        </TableCell>
                        <TableCell><StatusBadge value={order.priority} type="priority" /></TableCell>
                        <TableCell>{renderSlaBadge(order)}</TableCell>
                        <TableCell><StatusBadge value={order.status} /></TableCell>
                        <TableCell>
                          {canEdit(order) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(order); setShowForm(true); }}>
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
        </TabsContent>

        {/* Todos os Chamados */}
        <TabsContent value="all" className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum chamado encontrado"
              description={isClinical ? 'Abra um novo chamado corretivo quando necessário.' : 'Ajuste os filtros ou crie um novo chamado.'}
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
                      <TableHead className="text-xs font-semibold hidden xl:table-cell">SLA</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Abertura</TableHead>
                      <TableHead className="text-xs font-semibold w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => (
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
                        <TableCell className="hidden xl:table-cell">{renderSlaBadge(o)}</TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={fecharFormulario}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? 'Editar Chamado' : isClinical ? 'Abrir Chamado Corretivo' : 'Novo Chamado'}
            </DialogTitle>
          </DialogHeader>
          <OrderForm
            order={editingItem}
            equipamentoInicial={equipamentoInicial}
            onSubmit={handleSubmit}
            onCancel={fecharFormulario}
            isLoading={createMutation.isPending || updateMutation.isPending}
            user={user}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}