import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Ranking clicável: cada linha abre o equipamento ou a OS que gerou o número. */
export default function ListaRanking({ itens = [], vazio = 'Sem dados no período', sufixo }) {
  if (!itens.length) {
    return <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{vazio}</p>;
  }

  return (
    <ol className="divide-y rounded-lg border">
      {itens.map((item) => {
        const linha = (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{item.label}</p>
              {item.hint && <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>}
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-foreground">{item.valor}</span>
            {item.para && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
          </div>
        );

        return (
          <li key={item.chave || item.label}>
            {item.para ? (
              <Link to={item.para} className="block transition-colors hover:bg-muted/50">
                {linha}
              </Link>
            ) : (
              linha
            )}
          </li>
        );
      })}
      {sufixo && <li className="px-3 py-1.5 text-[10px] text-muted-foreground">{sufixo}</li>}
    </ol>
  );
}