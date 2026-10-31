import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FiltrosPanel from '@/components/maintenance/FiltrosPanel';
import FilterSelect from '@/components/maintenance/FilterSelect';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { FILTROS_INICIAIS, PERIODOS, TIPOS_MANUTENCAO } from '@/lib/indicadoresGerais';

const comoOpcoes = (lista = []) => lista.map((valor) => ({ value: valor.value ?? valor, label: valor.label ?? valor }));

/**
 * Filtros globais do topo: valem para todos os indicadores da página.
 * Ficam recolhidos por padrão (como em Manutenções); cada campo aceita
 * várias opções marcadas ao mesmo tempo.
 */
export default function FiltrosGlobais({
  filtros,
  onChange,
  setores = [],
  tiposEquipamento = [],
  tecnicos = [],
  mostrarTecnico = false,
}) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });
  const ativos =
    Number(!!filtros.setor?.length) +
    Number(!!filtros.tipoEquipamento?.length) +
    Number(!!filtros.tipoManutencao?.length) +
    Number(!!filtros.tecnico?.length) +
    Number(filtros.periodo !== FILTROS_INICIAIS.periodo);

  return (
    <FiltrosPanel ativos={ativos}>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <FilterSelect ariaLabel="Período" value={filtros.periodo} onChange={alterar('periodo')} options={PERIODOS} />
          <FilterMultiSelect label="Setor" value={filtros.setor || []} onChange={alterar('setor')} options={comoOpcoes(setores)} />
          <FilterMultiSelect
            label="Tipo de equipamento"
            value={filtros.tipoEquipamento || []}
            onChange={alterar('tipoEquipamento')}
            options={comoOpcoes(tiposEquipamento)}
          />
          <FilterMultiSelect
            label="Tipo de manutenção"
            value={filtros.tipoManutencao || []}
            onChange={alterar('tipoManutencao')}
            options={comoOpcoes(TIPOS_MANUTENCAO)}
          />
          {mostrarTecnico && (
            <FilterMultiSelect label="Técnico" value={filtros.tecnico || []} onChange={alterar('tecnico')} options={tecnicos} />
          )}
        </div>

        {ativos > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onChange({ ...FILTROS_INICIAIS })}
            >
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </FiltrosPanel>
  );
}