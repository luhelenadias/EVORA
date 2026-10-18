import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PartsUsedEditor from '@/components/maintenance/PartsUsedEditor';
import { minutosDeExecucao } from '@/lib/atendimento';
import { formatarMoeda, pecasAcimaDoEstoque, totalPecas } from '@/lib/orderDetail';
import { AlertTriangle } from 'lucide-react';

export default function FinalizarManutencaoDialog({ open, order, equipment, onClose, onConfirm, isSaving }) {
  const { data: spareParts = [] } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });

  const [minutos, setMinutos] = useState(0);
  const [ajustadoManualmente, setAjustadoManualmente] = useState(false);
  const [report, setReport] = useState('');
  const [parts, setParts] = useState([]);

  useEffect(() => {
    if (!open || !order) return;
    // Nasce pré-preenchido com o valor real: (agora - início), em minutos arredondados.
    setMinutos(minutosDeExecucao(order.start_date, new Date()) ?? 0);
    setAjustadoManualmente(false);
    setReport(order.technical_report || '');
    setParts(order.parts_used || []);
  }, [open, order?.id]);

  const pecasValidas = parts.filter((p) => p.spare_part_id);
  const subtotalPecas = totalPecas(pecasValidas);
  const totalOrdem = (Number(order?.total_cost) || 0) + subtotalPecas;
  const excedentes = pecasAcimaDoEstoque(pecasValidas, spareParts);
  const bloqueado = excedentes.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (bloqueado) return;
    const completionDate = new Date().toISOString();
    // Sem ajuste manual, grava sempre (completion_date - start_date) em minutos arredondados.
    const total = ajustadoManualmente
      ? Math.max(parseInt(minutos, 10) || 0, 0)
      : minutosDeExecucao(order.start_date, completionDate) ?? 0;
    onConfirm({
      completion_date: completionDate,
      duracao_total_minutos: total,
      technical_report: report.trim(),
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

          <div className="space-y-1.5">
            <Label className="text-xs">Tempo decorrido (minutos) *</Label>
            <Input
              type="number"
              min="0"
              value={minutos}
              onChange={(e) => { setMinutos(e.target.value); setAjustadoManualmente(true); }}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Calculado automaticamente (conclusão − início): {horas}h. Edite apenas se precisar ajustar.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">O que foi feito? *</Label>
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={4}
              placeholder="Descreva o serviço executado, peças substituídas e observações..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Peças utilizadas (opcional)</Label>
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