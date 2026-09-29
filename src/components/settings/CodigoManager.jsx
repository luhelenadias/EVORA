import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Lock, Info } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { normalizeSigla } from '@/lib/equipmentCode';
import { useToast } from '@/components/ui/use-toast';

const CONFIG = {
  CodigoSetor: {
    entity: 'CodigoSetor',
    usageField: 'setor_id',
    singular: 'setor',
    Singular: 'Setor',
    exemplo: 'CC',
    nomePlaceholder: 'Ex: Centro Cirúrgico',
    bloco: 'bloco 1',
  },
  CodigoTipoEquipamento: {
    entity: 'CodigoTipoEquipamento',
    usageField: 'tipo_equipamento_id',
    singular: 'tipo de equipamento',
    Singular: 'Tipo de Equipamento',
    exemplo: 'VT',
    nomePlaceholder: 'Ex: Ventilador para Terapia',
    bloco: 'bloco 2',
  },
};

export default function CodigoManager({ kind }) {
  const cfg = CONFIG[kind];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ sigla: '', nome: '', ativo: true });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [cfg.entity],
    queryFn: () => base44.entities[cfg.entity].list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const usageCount = (id) => equipment.filter((e) => e[cfg.usageField] === id).length;

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? base44.entities[cfg.entity].update(id, data) : base44.entities[cfg.entity].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.entity] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[cfg.entity].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.entity] });
      setDeleteTarget(null);
      toast({ title: `${cfg.Singular} excluído.` });
    },
  });

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.sigla || '').localeCompare(b.sigla || '')),
    [items]
  );

  const openForm = (item) => {
    setEditing(item);
    setForm({ sigla: item?.sigla || '', nome: item?.nome || '', ativo: item?.ativo !== false });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sigla = normalizeSigla(form.sigla);
    const nome = form.nome.trim();

    if (sigla.length !== 2) {
      toast({
        title: 'Sigla inválida',
        description: 'A sigla deve ter exatamente 2 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (!nome) {
      toast({ title: 'Nome obrigatório', description: `Informe o nome do ${cfg.singular}.`, variant: 'destructive' });
      return;
    }
    if (items.some((i) => normalizeSigla(i.sigla) === sigla && i.id !== editing?.id)) {
      toast({
        title: 'Sigla duplicada',
        description: `Já existe um ${cfg.singular} com a sigla ${sigla}.`,
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate({ id: editing?.id, data: { sigla, nome, ativo: form.ativo } });
  };

  const usage = deleteTarget ? usageCount(deleteTarget.id) : 0;
  const blocked = usage > 0;

  if (isLoading) {
    return <Card className="p-6 text-sm text-muted-foreground">Carregando...</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            A sigla tem exatamente 2 caracteres e forma o {cfg.bloco} do código técnico do equipamento
            (ex.: <span className="font-mono">{cfg.exemplo}</span> em <span className="font-mono">CC-VT0394</span>).
            Registros já usados por equipamentos não podem ser excluídos — desative-os.
          </p>
        </div>
        <Button onClick={() => openForm(null)} className="gap-1.5 flex-shrink-0">
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Info} title={`Nenhum ${cfg.singular} cadastrado`} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold w-24">Sigla</TableHead>
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Origem</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Em uso</TableHead>
                  <TableHead className="text-xs font-semibold">Situação</TableHead>
                  <TableHead className="text-xs font-semibold w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => {
                  const used = usageCount(item.id);
                  return (
                    <TableRow key={item.id} className={item.ativo === false ? 'opacity-60' : ''}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{item.sigla}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{item.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {item.padrao_sistema ? 'Padrão do sistema' : 'Personalizado'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {used > 0 ? `${used} equipamento(s)` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={item.ativo === false
                            ? 'bg-muted text-muted-foreground border-border text-[11px]'
                            : 'bg-primary/10 text-primary border-primary/25 text-[11px]'}
                        >
                          {item.ativo === false ? 'Desativado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(item)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                            title={used > 0 ? 'Em uso — não pode excluir' : 'Excluir'}
                          >
                            {used > 0 ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? `Editar ${cfg.Singular}` : `Novo ${cfg.Singular}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sigla *</Label>
              <Input
                value={form.sigla}
                onChange={(e) => setForm((p) => ({ ...p, sigla: normalizeSigla(e.target.value) }))}
                maxLength={2}
                placeholder={cfg.exemplo}
                className="font-mono uppercase w-24 text-center text-base tracking-widest"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Exatamente 2 caracteres, convertidos para maiúsculo automaticamente.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder={cfg.nomePlaceholder}
                required
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm">Ativo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desativado não aparece nas opções de novos cadastros, mas mantém o histórico.
                </p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : editing ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {blocked ? `${cfg.Singular} em uso` : `Excluir ${cfg.singular}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blocked ? (
                <>
                  A sigla <span className="font-mono font-semibold">{deleteTarget?.sigla}</span> está vinculada a{' '}
                  {usage} equipamento(s) e não pode ser excluída. Para desativá-la sem perder o histórico,
                  edite o registro e desligue a opção &quot;Ativo&quot;.
                </>
              ) : (
                <>
                  O registro{' '}
                  <span className="font-semibold">{deleteTarget?.sigla} — {deleteTarget?.nome}</span> será
                  removido permanentemente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{blocked ? 'Entendi' : 'Cancelar'}</AlertDialogCancel>
            {!blocked && (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); deleteMutation.mutate(deleteTarget.id); }}
                disabled={deleteMutation.isPending}
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}