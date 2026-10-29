import React from 'react';
import FiltrosPanel from '@/components/maintenance/FiltrosPanel';
import FilterSelect from '@/components/maintenance/FilterSelect';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { PERIODOS, TIPOS_ORDEM, semSelecao } from '@/lib/filtros';

const comoOpcoes = (lista = []) => lista.map((valor) => ({ value: valor, label: valor }));

/** Filtros dos indicadores: período, técnico, tipo e equipamento no painel recolhível. */
export default function FiltrosIndicadores({ filtros, onChange, tecnicos = [], equipamentos = [] }) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });

  const ativos =
    ['tecnico', 'tipo', 'equipamento'].filter((campo) => !semSelecao(filtros[campo])).length +
    (filtros.periodo !== '90' ? 1 : 0);

  return (
    <FiltrosPanel ativos={ativos}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <FilterSelect
          ariaLabel="Período"
          value={filtros.periodo}
          onChange={alterar('periodo')}
          options={PERIODOS}
        />
        <FilterMultiSelect
          label="Técnico"
          value={filtros.tecnico || []}
          onChange={alterar('tecnico')}
          options={tecnicos.map((t) => ({ value: t.id, label: t.name }))}
        />
        <FilterMultiSelect
          label="Tipo"
          value={filtros.tipo || []}
          onChange={alterar('tipo')}
          options={comoOpcoes(TIPOS_ORDEM)}
        />
        <FilterMultiSelect
          label="Equipamento"
          value={filtros.equipamento || []}
          onChange={alterar('equipamento')}
          options={equipamentos.map((e) => ({ value: e.id, label: e.name }))}
        />
      </div>
    </FiltrosPanel>
  );
}