import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { ROLES, abaPermitida, abasDoPerfil } from '@/lib/roles';
import Sidebar from './Sidebar';
import SemAcesso from './SemAcesso';
import AlertasBell from '@/components/alertas/AlertasBell';

/** Rotas que não são abas da barra lateral, mas todo mundo acessa. */
const ROTAS_SEMPRE_LIBERADAS = ['/meu-perfil'];

/** Rotas fora do menu, liberadas apenas para o perfil administrador (auditoria). */
const ROTAS_SOMENTE_ADMIN = ['/auditoria'];

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { config, isLoading } = useConfiguracao();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: carregandoUsuario, refetch: recarregarUsuario } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const atual = await base44.auth.me();
      // Primeiro acesso de quem foi convidado: aplica o convite no próprio perfil.
      const resposta = await base44.functions.invoke('aplicarConvite', {}).catch(() => null);
      return resposta?.data?.aplicado ? base44.auth.me() : atual;
    },
  });

  // Verificação de alertas ao abrir o app (uma vez por sessão; a rotina diária cobre o resto).
  useEffect(() => {
    if (sessionStorage.getItem('alertas:verificados')) return;
    sessionStorage.setItem('alertas:verificados', '1');
    base44.functions
      .invoke('verificarAlertas', {})
      .then(() => queryClient.invalidateQueries({ queryKey: ['alertas'] }))
      .catch(() => {});
  }, [queryClient]);

  const role = user?.role || ROLES.CLINICO;
  const abas = abasDoPerfil(config, role);
  // Enquanto usuário/configuração carregam, não decide acesso (evita bloquear por engano).
  const carregando = isLoading || carregandoUsuario || !user;
  const liberada =
    carregando ||
    ROTAS_SEMPRE_LIBERADAS.includes(location.pathname) ||
    (role === ROLES.ADMIN && ROTAS_SOMENTE_ADMIN.includes(location.pathname)) ||
    !!abaPermitida(config, role, location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} onCollapsedChange={setSidebarCollapsed} />
      <main
        className={cn('min-h-screen transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60')}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <AlertasBell />
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          {liberada ? (
            <Outlet context={{ user, recarregarUsuario }} />
          ) : location.pathname === '/' && abas[0] ? (
            <Navigate to={abas[0].path} replace />
          ) : (
            <SemAcesso abas={abas} perfil={role} />
          )}
        </div>
      </main>
    </div>
  );
}