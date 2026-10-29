import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Select compacto usado nas barras de filtro das três abas de Manutenções. */
export default function FilterSelect({ value, onChange, options = [], className, ariaLabel }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn('h-9 text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opcao) => (
          <SelectItem key={opcao.value} value={opcao.value}>
            {opcao.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}