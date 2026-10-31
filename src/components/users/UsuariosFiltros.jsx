import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FiltrosPanel from '@/components/maintenance/FiltrosPanel';
import FilterMultiSelect from '@/components/maintenance/FilterMultiSelect';
import { PERFIS, ROLE_LABELS } from '@/lib/roles';
import { SITUACOES } from '@/lib/tecnicos';

/** Situações exibidas no filtro: as do usuário + o convite ainda não aceito. */
export const SITUACOES_FILTRO = [...SITUACOES, 'Convite pendente'];

export const FILTROS_USUARIOS_INICIAIS = { busca: '', tipo: [], situacao: [] };

export default function UsuariosFiltros({ filtros, onChange }) {
  const ativos = (filtros.tipo || []).length + (filtros.situacao || []).length + (filtros.busca ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={filtros.busca}
          onChange={(evento) => onChange({ ...filtros, busca: evento.target.value })}
          className="pl-10"
        />
      </div>

      <FiltrosPanel ativos={ativos}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <FilterMultiSelect
            label="Tipo"
            value={filtros.tipo}
            onChange={(tipo) => onChange({ ...filtros, tipo })}
            options={PERFIS.map((perfil) => ({ value: perfil, label: ROLE_LABELS[perfil] }))}
          />
          <FilterMultiSelect
            label="Situação"
            value={filtros.situacao}
            onChange={(situacao) => onChange({ ...filtros, situacao })}
            options={SITUACOES_FILTRO.map((situacao) => ({ value: situacao, label: situacao }))}
          />
        </div>
      </FiltrosPanel>
    </div>
  );
}