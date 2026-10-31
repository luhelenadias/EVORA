import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERFIS, ROLE_LABELS } from '@/lib/roles';
import { ESPECIALIDADES, NIVEIS_TECNICOS, PERFIL_TECNICO, SITUACOES, situacaoDoUsuario } from '@/lib/tecnicos';

const vazio = {
  nome: '',
  role: 'clinico',
  situacao: 'Ativo',
  especialidade: '',
  nivel: '',
  phone: '',
  department: '',
};

/** Edição do usuário: tipo, situação e — só para a equipe técnica — especialidade e nível. */
export default function UsuarioDialog({ usuario, onClose, onSalvar, salvando }) {
  const [form, setForm] = useState(vazio);

  useEffect(() => {
    if (!usuario) return;
    setForm({
      nome: usuario.nome_completo || usuario.full_name || '',
      role: usuario.role || 'clinico',
      situacao: situacaoDoUsuario(usuario),
      especialidade: usuario.especialidade || '',
      nivel: usuario.nivel || '',
      phone: usuario.phone || '',
      department: usuario.department || '',
    });
  }, [usuario]);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const ehTecnico = form.role === PERFIL_TECNICO;

  return (
    <Dialog open={!!usuario} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Editar usuário</DialogTitle>
        </DialogHeader>

        {usuario && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input value={form.nome} onChange={(evento) => alterar('nome', evento.target.value)} />
              <p className="text-[11px] text-muted-foreground">
                A própria pessoa também pode ajustar esse nome em Meu perfil. Conta: {usuario.email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-1.5">
                <Label className="text-xs">Situação</Label>
                <Select value={form.situacao} onValueChange={(valor) => alterar('situacao', valor)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITUACOES.map((situacao) => (
                      <SelectItem key={situacao} value={situacao}>{situacao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ehTecnico && (
                <>
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
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.phone} onChange={(evento) => alterar('phone', evento.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Setor</Label>
                <Input value={form.department} onChange={(evento) => alterar('department', evento.target.value)} />
              </div>
            </div>

            {ehTecnico && form.situacao !== 'Ativo' && (
              <p className="text-xs text-muted-foreground">
                Quem não está Ativo continua no histórico, mas não recebe novos chamados.
              </p>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => onSalvar(form)} disabled={salvando}>Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}