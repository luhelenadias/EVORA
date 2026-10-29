import React from 'react';
import FilterSelect from '@/components/maintenance/FilterSelect';
import { PERIODOS, TIPOS_ORDEM } from '@/lib/filtros';

/** Filtros dos indicadores: período, técnico, tipo e equipamento. */
export default function FiltrosIndicadores({ filtros, onChange, tecnicos = [], equipamentos = [] }) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <FilterSelect
        ariaLabel="Período"
        value={filtros.periodo}
        onChange={alterar('periodo')}
        options={PERIODOS}
      />
      <FilterSelect
        ariaLabel="Técnico"
        value={filtros.tecnico}
        onChange={alterar('tecnico')}
        options={[
          { value: 'todos', label: 'Todos os técnicos' },
          ...tecnicos.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
      <FilterSelect
        ariaLabel="Tipo"
        value={filtros.tipo}
        onChange={alterar('tipo')}
        options={[{ value: 'Todas', label: 'Todos os tipos' }, ...TIPOS_ORDEM.map((t) => ({ value: t, label: t }))]}
      />
      <FilterSelect
        ariaLabel="Equipamento"
        value={filtros.equipamento}
        onChange={alterar('equipamento')}
        options={[
          { value: 'todos', label: 'Todos os equipamentos' },
          ...equipamentos.map((e) => ({ value: e.id, label: e.name })),
        ]}
      />
    </div>
  );
}