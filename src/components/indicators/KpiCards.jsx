import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Clock, Wrench, DollarSign } from 'lucide-react';
import { formatHours } from '@/lib/maintenance';

export default function KpiCards({ mttr, avgMtbf, availability, totalCost12m }) {
  const cards = [
    {
      label: 'MTTR',
      value: formatHours(mttr),
      icon: Wrench,
      subtitle: 'Tempo Médio de Reparo',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'MTBF Médio',
      value: formatHours(avgMtbf),
      icon: Clock,
      subtitle: 'Tempo Médio Entre Falhas',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Disponibilidade',
      value: `${availability}%`,
      icon: Activity,
      subtitle: 'Equipamentos ativos',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Custo Manut. (12m)',
      value: totalCost12m > 0 ? `R$ ${totalCost12m.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—',
      icon: DollarSign,
      subtitle: 'Custo total no período',
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{c.subtitle}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}