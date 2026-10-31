import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TONS = {
  neutro: 'text-foreground',
  positivo: 'text-primary',
  atencao: 'text-warning',
  critico: 'text-destructive',
};

/** Número de indicador: sempre leva ao detalhe quando recebe `para`. */
export default function NumeroIndicador({ rotulo, valor, detalhe, tom = 'neutro', para, icone: Icone }) {
  const conteudo = (
    <div className="flex h-full flex-col rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
          {rotulo}
        </p>
        {Icone && <Icone className="h-4 w-4 flex-shrink-0 text-primary/60" />}
      </div>
      <p className={cn('mt-2 font-display text-2xl font-semibold leading-none', TONS[tom])}>{valor}</p>
      {detalhe && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{detalhe}</p>}
    </div>
  );

  if (!para) return conteudo;
  return (
    <Link to={para} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {conteudo}
    </Link>
  );
}