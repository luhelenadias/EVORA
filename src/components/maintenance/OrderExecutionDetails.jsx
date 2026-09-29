import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import InfoField from '@/components/shared/InfoField';
import { ResponseTimeValue } from '@/components/maintenance/ResponseTimeInfo';
import { formatarDataHora, tempoAoVivo } from '@/lib/orderDetail';

/** Manutenção em andamento: responsável, execução e cronômetro ao vivo. */
export default function OrderExecutionDetails({ order }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium flex items-center gap-2">
          <Timer className="w-4 h-4 text-warning" /> Tempo decorrido
        </p>
        {order.start_date && (
          <span className="font-mono text-lg font-bold tabular-nums text-primary">
            {tempoAoVivo(agora - new Date(order.start_date).getTime())}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoField label="Técnico responsável" value={order.technician_name || 'Não atribuído'} />
        <InfoField label="Execução por" value={order.execution_by} />
        <InfoField label="Início do atendimento" value={formatarDataHora(order.start_date)} />
        {order.response_time_minutes != null && (
          <InfoField label="Tempo de atendimento" value={<ResponseTimeValue order={order} />} />
        )}
      </div>
    </div>
  );
}