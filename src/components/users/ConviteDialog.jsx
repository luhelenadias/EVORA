import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERFIS, ROLE_LABELS } from '@/lib/roles';
import { ESPECIALIDADES, NIVEIS_TECNICOS, PERFIL_TECNICO } from '@/lib/tecnicos';

/** Convite de usuário: e-mail, tipo e, para a equipe técnica, especialidade e nível. */
export default function ConviteDialog({ open, onClose, onConvidar, enviando }) {
  const [form, setForm] = useState({ email: '', role: 'tecnico', especialidade: '', nivel: '' });

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const ehTecnico = form.role === PERFIL_TECNICO;

  const fechar = () => {
    setForm({ email: '', role: 'tecnico', especialidade: '', nivel: '' });
    onClose();
  };

  const enviar = (evento) => {
    evento.preventDefault();
    onConvidar(form, fechar);
  };

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Convidar usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(evento) => alterar('email', evento.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de usuário</Label>
            <Select value={form.role} onValueChange={(valor) => alterar('role', valor)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERFIS.map((perfil) => (
                  <SelectItem key={perfil} value={perfil}>{ROLE_LABELS[perfil]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ehTecnico && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Especialidade</Label>
                <Select value={form.especialidade || 'sem'} onValueChange={(valor) => alterar('especialidade', valor === 'sem' ? '' : valor)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Não informada</SelectItem>
                    {ESPECIALIDADES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nível</Label>
                <Select value={form.nivel || 'sem'} onValueChange={(valor) => alterar('nivel', valor === 'sem' ? '' : valor)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Não informado</SelectItem>
                    {NIVEIS_TECNICOS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            A pessoa recebe o convite por e-mail e aparece como "Convite pendente" até entrar.
          </p>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" className="gap-1.5" disabled={enviando}>
              <UserPlus className="h-4 w-4" /> Enviar convite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}