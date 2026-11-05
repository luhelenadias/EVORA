import React from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import usePullToRefresh from '@/hooks/usePullToRefresh';

/** Envolve o conteúdo da página e mostra o indicador de "puxar para atualizar". */
export default function PullToRefresh({ onRefresh, children }) {
  const { distancia, atualizando, progresso } = usePullToRefresh(onRefresh);

  return (
    <div className="relative">
      <div
        aria-hidden={!distancia}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden"
        style={{
          height: distancia,
          opacity: distancia ? 1 : 0,
          transition: distancia ? 'none' : 'height 180ms ease, opacity 180ms ease',
        }}
      >
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
          {atualizando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowDown className="h-4 w-4" style={{ transform: `rotate(${progresso * 180}deg)` }} />
          )}
        </span>
      </div>
      {children}
    </div>
  );
}