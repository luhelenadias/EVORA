import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PartsUsedEditor from '@/components/maintenance/PartsUsedEditor';
import CamposRelatorioIa from '@/components/maintenance/CamposRelatorioIa';
import { Badge } from '@/components/ui/badge';
import { formatarMoeda, pecasAcimaDoEstoque, totalPecas } from '@/lib/orderDetail';
import { duracaoTexto, estaPausada, temposDaOS } from '@/lib/pausas';
import { AlertTriangle, Pause, Sparkles } from 'lucide-react';

export default function FinalizarManutencaoDialog({ open, order, equipment, onClose, onConfirm, isSaving }) {
  const { data: spareParts = [] } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });

  const [minutos, setMinutos] = useState(0);
  const [tempos, setTempos] = useState(null);
  const [ajustadoManualmente, setAjustadoManualmente] = useState(false);
  const [report, setReport] = useState('');
  const [parts, setParts] = useState([]);
  const [extras, setExtras] = useState({ causa_falha: '', testes_finais: '', pendencias: '' });

  useEffect(() => {
    if (!open || !order) return;
    // Nasce pré-preenchido com o TEMPO DE REPARO ATIVO: (agora − início) − pausas.
    const calculo = temposDaOS(order, new Date());
    setTempos(calculo);
    setMinutos(calculo.reparoMinutos);
    setAjustadoManualmente(false);
    setReport(order.technical_report || '');
    setParts(order.parts_used || []);
    setExtras({
      causa_falha: order.causa_falha || '',
      testes_finais: order.testes_finais || '',
      pendencias: order.pendencias || '',
    });
  }, [open, order?.id]);

  const pecasValidas = parts.filter((p) => p.spare_part_id);
  const subtotalPecas = totalPecas(pecasValidas);
  const totalOrdem = (Number(order?.total_cost) || 0) + subtotalPecas;
  const excedentes = pecasAcimaDoEstoque(pecasValidas, spareParts);
  const pausada = estaPausada(order);
  const bloqueado = excedentes.length > 0 || pausada;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (bloqueado) return;
    const completionDate = new Date().toISOString();
    // Sem ajuste manual, grava o tempo ativo: (conclusão − início) − pausas.
    const total = ajustadoManualmente
      ? Math.max(parseInt(minutos, 10) || 0, 0)
      : temposDaOS(order, new Date(completionDate)).reparoMinutos;
    onConfirm({
      completion_date: completionDate,
      duracao_total_minutos: total,
      technical_report: report.trim(),
      causa_falha: extras.causa_falha.trim(),
      testes_finais: extras.testes_finais.trim(),
      pendencias: extras.pendencias.trim(),
      parts_used: pecasValidas,
      // Custo total da OS = valor já registrado + peças utilizadas nesta conclusão.
      ...(subtotalPecas > 0 ? { total_cost: totalOrdem } : {}),
    });
  };

  const horas = ((Math.max(parseInt(minutos, 10) || 0, 0)) / 60).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Finalizar Manutenção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{order?.equipment_name || '—'}</p>
            {equipment?.codigo_equipamento && (
              <p className="font-mono text-xs font-bold text-primary">{equipment.codigo_equipamento}</p>
            )}
          </div>

          {pausada ? (
            <p className="flex items-start gap-1.5 rounded-md border border-accent/50 bg-accent/10 p-2.5 text-xs text-accent-foreground">
              <Pause className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              Esta OS está pausada. Retome a manutenção antes de finalizar.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Tempo de reparo ativo (minutos) *</Label>
              <Input
                type="number"
                min="0"
                value={minutos}
                onChange={(e) => { setMinutos(e.target.value); setAjustadoManualmente(true); }}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Tempo bruto {tempos?.brutoMinutos ?? 0} min − pausas {tempos?.pausadoMinutos ?? 0} min ={' '}
                {tempos?.reparoMinutos ?? 0} min ({duracaoTexto(tempos?.reparoMinutos ?? 0)}). Edite apenas se precisar ajustar.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Chamado total (abertura até agora): {duracaoTexto(tempos?.chamadoMinutos ?? 0)} — é o tempo que conta para o SLA.
              </p>
            </div>
          )}

          {order?.relatorio_audio_em && (
            <p className="flex items-start gap-1.5 rounded-md border border-primary/25 bg-primary/5 p-2.5 text-xs text-primary">
              <Sparkles className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              Rascunho gerado por IA a partir do relato em áudio — revise os campos abaixo antes de concluir.
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">O que foi feito? *</Label>
              {order?.campos_revisar?.includes('acao_realizada') && (
                <Badge variant="outline" className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground">
                  revisar
                </Badge>
              )}
            </div>
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={4}
              placeholder="Descreva o serviço executado, peças substituídas e observações..."
              required
            />
          </div>

          <CamposRelatorioIa
            valores={extras}
            revisar={order?.campos_revisar || []}
            onChange={(campo, valor) => setExtras((p) => ({ ...p, [campo]: valor }))}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Peças utilizadas (opcional)</Label>
              {order?.campos_revisar?.includes('pecas') && (
                <Badge variant="outline" className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground">
                  conferir quantidades
                </Badge>
              )}
            </div>
            <PartsUsedEditor items={parts} spareParts={spareParts} onChange={setParts} />
            {bloqueado ? (
              <p className="flex items-start gap-1.5 text-[11px] font-medium text-destructive">
                <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                <span>
                  Estoque insuficiente:{' '}
                  {excedentes
                    .map((e) => `${e.name} (disponível ${e.disponivel}, solicitado ${e.quantidade})`)
                    .join(' · ')}
                  . Ajuste as quantidades para concluir.
                </span>
              </p>
            ) : (
              subtotalPecas > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Peças somam {formatarMoeda(subtotalPecas)} — o custo total da ordem passará a{' '}
                  {formatarMoeda(totalOrdem)}.
                </p>
              )
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || bloqueado}>
              {isSaving ? 'Salvando...' : 'Concluir Manutenção'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}