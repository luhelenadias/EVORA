import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PartsUsedEditor({ items = [], spareParts = [], onChange }) {
  const adicionar = () => onChange([...items, { spare_part_id: '', name: '', quantity: 1, cost: 0 }]);
  const remover = (i) => onChange(items.filter((_, idx) => idx !== i));

  const selecionar = (i, id) => {
    const peca = spareParts.find((s) => s.id === id);
    onChange(
      items.map((item, idx) =>
        idx === i ? { ...item, spare_part_id: id, name: peca?.name || '', cost: peca?.unit_cost ?? 0 } : item
      )
    );
  };

  const alterarQtd = (i, valor) => {
    const quantidade = Math.max(parseInt(valor, 10) || 1, 1);
    onChange(items.map((item, idx) => (idx === i ? { ...item, quantity: quantidade } : item)));
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const peca = spareParts.find((s) => s.id === item.spare_part_id);
        return (
          <div key={i} className="space-y-1.5">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Peça {i + 1}</Label>
                <Select value={item.spare_part_id} onValueChange={(v) => selecionar(i, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a peça" /></SelectTrigger>
                  <SelectContent>
                    {spareParts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — estoque {s.current_stock ?? 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1.5">
                <Label className="text-xs">Qtd.</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => alterarQtd(i, e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => remover(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {peca && (
              <p className="text-[11px] text-muted-foreground">
                Estoque atual: {peca.current_stock ?? 0} · restará{' '}
                {Math.max((peca.current_stock ?? 0) - item.quantity, 0)}
              </p>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={adicionar}>
        <Plus className="w-3.5 h-3.5" /> Adicionar peça
      </Button>
    </div>
  );
}