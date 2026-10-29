import React from 'react';
import { CalendarClock, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FilterSelect from '@/components/maintenance/FilterSelect';
import { STATUS_ORDEM, TIPOS_ORDEM } from '@/lib/filtros';

/** Filtros do calendário: técnico, tipo, status e setor. A visão dia/semana/mês fica no calendário. */
export default function FiltrosCalendario({
  filtros,
  onChange,
  tecnicos = [],
  setores = [],
  mostrarMinhaAgenda = false,
  onMinhaAgenda,
  minhaAgendaAtiva = false,
  sugestoesPendentes = 0,
  onGerarSugestoes,
  gerandoSugestoes = false,
}) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        ariaLabel="Técnico"
        className="w-full sm:w-48"
        value={filtros.tecnico}
        onChange={alterar('tecnico')}
        options={[
          { value: 'todos', label: 'Todos os técnicos' },
          ...tecnicos.map((t) => ({ value: t.id, label: `${t.name}${t.status !== 'Ativo' ? ` · ${t.status}` : ''}` })),
        ]}
      />
      <FilterSelect
        ariaLabel="Tipo"
        className="w-full sm:w-40"
        value={filtros.tipo}
        onChange={alterar('tipo')}
        options={[{ value: 'Todas', label: 'Todos os tipos' }, ...TIPOS_ORDEM.map((t) => ({ value: t, label: t }))]}
      />
      <FilterSelect
        ariaLabel="Status"
        className="w-full sm:w-44"
        value={filtros.status}
        onChange={alterar('status')}
        options={[{ value: 'Todos', label: 'Todos os status' }, ...STATUS_ORDEM.map((s) => ({ value: s, label: s }))]}
      />
      <FilterSelect
        ariaLabel="Setor"
        className="w-full sm:w-40"
        value={filtros.setor}
        onChange={alterar('setor')}
        options={[{ value: 'todos', label: 'Todos os setores' }, ...setores.map((s) => ({ value: s, label: s }))]}
      />

      {mostrarMinhaAgenda && (
        <Button
          variant={minhaAgendaAtiva ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5"
          onClick={onMinhaAgenda}
        >
          <UserRound className="h-3.5 w-3.5" /> Minha agenda
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="ml-auto h-9 gap-1.5"
        onClick={onGerarSugestoes}
        disabled={gerandoSugestoes}
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {gerandoSugestoes ? 'Gerando...' : 'Sugerir datas'}
        {sugestoesPendentes > 0 && (
          <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">{sugestoesPendentes}</span>
        )}
      </Button>
    </div>
  );
}