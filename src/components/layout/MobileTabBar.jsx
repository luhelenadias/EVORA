import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Home, ClipboardList, Monitor, Wrench, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { abasDoUsuario } from '@/lib/roles';
import { destinoDaAba, raizDaAba, registrarLocal, reiniciarAba } from '@/lib/tabStack';

/**
 * Destinos da barra inferior — os cinco módulos do aplicativo portátil.
 * Contratos, usuários e configurações ficam no desktop; o perfil abre pelo
 * atalho no topo da tela.
 */
const DESTINOS = [
  { key: 'indicadores', label: 'Início', path: '/', icon: Home },
  { key: 'chamados', label: 'Chamados', path: '/chamados', icon: ClipboardList },
  { key: 'equipamentos', label: 'Equip.', path: '/equipamentos', icon: Monitor },
  { key: 'manutencoes', label: 'Manutenção', path: '/manutencoes', icon: Wrench },
  { key: 'pecas', label: 'Peças', path: '/pecas', icon: Package },
];

/**
 * Barra de navegação inferior do aplicativo (Android/iOS).
 * Aparece apenas abaixo de 768px; no desktop a barra lateral continua sendo o menu.
 *
 * Cada aba mantém a própria pilha de navegação (src/lib/tabStack.js): ao voltar para uma aba,
 * ela reabre onde estava; tocar na aba já ativa volta para a raiz dela.
 */
export default function MobileTabBar({ user, config }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tipoNavegacao = useNavigationType();
  const chaves = abasDoUsuario(config, user).map((aba) => aba.key);

  const itens = DESTINOS.filter((item) => chaves.includes(item.key));

  // Registra cada local visitado na pilha da aba a que ele pertence.
  useEffect(() => {
    registrarLocal(location.pathname, location.search, tipoNavegacao);
  }, [location.pathname, location.search, tipoNavegacao]);

  const abaAtual = raizDaAba(location.pathname);
  const ativo = (path) => abaAtual === path;

  const abrirAba = (evento, item) => {
    // Deixa o navegador agir em cliques com tecla modificadora (abrir em nova aba).
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
    evento.preventDefault();
    if (ativo(item.path)) {
      reiniciarAba(item.path);
      navigate(item.path);
    } else {
      navigate(destinoDaAba(item.path));
    }
  };

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
              onClick={(evento) => abrirAba(evento, item)}
              aria-current={atual ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 select-none touch-manipulation flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                atual ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={atual ? 2.4 : 1.8} />
              <span className="max-w-full truncate px-0.5 leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}