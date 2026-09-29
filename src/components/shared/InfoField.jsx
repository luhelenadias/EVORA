import React from 'react';
import { cn } from '@/lib/utils';

/** Rótulo + valor. Não renderiza nada quando o conteúdo não foi informado. */
export default function InfoField({ label, value, children, className }) {
  const conteudo = children ?? value;
  if (conteudo == null || conteudo === '' || conteudo === false) return null;

  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm leading-snug">{conteudo}</div>
    </div>
  );
}