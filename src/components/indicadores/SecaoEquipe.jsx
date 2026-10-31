import React from 'react';
import { AlertCircle } from 'lucide-react';
import NumeroIndicador from './NumeroIndicador';
import ListaRanking from './ListaRanking';
import { formatarMoeda, linkManutencoes } from '@/lib/indicadoresGerais';

/** 7. Equipe (gestão e administração): OS por técnico e produtividade. */
export default function SecaoEquipe({ equipe }) {
  const { linhas, semCarga, custoHora, custoTotalInterno } = equipe;
  const semDados = semCarga > 0 || !custoHora;

  const ranking = linhas.map((linha) => ({
    chave: linha.id,
    label: linha.nome,
    hint:
      linha.produtividade == null
        ? `${linha.horas.toFixed(1)} h registradas · carga não informada`
        : `${linha.horas.toFixed(1)} h de ${linha.tempoPago.toFixed(0)} h pagas`,
    valor: linha.produtividade == null ? `${linha.os} OS` : `${linha.produtividade}%`,
    para: linkManutencoes({ tecnico: linha.id }),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumeroIndicador
          rotulo="Técnicos com OS"
          valor={linhas.filter((l) => l.os > 0).length}
          detalhe={`${linhas.length} pessoa(s) na equipe técnica`}
          para="/usuarios"
        />
        <NumeroIndicador
          rotulo="Carga horária informada"
          valor={`${linhas.length - semCarga}/${linhas.length}`}
          detalhe="Pessoas com carga mensal cadastrada"
          tom={semCarga ? 'atencao' : 'positivo'}
          para="/usuarios"
        />
        <NumeroIndicador
          rotulo="Custo da hora técnica"
          valor={custoHora ? formatarMoeda(custoHora) : '—'}
          detalhe={custoHora ? 'Definido em Configurações → Indicadores' : 'Informe em Configurações → Indicadores'}
          para="/configuracoes"
        />
        <NumeroIndicador
          rotulo="Mão de obra interna estimada"
          valor={custoTotalInterno == null ? '—' : formatarMoeda(custoTotalInterno)}
          detalhe="Horas registradas em OS × custo da hora"
          para={linkManutencoes({})}
        />
      </div>

      {semDados && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          <p className="text-xs text-foreground">
            <strong>Produtividade sem dados completos.</strong> Informe a carga horária mensal de cada técnico (Usuários)
            e o custo da hora técnica (Configurações → Indicadores). Sem isso, o tempo pago não é calculado e nenhum
            percentual é estimado.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Produtividade = tempo registrado em OS ÷ tempo pago
        </p>
        <ListaRanking itens={ranking} vazio="Nenhuma OS atribuída a técnicos no período" />
        <p className="rounded-lg border border-dashed px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          Leitura de gestão, não de cobrança individual: o tempo registrado inclui espera por peça, fornecedor e
          liberação de área — fatores fora do controle do técnico.
        </p>
      </div>
    </div>
  );
}