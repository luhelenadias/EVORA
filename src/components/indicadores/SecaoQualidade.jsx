import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import ListaRanking from './ListaRanking';
import { formatarPct, linkManutencoes, linkOrdem } from '@/lib/indicadoresGerais';

/** 8. Qualidade dos dados: o que falta para os indicadores serem confiáveis. */
export default function SecaoQualidade({ qualidade }) {
  const semTecnico = qualidade.osSemTecnicoLista.map((ordem) => ({
    chave: ordem.id,
    label: `${ordem.code || 'OS'} · ${ordem.equipment_name || 'Equipamento'}`,
    hint: ordem.tipo,
    valor: 'sem técnico',
    para: linkOrdem(ordem.id),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Prioridade calculada"
          valor={formatarPct(qualidade.pctPrioridade)}
          detalhe={`${qualidade.pendentesPrioridade} pendente(s) de atualização`}
          tom={qualidade.pendentesPrioridade ? 'atencao' : 'positivo'}
          para="/equipamentos?filter=pendente"
        />
        <NumeroIndicador
          rotulo="OS sem técnico"
          valor={qualidade.osSemTecnico}
          detalhe="Abertas sem responsável"
          tom={qualidade.osSemTecnico ? 'atencao' : 'positivo'}
          para={linkManutencoes({ 'sem-tecnico': 1 })}
        />
        <NumeroIndicador
          rotulo="Contratos sem SLA"
          valor={qualidade.contratosSemSla}
          detalhe="Sem prazo de resposta ou resolução"
          tom={qualidade.contratosSemSla ? 'atencao' : 'positivo'}
          para="/contratos"
        />
        <NumeroIndicador
          rotulo="Equipamentos sem custo"
          valor={qualidade.equipamentosSemCusto}
          detalhe="Sem valor de aquisição informado"
          tom={qualidade.equipamentosSemCusto ? 'atencao' : 'positivo'}
          para="/equipamentos"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          OS abertas aguardando responsável
        </p>
        <ListaRanking itens={semTecnico} vazio="Todas as OS abertas têm técnico atribuído" />
      </div>
    </div>
  );
}