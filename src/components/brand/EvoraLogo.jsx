import React from 'react';
import { cn } from '@/lib/utils';

const CORES = {
  brand: { base: '#0F4C4A', acento: '#D97861' },
  light: { base: '#F5F3EE', acento: '#D97861' }
};

/** Símbolo EVORA — três formas em camadas formando um "E" com movimento diagonal. */
export function EvoraSymbol({ tone = 'brand', className }) {
  const cor = CORES[tone] || CORES.brand;

  return (
    <svg
      viewBox="260 390 700 435"
      className={cn('h-8 w-[52px] flex-shrink-0', className)}
      role="img"
      aria-label="EVORA">
      
      <path
        fill={cor.base}
        d="M389 497 L470 413 Q485 397 508 397 L903 397 L828 480 Q815 497 790 497Z" />
      
      <path
        fill={cor.acento}
        d="M268 607 L322 557 L722 555 Q735 555 745 565 L830 655 L330 659 Q322 658 318 655Z" />
      
      <path
        fill={cor.base}
        d="M389 715 L800 712 Q820 712 832 700 L942 601 Q950 600 946 618 L858 790 Q848 817 820 817 L508 817 Q485 817 470 803Z" />
      
    </svg>);

}

/** Símbolo + wordmark EVORA e subtítulo institucional. */
export default function EvoraLogo({ tone = 'brand', compact = false, showSubtitle = true, className, symbolClassName }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <EvoraSymbol tone={tone} className={symbolClassName} />
      {!compact &&
      <div className="min-w-0">
          <span className="block font-display font-semibold uppercase leading-none tracking-[0.3em] text-2xl">
            EVORA
          </span>
          {showSubtitle &&
        <span className="mt-1 block text-[9px] uppercase leading-none tracking-[0.16em] opacity-70">
              Intelligent Clinical Management
            </span>
        }
        </div>
      }
    </div>);

}