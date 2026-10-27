import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { alertaAtivo, alertaVisivel } from '@/lib/alertas';

/**
 * Alertas visíveis para o usuário logado: respeita o roteamento por perfil e,
 * para técnicos, apenas os alertas das suas próprias OS.
 */
export function useAlertas() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['techteam'],
    queryFn: () => base44.entities.TechTeam.list(),
    enabled: !!user,
  });

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => base44.entities.Alerta.list(),
    enabled: !!user,
  });

  const role = user?.role || 'clinico';

  const tecnico = useMemo(() => {
    if (role !== 'tecnico' || !user) return null;
    const email = (user.email || '').toLowerCase();
    return (
      tecnicos.find((t) => t.user_id === user.id) ||
      tecnicos.find((t) => t.email && t.email.toLowerCase() === email) ||
      null
    );
  }, [role, user, tecnicos]);

  const visiveis = useMemo(
    () => alertas.filter((a) => alertaVisivel(a, role, tecnico?.id)),
    [alertas, role, tecnico]
  );

  const ativos = useMemo(() => visiveis.filter(alertaAtivo), [visiveis]);
  const novos = useMemo(() => ativos.filter((a) => a.status === 'Novo'), [ativos]);

  return { user, role, tecnico, alertas: visiveis, ativos, novos, isLoading };
}