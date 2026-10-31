import React from 'react';
import NumeroIndicador from './NumeroIndicador';
import { formatarMoeda, formatarPct, linkManutencoes } from '@/lib/indicadoresGerais';

/** 5. SLA e contratos. OS sem SLA definido ficam fora do percentual, mas são mostradas. */
export default function SecaoSlaContratos({ sla }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="SLA de resposta"
          valor={formatarPct(sla.pctResposta)}
          detalhe={`${sla.respostaOk} de ${sla.comResposta} OS · ${sla.semSlaResposta} sem SLA`}
          tom={sla.pctResposta != null && sla.pctResposta < 90 ? 'atencao' : 'positivo'}
          para={linkManutencoes({ abertas: 1 })}
        />
        <NumeroIndicador
          rotulo="SLA de resolução"
          valor={formatarPct(sla.pctResolucao)}
          detalhe={`${sla.resolucaoOk} de ${sla.comResolucao} OS · ${sla.semSlaResolucao} sem SLA`}
          tom={sla.pctResolucao != null && sla.pctResolucao < 90 ? 'atencao' : 'positivo'}
          para={linkManutencoes({ abertas: 1 })}
        />
        <NumeroIndicador
          rotulo="Contratos vencendo"
          valor={sla.vencendo}
          detalhe={`${sla.vencidos} vencido(s) na base`}
          tom={sla.vencendo ? 'atencao' : 'positivo'}
          para="/contratos"
        />
        <NumeroIndicador
          rotulo="Valor mensal contratado"
          valor={formatarMoeda(sla.valorMensal)}
          detalhe="Somente contratos vigentes"
          para="/contratos"
        />
      </div>

      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
        <p>
          Nota média dos fornecedores:{' '}
          <strong className="text-foreground">
            {sla.notaFornecedores == null ? '—' : `${sla.notaFornecedores.toFixed(1)} / 5`}
          </strong>{' '}
          · {sla.semSlaContrato} contrato(s) sem SLA cadastrado.
        </p>
        <p className="mt-1">
          Percentuais consideram apenas OS com prazo de SLA definido — {sla.semSlaResolucao} OS do período não têm SLA
          aplicável e não entram na conta.
        </p>
      </div>
    </div>
  );
}