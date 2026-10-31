import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FilterSelect from '@/components/maintenance/FilterSelect';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { FILTROS_INICIAIS, PERIODOS, TIPOS_MANUTENCAO } from '@/lib/indicadoresGerais';

const comoOpcoes = (lista = []) => lista.map((valor) => ({ value: valor.value ?? valor, label: valor.label ?? valor }));

/** Filtros globais do topo: valem para todos os indicadores da página. */
export default function FiltrosGlobais({
  filtros,
  onChange,
  setores = [],
  tiposEquipamento = [],
  tecnicos = [],
  mostrarTecnico = false,
}) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });
  const comFiltro =
    Number(!!filtros.setor?.length) +
    Number(!!filtros.tipoEquipamento?.length) +
    Number(!!filtros.tipoManutencao?.length) +
    Number(!!filtros.tecnico?.length) +
    Number(filtros.periodo !== FILTROS_INICIAIS.periodo);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <FilterSelect ariaLabel="Período" value={filtros.periodo} onChange={alterar('periodo')} options={PERIODOS} />
      <FilterMultiSelect label="Setor" value={filtros.setor} onChange={alterar('setor')} options={comoOpcoes(setores)} />
      <FilterMultiSelect
        label="Tipo de equipamento"
        value={filtros.tipoEquipamento}
        onChange={alterar('tipoEquipamento')}
        options={comoOpcoes(tiposEquipamento)}
      />
      <FilterMultiSelect
        label="Tipo de manutenção"
        value={filtros.tipoManutencao}
        onChange={alterar('tipoManutencao')}
        options={comoOpcoes(TIPOS_MANUTENCAO)}
      />
      {mostrarTecnico && (
        <FilterMultiSelect label="Técnico" value={filtros.tecnico} onChange={alterar('tecnico')} options={tecnicos} />
      )}
      {comFiltro > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => onChange({ ...FILTROS_INICIAIS })}>
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}