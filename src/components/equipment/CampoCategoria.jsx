import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TermoTooltip from '@/components/shared/TermoTooltip';

/**
 * Campo de priorização em lista de escolha: mostra a categoria e grava o número
 * correspondente no campo existente. Ao editar, a lista vem pré-selecionada.
 */
export default function CampoCategoria({ termo, rotulo, opcoes, value, onChange, placeholder = 'Selecione', apoio = false }) {
  const selecionada = opcoes.find((o) => String(o.value) === String(value));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {rotulo} (<TermoTooltip termo={termo} as="span">{termo}</TermoTooltip>) *
      </Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>{o.value} — {o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {apoio && selecionada?.apoio ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{selecionada.apoio}</p>
      ) : null}
    </div>
  );
}