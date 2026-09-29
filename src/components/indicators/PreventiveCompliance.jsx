import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function PreventiveCompliance({ onSchedule, atRisk, overdue, total }) {
  const compliancePct = total > 0 ? Math.round((onSchedule / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cumprimento do Plano Preventivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-3xl font-bold text-success">{compliancePct}%</span>
            <span className="text-xs text-muted-foreground">{onSchedule} de {total} planos em dia</span>
          </div>
          <Progress value={compliancePct} className="h-2.5" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-primary">{onSchedule}</p>
              <p className="text-[10px] text-muted-foreground">Em dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-warning-foreground">{atRisk}</p>
              <p className="text-[10px] text-muted-foreground">Próximos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10">
            <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-destructive">{overdue}</p>
              <p className="text-[10px] text-muted-foreground">Atrasados</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}