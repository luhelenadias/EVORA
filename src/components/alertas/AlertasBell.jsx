import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAlertas } from '@/hooks/useAlertas';
import { agruparAlertas } from '@/lib/alertas';
import AlertaItem from './AlertaItem';
import AlertaGrupo from './AlertaGrupo';
import AlertasDialog from './AlertasDialog';

/** Sino do topo: contagem de alertas novos, lista rápida e a lista completa em janela. */
export default function AlertasBell() {
  const { novos, ativos } = useAlertas();
  const [menuAberto, setMenuAberto] = useState(false);
  const [todosAbertos, setTodosAbertos] = useState(false);
  const grupos = agruparAlertas(ativos, 3).slice(0, 5);

  const abrirTodos = () => {
    setMenuAberto(false);
    setTodosAbertos(true);
  };

  return (
    <>
      <Popover open={menuAberto} onOpenChange={setMenuAberto}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={`Alertas (${novos.length} novos)`}>
            <Bell className="w-5 h-5" />
            {novos.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {novos.length > 99 ? '99+' : novos.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Alertas</p>
              <p className="text-[11px] text-muted-foreground">
                {novos.length} novo{novos.length !== 1 ? 's' : ''} · {ativos.length} em aberto
              </p>
            </div>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {grupos.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhum alerta em aberto.</p>
            ) : (
              grupos.map((grupo) => (
                <AlertaGrupo key={grupo.chave} grupo={grupo} onAbrir={() => setMenuAberto(false)} />
              ))
            )}
          </div>

          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={abrirTodos}>
              Ver todos os alertas
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertasDialog open={todosAbertos} onClose={() => setTodosAbertos(false)} />
    </>
  );
}