/**
 * Equipe técnica = usuários com perfil 'tecnico'.
 * Toda referência a técnico (OS, alertas, equipamento, agenda, auditoria)
 * guarda o ID do usuário; aqui o registro vem no formato das telas de agenda.
 */

export const PERFIL_TECNICO = 'tecnico';

export function situacaoDoUsuario(usuario: any) {
  return usuario?.situacao || 'Ativo';
}

export function comoTecnico(usuario: any) {
  return {
    id: usuario?.id || '',
    name: usuario?.full_name || usuario?.email || 'Técnico',
    email: usuario?.email || '',
    phone: usuario?.phone || '',
    status: situacaoDoUsuario(usuario),
    specialty: usuario?.especialidade || '',
    level: usuario?.nivel || '',
  };
}

/** Equipe técnica cadastrada, lida com permissão de serviço (a tela pode ser de técnico). */
export async function listarTecnicos(base44: any) {
  const usuarios = await base44.asServiceRole.entities.User.list();
  return (usuarios || []).filter((u: any) => u.role === PERFIL_TECNICO).map(comoTecnico);
}