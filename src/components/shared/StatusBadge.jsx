import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Paleta EVORA: verde petróleo = estável/positivo · coral = alerta/atraso/critico
const ok = 'bg-primary/10 text-primary border-primary/25';
const alerta = 'bg-destructive/10 text-destructive border-destructive/30';
const atencao = 'bg-warning/20 text-warning-foreground border-warning/40';
const neutro = 'bg-muted text-muted-foreground border-border';

const statusStyles = {
  'Ativo': ok,
  'Em Manutenção': atencao,
  'Parado': alerta,
  'Inativo/Baixado': neutro,
  'Novo': ok,
  'Em Andamento': atencao,
  'Aguardando Orçamento': atencao,
  'Aguardando Aprovação': atencao,
  'Em Transporte (ida)': atencao,
  'Em Conserto Externo': atencao,
  'Em Transporte (volta)': atencao,
  'Aguardando Teste de Qualidade': atencao,
  'Aguardando Aceite': atencao,
  'Aguardando Peça': atencao,
  'Aguardando Fornecedor': atencao,
  'Pendente': atencao,
  'Concluído': ok,
  'Vencendo': atencao,
  'Vencido': alerta,
  'Cancelado': neutro,
  'Em Estoque': ok,
  'Estoque Baixo': atencao,
  'Sem Estoque': alerta,
  'Em Férias': atencao,
  'Afastado': neutro,
  'Inativo': neutro,
  'Convite pendente': atencao,
  'Suspenso': neutro,
  'Dentro do Prazo': ok,
  'Atrasado': alerta,
  'Sem SLA Definido': neutro,
};

const priorityStyles = {
  'Baixa': neutro,
  'Média': atencao,
  'Alta': alerta,
  'Crítica': 'bg-destructive/15 text-destructive border-destructive/40',
};

const criticalityStyles = {
  'Suporte à Vida': alerta,
  'Terapêutico': atencao,
  'Diagnóstico': ok,
  'Apoio': neutro,
};

/**
 * `rotulo` troca só o texto exibido, sem mudar o valor gravado — usado para
 * "Novo" aparecer como "Aguardando triagem" nas OS corretivas (ver lib/triagem).
 */
export default function StatusBadge({ value, type = 'status', rotulo }) {
  const styles = type === 'priority' ? priorityStyles : type === 'criticality' ? criticalityStyles : statusStyles;
  const style = styles[value] || neutro;

  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium border", style)}>
      {rotulo || value}
    </Badge>
  );
}