import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Equipe técnica agora é o próprio usuário: usuários com perfil 'tecnico' e os
 * campos especialidade, nivel e situacao. Aqui os usuários são apresentados no
 * formato que as telas de manutenção já usam (name / status), para que a agenda,
 * o calendário e as sugestões continuem funcionando com IDs de usuário.
 */

export const PERFIL_TECNICO = 'tecnico';

export const SITUACOES = ['Ativo', 'Em Férias', 'Afastado', 'Inativo'];

export const ESPECIALIDADES = ['Elétrica', 'Mecânica', 'Biomédica', 'TI'];

export const NIVEIS_TECNICOS = ['Júnior', 'Pleno', 'Sênior'];

export function situacaoDoUsuario(usuario) {
  return usuario?.situacao || 'Ativo';
}

/** Nome exibido da pessoa: o nome editável em Meu perfil, senão o da conta. */
export function nomeDaPessoa(usuario) {
  const nome = String(usuario?.nome_completo || usuario?.full_name || usuario?.email || '').trim();
  return nome || 'Sem nome';
}

/** Usuário no formato usado nas telas de manutenção. */
export function comoTecnico(usuario) {
  return {
    ...usuario,
    name: nomeDaPessoa(usuario),
    status: situacaoDoUsuario(usuario),
    specialty: usuario?.especialidade || '',
    level: usuario?.nivel || '',
  };
}

export function tecnicosDaLista(usuarios = []) {
  return (usuarios || []).filter((u) => u.role === PERFIL_TECNICO).map(comoTecnico);
}

export function tecnicosAtivosDaLista(usuarios = []) {
  return tecnicosDaLista(usuarios).filter((t) => t.status === 'Ativo');
}

/** Nome de exibição do técnico a partir do ID (usuário). */
export function nomeDoTecnico(id, tecnicos = []) {
  return tecnicos.find((t) => t.id === id)?.name || '';
}

/**
 * Equipe técnica disponível nas telas: por padrão todos (para exibir situação),
 * com `ativos` só os que podem receber chamados.
 */
export function useTecnicos({ ativos = false, enabled = true } = {}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['usuarios-tecnicos'],
    // Quem não é administrador não lê a lista completa: a tela segue sem equipe.
    queryFn: () => base44.entities.User.list().catch(() => []),
    enabled,
  });

  const tecnicos = useMemo(() => {
    const lista = tecnicosDaLista(data);
    return ativos ? lista.filter((t) => t.status === 'Ativo') : lista;
  }, [data, ativos]);

  return { tecnicos, isLoading };
}