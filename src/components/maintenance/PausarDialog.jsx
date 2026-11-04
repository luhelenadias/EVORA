import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOTIVOS_PAUSA, pausarManutencao, statusDaPausa } from '@/lib/pausas';

/** Pausa da manutenção: motivo + observação. A OS fica aguardando até o Retomar. */
export default function PausarDialog({ order, onClose, onConcluido }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState(MOTIVOS_PAUSA[0]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    setSalvando(true);
    try {
      await pausarManutencao(base44, order, { motivo, observacao });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success(`Manutenção pausada — ${statusDaPausa(motivo)}`);
      onConcluido?.();
      onClose?.();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível pausar a manutenção');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Pausar manutenção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{order?.equipment_name || 'Equipamento'}</p>
            <p className="font-mono text-xs text-muted-foreground">{order?.code}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_PAUSA.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              A OS vai para "{statusDaPausa(motivo)}" e só volta a "Em Andamento" no Retomar.
              O prazo de SLA continua correndo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="O que está impedindo o atendimento agora?"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={confirmar} disabled={salvando}>
              {salvando ? 'Pausando...' : 'Pausar manutenção'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}