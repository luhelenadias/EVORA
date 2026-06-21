import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  'Ativo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Em Manutenção': 'bg-amber-50 text-amber-700 border-amber-200',
  'Parado': 'bg-red-50 text-red-700 border-red-200',
  'Inativo/Baixado': 'bg-slate-100 text-slate-500 border-slate-200',
  'Novo': 'bg-blue-50 text-blue-700 border-blue-200',
  'Em Andamento': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aguardando Peça': 'bg-orange-50 text-orange-700 border-orange-200',
  'Aguardando Fornecedor': 'bg-orange-50 text-orange-700 border-orange-200',
  'Pendente': 'bg-purple-50 text-purple-700 border-purple-200',
  'Concluído': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Vencendo': 'bg-amber-50 text-amber-700 border-amber-200',
  'Vencido': 'bg-red-50 text-red-700 border-red-200',
  'Cancelado': 'bg-slate-100 text-slate-500 border-slate-200',
  'Em Estoque': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Estoque Baixo': 'bg-amber-50 text-amber-700 border-amber-200',
  'Sem Estoque': 'bg-red-50 text-red-700 border-red-200',
  'Em Férias': 'bg-sky-50 text-sky-700 border-sky-200',
  'Afastado': 'bg-slate-100 text-slate-500 border-slate-200',
  'Suspenso': 'bg-slate-100 text-slate-500 border-slate-200',
};

const priorityStyles = {
  'Baixa': 'bg-slate-100 text-slate-600 border-slate-200',
  'Média': 'bg-blue-50 text-blue-700 border-blue-200',
  'Alta': 'bg-orange-50 text-orange-700 border-orange-200',
  'Crítica': 'bg-red-50 text-red-700 border-red-200',
};

const criticalityStyles = {
  'Suporte à Vida': 'bg-red-50 text-red-700 border-red-200',
  'Terapêutico': 'bg-amber-50 text-amber-700 border-amber-200',
  'Diagnóstico': 'bg-blue-50 text-blue-700 border-blue-200',
  'Apoio': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function StatusBadge({ value, type = 'status' }) {
  const styles = type === 'priority' ? priorityStyles : type === 'criticality' ? criticalityStyles : statusStyles;
  const style = styles[value] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium border", style)}>
      {value}
    </Badge>
  );
}