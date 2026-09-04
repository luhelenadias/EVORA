import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Clock, Wrench, DollarSign } from 'lucide-react';
import { formatHours } from '@/lib/maintenance';
import { cn } from '@/lib/utils';

export default function KpiCards({ mttr, avgMtbf, availability, totalCost12m, onCardClick }) {
  const cards = [
    {
      key: 'mttr',
      label: 'MTTR (média)',
      value: formatHours(mttr),
      icon: Wrench,
      subtitle: 'Tempo Médio de Reparo — clique p/ ver por equipamento',
      color: 'text-primary',
      bg: 'bg-primary/10',
      secondary: true,
    },
    {
      key: 'mtbf',
      label: 'MTBF (média)',
      value: formatHours(avgMtbf),
      icon: Clock,
      subtitle: 'Tempo Médio Entre Falhas — clique p/ ver por equipamento',
      color: 'text-accent',
      bg: 'bg-accent/10',
      secondary: true,
    },
    {
      key: 'availability',
      label: 'Disponibilidade',
      value: `${availability}%`,
      icon: Activity,
      subtitle: 'Equipamentos ativos — clique p/ detalhar',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      key: 'cost',
      label: 'Custo Manut. (12m)',
      value: totalCost12m > 0 ? `R$ ${totalCost12m.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—',
      icon: DollarSign,
      subtitle: 'Custo total no período — clique p/ ver ordens',
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.key}
            onClick={() => onCardClick?.(c.key)}
            className={cn(
              'p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all',
              c.secondary && 'bg-muted/30'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className={cn('font-bold mt-1', c.secondary ? 'text-xl' : 'text-2xl')}>{c.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{c.subtitle}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
                <Icon className={cn('w-5 h-5', c.color)} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}