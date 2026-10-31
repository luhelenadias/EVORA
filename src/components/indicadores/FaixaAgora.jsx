import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, PowerOff, Timer, UserX } from 'lucide-react';
import { linkManutencoes } from '@/lib/indicadoresGerais';
import { cn } from '@/lib/utils';

const TILES = [
  { chave: 'osAbertas', rotulo: 'OS abertas', icone: Timer, para: () => linkManutencoes({ abertas: 1 }) },
  { chave: 'osAtrasadas', rotulo: 'OS atrasadas', icone: AlertTriangle, para: () => linkManutencoes({ abertas: 1, atrasadas: 1 }), critico: true },
  { chave: 'alertasUrgentes', rotulo: 'Alertas urgentes', icone: BellRing, critico: true },
  { chave: 'semTecnico', rotulo: 'OS sem técnico', icone: UserX, para: () => linkManutencoes({ 'sem-tecnico': 1 }) },
  { chave: 'equipamentosParados', rotulo: 'Equipamentos parados', icone: PowerOff, para: () => '/equipamentos' },
];

/** Faixa "Agora": o que exige ação hoje, com cada número abrindo a lista já filtrada. */
export default function FaixaAgora({ agora, onAbrirAlertas }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary">Agora</h2>
        <p className="text-[11px] text-muted-foreground">o que exige ação hoje — clique no número para abrir a lista</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((tile) => {
          const Icone = tile.icone;
          const valor = agora[tile.chave] ?? 0;
          const destaque = tile.critico && valor > 0;
          const conteudo = (
            <div
              className={cn(
                'flex h-full flex-col justify-between gap-2 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40',
                destaque && 'border-accent/50 bg-accent/5'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium leading-tight text-muted-foreground">{tile.rotulo}</p>
                <Icone className={cn('h-4 w-4 flex-shrink-0', destaque ? 'text-accent' : 'text-primary/60')} />
              </div>
              <p className={cn('font-display text-xl font-semibold leading-none', destaque ? 'text-accent' : 'text-foreground')}>
                {valor}
              </p>
            </div>
          );

          if (tile.chave === 'alertasUrgentes') {
            return (
              <button key={tile.chave} type="button" onClick={onAbrirAlertas} className="text-left">
                {conteudo}
              </button>
            );
          }
          return (
            <Link key={tile.chave} to={tile.para()} className="block">
              {conteudo}
            </Link>
          );
        })}
      </div>
    </section>
  );
}