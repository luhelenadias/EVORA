import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import { URGENCIAS } from '@/lib/triagem';

/**
 * Prioridade na triagem: mostra a urgência de quem abriu e a prioridade
 * sugerida pela criticidade do equipamento; a gestão confirma ou altera.
 */
export default function PrioridadeTriagem({
  urgencia,
  sugestao,
  prioridade,
  onPrioridadeChange,
  motivo,
  onMotivoChange,
  erro,
}) {
  const alterada = sugestao && prioridade !== sugestao;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Urgência informada na abertura:</span>
        {urgencia ? <StatusBadge value={urgencia} type="priority" /> : (
          <span className="text-muted-foreground">não informada</span>
        )}
        <span className="ml-2 text-muted-foreground">Sugestão pela criticidade:</span>
        {sugestao ? <StatusBadge value={sugestao} type="priority" /> : (
          <span className="text-muted-foreground">sem sugestão</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Prioridade confirmada *</Label>
          <Select value={prioridade} onValueChange={onPrioridadeChange}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCIAS.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {alterada && (
          <p className="text-[11px] text-muted-foreground">
            Diferente da sugestão: o motivo é obrigatório.
          </p>
        )}
      </div>

      {alterada && (
        <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <Label className="text-xs">Motivo da alteração de prioridade *</Label>
          <Textarea
            rows={2}
            value={motivo || ''}
            onChange={(evento) => onMotivoChange(evento.target.value)}
            placeholder="Ex.: equipamento parado com procedimento em curso"
          />
          {erro && <p className="text-[11px] font-medium text-destructive">{erro}</p>}
        </div>
      )}
    </div>
  );
}