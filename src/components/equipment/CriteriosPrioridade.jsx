import React from 'react';
import TermoTooltip from '@/components/shared/TermoTooltip';
import { OPCOES_FUNCAO_F, OPCOES_RISCO_PR, OPCOES_MANUTENCAO } from '@/lib/priorizacao';

/** Critérios que compõem o índice de priorização, com a explicação de cada sigla. */
export default function CriteriosPrioridade({ equipment }) {
  const itens = [
    { termo: 'F', rotulo: 'Função', valor: equipment.funcao_f, opcoes: OPCOES_FUNCAO_F },
    { termo: 'PR', rotulo: 'Risco físico', valor: equipment.risco_fisico_pr, opcoes: OPCOES_RISCO_PR },
    { termo: 'MR', rotulo: 'Requisitos manut.', valor: equipment.requisitos_manutencao_mr, opcoes: OPCOES_MANUTENCAO },
    { termo: 'MC', rotulo: 'Mission critical', valor: equipment.mission_critical_mc },
    { termo: 'R', rotulo: 'Risco ECRI', valor: equipment.risco_r },
    { termo: 'M', rotulo: 'Manutenção', valor: equipment.manutencao_m, opcoes: OPCOES_MANUTENCAO },
    { termo: 'U', rotulo: 'Utilização', valor: equipment.utilizacao_u },
  ].filter((item) => item.valor != null && item.valor !== '');

  if (!itens.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum critério de priorização preenchido neste cadastro.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {itens.map((item) => {
        const categoria = item.opcoes?.find((o) => String(o.value) === String(item.valor));
        return (
          <div key={item.termo} className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <TermoTooltip termo={item.termo} as="span">
                {item.rotulo} ({item.termo})
              </TermoTooltip>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.valor}</p>
            {categoria && (
              <p className="text-[11px] text-muted-foreground">{categoria.label}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}