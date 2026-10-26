import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileText } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import InfoField from '@/components/shared/InfoField';
import { formatarData, formatarMoeda, podeVerContrato, statusPorVigencia, diasParaVencer } from '@/lib/contratos';

/** Contrato ao qual o equipamento pertence — visível apenas para Administrador e Gestor. */
export default function EquipmentContract({ equipment, user }) {
  const podeVer = podeVerContrato(user?.role);

  const { data: contratos = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
    enabled: podeVer,
  });

  if (!podeVer) return null;

  const contrato =
    contratos.find((c) => c.id === equipment.contract_id) ||
    contratos.find((c) => (c.covered_equipment_ids || []).includes(equipment.id));

  if (!contrato) return null;

  const status = statusPorVigencia(contrato);
  const dias = diasParaVencer(contrato.end_date);

  return (
    <>
      <Separator />
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold font-display">Contrato vinculado</h3>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/contratos">Abrir contrato</Link>
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{contrato.supplier_name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{contrato.contract_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={status} />
              {contrato.extracao_status === 'Pendente de revisão' && (
                <Badge variant="outline" className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground">
                  dados a revisar
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoField label="Vigência" value={`${formatarData(contrato.start_date)} — ${formatarData(contrato.end_date)}`} />
            <InfoField label="Valor mensal" value={formatarMoeda(contrato.monthly_value)} />
            <InfoField
              label="SLA (resposta / resolução)"
              value={
                contrato.sla_response_hours || contrato.sla_resolution_hours
                  ? `${contrato.sla_response_hours ? `${contrato.sla_response_hours}h` : '—'} / ${contrato.sla_resolution_hours ? `${contrato.sla_resolution_hours}h` : '—'}`
                  : null
              }
            />
            <InfoField label="Preventiva inclusa" value={contrato.preventive_frequency} />
            <InfoField label="Fim da garantia" value={formatarData(equipment.warranty_end)} />
            <InfoField
              label="Cobertura"
              value={(contrato.included_services || []).length ? contrato.included_services.join(', ') : null}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {status === 'Vencido' && (
            <p className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Contrato vencido — o SLA contratual não é aplicado aos chamados.
            </p>
          )}
          {status !== 'Vencido' && dias !== null && dias <= 60 && (
            <p className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Renovação em {dias} dia(s).
            </p>
          )}
        </div>
      </div>
    </>
  );
}