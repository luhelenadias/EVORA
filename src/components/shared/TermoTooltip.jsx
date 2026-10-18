import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TOOLTIPS } from '@/lib/priorizacao';
import { cn } from '@/lib/utils';

/**
 * Termo/sigla com explicação: sublinhado pontilhado discreto e caixinha ao passar o mouse,
 * ao focar pelo teclado e ao tocar no celular.
 */
export default function TermoTooltip({ termo, texto, children, className, as = 'button' }) {
  const explicacao = texto ?? TOOLTIPS[termo];
  const conteudo = children ?? termo;
  if (!explicacao) return <>{conteudo}</>;

  const Trigger = as === 'span' ? 'span' : 'button';
  const props = as === 'span' ? { role: 'button', tabIndex: 0 } : { type: 'button' };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Trigger
            {...props}
            className={cn(
              'cursor-help text-left underline decoration-dotted decoration-from-font underline-offset-2',
              className
            )}
          >
            {conteudo}
          </Trigger>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] rounded-lg border-0 bg-foreground px-3 py-2 text-[12.5px] font-medium leading-relaxed text-background"
        >
          {explicacao}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}