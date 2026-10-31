import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import ListaRanking from './ListaRanking';
import {
  formatarDias, formatarHoras, linkEquipamento, linkManutencoes, linkOrdem,
} from '@/lib/indicadoresGerais';

/** 2. Atendimento e reparo: só corretivas para tempo de atendimento e MTTR. */
export default function SecaoAtendimento({ atendimento, corretivas, podeVerEspera }) {
  const mttrItens = atendimento.mttrPorEquipamento.slice(0, 6).map((linha) => ({
    chave: linha.equipment_id,
    label: linha.nome,
    hint: `${linha.os} corretiva(s) concluída(s)`,
    valor: formatarHoras(linha.mttr),
    para: linkEquipamento(linha.equipment_id),
  }));

  const esperaItens = atendimento.esperaPorEquipamento.slice(0, 6).map((linha) => ({
    chave: linha.equipment_id,
    label: linha.nome,
    hint: `${linha.os} OS com espera`,
    valor: formatarDias(linha.dias),
    para: linkManutencoes({ equipamento: linha.equipment_id }),
  }));

  const antigas = atendimento.maisAntigas.map((ordem) => ({
    chave: ordem.id,
    label: `${ordem.code || 'OS'} · ${ordem.equipment_name || 'Equipamento'}`,
    hint: `${ordem.tipo}`,
    valor: `${ordem.dias} d`,
    para: linkOrdem(ordem.id),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Tempo médio de atendimento"
          valor={formatarHoras(atendimento.tempoMedioAtendimento)}
          detalhe={`Abertura até início · ${atendimento.osComAtendimento} corretiva(s)`}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="MTTR"
          valor={formatarHoras(atendimento.mttr)}
          detalhe={`Reparo em si · ${atendimento.osComReparo} corretiva(s) concluída(s)`}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="Tempo em espera"
          valor={podeVerEspera ? formatarDias(atendimento.esperaTotalDias) : '—'}
          detalhe={
            !podeVerEspera
              ? 'Disponível para gestão e administração'
              : atendimento.esperaDisponivel
                ? `Soma das esperas de ${atendimento.osComEspera} OS`
                : 'Calculado a partir das mudanças de status'
          }
          para={linkManutencoes({ abertas: 1 })}
        />
        <NumeroIndicador
          rotulo="OS abertas"
          valor={atendimento.idadeFaixas.reduce((soma, faixa) => soma + faixa.total, 0)}
          detalhe="Idade detalhada abaixo"
          para={linkManutencoes({ abertas: 1 })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            MTTR por equipamento — do maior para o menor
          </p>
          <ListaRanking itens={mttrItens} vazio="Nenhuma corretiva concluída no período" />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tempo em espera por equipamento
          </p>
          {podeVerEspera ? (
            <ListaRanking
              itens={esperaItens}
              vazio="Nenhuma OS passou por Aguardando Peça, Fornecedor ou Pendente"
              sufixo="Espera = intervalos em Aguardando Peça/Fornecedor/Pendente registrados no histórico de status."
            />
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              O tempo em espera usa o histórico de status (log de auditoria) e fica restrito a gestão e administração.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Idade das OS abertas</p>
          <ListaRanking
            itens={atendimento.idadeFaixas.map((faixa) => ({
              chave: faixa.rotulo,
              label: faixa.rotulo,
              valor: faixa.total,
              para: linkManutencoes({ abertas: 1 }),
            }))}
            vazio="Nenhuma OS aberta"
          />
          <p className="text-[10px] text-muted-foreground">
            {corretivas} corretiva(s) com abertura no período selecionado.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Abertas há mais tempo</p>
          <ListaRanking itens={antigas} vazio="Nenhuma OS aberta" />
        </div>
      </div>
    </div>
  );
}