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

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => base44.entities.Alerta.list(),
    enabled: !!user,
  });

  const role = user?.role || 'clinico';

  // O técnico é o próprio usuário: os alertas guardam o ID da conta.
  const tecnico = role === 'tecnico' ? user : null;

  const visiveis = useMemo(
    () => alertas.filter((a) => alertaVisivel(a, role, user?.id)),
    [alertas, role, user]
  );

  const ativos = useMemo(() => visiveis.filter(alertaAtivo), [visiveis]);
  const novos = useMemo(() => ativos.filter((a) => a.status === 'Novo'), [ativos]);

  return { user, role, tecnico, alertas: visiveis, ativos, novos, isLoading };
}