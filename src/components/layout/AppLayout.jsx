import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { ROLES, abaPermitida, abasDoPerfil } from '@/lib/roles';
import Sidebar from './Sidebar';
import SemAcesso from './SemAcesso';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { config, isLoading } = useConfiguracao();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">
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