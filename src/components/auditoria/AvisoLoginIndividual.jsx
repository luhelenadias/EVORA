import React from 'react';
import { Info } from 'lucide-react';

/**
 * Aviso discreto: o log só identifica pessoas quando cada uma tem login
 * próprio. Não bloqueia nada — apenas explica o limite e sugere contas
 * individuais quando o uso está concentrado numa conta só.
 */
export default function AvisoLoginIndividual({ registros = [] }) {
  const porUsuario = registros.reduce((mapa, registro) => {
    const chave = registro.usuario_email || registro.usuario_nome;
    if (!chave) return mapa;
    mapa[chave] = (mapa[chave] || 0) + 1;
    return mapa;
  }, {});

  const total = Object.values(porUsuario).reduce((soma, n) => soma + n, 0);
  const [maisAtivo, quantidade] = Object.entries(porUsuario).sort((a, b) => b[1] - a[1])[0] || [];
  const concentrado = total >= 8 && quantidade / total >= 0.7;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-px h-3.5 w-3.5 flex-shrink-0" />
      <div className="space-y-1">
        <p>
          O log só identifica pessoas quando cada uma tem login próprio. Ações feitas em uma
          conta compartilhada aparecem todas com o mesmo nome — não é possível separar quem
          fez o quê.
        </p>
        {concentrado && (
          <p className="text-warning-foreground">
            {quantidade} de {total} ações registradas vieram da mesma conta ({maisAtivo}). Vale
            incentivar contas individuais para cada pessoa da equipe.
          </p>
        )}
      </div>
    </div>
  );
}