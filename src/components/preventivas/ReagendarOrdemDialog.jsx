import React, { useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CalendarClock, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { dataProgramada, horarioProgramado, temHorario } from '@/lib/preventivas';
import { avisosDeAgenda, isoDaData, podeReagendar } from '@/lib/agenda';

/**
 * Painel do card do calendário: detalhes da OS e do equipamento, troca do
 * técnico responsável e da data/hora, e atalho para a OS completa.
 */
export default function ReagendarOrdemDialog({ ordem, equipment, tecnicos = [], ordens = [], onSalvar, onAbrirOS, onClose }) {
  const dataAtual = dataProgramada(ordem);
  const editavel = podeReagendar(ordem);

  const [tecnicoId, setTecnicoId] = useState(ordem.technician_id || 'sem');
  const [dia, setDia] = useState(dataAtual ? format(dataAtual, 'yyyy-MM-dd') : '');
  const [hora, setHora] = useState(temHorario(ordem) ? horarioProgramado(ordem) : '');
  const [salvando, setSalvando] = useState(false);

  const tecnicoEscolhido = tecnicoId === 'sem' ? null : tecnicoId;
  const novaData = isoDaData(dia, hora);
  const avisos = editavel && novaData
    ? avisosDeAgenda({ order: ordem, novaData, tecnicoId: tecnicoEscolhido, ordens, tecnicos })
    : [];
  const alterou =
    editavel &&
    ((novaData || '') !== (ordem.scheduled_date || '') ||
      (tecnicoEscolhido || '') !== (ordem.technician_id || ''));

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(ordem, {
        scheduled_date: novaData || ordem.scheduled_date || '',
        technician_id: tecnicoEscolhido,
        technician_name: tecnicoEscolhido ? tecnicos.find((t) => t.id === tecnicoEscolhido)?.name || '' : '',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {equipment?.name || ordem.equipment_name || 'Equipamento'}
            {equipment?.codigo_equipamento && (
              <Badge variant="outline" className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5">
                {equipment.codigo_equipamento}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {ordem.code && <span className="font-mono">{ordem.code}</span>}
            <span>{ordem.type}</span>
            <StatusBadge value={ordem.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="text-sm font-medium text-foreground">
              {equipment?.location_sector || ordem.sector || 'Setor não informado'}
            </p>
            <p className="leading-relaxed">{ordem.problem_description || 'Sem descrição informada.'}</p>
            <p>
              Agendada para{' '}
              <span className="font-medium text-foreground">
                {dataAtual ? format(dataAtual, 'dd/MM/yyyy') : 'sem data'}
                {temHorario(ordem) ? ` às ${horarioProgramado(ordem)}` : ''}
              </span>
            </p>
          </div>

          {editavel ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Técnico responsável</Label>
                <Select value={tecnicoId} onValueChange={setTecnicoId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem técnico</SelectItem>
                    {tecnicos.map((tecnico) => (
                      <SelectItem key={tecnico.id} value={tecnico.id}>
                        {tecnico.name}{tecnico.status && tecnico.status !== 'Ativo' ? ` · ${tecnico.status}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Dia</Label>
                  <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hora (opcional)</Label>
                  <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                </div>
              </div>

              {avisos.length > 0 && (
                <div className="space-y-1 rounded-lg border border-accent/40 bg-accent/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <AlertTriangle className="w-3.5 h-3.5" /> Atenção
                  </p>
                  {avisos.map((aviso) => (
                    <p key={aviso} className="text-xs leading-snug text-foreground/80">{aviso}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5 mt-px flex-shrink-0" />
              Só manutenções ainda não iniciadas podem ser reagendadas. Esta já{' '}
              {ordem.status === 'Em Andamento' ? 'está em andamento' : 'foi concluída'}.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" className="gap-1.5" onClick={() => onAbrirOS?.(ordem)}>
            <ExternalLink className="w-3.5 h-3.5" /> Abrir OS completa
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            {editavel && (
              <Button onClick={salvar} disabled={!alterou || salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}