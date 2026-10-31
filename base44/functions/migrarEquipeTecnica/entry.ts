import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { comoTecnico } from '../../shared/tecnicos.ts';

/**
 * Migração única da fusão Equipe Técnica -> Usuários.
 *
 * - Copia especialidade, nível, situação e telefone do TechTeam para o usuário
 *   correspondente (vinculado por user_id ou pelo e-mail) e marca o perfil como técnico.
 * - Reponta as referências de técnico (OS, alertas, equipamentos, sugestões,
 *   auditoria, fila de notificações) do ID do TechTeam para o ID do usuário.
 * - NÃO apaga nenhum registro de TechTeam.
 *
 * Rodar quantas vezes for preciso: o que já aponta para usuário não casa mais
 * com nenhum ID de TechTeam e fica intocado.
 */
async function repontar(entidade: any, filtro: any, dados: any) {
  const total = await entidade.count(filtro).catch(() => 0);
  if (!total) return 0;
  await entidade.updateMany(filtro, { $set: dados });
  return total;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores' }, { status: 403 });

    const [equipe, usuarios, convites] = await Promise.all([
      base44.asServiceRole.entities.TechTeam.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.ConviteUsuario.list(),
    ]);

    const relatorio: any = {
      equipe_tecnica: (equipe || []).length,
      usuarios_atualizados: 0,
      convites_criados: 0,
      sem_usuario_vinculado: [] as string[],
      referencias: { ordens: 0, alertas: 0, equipamentos: 0, sugestoes: 0, auditoria: 0, notificacoes: 0 },
    };

    const pares: Array<{ tecnico: any; usuario: any }> = [];

    for (const tecnico of equipe || []) {
      const email = String(tecnico.email || '').toLowerCase();
      const porVinculo = tecnico.user_id ? (usuarios || []).find((u: any) => u.id === tecnico.user_id) : null;
      const porEmail = email ? (usuarios || []).find((u: any) => String(u.email || '').toLowerCase() === email) : null;
      const usuario = porVinculo || porEmail || null;

      if (!usuario) {
        relatorio.sem_usuario_vinculado.push(tecnico.name || tecnico.email || tecnico.id);
        // Sem conta ainda: a ficha fica como convite pendente, com especialidade e nível.
        if (email) {
          const jaConvidado = (convites || []).find((c: any) => String(c.email || '').toLowerCase() === email);
          if (!jaConvidado) {
            await base44.asServiceRole.entities.ConviteUsuario.create({
              email,
              nome: tecnico.name || '',
              role: 'tecnico',
              especialidade: tecnico.specialty || '',
              nivel: tecnico.level || '',
              convidado_por: 'Migração da equipe técnica',
              convidado_em: new Date().toISOString(),
            });
            relatorio.convites_criados += 1;
          }
        }
        continue;
      }

      await base44.asServiceRole.entities.User.update(usuario.id, {
        role: 'tecnico',
        ...(tecnico.specialty ? { especialidade: tecnico.specialty } : {}),
        ...(tecnico.level ? { nivel: tecnico.level } : {}),
        ...(tecnico.status ? { situacao: tecnico.status } : {}),
        ...(tecnico.phone && !usuario.phone ? { phone: tecnico.phone } : {}),
      });

      relatorio.usuarios_atualizados += 1;
      pares.push({ tecnico, usuario });
    }

    for (const { tecnico, usuario } of pares) {
      const nome = comoTecnico(usuario).name;
      relatorio.referencias.ordens += await repontar(
        base44.asServiceRole.entities.ServiceOrder,
        { technician_id: tecnico.id },
        { technician_id: usuario.id, technician_name: nome }
      );
      relatorio.referencias.alertas += await repontar(
        base44.asServiceRole.entities.Alerta,
        { tecnico_id: tecnico.id },
        { tecnico_id: usuario.id }
      );
      relatorio.referencias.equipamentos += await repontar(
        base44.asServiceRole.entities.Equipment,
        { tecnico_padrao_id: tecnico.id },
        { tecnico_padrao_id: usuario.id }
      );
      relatorio.referencias.sugestoes += await repontar(
        base44.asServiceRole.entities.SugestaoAgenda,
        { tecnico_sugerido_id: tecnico.id },
        { tecnico_sugerido_id: usuario.id, tecnico_sugerido_nome: nome }
      );
      relatorio.referencias.auditoria += await repontar(
        base44.asServiceRole.entities.LogAuditoria,
        { tecnico_atribuido_id: tecnico.id },
        { tecnico_atribuido_id: usuario.id }
      );
      relatorio.referencias.notificacoes += await repontar(
        base44.asServiceRole.entities.NotificacaoAgenda,
        { tecnico_id: tecnico.id },
        { tecnico_id: usuario.id, tecnico_nome: nome, tecnico_email: usuario.email || '' }
      );
    }

    return Response.json(relatorio);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}