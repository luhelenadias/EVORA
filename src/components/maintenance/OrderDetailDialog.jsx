import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import OrderTimeline from '@/components/auditoria/OrderTimeline';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import OrderEquipmentSummary from '@/components/maintenance/OrderEquipmentSummary';
import OrderTypeDetails from '@/components/maintenance/OrderTypeDetails';
import OrderExecutionDetails from '@/components/maintenance/OrderExecutionDetails';
import OrderCompletionDetails from '@/components/maintenance/OrderCompletionDetails';
import OrderSlaBanner from '@/components/maintenance/OrderSlaBanner';
import OrderHistoryList from '@/components/maintenance/OrderHistoryList';
import TranscricaoAudio from '@/components/maintenance/TranscricaoAudio';
import PausasTimeline from '@/components/maintenance/PausasTimeline';
import PedidosPecaOS from '@/components/maintenance/PedidosPecaOS';
import PausarDialog from '@/components/maintenance/PausarDialog';
import PedirPecaDialog from '@/components/maintenance/PedirPecaDialog';
import RotaCard from '@/components/orders/RotaCard';
import AnexosField from '@/components/orders/AnexosField';
import { resolverSla } from '@/lib/orderDetail';
import { sugerirRota } from '@/lib/rota';
import { GRUPOS_CENTRAL } from '@/lib/central';
import { rotuloStatusOS } from '@/lib/triagem';
import { estaPausada, retomarManutencao } from '@/lib/pausas';
import { Package, Pause, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function OrderDetailDialog({ order, equipment, orders = [], onClose }) {
  const queryClient = useQueryClient();
  const [pausando, setPausando] = useState(false);
  const [pedindo, setPedindo] = useState(false);
  const [retomando, setRetomando] = useState(false);

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidosPeca'],
    queryFn: () => base44.entities.PedidoPeca.list('-solicitado_em'),
  });

  const { data: spareParts = [] } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });

  if (!order) return null;

  const rotaSugestao = equipment ? sugerirRota(equipment, contracts) : null;
  const contratoRota = contracts.find((c) => c.id === order.contrato_id) || rotaSugestao?.contrato || null;
  const pausada = estaPausada(order);
  const atuante =
    ['admin', 'gestor'].includes(user?.role) ||
    (user?.role === 'tecnico' && !!order.technician_id && order.technician_id === user?.id);
  const pecasById = Object.fromEntries(spareParts.map((peca) => [peca.id, peca]));

  const retomar = async () => {
    setRetomando(true);
    try {
      await retomarManutencao(base44, order);
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success('Manutenção retomada');
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível retomar');
    } finally {
      setRetomando(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {order.equipment_name || equipment?.name || 'Equipamento'}
              {equipment?.codigo_equipamento && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5"
                >
                  {equipment.codigo_equipamento}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              {order.code && <span className="font-mono">{order.code}</span>}
              <span>{order.type}</span>
              <StatusBadge value={order.status} rotulo={rotuloStatusOS(order)} />
            </DialogDescription>
          </DialogHeader>

          {atuante && order.status !== 'Concluído' && (
            <div className="flex flex-wrap gap-2">
              {pausada ? (
                <Button size="sm" className="gap-1.5" onClick={retomar} disabled={retomando}>
                  <Play className="h-3.5 w-3.5" /> {retomando ? 'Retomando...' : 'Retomar'}
                </Button>
              ) : (
                order.status === 'Em Andamento' && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPausando(true)}>
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </Button>
                )
              )}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPedindo(true)}>
                <Package className="h-3.5 w-3.5" /> Pedir peça
              </Button>
            </div>
          )}

          <Tabs defaultValue="detalhes">
            <TabsList>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="mt-4 space-y-4">
              <OrderEquipmentSummary order={order} equipment={equipment} />

              {order.type === 'Corretiva' && (
                <div className="space-y-0.5 rounded-lg border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  {order.triagem_em ? (
                    <p>
                      Triagem de {order.triagem_por_nome || '—'} em{' '}
                      {format(parseISO(order.triagem_em), 'dd/MM/yyyy HH:mm')} · destino{' '}
                      {order.rota_atendimento || '—'}
                      {order.technician_name ? ` · técnico ${order.technician_name}` : ''}
                      {order.fornecedor_nome ? ` · fornecedor ${order.fornecedor_nome}` : ''}
                    </p>
                  ) : (
                    <p>Aguardando triagem: o destino é definido pela gestão em Manutenções.</p>
                  )}
                  {order.urgencia_percebida && <p>Urgência informada na abertura: {order.urgencia_percebida}.</p>}
                  {order.triagem_devolucao_motivo && (
                    <p className="font-medium text-destructive">
                      Devolvida para complemento: {order.triagem_devolucao_motivo}
                    </p>
                  )}
                </div>
              )}

              <AnexosField valores={order.attachments} somenteLeitura />

              {order.type === 'Corretiva' && (order.rota_atendimento || rotaSugestao) && (
                <RotaCard
                  sugestao={rotaSugestao}
                  rota={order.rota_atendimento}
                  contrato={contratoRota}
                  motivoAtual={order.rota_motivo}
                  motivoTroca={order.rota_alterada_motivo}
                  fornecedor={order.fornecedor_nome}
                  somenteLeitura
                />
              )}

              {order.type === 'Corretiva' && <OrderSlaBanner sla={resolverSla(order, contracts)} />}

              <OrderTypeDetails order={order} equipment={equipment} />

              {(GRUPOS_CENTRAL.andamento.includes(order.status) || pausada) && <OrderExecutionDetails order={order} />}

              <PausasTimeline order={order} />

              <PedidosPecaOS order={order} pedidos={pedidos} pecasById={pecasById} user={user} />

              {order.status === 'Concluído' && <OrderCompletionDetails order={order} />}

              <TranscricaoAudio transcricao={order.transcricao_audio} />

              <OrderHistoryList orders={orders} order={order} />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <OrderTimeline order={order} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {pausando && (
        <PausarDialog
          order={order}
          onClose={() => setPausando(false)}
          onConcluido={() => queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })}
        />
      )}

      {pedindo && (
        <PedirPecaDialog
          order={order}
          spareParts={spareParts}
          onClose={() => setPedindo(false)}
          onConcluido={() => queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })}
        />
      )}
    </>
  );
}