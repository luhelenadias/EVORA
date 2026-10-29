import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FilterSelect from '@/components/maintenance/FilterSelect';
import { PERIODOS, PRIORIDADES, STATUS_ORDEM, TIPOS_ORDEM } from '@/lib/filtros';

const comTodos = (lista, rotulo) => [{ value: 'todos', label: rotulo }, ...lista.map((v) => ({ value: v, label: v }))];

/** Filtros da aba Lista: status, técnico, período, tipo, prioridade, setor e equipamento. */
export default function FiltrosLista({ filtros, onChange, tecnicos = [], equipamentos = [], setores = [] }) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por equipamento, código ou descrição..."
          value={filtros.busca || ''}
          onChange={(evento) => onChange({ ...filtros, busca: evento.target.value })}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <FilterSelect
          ariaLabel="Status"
          value={filtros.status}
          onChange={alterar('status')}
          options={[{ value: 'Todos', label: 'Todos os status' }, ...STATUS_ORDEM.map((s) => ({ value: s, label: s }))]}
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
          ariaLabel="Período"
          value={filtros.periodo}
          onChange={alterar('periodo')}
          options={PERIODOS}
        />
        <FilterSelect
          ariaLabel="Tipo"
          value={filtros.tipo}
          onChange={alterar('tipo')}
          options={[{ value: 'Todas', label: 'Todos os tipos' }, ...TIPOS_ORDEM.map((t) => ({ value: t, label: t }))]}
        />
        <FilterSelect
          ariaLabel="Prioridade"
          value={filtros.prioridade}
          onChange={alterar('prioridade')}
          options={[{ value: 'Todas', label: 'Todas as prioridades' }, ...PRIORIDADES.map((p) => ({ value: p, label: p }))]}
        />
        <FilterSelect
          ariaLabel="Setor"
          value={filtros.setor}
          onChange={alterar('setor')}
          options={comTodos(setores, 'Todos os setores')}
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

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={() => onChange({ ...filtros, busca: '', status: 'Todos', tecnico: 'todos', periodo: 'todos', tipo: 'Todas', prioridade: 'Todas', setor: 'todos', equipamento: 'todos' })}
        >
          <X className="h-3 w-3" /> Limpar filtros
        </Button>
      </div>
    </div>
  );
}