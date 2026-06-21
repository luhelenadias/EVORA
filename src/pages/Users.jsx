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
import { Settings, Search, Pencil, UserPlus } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/roles';
import { toast } from 'sonner';

const roleBadgeColors = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  tecnico: 'bg-amber-50 text-amber-700 border-amber-200',
  clinico: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  gestor: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function Users() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'clinico' });
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('Usuário atualizado!');
    },
  });

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    const roleMap = { admin: 'admin', tecnico: 'user', clinico: 'user', gestor: 'user' };
    await base44.users.inviteUser(inviteForm.email, roleMap[inviteForm.role] || 'user');
    toast.success('Convite enviado!');
    setShowInvite(false);
    setInviteForm({ email: '', role: 'clinico' });
  };

  const handleRoleUpdate = () => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: { role: editingUser.role } });
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" subtitle={`${users.length} usuários`} onAdd={() => setShowInvite(true)} addLabel="Convidar Usuário" />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Settings} title="Nenhum usuário encontrado" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold">E-mail</TableHead>
                  <TableHead className="text-xs font-semibold">Perfil</TableHead>
                  <TableHead className="text-xs font-semibold w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm">{u.full_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] border ${roleBadgeColors[u.role] || roleBadgeColors.clinico}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingUser({ ...u })}>
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

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Convidar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Perfil</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({...p, role: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="tecnico">Técnico de Manutenção</SelectItem>
                  <SelectItem value="clinico">Clínico</SelectItem>
                  <SelectItem value="gestor">Gestor de Eng. Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button type="submit" className="gap-1.5"><UserPlus className="w-4 h-4" /> Enviar Convite</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Perfil do Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{editingUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Perfil</Label>
                <Select value={editingUser.role || 'clinico'} onValueChange={v => setEditingUser(p => ({...p, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="tecnico">Técnico de Manutenção</SelectItem>
                    <SelectItem value="clinico">Clínico</SelectItem>
                    <SelectItem value="gestor">Gestor de Eng. Clínica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={handleRoleUpdate} disabled={updateMutation.isPending}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}