import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Package } from 'lucide-react';
import { URGENCIAS_PEDIDO } from '@/lib/pedidosPeca';

/**
 * Pedido de peça dentro da OS: catálogo (com estoque) ou texto livre.
 * Sem estoque, a pausa da manutenção vem marcada por padrão.
 */
export default function PedirPecaDialog({ order, spareParts = [], onClose, onConcluido }) {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState('catalogo');
  const [sparePartId, setSparePartId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [urgencia, setUrgencia] = useState('Média');
  const [observacao, setObservacao] = useState('');
  const [escolhaPausa, setEscolhaPausa] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const peca = useMemo(() => spareParts.find((p) => p.id === sparePartId) || null, [spareParts, sparePartId]);
  const qtd = Math.max(parseInt(quantidade, 10) || 1, 1);
  const estoque = Number(peca?.current_stock ?? 0);
  const emEstoque = !!peca && estoque >= qtd;
  const pausar = escolhaPausa === null ? !emEstoque : escolhaPausa;

  const enviar = async () => {
    if (modo === 'catalogo' && !peca) {
      toast.error('Escolha a peça do catálogo ou descreva a peça');
      return;
    }
    if (modo === 'livre' && !descricao.trim()) {
      toast.error('Descreva a peça que precisa');
      return;
    }
    setSalvando(true);
    try {
      const { data } = await base44.functions.invoke('pedidoPeca', {
        acao: 'criar',
        service_order_id: order.id,
        spare_part_id: modo === 'catalogo' ? peca.id : '',
        descricao_livre: modo === 'livre' ? descricao : '',
        quantidade: qtd,
        urgencia,
        observacao,
        pausar: emEstoque ? false : pausar,
      });
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['pedidosPeca'] });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success(
        data?.pausado
          ? 'Pedido registrado e manutenção pausada até a peça chegar'
          : data?.em_estoque
            ? 'Pedido registrado: o almoxarifado separa a peça'
            : 'Pedido de peça registrado'
      );
      onConcluido?.(data);
      onClose?.();
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível registrar o pedido');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose?.()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Pedir peça</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{order?.equipment_name || 'Equipamento'}</p>
            <p className="font-mono text-xs text-muted-foreground">{order?.code}</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={modo === 'catalogo' ? 'default' : 'outline'}
              className="flex-1 gap-1.5"
              onClick={() => setModo('catalogo')}
            >
              <Package className="h-3.5 w-3.5" /> Do catálogo
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === 'livre' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setModo('livre')}
            >
              Peça fora do catálogo
            </Button>
          </div>

          {modo === 'catalogo' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Peça *</Label>
              <Select value={sparePartId} onValueChange={setSparePartId}>
                <SelectTrigger><SelectValue placeholder="Selecione a peça" /></SelectTrigger>
                <SelectContent>
                  {spareParts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} — estoque {item.current_stock ?? 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {peca && (
                <p className="text-[11px] text-muted-foreground">
                  {peca.code} · estoque atual {estoque} · mínimo {peca.minimum_stock ?? 0}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Qual peça? *</Label>
              <Textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: cabo de bisturi descartável, modelo X"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Urgência *</Label>
              <Select value={urgencia} onValueChange={setUrgencia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCIAS_PEDIDO.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Referência, fornecedor, por que a peça atual não serve..."
            />
          </div>

          {emEstoque ? (
            <p className="flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-primary">
              <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              Em estoque: o almoxarifado separa a peça. A manutenção não precisa ser pausada.
            </p>
          ) : (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-2.5">
              <p className="text-xs font-medium text-warning-foreground">Pausar a manutenção até a peça chegar?</p>
              <RadioGroup
                value={pausar ? 'sim' : 'nao'}
                onValueChange={(valor) => setEscolhaPausa(valor === 'sim')}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="sim" id="pausa-sim" />
                  <Label htmlFor="pausa-sim" className="text-xs">Sim</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="nao" id="pausa-nao" />
                  <Label htmlFor="pausa-nao" className="text-xs">Não</Label>
                </div>
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground">
                A pausa fica ligada a este pedido; a retomada é sempre sua, quando a peça chegar.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={enviar} disabled={salvando}>
              {salvando ? 'Registrando...' : 'Registrar pedido'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}