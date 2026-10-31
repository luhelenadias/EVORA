import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import ListaRanking from './ListaRanking';
import { formatarPct, linkManutencoes, linkOrdem } from '@/lib/indicadoresGerais';

/**
 * 3. Preventivas. Pontualidade = início do atendimento em relação à data programada,
 * nunca a abertura da OS (que gera números irreais em preventivas anuais).
 */
export default function SecaoPreventivas({ preventivas }) {
  const proximas = preventivas.proximasLista.map((ordem) => ({
    chave: ordem.id,
    label: `${ordem.code || 'Preventiva'} · ${ordem.equipment_name || 'Equipamento'}`,
    hint: ordem.technician_name || 'Não atribuída',
    valor: new Date(ordem.data).toLocaleDateString('pt-BR'),
    para: linkOrdem(ordem.id),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Cumpridas no prazo"
          valor={formatarPct(preventivas.pctNoPrazo)}
          detalhe={`${preventivas.noPrazo} de ${preventivas.concluidas} concluída(s)`}
          tom={preventivas.pctNoPrazo != null && preventivas.pctNoPrazo < 80 ? 'atencao' : 'positivo'}
          para={linkManutencoes({ tipo: 'Preventiva' })}
        />
        <NumeroIndicador
          rotulo="Atrasadas"
          valor={preventivas.atrasadas}
          detalhe="Data programada já venceu e segue aberta"
          tom={preventivas.atrasadas ? 'critico' : 'positivo'}
          para={linkManutencoes({ tipo: 'Preventiva', abertas: 1, atrasadas: 1 })}
        />
        <NumeroIndicador
          rotulo="Próximas 30 dias"
          valor={preventivas.proximas}
          detalhe="Programadas para as próximas quatro semanas"
          para={linkManutencoes({ tipo: 'Preventiva', abertas: 1 })}
        />
        <NumeroIndicador
          rotulo="Preventiva / corretiva"
          valor={`${formatarPct(preventivas.pctPreventiva)} / ${formatarPct(100 - (preventivas.pctPreventiva ?? 0))}`}
          detalhe={`${preventivas.preventivas} preventiva(s) · ${preventivas.corretivas} corretiva(s)`}
          para={linkManutencoes({})}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Próximas preventivas</p>
        <ListaRanking itens={proximas} vazio="Nenhuma preventiva programada para os próximos 30 dias" />
        <p className="text-[10px] text-muted-foreground">
          Pontualidade compara o início do atendimento com a data programada da preventiva — o tempo desde a abertura
          não é usado aqui.
        </p>
      </div>
    </div>
  );
}