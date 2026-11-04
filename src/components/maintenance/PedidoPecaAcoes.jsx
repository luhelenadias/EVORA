import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { podeMover } from '@/lib/pedidosPeca';

/**
 * Andamento do pedido: gestão move Em compra/Chegou/Cancelada,
 * o técnico da OS marca a Retirada (com opção de somar a peça à OS).
 */
export default function PedidoPecaAcoes({ pedido, order, user, compacto = false }) {
  const queryClient = useQueryClient();
  const [previsao, setPrevisao] = useState(pedido?.previsao_chegada || '');
  const [incluirNaOS, setIncluirNaOS] = useState(true);
  const [salvando, setSalvando] = useState(false);

  if (!podeMover(pedido, user, order)) return null;

  const gestao = ['admin', 'gestor'].includes(user?.role);
  const tecnicoDaOS = user?.role === 'tecnico' && order?.technician_id === user?.id;

  const mover = async (status) => {
    setSalvando(true);
    try {
      const { data } = await base44.functions.invoke('pedidoPeca', {
        acao: 'atualizar',
        pedido_id: pedido.id,
        status,
        previsao_chegada: status === 'Em compra' ? previsao : undefined,
        incluir_na_os: status === 'Retirada' ? incluirNaOS : undefined,
      });
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['pedidosPeca'] });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success(`Pedido: ${status}`);
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível mover o pedido');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={compacto ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap items-center gap-2'}>
      {gestao && pedido.status !== 'Em compra' && pedido.status !== 'Chegou' && (
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Previsão</Label>
          <Input
            type="date"
            value={previsao}
            onChange={(e) => setPrevisao(e.target.value)}
            className="h-7 w-[135px] text-[11px]"
          />
        </div>
      )}
      {gestao && pedido.status === 'Solicitada' && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={salvando} onClick={() => mover('Em compra')}>
          Em compra
        </Button>
      )}
      {gestao && ['Solicitada', 'Em compra'].includes(pedido.status) && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={salvando} onClick={() => mover('Chegou')}>
          Chegou
        </Button>
      )}
      {gestao && pedido.status !== 'Chegou' && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground" disabled={salvando} onClick={() => mover('Cancelada')}>
          Cancelar
        </Button>
      )}
      {tecnicoDaOS && ['Solicitada', 'Em compra', 'Chegou'].includes(pedido.status) && (
        <>
          {pedido.spare_part_id && (
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Checkbox checked={incluirNaOS} onCheckedChange={(v) => setIncluirNaOS(!!v)} />
              usar na OS
            </label>
          )}
          <Button size="sm" className="h-7 px-2 text-[11px]" disabled={salvando} onClick={() => mover('Retirada')}>
            Retirada
          </Button>
        </>
      )}
    </div>
  );
}