import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import ListaRanking from './ListaRanking';
import { formatarHoras, linkEquipamento, linkManutencoes } from '@/lib/indicadoresGerais';

/** 4. Confiabilidade: MTBF, rechamadas, reincidência e equipamentos da faixa Crítica. */
export default function SecaoConfiabilidade({ confiabilidade }) {
  const mtbf = confiabilidade.mtbfRanking.slice(0, 6).map((linha) => ({
    chave: linha.equipment_id,
    label: linha.nome,
    hint: `${linha.os} falha(s) no período`,
    valor: formatarHoras(linha.mtbf),
    para: linkEquipamento(linha.equipment_id),
  }));

  const reincidentes = confiabilidade.reincidentes12m.slice(0, 6).map((linha) => ({
    chave: linha.equipment_id,
    label: linha.nome,
    hint: `${linha.corretivas12m} corretiva(s) em 12 meses`,
    valor: `${linha.rechamadas} rechamada(s)`,
    para: linkManutencoes({ equipamento: linha.equipment_id, tipo: 'Corretiva' }),
  }));

  const criticos = confiabilidade.faixaCritica.slice(0, 6).map((linha) => ({
    chave: linha.equipment_id,
    label: linha.nome,
    hint: linha.score != null ? `Índice ${linha.score}` : 'Faixa Crítica',
    valor: 'Crítica',
    para: linkEquipamento(linha.equipment_id),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="MTBF médio"
          valor={formatarHoras(confiabilidade.mtbfMedio)}
          detalhe={`Entre falhas de ${confiabilidade.mtbfRanking.length} equipamento(s)`}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="Rechamadas"
          valor={confiabilidade.totalRechamadas}
          detalhe={`Nova corretiva até ${confiabilidade.diasRechamada} dias após uma concluída`}
          tom={confiabilidade.totalRechamadas ? 'atencao' : 'positivo'}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="Equipamentos reincidentes"
          valor={confiabilidade.reincidentes12m.filter((l) => l.corretivas12m >= 3).length}
          detalhe="3 ou mais corretivas em 12 meses"
          tom={confiabilidade.reincidentes12m.length ? 'atencao' : 'positivo'}
          para="/equipamentos"
        />
        <NumeroIndicador
          rotulo="Faixa Crítica"
          valor={confiabilidade.faixaCritica.length}
          detalhe="Equipamentos no topo do ranking de prioridade"
          para="/equipamentos"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Menor MTBF</p>
          <ListaRanking itens={mtbf} vazio="Sem falhas suficientes para calcular MTBF" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reincidência</p>
          <ListaRanking itens={reincidentes} vazio="Nenhuma reincidência no período" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridade Crítica</p>
          <ListaRanking itens={criticos} vazio="Nenhum equipamento na faixa Crítica" />
        </div>
      </div>
    </div>
  );
}