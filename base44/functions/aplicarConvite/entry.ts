import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Primeiro acesso de quem foi convidado: aplica ao perfil o que foi combinado
 * no convite (tipo de usuário, nome completo, especialidade e nível) e encerra
 * o convite. Só mexe no próprio usuário autenticado.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ aplicado: false });

    const email = String(user.email || '').trim().toLowerCase();
    if (!email) return Response.json({ aplicado: false });

    const convites = await base44.asServiceRole.entities.ConviteUsuario.list();
    const convite = (convites || []).find(
      (c: any) => String(c.email || '').trim().toLowerCase() === email
    );
    if (!convite) return Response.json({ aplicado: false });

    const nome = String(convite.nome || '').trim();
    const dados: any = {};
    if (convite.role) dados.role = convite.role;
    if (nome && !String(user.nome_completo || '').trim()) dados.nome_completo = nome;
    if (convite.especialidade) dados.especialidade = convite.especialidade;
    if (convite.nivel) dados.nivel = convite.nivel;
    if (!user.situacao) dados.situacao = 'Ativo';

    if (Object.keys(dados).length) {
      await base44.asServiceRole.entities.User.update(user.id, dados);
    }
    await base44.asServiceRole.entities.ConviteUsuario.delete(convite.id);

    return Response.json({ aplicado: true, role: dados.role || user.role || null });
  } catch (error) {
    return Response.json({ aplicado: false, error: error.message });
  }
}