import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NIVEIS, NIVEL_UI, destinoDoAlerta } from '@/lib/alertas';
import NivelBadge from './NivelBadge';
import AlertaAcoes from './AlertaAcoes';
import { cn } from '@/lib/utils';

/** Uma linha de alerta: clicar abre o contrato, a OS ou o equipamento de origem. */
export default function AlertaItem({ alerta, compacto = false }) {
  const navigate = useNavigate();
  const ui = NIVEL_UI[NIVEIS.includes(alerta.nivel) ? alerta.nivel : 'Informativo'];
  const abrir = () => navigate(destinoDoAlerta(alerta));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') abrir();
      }}
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-lg border border-l-4 bg-card p-3 text-left transition-colors hover:bg-muted/50',
        ui.borda,
        alerta.status === 'Visto' && 'opacity-80'
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <NivelBadge nivel={alerta.nivel} />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{alerta.tipo}</span>
          {alerta.status === 'Visto' && (
            <span className="text-[11px] text-muted-foreground">· visto</span>
          )}
          {alerta.status === 'Adiado' && <span className="text-[11px] text-muted-foreground">· adiado</span>}
        </div>
        <p className="text-sm font-semibold text-foreground">{alerta.titulo}</p>
        {alerta.mensagem && !compacto && (
          <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
        )}
        {alerta.entidade_codigo && (
          <p className="text-[11px] text-muted-foreground/80">{alerta.entidade_codigo}</p>
        )}
      </div>
      <AlertaAcoes alerta={alerta} />
    </div>
  );
}