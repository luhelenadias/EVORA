import React from 'react';
import { CalendarClock, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FiltrosPanel from '@/components/maintenance/FiltrosPanel';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { STATUS_ORDEM, TIPOS_ORDEM, semSelecao } from '@/lib/filtros';

const comoOpcoes = (lista = []) => lista.map((valor) => ({ value: valor, label: valor }));

/** Filtros do calendário: técnico, tipo, status e setor no painel recolhível. */
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

  const ativos = ['tecnico', 'tipo', 'status', 'setor'].filter((campo) => !semSelecao(filtros[campo])).length;

  const acoes = (
    <div className="flex flex-wrap items-center gap-2">
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
        className="h-9 gap-1.5"
        onClick={onGerarSugestoes}
        disabled={gerandoSugestoes}
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {gerandoSugestoes ? 'Gerando...' : 'Sugerir datas'}
        {sugestoesPendentes > 0 && (
          <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            {sugestoesPendentes}
          </span>
        )}
      </Button>
    </div>
  );

  return (
    <FiltrosPanel ativos={ativos} acoes={acoes}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <FilterMultiSelect
          label="Técnico"
          value={filtros.tecnico || []}
          onChange={alterar('tecnico')}
          options={tecnicos.map((t) => ({
            value: t.id,
            label: `${t.name}${t.status !== 'Ativo' ? ` · ${t.status}` : ''}`,
          }))}
        />
        <FilterMultiSelect
          label="Tipo"
          value={filtros.tipo || []}
          onChange={alterar('tipo')}
          options={comoOpcoes(TIPOS_ORDEM)}
        />
        <FilterMultiSelect
          label="Status"
          value={filtros.status || []}
          onChange={alterar('status')}
          options={comoOpcoes(STATUS_ORDEM)}
        />
        <FilterMultiSelect
          label="Setor"
          value={filtros.setor || []}
          onChange={alterar('setor')}
          options={comoOpcoes(setores)}
        />
      </div>
    </FiltrosPanel>
  );
}