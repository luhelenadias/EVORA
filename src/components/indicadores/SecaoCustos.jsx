import React from 'react';
import { AlertCircle } from 'lucide-react';
import NumeroIndicador from './NumeroIndicador';
import { formatarMoeda, formatarPct, linkManutencoes } from '@/lib/indicadoresGerais';

/** Faixa de referência de custo anual de manutenção sobre o valor do parque. */
const REFERENCIA = { minimo: 5, referencia: 7, maximo: 9, fonte: 'Bronzino, 1992' };

/** 6. Custos: peças + serviço, separando interno e externo. */
export default function SecaoCustos({ custos }) {
  const anualOk = custos.pctParque != null;

  return (
    <div className="space-y-3">
      {custos.semCustos && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          <p className="text-xs text-foreground">
            <strong>Custos não preenchidos.</strong> Nenhuma OS do período tem custo de peças ou de serviço registrado —
            os indicadores de custo ficam sem valor em vez de aparecerem como 0%.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Gasto de manutenção"
          valor={custos.semCustos ? '—' : formatarMoeda(custos.total)}
          detalhe="Peças + serviço no período"
          para={linkManutencoes({})}
        />
        <NumeroIndicador
          rotulo="Peças e materiais"
          valor={custos.semCustos ? '—' : formatarMoeda(custos.custoPecas)}
          detalhe="Insumos lançados nas OS"
          para="/pecas"
        />
        <NumeroIndicador
          rotulo="Serviço externo"
          valor={custos.semCustos ? '—' : formatarMoeda(custos.externo)}
          detalhe={`Interno: ${formatarMoeda(custos.interno)}`}
          para={linkManutencoes({})}
        />
        <NumeroIndicador
          rotulo="Custo anual / valor do parque"
          valor={anualOk ? formatarPct(Math.round(custos.pctParque)) : '—'}
          detalhe={
            anualOk
              ? `${formatarMoeda(custos.custoAnual)} ao ano sobre ${formatarMoeda(custos.valorParque)}`
              : custos.semCustos
                ? 'Sem custos registrados no período'
                : 'Informe o valor de aquisição dos equipamentos'
          }
          tom={
            custos.pctParque == null
              ? 'neutro'
              : custos.pctParque > REFERENCIA.maximo
                ? 'critico'
                : custos.pctParque > REFERENCIA.referencia
                  ? 'atencao'
                  : 'positivo'
          }
        />
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Referência: {REFERENCIA.minimo}% a {REFERENCIA.maximo}% do valor do parque ao ano ({REFERENCIA.fonte})
          </p>
          <p className="text-[11px] text-muted-foreground">Referência exibida: ~{REFERENCIA.referencia}% ao ano</p>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
          <span className="h-full bg-primary/30" style={{ width: '50%' }} />
          <span className="h-full bg-warning/40" style={{ width: '20%' }} />
          <span className="h-full bg-destructive/30" style={{ width: '30%' }} />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Faixa verde até 7%, atenção entre 7% e 9%, acima de 9% pede revisão do contrato de manutenção.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <NumeroIndicador rotulo="Valor em estoque" valor={formatarMoeda(custos.valorEstoque)} detalhe="Peças × custo unitário" para="/pecas" />
        <NumeroIndicador
          rotulo="Peças abaixo do mínimo"
          valor={custos.pecasAbaixoMinimo}
          detalhe="Reposição necessária"
          tom={custos.pecasAbaixoMinimo ? 'atencao' : 'positivo'}
          para="/pecas"
        />
        <NumeroIndicador
          rotulo="Peças sem custo unitário"
          valor={custos.pecasSemCusto}
          detalhe="Sem preço cadastrado no estoque"
          para="/pecas"
        />
      </div>
    </div>
  );
}