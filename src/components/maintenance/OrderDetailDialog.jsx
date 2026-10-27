import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { resolverSla } from '@/lib/orderDetail';

export default function OrderDetailDialog({ order, equipment, orders = [], onClose }) {
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  if (!order) return null;

  return (
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
            <StatusBadge value={order.status} />
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalhes">
          <TabsList>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="mt-4 space-y-4">
            <OrderEquipmentSummary order={order} equipment={equipment} />

            {order.type === 'Corretiva' && <OrderSlaBanner sla={resolverSla(order, contracts)} />}

            <OrderTypeDetails order={order} equipment={equipment} />

            {order.status === 'Em Andamento' && <OrderExecutionDetails order={order} />}

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
  );
}