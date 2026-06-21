import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/shared/StatusBadge';
import { Pencil, Calendar, MapPin, Building, Shield } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

function formatCurrency(v) {
  if (!v) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function EquipmentDetail({ equipment, onEdit }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['equipment-orders', equipment.id],
    queryFn: () => base44.entities.ServiceOrder.filter({ equipment_id: equipment.id }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display">{equipment.name}</h2>
          <p className="text-sm text-muted-foreground">{equipment.manufacturer} {equipment.model}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={equipment.operational_status} />
          <StatusBadge value={equipment.criticality} type="criticality" />
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <InfoRow label="Nº Série" value={equipment.serial_number} />
        <InfoRow label="Patrimônio" value={equipment.patrimony_number} />
        <InfoRow label="Registro ANVISA" value={equipment.anvisa_registry} />
        <InfoRow label="Unidade" value={equipment.location_unit} />
        <InfoRow label="Setor" value={equipment.location_sector} />
        <InfoRow label="Valor Aquisição" value={formatCurrency(equipment.acquisition_value)} />
        <InfoRow label="Data Aquisição" value={formatDate(equipment.acquisition_date)} />
        <InfoRow label="Data Instalação" value={formatDate(equipment.installation_date)} />
        <InfoRow label="Fim da Garantia" value={formatDate(equipment.warranty_end)} />
        <InfoRow label="Última Calibração" value={formatDate(equipment.last_calibration_date)} />
        <InfoRow label="Próxima Calibração" value={formatDate(equipment.next_calibration_date)} />
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold font-display mb-3">Histórico de Chamados ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {orders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div>
                  <span className="font-medium">{o.code || `OS-${o.id?.substring(0, 6)}`}</span>
                  <span className="text-muted-foreground ml-2">{o.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatDate(o.open_date?.split('T')[0])}</span>
                  <StatusBadge value={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}