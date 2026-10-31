import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import UsuariosFiltros, { FILTROS_USUARIOS_INICIAIS } from '@/components/users/UsuariosFiltros';
import UsuariosTabela from '@/components/users/UsuariosTabela';
import UsuarioDialog from '@/components/users/UsuarioDialog';
import ConviteDialog from '@/components/users/ConviteDialog';
import { PERFIL_TECNICO, situacaoDoUsuario } from '@/lib/tecnicos';

const SEM_ACESSO = 'Convite pendente';

/**
 * Tela única de pessoas: substitui a antiga Equipe Técnica. Quem é da equipe
 * técnica é um usuário com perfil técnico — especialidade, nível e situação
 * ficam no próprio cadastro.
 */
export default function Users() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState(FILTROS_USUARIOS_INICIAIS);
  const [editando, setEditando] = useState(null);
  const [convidando, setConvidando] = useState(false);
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [desativando, setDesativando] = useState(null);

  const { data = { usuarios: [], convites: [] }, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const [usuarios, convites] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.ConviteUsuario.list(),
      ]);

      // Quem foi convidado e já entrou recebe o tipo combinado no convite.
      const pendentes = [];
      let repontar = false;
      for (const convite of convites || []) {
        const email = String(convite.email || '').toLowerCase();
        const pessoa = (usuarios || []).find((u) => String(u.email || '').toLowerCase() === email);
        if (!pessoa) {
          pendentes.push(convite);
          continue;
        }
        await base44.entities.User.update(pessoa.id, {
          role: convite.role,
          ...(convite.especialidade ? { especialidade: convite.especialidade } : {}),
          ...(convite.nivel ? { nivel: convite.nivel } : {}),
        });
        await base44.entities.ConviteUsuario.delete(convite.id);
        repontar = true;
      }

      // Convite herdado da antiga Equipe Técnica: ao entrar, o histórico antigo
      // (OS, alertas, agenda) passa a apontar para o ID do usuário.
      if (repontar) await base44.functions.invoke('migrarEquipeTecnica', {}).catch(() => {});

      return { usuarios: usuarios || [], convites: pendentes };
    },
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] });

  const linhas = useMemo(() => {
    const pessoas = data.usuarios.map((usuario) => ({
      key: usuario.id,
      usuario,
      nome: usuario.full_name || 'Sem nome cadastrado',
      email: usuario.email,
      role: usuario.role || 'clinico',
      situacao: situacaoDoUsuario(usuario),
      especialidade: usuario.especialidade || '',
      nivel: usuario.nivel || '',
      department: usuario.department || '',
      convitePendente: false,
    }));

    const convites = data.convites.map((convite) => ({
      key: `convite-${convite.id}`,
      convite,
      nome: convite.nome || 'Convite enviado',
      email: convite.email,
      role: convite.role || 'clinico',
      situacao: SEM_ACESSO,
      especialidade: convite.especialidade || '',
      nivel: convite.nivel || '',
      department: '',
      convitePendente: true,
    }));

    const termo = filtros.busca.trim().toLowerCase();
    return [...pessoas, ...convites]
      .filter((linha) => !filtros.tipo.length || filtros.tipo.includes(linha.role))
      .filter((linha) => !filtros.situacao.length || filtros.situacao.includes(linha.situacao))
      .filter(
        (linha) =>
          !termo ||
          linha.nome.toLowerCase().includes(termo) ||
          String(linha.email || '').toLowerCase().includes(termo)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, filtros]);

  const convidar = async (form, fechar) => {
    const email = form.email.trim().toLowerCase();
    setEnviandoConvite(true);
    try {
      await base44.users.inviteUser(email, form.role === 'admin' ? 'admin' : 'user');
      await base44.entities.ConviteUsuario.create({
        email,
        nome: '',
        role: form.role,
        especialidade: form.especialidade || '',
        nivel: form.nivel || '',
        convidado_em: new Date().toISOString(),
      });
      fechar();
      toast.success(`Convite enviado para ${email}`);
      recarregar();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível enviar o convite');
    } finally {
      setEnviandoConvite(false);
    }
  };

  const salvarUsuario = async (form) => {
    if (!editando) return;
    setSalvando(true);
    try {
      await base44.entities.User.update(editando.usuario.id, {
        role: form.role,
        situacao: form.situacao,
        especialidade: form.role === PERFIL_TECNICO ? form.especialidade : editando.usuario.especialidade || '',
        nivel: form.role === PERFIL_TECNICO ? form.nivel : editando.usuario.nivel || '',
        phone: form.phone,
        department: form.department,
      });
      setEditando(null);
      toast.success('Usuário atualizado');
      recarregar();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  };

  const mudarSituacao = async (usuario, situacao) => {
    await base44.entities.User.update(usuario.id, { situacao });
    toast.success(situacao === 'Inativo' ? 'Usuário desativado — histórico preservado' : 'Usuário reativado');
    recarregar();
  };

  const desativar = async () => {
    if (!desativando) return;
    await mudarSituacao(desativando.usuario, 'Inativo');
    setDesativando(null);
  };

  const reenviarConvite = async (linha) => {
    try {
      await base44.users.inviteUser(linha.email, linha.role === 'admin' ? 'admin' : 'user');
      await base44.entities.ConviteUsuario.update(linha.convite.id, {
        convidado_em: new Date().toISOString(),
      });
      toast.success(`Convite reenviado para ${linha.email}`);
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível reenviar o convite');
    }
  };

  const cancelarConvite = async (linha) => {
    await base44.entities.ConviteUsuario.delete(linha.convite.id);
    toast.success('Convite cancelado');
    recarregar();
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  const tecnicosAtivos = data.usuarios.filter(
    (u) => u.role === PERFIL_TECNICO && situacaoDoUsuario(u) === 'Ativo'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle={`${data.usuarios.length} usuário(s) · ${data.convites.length} convite(s) pendente(s) · ${tecnicosAtivos} na equipe técnica ativa`}
        onAdd={() => setConvidando(true)}
        addLabel="Convidar usuário"
      />

      <Card>
        <div className="p-4">
          <UsuariosFiltros filtros={filtros} onChange={setFiltros} />
        </div>
      </Card>

      {linhas.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nenhuma pessoa com esses filtros"
          description="Ajuste o tipo, a situação ou a busca para encontrar quem procura."
        />
      ) : (
        <Card>
          <UsuariosTabela
            linhas={linhas}
            onEditar={setEditando}
            onDesativar={setDesativando}
            onReativar={(linha) => mudarSituacao(linha.usuario, 'Ativo')}
            onReenviarConvite={reenviarConvite}
            onCancelarConvite={cancelarConvite}
          />
        </Card>
      )}

      <UsuarioDialog
        usuario={editando?.usuario || null}
        onClose={() => setEditando(null)}
        onSalvar={salvarUsuario}
        salvando={salvando}
      />

      <ConviteDialog
        open={convidando}
        onClose={() => setConvidando(false)}
        onConvidar={convidar}
        enviando={enviandoConvite}
      />

      <AlertDialog open={!!desativando} onOpenChange={(aberto) => !aberto && setDesativando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar este usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {desativando?.nome} sai da equipe ativa, mas o histórico de chamados, agenda e auditoria continua intacto.
              Nada é excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desativar}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}