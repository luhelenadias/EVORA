import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign } from 'lucide-react';

export default function CostBySector({ costBySector, costByEquipment }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-muted-foreground" /> Custo de Manutenção por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costBySector.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sem dados de custo.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costBySector} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-muted-foreground" /> Custo por Equipamento (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costByEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sem dados de custo.</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {costByEquipment.map((e) => (
                <div key={e.name} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="truncate pr-2">{e.name}</span>
                  <span className="font-semibold text-muted-foreground whitespace-nowrap">
                    R$ {e.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}