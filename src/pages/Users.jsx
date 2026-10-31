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
import { PERFIL_TECNICO, nomeDaPessoa, situacaoDoUsuario } from '@/lib/tecnicos';
import { rotulosDeAcessos } from '@/lib/roles';
import { registrarAuditoria } from '@/lib/auditoria';

const CONVITE_PENDENTE = 'Convite pendente';

/**
 * Tela única de pessoas: quem é da equipe técnica é um usuário com perfil
 * técnico — especialidade, nível e situação ficam no próprio cadastro.
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
      return { usuarios: usuarios || [], convites: convites || [] };
    },
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    queryClient.invalidateQueries({ queryKey: ['usuarios-tecnicos'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const linhas = useMemo(() => {
    const pessoas = data.usuarios.map((usuario) => ({
      key: usuario.id,
      usuario,
      nome: nomeDaPessoa(usuario),
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
      nome: convite.nome || 'Convite sem nome',
      email: convite.email,
      role: convite.role || 'clinico',
      situacao: CONVITE_PENDENTE,
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

  /** Perfil e situação só mudam pelo administrador — e isso fica no log. */
  const auditarPerfil = async (usuario, campo, anterior, novo) => {
    if (String(anterior || '') === String(novo || '')) return;
    await registrarAuditoria({
      entidade_tipo: 'User',
      entidade_id: usuario.id,
      entidade_codigo: usuario.email || '',
      acao: 'Mudança de perfil',
      campo,
      valor_anterior: anterior || '',
      valor_novo: novo || '',
      motivo: `Alterado pelo administrador · ${nomeDaPessoa(usuario)}`,
    });
  };

  /** Aviso personalizado com o nome; o e-mail de acesso é o do convite. */
  const enviarEmailDeConvite = async ({ nome, email, role }) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        template_name: 'ConviteUsuario',
        variables: { nome, email, tipo: role },
        category: 'transactional',
      });
      return true;
    } catch {
      return false;
    }
  };

  const convidar = async (form, fechar) => {
    const email = form.email.trim().toLowerCase();
    const nome = form.nome.trim();
    if (!nome) {
      toast.error('Informe o nome completo de quem vai ser convidado');
      return;
    }
    setEnviandoConvite(true);
    try {
      await base44.users.inviteUser(email, form.role === 'admin' ? 'admin' : 'user');
      await base44.entities.ConviteUsuario.create({
        email,
        nome,
        role: form.role,
        especialidade: form.especialidade || '',
        nivel: form.nivel || '',
        convidado_em: new Date().toISOString(),
      });
      const enviado = await enviarEmailDeConvite({ nome, email, role: form.role });
      fechar();
      toast.success(
        enviado
          ? `Convite enviado para ${nome} (${email})`
          : `Convite registrado para ${email}. O e-mail de acesso é o do convite do sistema.`
      );
      recarregar();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível enviar o convite');
    } finally {
      setEnviandoConvite(false);
    }
  };

  const salvarUsuario = async (form) => {
    if (!editando) return;
    const usuario = editando.usuario;
    const ehTecnico = form.role === PERFIL_TECNICO;
    setSalvando(true);
    try {
      // Valor de partida lido na hora: duas edições seguidas não perdem o registro no log.
      const antes = await base44.entities.User.get(usuario.id).catch(() => usuario);
      // Acessos próprios só quando personalizados; vazio = segue o perfil.
      const acessos = form.acessos?.personalizado ? form.acessos.chaves : [];
      await base44.entities.User.update(usuario.id, {
        nome_completo: form.nome.trim(),
        role: form.role,
        situacao: form.situacao,
        especialidade: ehTecnico ? form.especialidade : usuario.especialidade || '',
        nivel: ehTecnico ? form.nivel : usuario.nivel || '',
        phone: form.phone,
        department: form.department,
        acessos_individuais: acessos,
      });
      await auditarPerfil(usuario, 'role', antes.role, form.role);
      await auditarPerfil(usuario, 'situacao', situacaoDoUsuario(antes), form.situacao);
      await auditarPerfil(
        usuario,
        'acessos',
        rotulosDeAcessos(antes.acessos_individuais),
        rotulosDeAcessos(acessos)
      );
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
    try {
      const antes = await base44.entities.User.get(usuario.id).catch(() => usuario);
      await base44.entities.User.update(usuario.id, { situacao });
      await auditarPerfil(usuario, 'situacao', situacaoDoUsuario(antes), situacao);
      toast.success(situacao === 'Inativo' ? 'Usuário desativado — histórico preservado' : 'Usuário reativado');
      recarregar();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível alterar a situação');
    }
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
      await enviarEmailDeConvite({ nome: linha.convite.nome || linha.nome, email: linha.email, role: linha.role });
      toast.success(`Convite reenviado para ${linha.email}`);
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível reenviar o convite');
    }
  };

  const cancelarConvite = async (linha) => {
    try {
      await base44.entities.ConviteUsuario.delete(linha.convite.id);
      toast.success('Convite cancelado');
      recarregar();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível cancelar o convite');
    }
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