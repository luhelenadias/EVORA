import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Pencil, Clock, Wrench, Users, Activity } from 'lucide-react';
import { format, parseISO, differenceInMonths, differenceInDays, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Mapeamentos para o código de 8 dígitos ──────────────────────────
const SECTOR_CODES = {
  'Ambulatório de Vascular': 'AV',
  'Centro Cirúrgico': 'CC',
  'Enfermaria de Cirurgia Plástica': 'EP',
  'Enfermaria de Vascular': 'EV',
  'Serviço de Neurologia': 'NE',
  'Serviço de Radiologia': 'RA',
  'UTI Adulto': 'UA',
  'UTI Pediátrica': 'UP',
  'UTI Neonatal': 'UN',
  'Pronto-Socorro': 'PS',
  'Cardiologia': 'CA',
  'CME': 'CM',
  'Radiologia': 'RA',
};

const EQUIPMENT_TYPE_CODES = {
  'Ventilador': 'VT',
  'Bisturi': 'BE',
  'Raio': 'RX',
  'Desfibrilador': 'DS',
  'Monitor': 'MO',
  'Bomba': 'BI',
  'Ultrassom': 'US',
  'Eletrocard': 'EC',
  'Mesa': 'MC',
  'Autoclave': 'AC',
  'Incubadora': 'IN',
};

function getSectorCode(unit) {
  if (!unit) return 'XX';
  for (const [key, code] of Object.entries(SECTOR_CODES)) {
    if (unit.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(unit.toLowerCase())) {
      return code;
    }
  }
  return unit.substring(0, 2).toUpperCase();
}

function getEquipmentTypeCode(name) {
  if (!name) return 'EQ';
  for (const [key, code] of Object.entries(EQUIPMENT_TYPE_CODES)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return code;
  }
  return name.substring(0, 2).toUpperCase();
}

function generateEquipmentCode(equipment, allEquipmentInUnit) {
  const sectorCode = getSectorCode(equipment.location_unit);
  const typeCode = getEquipmentTypeCode(equipment.name);

  // Count how many of the same type are in the same unit (including this one)
  const sameTypeInUnit = (allEquipmentInUnit || []).filter(e =>
    getEquipmentTypeCode(e.name) === typeCode && getSectorCode(e.location_unit) === sectorCode
  );
  const idx = sameTypeInUnit.findIndex(e => e.id === equipment.id);
  const qty = String((idx >= 0 ? idx : 0) + 1).padStart(2, '0');

  const year = equipment.acquisition_date
    ? equipment.acquisition_date.substring(2, 4)
    : String(new Date().getFullYear()).substring(2);

  return `${sectorCode}${typeCode}${qty}${year}`;
}

// ── Helpers ──────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-primary font-mono text-base tracking-widest' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

function formatCurrency(v) {
  if (!v && v !== 0) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function getApproxAge(acquisitionDate) {
  if (!acquisitionDate) return '—';
  const months = differenceInMonths(new Date(), parseISO(acquisitionDate));
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} ano${years > 1 ? 's' : ''} e ${rem} ${rem === 1 ? 'mês' : 'meses'}` : `${years} ano${years > 1 ? 's' : ''}`;
}

function getCondition(orders6m) {
  const corrective = orders6m.filter(o => o.type === 'Corretiva');
  const hasOpen = orders6m.some(o => ['Novo', 'Em Andamento', 'Aguardando Peça', 'Aguardando Fornecedor', 'Pendente'].includes(o.status));
  if (hasOpen || corrective.length >= 3) return { label: 'Não funciona / Crítico', color: 'bg-red-100 text-red-700 border-red-200' };
  if (corrective.length >= 1) return { label: 'Funciona precariamente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: 'Funciona satisfatoriamente', color: 'bg-green-100 text-green-700 border-green-200' };
}

function getMaintenanceType(orders) {
  if (!orders || orders.length === 0) return 'Nunca houve manutenção';
  const internal = orders.some(o => o.execution_by === 'Equipe Interna');
  const external = orders.some(o => o.execution_by === 'Fornecedor Externo');
  if (internal && external) return 'Interna + Prestadores de serviço';
  if (external) return 'Através de prestadores de serviço';
  if (internal) return 'Internamente';
  return 'Nunca houve manutenção';
}

function getAvgRepairDays(orders) {
  const completed = orders.filter(o => o.completion_date && o.start_date);
  if (completed.length === 0) return '—';
  const avg = completed.reduce((sum, o) => {
    return sum + differenceInDays(parseISO(o.completion_date), parseISO(o.start_date));
  }, 0) / completed.length;
  return `${avg.toFixed(1)} dia${avg !== 1 ? 's' : ''}`;
}

export default function EquipmentDetail({ equipment, onEdit, allEquipment = [] }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['equipment-orders', equipment.id],
    queryFn: () => base44.entities.ServiceOrder.filter({ equipment_id: equipment.id }),
  });

  const sixMonthsAgo = subMonths(new Date(), 6);
  const orders6m = orders.filter(o => o.open_date && isAfter(parseISO(o.open_date), sixMonthsAgo));
  const repairsLast6m = orders6m.filter(o => o.type === 'Corretiva').length;
  const condition = getCondition(orders6m);
  const maintenanceType = getMaintenanceType(orders);
  const avgRepairDays = getAvgRepairDays(orders);
  const equipmentCode = generateEquipmentCode(equipment, allEquipment);

  // Dados configuráveis no equipamento
  const weeklyUsage = equipment.weekly_usage_hours ?? '—';
  const totalOperators = equipment.total_operators ?? '—';
  const trainedOperators = equipment.trained_operators ?? '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display">{equipment.name}</h2>
          <p className="text-sm text-muted-foreground">{equipment.manufacturer} · {equipment.model}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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

      {/* 1. IDENTIFICAÇÃO */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">1</span>
          </div>
          <h3 className="text-sm font-semibold font-display">Identificação do Equipamento</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="col-span-2 sm:col-span-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Código do Equipamento</p>
            <p className="text-xl font-mono font-bold tracking-[0.3em] text-primary">{equipmentCode}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              <span className="font-semibold">{equipmentCode.substring(0, 2)}</span> Setor ·&nbsp;
              <span className="font-semibold">{equipmentCode.substring(2, 4)}</span> Tipo ·&nbsp;
              <span className="font-semibold">{equipmentCode.substring(4, 6)}</span> Nº na unidade ·&nbsp;
              <span className="font-semibold">{equipmentCode.substring(6, 8)}</span> Ano de aquisição
            </p>
          </div>
          <InfoRow label="Tipo / Criticidade" value={equipment.criticality} />
          <InfoRow label="Fabricante" value={equipment.manufacturer} />
          <InfoRow label="Modelo" value={equipment.model} />
          <InfoRow label="Número de Série" value={equipment.serial_number} />
          <InfoRow label="Registro ANVISA" value={equipment.anvisa_registry} />
          <InfoRow label="Nº Patrimônio" value={equipment.patrimony_number} />
          <InfoRow label="Valor de Aquisição" value={formatCurrency(equipment.acquisition_value)} />
          <InfoRow label="Data de Aquisição" value={formatDate(equipment.acquisition_date)} />
          <InfoRow label="Data de Instalação" value={formatDate(equipment.installation_date)} />
          <InfoRow label="Unidade" value={equipment.location_unit} />
          <InfoRow label="Setor" value={equipment.location_sector} />
          <InfoRow label="Fim da Garantia" value={formatDate(equipment.warranty_end)} />
        </div>
      </div>

      <Separator />

      {/* 2. HISTÓRICO */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">2</span>
          </div>
          <h3 className="text-sm font-semibold font-display">Histórico do Equipamento</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Reparos últimos 6 meses */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Reparos (6 meses)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{repairsLast6m}</p>
            <p className="text-[10px] text-muted-foreground">{repairsLast6m === 1 ? 'corretiva registrada' : 'corretivas registradas'}</p>
          </div>

          {/* Idade do equipamento */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Idade Aproximada</p>
            </div>
            <p className="text-sm font-bold text-foreground">{getApproxAge(equipment.acquisition_date)}</p>
            <p className="text-[10px] text-muted-foreground">desde a aquisição</p>
          </div>

          {/* Tempo médio de reparo */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Tempo Médio de Reparo</p>
            </div>
            <p className="text-sm font-bold text-foreground">{avgRepairDays}</p>
            <p className="text-[10px] text-muted-foreground">média por chamado concluído</p>
          </div>

          {/* Condição de funcionamento */}
          <div className="col-span-2 sm:col-span-3 p-3 rounded-lg bg-muted/50 border">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Condição de Funcionamento</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${condition.color}`}>
              {condition.label}
            </span>
          </div>

          {/* Utilização semanal */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Utilização / Semana</p>
            </div>
            <p className="text-sm font-bold text-foreground">
              {weeklyUsage !== '—' ? `${weeklyUsage}h` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">horas de uso estimadas</p>
          </div>

          {/* Operadores */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Operadores</p>
            </div>
            <p className="text-sm font-bold text-foreground">{totalOperators}</p>
            <p className="text-[10px] text-muted-foreground">utilizam o equipamento</p>
          </div>

          {/* Operadores treinados */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Treinados</p>
            </div>
            <p className="text-sm font-bold text-foreground">{trainedOperators}</p>
            <p className="text-[10px] text-muted-foreground">operadores certificados</p>
          </div>

          {/* Tipo de manutenção */}
          <div className="col-span-2 sm:col-span-3 p-3 rounded-lg bg-muted/50 border">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Como é feita a Manutenção</p>
            <p className="text-sm font-semibold">{maintenanceType}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Chamados recentes */}
      <div>
        <h3 className="text-sm font-semibold font-display mb-3">Chamados Registrados ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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