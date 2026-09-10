import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertTriangle, Pencil } from 'lucide-react';
import { useConfiguracao } from '@/hooks/useConfiguracao';

export default function MaintenancePending() {
  const navigate = useNavigate();
  const { config } = useConfiguracao();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const pending = useMemo(
    () => equipment.filter((e) => e.status_priorizacao === 'pendente_atualizacao'),
    [equipment]
  );

  if (isLoading) {
    return <Card className="p-6"><p className="text-sm text-muted-foreground">Carregando...</p></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {pending.length} equipamento{pending.length !== 1 ? 's' : ''} pendente{pending.length !== 1 ? 's' : ''} de atualização para o modelo avançado
          </p>
          <p className="text-xs text-amber-700">
            {config?.modelo_priorizacao === 'avancado'
              ? 'Complete os campos de criticidade institucional, risco ECRI e manutenção em cada equipamento.'
              : 'Ative o modelo avançado nas configurações para visualizar as pendências.'}
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma pendência"
          description="Todos os equipamentos estão com a priorização calculada."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Patrimônio</TableHead>
                  <TableHead className="text-xs font-semibold">Criticidade</TableHead>
                  <TableHead className="text-xs font-semibold">Score</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {e.name}
                        <StatusBadge value="Pendente" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {e.patrimony_number || '—'}
                    </TableCell>
                    <TableCell><StatusBadge value={e.criticality} type="criticality" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                    <TableCell><StatusBadge value={e.operational_status} /></TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate('/equipamentos')}
                        title="Editar equipamento"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}