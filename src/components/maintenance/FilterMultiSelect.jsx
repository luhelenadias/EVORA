import React, { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Filtro de seleção múltipla por caixas de seleção: o usuário marca quantas
 * opções quiser. Nenhuma marcada = sem filtro. O rótulo é curto (só o nome do
 * campo) e o número de opções marcadas aparece ao lado.
 */
export default function FilterMultiSelect({ label, options = [], value = [], onChange, className, comBusca }) {
  const [termo, setTermo] = useState('');
  const buscar = comBusca ?? options.length > 8;

  const visiveis = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return t ? options.filter((opcao) => String(opcao.label).toLowerCase().includes(t)) : options;
  }, [options, termo]);

  const alternar = (valor) =>
    onChange(value.includes(valor) ? value.filter((v) => v !== valor) : [...value, valor]);

  return (
    <Popover onOpenChange={(aberto) => !aberto && setTermo('')}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={label}
          className={cn(
            'h-9 w-full justify-between gap-1 px-3 text-xs font-normal',
            value.length > 0 && 'border-primary/60 bg-primary/5 font-semibold text-foreground',
            className
          )}
        >
          <span className="truncate">
            {label}
            {value.length > 0 && ` · ${value.length}`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-60 p-0">
        {buscar && (
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={termo}
                onChange={(evento) => setTermo(evento.target.value)}
                placeholder="Buscar..."
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto py-1">
          {visiveis.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nada encontrado</p>}
          {visiveis.map((opcao) => {
            const marcado = value.includes(opcao.value);
            return (
              <div
                key={opcao.value}
                role="option"
                aria-selected={marcado}
                tabIndex={0}
                onClick={() => alternar(opcao.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    alternar(opcao.value);
                  }
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-xs outline-none hover:bg-muted',
                  marcado && 'font-medium'
                )}
              >
                <Checkbox checked={marcado} tabIndex={-1} className="pointer-events-none" />
                <span className="truncate">{opcao.label}</span>
              </div>
            );
          })}
        </div>

        {value.length > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange([])}>
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}