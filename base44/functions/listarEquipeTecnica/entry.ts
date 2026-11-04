import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Lista a equipe técnica (usuários com perfil "tecnico") para as telas de triagem,
 * agenda, calendário e indicadores.
 *
 * A leitura direta da entidade User só funciona para o administrador; a gestão, que
 * faz a triagem, recebia lista vazia. Aqui o servidor devolve apenas os campos
 * necessários para o trabalho, a qualquer pessoa autenticada. O e-mail só vai para
 * quem não é da Clínica.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const resposta: any = await base44.asServiceRole.entities.User.list();
    const todos: any[] = Array.isArray(resposta) ? resposta : resposta?.items || [];

    const veEmail = user.role !== 'clinico';
    const tecnicos = todos
      .filter((u) => u?.role === 'tecnico')
      .map((u) => ({
        id: u.id,
        role: u.role,
        full_name: u.full_name || '',
        nome_completo: u.nome_completo || '',
        especialidade: u.especialidade || '',
        nivel: u.nivel || '',
        situacao: u.situacao || 'Ativo',
        carga_horaria_mensal_h: u.carga_horaria_mensal_h ?? null,
        ...(veEmail ? { email: u.email || '', phone: u.phone || '' } : {}),
      }));

    return Response.json({ tecnicos });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao listar a equipe técnica' }, { status: 500 });
  }
}
