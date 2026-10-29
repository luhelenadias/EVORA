import React, { useMemo, useState } from 'react';
import { BellOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlertas } from '@/hooks/useAlertas';
import { agruparAlertas, alertaAtivo, TIPOS_ALERTA } from '@/lib/alertas';
import NivelBadge from './NivelBadge';
import AlertaGrupo from './AlertaGrupo';

const STATUS_FILTROS = [
  { value: 'em_aberto', label: 'Em aberto' },
  { value: 'Novo', label: 'Novos' },
  { value: 'Visto', label: 'Vistos' },
  { value: 'Adiado', label: 'Adiados' },
  { value: 'Resolvido', label: 'Resolvidos' },
  { value: 'todos', label: 'Todos' },
];

/** Lista completa de alertas com filtros, aberta pelo sino do topo. */
export default function AlertasDialog({ open, onClose }) {
  const { alertas, isLoading } = useAlertas();
  const [tipo, setTipo] = useState('todos');
  const [nivel, setNivel] = useState('todos');
  const [status, setStatus] = useState('em_aberto');

  const filtrados = useMemo(
    () =>
      alertas.filter((a) => {
        if (tipo !== 'todos' && a.tipo !== tipo) return false;
        if (nivel !== 'todos' && a.nivel !== nivel) return false;
        if (status === 'em_aberto') return alertaAtivo(a);
        if (status === 'todos') return true;
        return a.status === status;
      }),
    [alertas, tipo, nivel, status]
  );

  const grupos = useMemo(() => agruparAlertas(filtrados, 3), [filtrados]);
  const contagem = useMemo(
    () =>
      alertas.filter(alertaAtivo).reduce(
        (acc, a) => ({ ...acc, [a.nivel]: (acc[a.nivel] || 0) + 1 }),
        { Urgente: 0, 'Atenção': 0, Informativo: 0 }
      ),
    [alertas]
  );

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alertas</DialogTitle>
          <DialogDescription>
            Contratos, preventivas, SLA, estoque e chamados que precisam de atenção
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <NivelBadge nivel="Urgente" className="normal-case" />
          <span className="-ml-1 text-xs text-muted-foreground">{contagem.Urgente}</span>
          <NivelBadge nivel="Atenção" className="normal-case" />
          <span className="-ml-1 text-xs text-muted-foreground">{contagem['Atenção']}</span>
          <NivelBadge nivel="Informativo" className="normal-case" />
          <span className="-ml-1 text-xs text-muted-foreground">{contagem.Informativo}</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_ALERTA.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger>
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              <SelectItem value="Urgente">Urgente</SelectItem>
              <SelectItem value="Atenção">Atenção</SelectItem>
              <SelectItem value="Informativo">Informativo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTROS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BellOff className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum alerta neste filtro</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Quando um contrato, preventiva, SLA ou peça exigir atenção, o aviso aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {grupos.map((grupo) => (
              <AlertaGrupo key={grupo.chave} grupo={grupo} onAbrir={onClose} />
            ))}
          </div>
        )}

        {status !== 'todos' && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setStatus('todos')}>
              Ver também os resolvidos
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}