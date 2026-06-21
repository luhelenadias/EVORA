import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="relative overflow-hidden p-5 group hover:shadow-lg transition-shadow duration-300">
            <div className={cn(
              "absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10",
              stat.color
            )} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold mt-1.5 font-display">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={cn("p-2.5 rounded-xl", stat.bgColor || "bg-primary/10")}>
                <Icon className={cn("w-5 h-5", stat.iconColor || "text-primary")} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}