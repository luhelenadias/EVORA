import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Clock, Eye } from 'lucide-react';

/** Marcar como visto, adiar (1/3/7 dias) e resolver. */
export default function AlertaAcoes({ alerta, onFeito }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const atualizar = async (dados) => {
    await base44.entities.Alerta.update(alerta.id, dados);
    queryClient.invalidateQueries({ queryKey: ['alertas'] });
    onFeito?.();
  };

  const marcarVisto = (e) => {
    e.stopPropagation();
    atualizar({ status: 'Visto', visto_em: new Date().toISOString(), visto_por: user?.full_name || 'Usuário' });
  };

  const adiar = (e, dias) => {
    e.stopPropagation();
    atualizar({ status: 'Adiado', adiado_ate: addDays(new Date(), dias).toISOString() });
  };

  const resolver = (e) => {
    e.stopPropagation();
    atualizar({ status: 'Resolvido', resolucao: 'Manual', resolvido_em: new Date().toISOString() });
  };

  const resolvido = alerta.status === 'Resolvido';

  if (resolvido) return null;

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {alerta.status !== 'Visto' && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={marcarVisto} title="Marcar como visto">
          <Eye className="w-3.5 h-3.5" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Adiar">
            <Clock className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Adiar por</DropdownMenuLabel>
          {[1, 3, 7].map((dias) => (
            <DropdownMenuItem key={dias} onClick={(e) => adiar(e, dias)}>
              {dias} dia{dias > 1 ? 's' : ''}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={resolver} title="Resolver">
        <Check className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}