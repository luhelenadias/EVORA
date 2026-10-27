import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { ROLES, abaPermitida, abasDoPerfil } from '@/lib/roles';
import Sidebar from './Sidebar';
import SemAcesso from './SemAcesso';
import AlertasBell from '@/components/alertas/AlertasBell';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { config, isLoading } = useConfiguracao();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
  const carregando = isLoading || !user;
  const liberada = carregando || !!abaPermitida(config, role, location.pathname);

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
            <Outlet context={{ user }} />
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