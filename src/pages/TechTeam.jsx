import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Search, Pencil, Phone, Mail } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function TechTeam() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['techTeam'],
    queryFn: () => base44.entities.TechTeam.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TechTeam.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['techTeam'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TechTeam.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['techTeam'] }); setShowForm(false); setEditingItem(null); },
  });

  const filtered = team.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const [form, setForm] = useState({});

  const openForm = (item) => {
    setEditingItem(item);
    setForm({
      name: item?.name || '',
      email: item?.email || '',
      phone: item?.phone || '',
      specialty: item?.specialty || '',
      level: item?.level || '',
      status: item?.status || 'Ativo',
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" />{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Equipe Técnica" subtitle={`${team.length} técnicos cadastrados`} onAdd={() => openForm(null)} addLabel="Novo Técnico" />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou especialidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum técnico encontrado" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{t.specialty}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{t.level}</Badge>
                    </div>
                  </div>
                  <StatusBadge value={t.status} />
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {t.email && (
                    <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{t.email}</div>
                  )}
                  {t.phone && (
                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{t.phone}</div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openForm(t)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? 'Editar Técnico' : 'Novo Técnico'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Especialidade *</Label>
                <Select value={form.specialty} onValueChange={v => setForm(p => ({...p, specialty: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elétrica">Elétrica</SelectItem>
                    <SelectItem value="Mecânica">Mecânica</SelectItem>
                    <SelectItem value="Biomédica">Biomédica</SelectItem>
                    <SelectItem value="TI">TI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nível</Label>
                <Select value={form.level} onValueChange={v => setForm(p => ({...p, level: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Júnior">Júnior</SelectItem>
                    <SelectItem value="Pleno">Pleno</SelectItem>
                    <SelectItem value="Sênior">Sênior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em Férias">Em Férias</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
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