import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Monitor, Users, FileText,
  ClipboardList, Settings, ChevronLeft, ChevronRight,
  PlusCircle, CalendarDays, Package, LogOut, Menu, X, BarChart2, UserCog, BellRing } from
'lucide-react';
import EvoraLogo from '@/components/brand/EvoraLogo';
import { ROLES, ROLE_LABELS, abasDoPerfil } from '@/lib/roles';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Ícone de cada aba (as abas em si vêm de src/lib/roles.js). */
const ICONES = {
  dashboard: LayoutDashboard,
  alertas: BellRing,
  chamados: ClipboardList,
  abrir_chamado: PlusCircle,
  equipamentos: Monitor,
  manutencoes: Wrench,
  preventivas: CalendarDays,
  equipe: Users,
  contratos: FileText,
  pecas: Package,
  indicadores: BarChart2,
  usuarios: UserCog,
  configuracoes: Settings
};

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
  const { config } = useConfiguracao();

  // Abas liberadas para o perfil — definidas em Configurações → Acessos por Perfil.
  const menuItems = abasDoPerfil(config, userRole).map((aba) => ({
    ...aba,
    icon: ICONES[aba.key] || ClipboardList
  }));

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
        {!collapsed &&
      <div className="mb-2 px-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{ROLE_LABELS[userRole]}</p>
          </div>
      }
        <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className={cn(
          "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
          collapsed ? "justify-center px-2" : "justify-start gap-2"
        )}>
        
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sair"}
        </Button>
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
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm">
        
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen &&
      <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-sidebar text-sidebar-foreground shadow-xl">
            <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3 right-3 text-sidebar-foreground/70">
            
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