import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { ROLES, abaPermitidaDoUsuario, abasDoUsuario } from '@/lib/roles';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
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

  // Conta convidada cujo perfil ainda não foi aplicado (a plataforma cria como "user"):
  // o servidor recusa tudo para esse papel, então a tela não finge que é Clínica.
  const perfilPendente = !!user && !Object.values(ROLES).includes(user.role);

  // Enquanto o perfil não chega, tenta aplicar o convite de novo, a cada poucos segundos.
  useEffect(() => {
    if (!perfilPendente) return undefined;
    const timer = setInterval(() => { recarregarUsuario(); }, 5000);
    return () => clearInterval(timer);
  }, [perfilPendente, recarregarUsuario]);

  const role = user?.role || ROLES.CLINICO;
  const abas = abasDoUsuario(config, user);
  // Enquanto usuário/configuração carregam, não decide acesso (evita bloquear por engano).
  const carregando = isLoading || carregandoUsuario || !user;
  const liberada =
    carregando ||
    ROTAS_SEMPRE_LIBERADAS.includes(location.pathname) ||
    (role === ROLES.ADMIN && ROTAS_SOMENTE_ADMIN.includes(location.pathname)) ||
    !!abaPermitidaDoUsuario(config, user, location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} onCollapsedChange={setSidebarCollapsed} />
      <main
        className={cn('min-h-screen transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60')}
      >
        <header className="pt-safe sticky top-0 z-30 flex min-h-14 items-center justify-end border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <AlertasBell />
        </header>
        <div className="p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6 lg:p-8">
          {perfilPendente ? (
            <div className="mx-auto mt-16 max-w-md rounded-lg border border-border bg-card p-6 text-center">
              <h2 className="font-display text-lg font-semibold">Configurando o seu acesso</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu perfil ainda não foi aplicado à sua conta. Isso costuma levar poucos segundos depois do primeiro
                acesso. Se persistir, peça à administração para conferir o convite enviado para {user?.email}.
              </p>
              <button
                type="button"
                onClick={() => recarregarUsuario()}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Tentar novamente
              </button>
            </div>
          ) : liberada ? (
            <div key={location.pathname} className="animate-page-in">
              <Outlet context={{ user, recarregarUsuario }} />
            </div>
          ) : location.pathname === '/' && abas[0] ? (
            <Navigate to={abas[0].path} replace />
          ) : (
            <SemAcesso
              abas={abas}
              perfil={role}
              personalizado={!!(user?.acessos_individuais || []).length}
            />
          )}
        </div>
      </main>
      <MobileTabBar user={user} config={config} />
    </div>
  );
}