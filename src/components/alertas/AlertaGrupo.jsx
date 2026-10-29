import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ROTULOS_COLETIVOS } from '@/lib/alertas';
import NivelBadge from './NivelBadge';
import AlertaItem from './AlertaItem';
import { cn } from '@/lib/utils';

/** Vários alertas do mesmo tipo entram agrupados, com expansão. */
export default function AlertaGrupo({ grupo, onAbrir }) {
  const [aberto, setAberto] = useState(false);

  if (grupo.itens.length === 1) return <AlertaItem alerta={grupo.itens[0]} onAbrir={onAbrir} />;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-sm font-semibold text-foreground">
          {grupo.itens.length} {ROTULOS_COLETIVOS[grupo.tipo] || grupo.tipo.toLowerCase()}
        </span>
        <NivelBadge nivel={grupo.nivel} className="ml-auto" />
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', aberto && 'rotate-180')} />
      </button>
      {aberto && (
        <div className="space-y-2 border-t p-2">
          {grupo.itens.map((alerta) => (
            <AlertaItem key={alerta.id} alerta={alerta} onAbrir={onAbrir} />
          ))}
        </div>
      )}
    </div>
  );
}