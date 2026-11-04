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

      {/* Triagem: a espera foi separada em antes e depois da decisão de destino. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <NumeroIndicador
          rotulo="Espera até a triagem"
          valor={formatarHoras(atendimento.tempoMedioTriagem)}
          detalhe={`Abertura até a triagem · ${atendimento.osComTriagem} corretiva(s)`}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="Triagem até o início"
          valor={formatarHoras(atendimento.tempoMedioTriagemAteInicio)}
          detalhe={`Depois da triagem · ${atendimento.osComTriagemAteInicio} corretiva(s)`}
          para={linkManutencoes({ tipo: 'Corretiva' })}
        />
        <NumeroIndicador
          rotulo="Fila de triagem hoje"
          valor={atendimento.filaTriagem?.quantidade ?? 0}
          detalhe={
            atendimento.filaTriagem?.maisAntigaDias != null
              ? `A mais antiga aguarda há ${atendimento.filaTriagem.maisAntigaDias} dia(s)`
              : 'Nenhum chamado aguardando triagem'
          }
          tom={atendimento.filaTriagem?.quantidade ? 'atencao' : 'neutro'}
          para={linkManutencoes({ view: 'triagem' })}
        />
      </div>

      {/* Pausas: onde a manutenção parou e quanto se espera por peça. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
        <NumeroIndicador
          rotulo="OS pausadas agora"
          valor={atendimento.pausadasAgora?.quantidade ?? 0}
          detalhe={
            atendimento.pausadasAgora?.maisAntigaDias != null
              ? `A mais antiga está pausada há ${atendimento.pausadasAgora.maisAntigaDias} dia(s)`
              : 'Nenhuma manutenção pausada'
          }
          tom={atendimento.pausadasAgora?.quantidade ? 'atencao' : 'neutro'}
          para={linkManutencoes({ abertas: 1 })}
        />
        <NumeroIndicador
          rotulo="Espera média de peça"
          valor={formatarHoras(atendimento.esperaPecaHoras)}
          detalhe={`Pedido até a chegada · ${atendimento.pedidosComChegada || 0} pedido(s)`}
          para="/pecas"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tempo parado por motivo de pausa
        </p>
        {(atendimento.paradoPorMotivo || []).length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-3 text-center text-[11px] text-muted-foreground">
            Nenhuma pausa registrada no período.
          </p>
        ) : (
          <div className="space-y-2">
            {atendimento.paradoPorMotivo.map((linha) => {
              const maior = Math.max(...atendimento.paradoPorMotivo.map((l) => l.minutos), 1);
              return (
                <div key={linha.motivo} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">{linha.motivo}</span>
                    <span className="text-muted-foreground">
                      {formatarDias(linha.minutos / 1440)} · {linha.os} pausa(s)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.round((linha.minutos / maior) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Soma das pausas das OS do período. O tempo pausado não entra no MTTR, mas conta no SLA.
        </p>
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