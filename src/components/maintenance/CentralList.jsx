import React, { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import CentralOrderCard from '@/components/maintenance/CentralOrderCard';
import { ordenarOrdens } from '@/lib/central';

export default function CentralList({
  orders,
  equipmentById,
  ordem,
  iniciandoId,
  onStart,
  onFinish,
  title,
  description,
}) {
  const lista = useMemo(() => ordenarOrdens(orders, ordem), [orders, ordem]);

  if (lista.length === 0) {
    return <EmptyState icon={ClipboardList} title={title} description={description} />;
  }

  return (
    <div className="space-y-3">
      {lista.map((order) => (
        <CentralOrderCard
          key={order.id}
          order={order}
          equipment={equipmentById[order.equipment_id]}
          onStart={onStart}
          onFinish={onFinish}
          isStarting={iniciandoId === order.id}
        />
      ))}
    </div>
  );
}