import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Monitor, Users, FileText,
  ClipboardList, Settings, ChevronLeft, ChevronRight,
  PlusCircle, Calendar, Package, LogOut, Menu, X, Activity
} from 'lucide-react';
import { ROLES, ROLE_LABELS } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const allMenuItems = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  chamados: { label: 'Chamados', icon: ClipboardList, path: '/chamados' },
  meus_chamados: { label: 'Meus Chamados', icon: ClipboardList, path: '/chamados' },
  abrir_chamado: { label: 'Abrir Chamado', icon: PlusCircle, path: '/chamados/novo' },
  equipamentos: { label: 'Equipamentos', icon: Monitor, path: '/equipamentos' },
  equipamentos_readonly: { label: 'Equipamentos', icon: Monitor, path: '/equipamentos' },
  equipe: { label: 'Equipe Técnica', icon: Users, path: '/equipe' },
  manutencoes: { label: 'Manutenções', icon: Wrench, path: '/manutencoes' },
  agenda_manutencoes: { label: 'Agenda', icon: Calendar, path: '/manutencoes' },
  contratos: { label: 'Contratos', icon: FileText, path: '/contratos' },
  contratos_readonly: { label: 'Contratos', icon: FileText, path: '/contratos' },
  pecas: { label: 'Peças', icon: Package, path: '/pecas' },
  usuarios: { label: 'Usuários', icon: Settings, path: '/usuarios' },
};

export default function Sidebar({ user }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = user?.role || ROLES.CLINICO;
  const roleMenuKeys = {
    admin: ['dashboard', 'chamados', 'equipamentos', 'equipe', 'manutencoes', 'contratos', 'pecas', 'usuarios'],
    gestor: ['dashboard', 'chamados', 'equipamentos_readonly', 'manutencoes', 'contratos_readonly'],
    tecnico: ['meus_chamados', 'agenda_manutencoes', 'equipamentos_readonly'],
    clinico: ['abrir_chamado', 'meus_chamados'],
  };

  const menuKeys = roleMenuKeys[userRole] || roleMenuKeys.clinico;
  const menuItems = menuKeys.map(k => ({ ...allMenuItems[k], key: k })).filter(Boolean);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-primary-foreground font-display truncate">MedEquip</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn(
        "border-t border-sidebar-border p-3",
        collapsed && "px-2"
      )}>
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{ROLE_LABELS[userRole]}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center px-2" : "justify-start gap-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sair"}
        </Button>
      </div>

      {/* Collapse button - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-sidebar text-sidebar-foreground shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-sidebar-foreground/70"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}