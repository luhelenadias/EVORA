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
  user,
  onStart,
  onFinish,
  onRecord,
  onPause,
  onResume,
  onOpen,
  title,
  description,
}) {
  const lista = useMemo(
    () => ordenarOrdens(orders, ordem, equipmentById),
    [orders, ordem, equipmentById]
  );

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
          user={user}
          onStart={onStart}
          onFinish={onFinish}
          onRecord={onRecord}
          onPause={onPause}
          onResume={onResume}
          onOpen={onOpen}
          isStarting={iniciandoId === order.id}
        />
      ))}
    </div>
  );
}