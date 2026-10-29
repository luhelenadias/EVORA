import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FiltrosPanel from '@/components/maintenance/FiltrosPanel';
import FilterSelect from '@/components/maintenance/FilterSelect';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { FILTROS_LISTA_INICIAIS, PERIODOS, PRIORIDADES, STATUS_ORDEM, TIPOS_ORDEM, semSelecao } from '@/lib/filtros';

const comoOpcoes = (lista = []) => lista.map((valor) => ({ value: valor, label: valor }));
const CAMPOS = ['status', 'tecnico', 'tipo', 'prioridade', 'setor', 'equipamento'];

/** Filtros da aba Lista: busca sempre visível e o restante no painel recolhível. */
export default function FiltrosLista({ filtros, onChange, tecnicos = [], equipamentos = [], setores = [] }) {
  const alterar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });

  const ativos =
    CAMPOS.filter((campo) => !semSelecao(filtros[campo])).length +
    (String(filtros.busca || '').trim() ? 1 : 0) +
    (filtros.periodo !== 'todos' ? 1 : 0);

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

      <FiltrosPanel ativos={ativos}>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <FilterMultiSelect
              label="Status"
              value={filtros.status || []}
              onChange={alterar('status')}
              options={comoOpcoes(STATUS_ORDEM)}
            />
            <FilterMultiSelect
              label="Técnico"
              value={filtros.tecnico || []}
              onChange={alterar('tecnico')}
              options={tecnicos.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FilterSelect
              ariaLabel="Período"
              value={filtros.periodo}
              onChange={alterar('periodo')}
              options={PERIODOS}
            />
            <FilterMultiSelect
              label="Tipo"
              value={filtros.tipo || []}
              onChange={alterar('tipo')}
              options={comoOpcoes(TIPOS_ORDEM)}
            />
            <FilterMultiSelect
              label="Prioridade"
              value={filtros.prioridade || []}
              onChange={alterar('prioridade')}
              options={comoOpcoes(PRIORIDADES)}
            />
            <FilterMultiSelect
              label="Setor"
              value={filtros.setor || []}
              onChange={alterar('setor')}
              options={comoOpcoes(setores)}
            />
            <FilterMultiSelect
              label="Equipamento"
              value={filtros.equipamento || []}
              onChange={alterar('equipamento')}
              options={equipamentos.map((e) => ({ value: e.id, label: e.name }))}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onChange({ ...FILTROS_LISTA_INICIAIS })}
            >
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          </div>
        </div>
      </FiltrosPanel>
    </div>
  );
}