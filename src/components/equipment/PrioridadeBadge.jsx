import React from 'react';
import TermoTooltip from '@/components/shared/TermoTooltip';
import { rotuloScore } from '@/lib/priorizacao';
import { cn } from '@/lib/utils';

// Coral = crítico · grafite = intermediário · cinza = baixo
const ESTILOS = {
  'Crítica': 'border-transparent bg-accent text-accent-foreground',
  'Alta': 'border-accent text-accent bg-accent/5',
  'Média': 'border-foreground/40 text-foreground bg-foreground/5',
  'Baixa': 'border-border text-muted-foreground bg-muted',
};

/**
 * Faixa de prioridade (badge) + colocação no ranking + rótulo do índice (EM/EMR/AEMR).
 * Equipamentos pendentes aparecem como "Pendente de atualização".
 */
export default function PrioridadeBadge({ equipment, total, showScore = true }) {
  const calculado = equipment?.status_priorizacao === 'calculado' && equipment?.prioridade_faixa;

  if (!calculado) {
    return (
      <TermoTooltip
        termo="Pendente de atualização"
        className="rounded-md border border-warning/40 bg-warning/20 px-2 py-0.5 text-[11px] font-medium text-warning-foreground"
      >
        Pendente de atualização
      </TermoTooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TermoTooltip termo="faixa" className="inline-flex">
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold',
            ESTILOS[equipment.prioridade_faixa] || ESTILOS.Baixa
          )}
        >
          {equipment.prioridade_faixa}
        </span>
      </TermoTooltip>

      {equipment.prioridade_posicao != null && (
        <TermoTooltip termo="posicao" className="text-[11px] tabular-nums text-muted-foreground">
          #{equipment.prioridade_posicao} de {total ?? '—'}
        </TermoTooltip>
      )}

      {showScore && equipment.prioridade_score != null && (
        <TermoTooltip
          termo={equipment.prioridade_modelo || 'EM'}
          className="text-[11px] font-semibold tabular-nums text-foreground"
        >
          {rotuloScore(equipment.prioridade_score, equipment.prioridade_modelo)}
        </TermoTooltip>
      )}
    </div>
  );
}