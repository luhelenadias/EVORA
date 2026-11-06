import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Wrench, Monitor, FileText,
  ClipboardList, Settings, ChevronLeft, ChevronRight,
  Package, LogOut, Menu, X, BarChart2, UserCog, ScrollText, UserRound } from
'lucide-react';
import EvoraLogo from '@/components/brand/EvoraLogo';
import { ROLES, ROLE_LABELS, abasDoUsuario } from '@/lib/roles';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { nomeDaPessoa } from '@/lib/tecnicos';
import { iniciaisDoNome } from '@/lib/preventivas';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Ícone de cada aba (as abas em si vêm de src/lib/roles.js). */
const ICONES = {
  chamados: ClipboardList,
  equipamentos: Monitor,
  manutencoes: Wrench,
  contratos: FileText,
  pecas: Package,
  indicadores: BarChart2,
  usuarios: UserCog,
  configuracoes: Settings
};

/** Abas que já estão na barra inferior do celular: não se repetem no menu lateral (abaixo de 768px). */
const ABAS_NA_BARRA_INFERIOR = ['indicadores', 'chamados', 'equipamentos'];

export default function Sidebar({ user, onCollapsedChange }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapsedChange?.(next);
  };

  const userRole = user?.role || ROLES.CLINICO;
  const eAdmin = userRole === ROLES.ADMIN;
  const nomeUsuario = nomeDaPessoa(user);
  const { config } = useConfiguracao();

  // Abas liberadas: as individuais do usuário ou, sem personalização, as do perfil.
  const menuItems = abasDoUsuario(config, user || { role: userRole }).map((aba) => ({
    ...aba,
    icon: ICONES[aba.key] || ClipboardList
  }));

  const temExtras = menuItems.some((item) => !ABAS_NA_BARRA_INFERIOR.includes(item.key));

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const SidebarContent = () =>
  <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
      "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
      collapsed && "justify-center px-2"
    )}>
        <EvoraLogo tone="light" compact={collapsed} showSubtitle={false} className="min-w-0 text-sidebar-foreground" symbolClassName={collapsed ? 'h-7 w-[45px]' : 'h-9 w-[58px]'} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 md:hidden">
          Mais opções
        </p>
        {!temExtras && (
          <p className="px-3 text-xs text-sidebar-foreground/70 md:hidden">
            Início, chamados e perfil estão na barra inferior.
          </p>
        )}
        {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.key}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              ABAS_NA_BARRA_INFERIOR.includes(item.key) && "max-md:hidden",
              active ?
              "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" :
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}>
            
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>);

      })}
      </nav>

      {/* User section */}
      <div className={cn(
      "border-t border-sidebar-border p-3",
      collapsed && "px-2"
    )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Menu do usuário"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg bg-transparent px-2 py-2 text-left transition-colors hover:bg-sidebar-accent",
                collapsed && "justify-center px-1"
              )}>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
                {iniciaisDoNome(nomeUsuario)}
              </span>
              {!collapsed &&
              <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-sidebar-foreground">{nomeUsuario}</span>
                  <span className="block truncate text-[10px] text-sidebar-foreground/50">{ROLE_LABELS[userRole]}</span>
                </span>
              }
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <span className="block truncate font-medium">{nomeUsuario}</span>
              <span className="block truncate font-normal text-muted-foreground">{user?.email || ''}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 text-xs max-md:hidden">
              <Link to="/meu-perfil" onClick={() => setMobileOpen(false)}>
                <UserRound className="h-3.5 w-3.5" /> Meu perfil
              </Link>
            </DropdownMenuItem>
            {eAdmin && (
              <DropdownMenuItem asChild className="gap-2 text-xs">
                <Link to="/auditoria" onClick={() => setMobileOpen(false)}>
                  <ScrollText className="h-3.5 w-3.5" /> Auditoria
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse button - desktop only */}
      <button
      onClick={toggleCollapsed}
      className="hidden lg:flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
      
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>;


  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden top-safe fixed left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm">
        
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen &&
      <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="pt-safe relative w-64 bg-sidebar text-sidebar-foreground shadow-xl">
            <button
            onClick={() => setMobileOpen(false)}
            className="top-safe absolute right-3 z-10 text-sidebar-foreground/70">
            
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      }

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
      </aside>
    </>);

}