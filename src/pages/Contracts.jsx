import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronRight, FileText, Search } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ContractDetailDialog from '@/components/contracts/ContractDetailDialog';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { formatarMoeda, podeVerContrato, statusPorVigencia } from '@/lib/contratos';

export default function Contracts() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const podeVerValores = podeVerContrato(user?.role);
  const isReadOnly = user?.role !== 'admin';

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
    enabled: podeVerValores,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['contracts'] });

  // Vindo de um alerta (/contratos?contrato=<id>): abre o contrato direto.
  const [searchParams, setSearchParams] = useSearchParams();
  const contratoParam = searchParams.get('contrato');
  useEffect(() => {
    if (!contratoParam || !contracts.length) return;
    const alvo = contracts.find((c) => c.id === contratoParam);
    if (alvo) setDetalhe(alvo);
    setSearchParams({}, { replace: true });
  }, [contratoParam, contracts, setSearchParams]);

  const filtered = useMemo(
    () =>
      contracts.filter(
        (c) =>
          !search ||
          c.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.contract_number?.toLowerCase().includes(search.toLowerCase())
      ),
    [contracts, search]
  );

  const vencendo = useMemo(
    () => contracts.filter((c) => statusPorVigencia(c) === 'Vencendo').length,
    [contracts]
  );

  const pendentes = useMemo(
    () => contracts.filter((c) => c.extracao_status === 'Pendente de revisão').length,
    [contracts]
  );

  if (!podeVerValores) {
    return (
      <div className="space-y-6">
        <PageHeader title="Contratos" subtitle="Acesso restrito" />
        <EmptyState
          icon={FileText}
          title="Área restrita"
          description="O PDF e os valores dos contratos ficam disponíveis apenas para Administrador e Gestor de Engenharia Clínica."
        />
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={`${contracts.length} contratos`}
        onAdd={isReadOnly ? undefined : () => setNovoAberto(true)}
        addLabel="Novo Contrato"
      >
        {vencendo > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {vencendo} vencendo em 60 dias
          </div>
        )}
        {pendentes > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1.5 text-xs text-warning-foreground">
            {pendentes} com dados a revisar
          </div>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por fornecedor ou nº contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum contrato encontrado" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Fornecedor</TableHead>
                  <TableHead className="hidden text-xs font-semibold md:table-cell">Vigência</TableHead>
                  <TableHead className="hidden text-xs font-semibold lg:table-cell">Valor Mensal</TableHead>
                  <TableHead className="hidden text-xs font-semibold lg:table-cell">SLA (resposta / resolução)</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Documento</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const status = statusPorVigencia(c);
                  const dias = c.end_date
                    ? Math.ceil((parseISO(c.end_date) - new Date()) / 86400000)
                    : null;
                  const expirando = dias !== null && dias >= 0 && dias <= 60;
                  return (
                    <TableRow
                      key={c.id}
                      className={cn('cursor-pointer', expirando && 'bg-destructive/5')}
                      onClick={() => setDetalhe(c)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.supplier_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{c.contract_number || 'sem nº'}</p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {c.start_date && format(parseISO(c.start_date), 'dd/MM/yy')} — {c.end_date && format(parseISO(c.end_date), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">{formatarMoeda(c.monthly_value)}</TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">
                        {c.sla_response_hours || c.sla_resolution_hours
                          ? `${c.sla_response_hours || '—'}h / ${c.sla_resolution_hours || '—'}h`
                          : '—'}
                      </TableCell>
                      <TableCell><StatusBadge value={status} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.documento_atual_url ? (
                            <Badge variant="outline" className="border-primary/25 bg-primary/10 text-[10px] text-primary">
                              PDF
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">sem PDF</span>
                          )}
                          {c.extracao_status === 'Pendente de revisão' && (
                            <Badge variant="outline" className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground">
                              revisar
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Abra um contrato para enviar o PDF, extrair os dados com IA e conferir os campos.
      </p>

      {detalhe && (
        <ContractDetailDialog
          contrato={detalhe}
          user={user}
          onClose={() => setDetalhe(null)}
          onSaved={recarregar}
        />
      )}

      <ContractFormDialog open={novoAberto} onOpenChange={setNovoAberto} onCriado={recarregar} />
    </div>
  );
}