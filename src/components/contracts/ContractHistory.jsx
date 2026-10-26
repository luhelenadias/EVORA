import React from 'react';
import { History } from 'lucide-react';

function formatarQuando(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** Histórico de edições manuais: quem alterou, quando, de qual valor para qual. */
export default function ContractHistory({ registros = [] }) {
  if (!registros.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma alteração manual registrada ainda.</p>;
  }

  const lista = [...registros].reverse();

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {lista.map((registro, indice) => (
        <div key={`${registro.campo}-${registro.alterado_em}-${indice}`} className="rounded-lg border bg-muted/20 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{registro.campo}</p>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <History className="w-3 h-3" /> {formatarQuando(registro.alterado_em)}
            </span>
          </div>
          <p className="mt-1 text-xs">
            <span className="text-muted-foreground line-through">{registro.valor_anterior || '—'}</span>
            <span className="mx-1.5 text-muted-foreground">→</span>
            <span className="font-medium">{registro.valor_novo || '—'}</span>
          </p>
          {registro.alterado_por && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">por {registro.alterado_por}</p>
          )}
        </div>
      ))}
    </div>
  );
}