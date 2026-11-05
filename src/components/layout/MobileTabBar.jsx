import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Monitor, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { abasDoUsuario } from '@/lib/roles';

/** Destinos da barra inferior (o Perfil é sempre liberado). */
const DESTINOS = [
  { key: 'indicadores', label: 'Início', path: '/', icon: Home },
  { key: 'chamados', label: 'Chamados', path: '/chamados', icon: ClipboardList },
  { key: 'equipamentos', label: 'Equipamentos', path: '/equipamentos', icon: Monitor },
];

const PERFIL = { key: 'perfil', label: 'Perfil', path: '/meu-perfil', icon: UserRound };

/**
 * Barra de navegação inferior do aplicativo (Android/iOS).
 * Aparece apenas abaixo de 768px; no desktop a barra lateral continua sendo o menu.
 */
export default function MobileTabBar({ user, config }) {
  const location = useLocation();
  const chaves = abasDoUsuario(config, user).map((aba) => aba.key);

  const itens = [
    ...DESTINOS.filter((item) => chaves.includes(item.key)),
    PERFIL,
  ];

  const ativo = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      <div className="flex items-stretch">
        {itens.map((item) => {
          const Icon = item.icon;
          const atual = ativo(item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex flex-1 select-none touch-manipulation flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                atual ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={atual ? 2.4 : 1.8} />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}