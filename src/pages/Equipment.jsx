import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Search, Eye, AlertTriangle, Flame, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import EquipmentForm from '@/components/equipment/EquipmentForm';
import EquipmentDetail from '@/components/equipment/EquipmentDetail';
import QrCodeDialog from '@/components/equipment/QrCodeDialog';
import QrScannerDialog from '@/components/equipment/QrScannerDialog';
import { equipmentIdFromQr } from '@/lib/equipmentQr';
import PrioridadeBadge from '@/components/equipment/PrioridadeBadge';
import TermoTooltip from '@/components/shared/TermoTooltip';
import { recalcularPrioridades } from '@/lib/priorizacao';
import { Skeleton } from '@/components/ui/skeleton';
import useUrlModal from '@/hooks/useUrlModal';
import PullToRefresh from '@/components/shared/PullToRefresh';

export default function Equipment() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingOnly = searchParams.get('filter') === 'pendente';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // Ficha aberta: o id fica na URL (?equipamento=id ou /equipamentos/:id) para que
  // o gesto "voltar" feche a ficha em vez de sair do aplicativo.
  const [equipamentoAbertoId, abrirEquipamento, fecharParametro] = useUrlModal('equipamento');
  const [qrItem, setQrItem] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const { id: routeEquipmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { config } = useConfiguracao();

  const isReadOnly = user?.role === 'tecnico' || user?.role === 'gestor';

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  // QR da etiqueta abre a ficha direto (/equipamentos/<id>); a lista usa ?equipamento=<id>.
  const idAberto = equipamentoAbertoId || routeEquipmentId || null;
  const viewingItem = useMemo(
    () => (idAberto ? equipment.find((e) => e.id === idAberto) || null : null),
    [equipment, idAberto]
  );

  // Puxar para atualizar (toque): recarrega o parque de equipamentos.
  const atualizarParque = () => queryClient.invalidateQueries({ queryKey: ['equipment'] });

  const fecharDetalhe = () => {
    fecharParametro();
    if (routeEquipmentId) navigate('/equipamentos', { replace: true });
  };

  const tratarQrLido = (texto) => {
    const id = equipmentIdFromQr(texto);
    const alvo = id ? equipment.find((e) => e.id === id) : null;
    if (!alvo) {
      toast.error('QR Code não corresponde a um equipamento cadastrado.');
      return;
    }
    setShowScanner(false);
    navigate(`/equipamentos/${alvo.id}`);
  };

  // Ranking e faixas são relativos ao parque: recalculados a cada inclusão, edição ou baixa.
  const sincronizarPrioridades = async () => {
    if (config?.id) await recalcularPrioridades(config);
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: async () => {
      await sincronizarPrioridades();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: async () => {
      await sincronizarPrioridades();
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const totalRanking = useMemo(
    () =>
      equipment.filter(
        (e) => e.status_priorizacao === 'calculado' && e.operational_status !== 'Inativo/Baixado'
      ).length,
    [equipment]
  );

  const filtered = useMemo(() => {
    const result = equipment.filter(e => {
      const matchSearch = !search || 
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
        e.patrimony_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.operational_status === statusFilter;
      const matchCrit = criticalityFilter === 'all' || e.criticality === criticalityFilter;
      const matchPending = !pendingOnly || e.status_priorizacao === 'pendente_atualizacao';
      return matchSearch && matchStatus && matchCrit && matchPending;
    });
    // ordenação padrão: colocação no ranking (equipamentos sem posição por último)
    result.sort((a, b) => (a.prioridade_posicao ?? Infinity) - (b.prioridade_posicao ?? Infinity));
    return result;
  }, [equipment, search, statusFilter, criticalityFilter, pendingOnly]);

  const handleSubmit = (data) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
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

  return (
    <PullToRefresh onRefresh={atualizarParque}>
    <div className="space-y-6">
      <PageHeader
        title="Equipamentos"
        subtitle={`${equipment.length} equipamentos cadastrados`}
        onAdd={isReadOnly ? undefined : () => { setEditingItem(null); setShowForm(true); }}
        addLabel="Novo Equipamento"
      >
        <Button variant="outline" className="h-11 gap-1.5 sm:h-9" onClick={() => setShowScanner(true)}>
          <ScanLine className="w-4 h-4" /> Ler QR Code
        </Button>
      </PageHeader>

      {pendingOnly && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/30">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span>Mostrando apenas equipamentos pendentes de atualização para o modelo avançado.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>Ver todos</Button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, série ou patrimônio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                <SelectItem value="Parado">Parado</SelectItem>
                <SelectItem value="Inativo/Baixado">Inativo/Baixado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Suporte à Vida">Suporte à Vida</SelectItem>
                <SelectItem value="Terapêutico">Terapêutico</SelectItem>
                <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                <SelectItem value="Apoio">Apoio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Monitor} title="Nenhum equipamento encontrado" description="Ajuste os filtros ou cadastre um novo equipamento." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Setor</TableHead>
                  <TableHead className="text-xs font-semibold">Criticidade</TableHead>
                  <TableHead className="text-xs font-semibold">
                    <TermoTooltip termo="faixa" as="span" className="text-xs font-semibold">
                      Prioridade
                    </TermoTooltip>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(eq => (
                  <TableRow
                    key={eq.id}
                    className={cn('cursor-pointer hover:bg-muted/30', eq.prioridade_alta && 'bg-destructive/5 border-l-4 border-l-destructive')}
                    onClick={() => abrirEquipamento(eq.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {eq.prioridade_alta && <Flame className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                        <span className="font-medium text-sm">{eq.name}</span>
                        {eq.codigo_equipamento ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5"
                          >
                            {eq.codigo_equipamento}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal border-border text-muted-foreground bg-muted">
                            Sem código
                          </Badge>
                        )}
                      </div>
                      {eq.patrimony_number && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-mono">
                          Patrimônio {eq.patrimony_number}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{eq.location_sector || '—'}</TableCell>
                    <TableCell><StatusBadge value={eq.criticality} type="criticality" /></TableCell>
                    <TableCell>
                      <PrioridadeBadge equipment={eq} total={totalRanking} />
                    </TableCell>
                    <TableCell><StatusBadge value={eq.operational_status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8" onClick={e => { e.stopPropagation(); abrirEquipamento(eq.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            equipment={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!viewingItem} onOpenChange={fecharDetalhe}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Equipamento</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <EquipmentDetail
              equipment={viewingItem}
              user={user}
              allEquipment={equipment}
              onShowQr={() => setQrItem(viewingItem)}
              onEdit={isReadOnly ? undefined : () => { const alvo = viewingItem; fecharDetalhe(); setEditingItem(alvo); setShowForm(true); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <QrCodeDialog equipment={qrItem} open={!!qrItem} onOpenChange={(v) => !v && setQrItem(null)} />
      <QrScannerDialog open={showScanner} onOpenChange={setShowScanner} onDetect={tratarQrLido} />
    </div>
    </PullToRefresh>
  );
}