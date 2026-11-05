import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import ExcluirContaCard from '@/components/profile/ExcluirContaCard';
import { ROLE_LABELS } from '@/lib/roles';
import {
  ESPECIALIDADES, NIVEIS_TECNICOS, PERFIL_TECNICO, nomeDaPessoa, situacaoDoUsuario,
} from '@/lib/tecnicos';

/**
 * Meu perfil: a própria pessoa edita nome, telefone, setor e — na equipe
 * técnica — especialidade e nível. Tipo de usuário e situação são definidos
 * pelo administrador.
 */
export default function MeuPerfil() {
  const { user, recarregarUsuario } = useOutletContext() || {};
  const [form, setForm] = useState({ nome: '', phone: '', department: '', especialidade: '', nivel: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      nome: user.nome_completo || user.full_name || '',
      phone: user.phone || '',
      department: user.department || '',
      especialidade: user.especialidade || '',
      nivel: user.nivel || '',
    });
  }, [user]);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  if (!user) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  const ehTecnico = user.role === PERFIL_TECNICO;

  const salvar = async () => {
    setSalvando(true);
    try {
      await base44.auth.updateMe({
        nome_completo: form.nome.trim(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        ...(ehTecnico ? { especialidade: form.especialidade || '', nivel: form.nivel || '' } : {}),
      });
      await recarregarUsuario?.();
      toast.success('Seus dados foram atualizados');
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível salvar seus dados');
    } finally {
      setSalvando(false);
    }
  };

  const nomeExibido = nomeDaPessoa(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        subtitle={`${nomeExibido} · ${ROLE_LABELS[user.role] || user.role}`}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-sm">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Nome completo</Label>
              <Input value={form.nome} onChange={(e) => alterar('nome', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={(e) => alterar('phone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Setor / Departamento</Label>
              <Input value={form.department} onChange={(e) => alterar('department', e.target.value)} />
            </div>

            {ehTecnico && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Especialidade</Label>
                  <Select
                    value={form.especialidade || 'sem'}
                    onValueChange={(valor) => alterar('especialidade', valor === 'sem' ? '' : valor)}
                  >
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
                  <Select
                    value={form.nivel || 'sem'}
                    onValueChange={(valor) => alterar('nivel', valor === 'sem' ? '' : valor)}
                  >
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
          </div>

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> E-mail da conta: {user.email}
            </p>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar meus dados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            {ROLE_LABELS[user.role] || user.role}
          </Badge>
          <Badge variant="outline">{situacaoDoUsuario(user)}</Badge>
          <p className="flex-1 min-w-[220px]">
            Tipo de usuário e situação são definidos pelo administrador. Fale com ele se precisar de mudança.
          </p>
        </CardContent>
      </Card>

      <ExcluirContaCard />
    </div>
  );
}