import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import { formatarPct } from '@/lib/indicadoresGerais';

function Distribuicao({ titulo, itens, total }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <div className="space-y-1.5">
        {itens.map((item) => {
          const percentual = total ? Math.round((item.total / total) * 100) : 0;
          return (
            <div key={item.rotulo} className="flex items-center gap-2">
              <span className="w-32 flex-shrink-0 truncate text-xs text-foreground">{item.rotulo}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
              </span>
              <span className="w-14 flex-shrink-0 text-right text-xs font-semibold">{item.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 1. Parque: composição, situação atual e capacitação dos operadores. */
export default function SecaoParque({ parque }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Equipamentos"
          valor={parque.total}
          detalhe={`${parque.parados} parado(s) · ${parque.emManutencao} em manutenção`}
          para="/equipamentos"
        />
        <NumeroIndicador
          rotulo="Parados agora"
          valor={parque.parados}
          detalhe="Fora de operação, aguardando ação"
          tom={parque.parados ? 'atencao' : 'positivo'}
          para="/equipamentos"
        />
        <NumeroIndicador
          rotulo="Em manutenção"
          valor={parque.emManutencao}
          detalhe="Em atendimento neste momento"
          para="/equipamentos"
        />
        <NumeroIndicador
          rotulo="Operadores treinados"
          valor={formatarPct(parque.pctTreinados)}
          detalhe={`${parque.treinados} de ${parque.operadores} operadores`}
          tom={parque.pctTreinados != null && parque.pctTreinados < 70 ? 'atencao' : 'positivo'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Distribuicao titulo="Por status operacional" itens={parque.porStatus} total={parque.total} />
        <Distribuicao titulo="Por criticidade" itens={parque.porCriticidade} total={parque.total} />
      </div>
    </div>
  );
}