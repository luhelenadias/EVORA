import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Link2, Loader2 } from 'lucide-react';
import { casamentoDeSeries, formatarData, garantiaFim } from '@/lib/contratos';

/**
 * Séries do contrato casadas com os equipamentos do cadastro. O vínculo só é
 * gravado quando o usuário confirma; série sem equipamento nunca cria registro.
 */
export default function ContractSerieMatches({ contrato, series: seriesDoForm, equipamentos = [], onConfirmar, salvando }) {
  const series = seriesDoForm || contrato.series_no_contrato || [];
  const vinculados = contrato.covered_equipment_ids || [];
  const meses = Number(contrato.warranty_months) || null;

  const { vinculos, naoEncontradas } = useMemo(
    () => casamentoDeSeries(series, equipamentos),
    [series, equipamentos]
  );

  // null = ainda não mexeu: marca por padrão quem tem série no contrato e não está vinculado.
  const [escolhidos, setEscolhidos] = useState(null);
  const selecionados =
    escolhidos ?? vinculos.filter((v) => !vinculados.includes(v.equipment.id)).map((v) => v.equipment.id);

  if (!series.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum número de série registrado neste contrato. Rode a extração do PDF ou informe as séries manualmente.
      </p>
    );
  }

  const alternar = (id) =>
    setEscolhidos(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {vinculos.length} de {series.length} série(s) encontrada(s) no cadastro de equipamentos.
        {selecionados.length > 0 && ` ${selecionados.length} selecionado(s) para vincular.`}
      </p>

      <div className="space-y-2">
        {vinculos.map(({ serie, equipment }) => {
          const fim = garantiaFim(equipment, meses);
          const jaVinculado = vinculados.includes(equipment.id);
          return (
            <label
              key={serie}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
            >
              <Checkbox
                checked={selecionados.includes(equipment.id)}
                onCheckedChange={() => alternar(equipment.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{equipment.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-mono">{equipment.codigo_equipamento || '—'}</span> · série {serie}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {!meses
                    ? 'Garantia não informada no contrato — revisar.'
                    : fim
                      ? `Fim da garantia: ${formatarData(fim)} (instalação + ${meses} meses)`
                      : 'Equipamento sem data de instalação — garantia não calculada, revisar.'}
                </p>
              </div>
              {jaVinculado && (
                <Badge variant="outline" className="border-primary/25 bg-primary/10 text-[10px] text-primary">
                  já vinculado
                </Badge>
              )}
            </label>
          );
        })}
      </div>

      {naoEncontradas.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
            <AlertTriangle className="w-3.5 h-3.5" /> {naoEncontradas.length} série(s) sem equipamento correspondente no cadastro
          </p>
          <p className="mt-1 text-[11px] text-warning-foreground">
            Elas ficam registradas no contrato. Nenhum equipamento é criado automaticamente.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {naoEncontradas.map((serie) => (
              <span key={serie} className="rounded border border-warning/40 bg-background px-2 py-0.5 font-mono text-[11px]">
                {serie}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={salvando}
          onClick={() => onConfirmar(selecionados, naoEncontradas)}
        >
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Confirmar vínculos
        </Button>
      </div>
    </div>
  );
}