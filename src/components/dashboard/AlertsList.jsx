import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, FileWarning, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  contract: { icon: FileWarning, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Contrato' },
  maintenance: { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Manutenção' },
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', label: 'Crítico' },
  calibration: { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Calibração' },
};

export default function AlertsList({ alerts }) {
  if (!alerts?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold font-display">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum alerta no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold font-display flex items-center gap-2">
          Alertas
          <Badge variant="destructive" className="text-[10px] h-5">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map((alert, i) => {
          const config = typeConfig[alert.type] || typeConfig.critical;
          const Icon = config.icon;
          return (
            <div key={i} className={cn(
              "flex items-start gap-3 p-3 rounded-lg border border-transparent",
              config.bg
            )}>
              <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight">{alert.message}</p>
                {alert.detail && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{alert.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}