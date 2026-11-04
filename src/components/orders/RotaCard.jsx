import React from 'react';
import { FileText, ShieldCheck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROTAS, ROTAS_EXTERNAS, resumoContrato } from '@/lib/rota';

const ICONES = {
  Garantia: ShieldCheck,
  Contrato: FileText,
  'Equipe interna': Wrench,
  'Fornecedor sem contrato': Wrench,
};

/**
 * Cartão da rota de atendimento da OS corretiva: mostra a sugestão do sistema,
 * permite aceitar ou trocar a rota (exigindo motivo na troca) e, em
 * `somenteLeitura`, apenas apresenta a rota registrada na OS.
 */
export default function RotaCard({
  sugestao,
  rota,
  contrato,
  motivoAtual,
  motivoTroca,
  fornecedor,
  onRotaChange,
  onMotivoTrocaChange,
  onFornecedorChange,
  erro,
  somenteLeitura = false,
}) {
  const efetiva = rota || sugestao?.rota || '';
  if (!sugestao && !efetiva) return null;

  const Icone = ICONES[efetiva] || Wrench;
  const externa = ROTAS_EXTERNAS.includes(efetiva);
  const alterada = Boolean(sugestao && efetiva && efetiva !== sugestao.rota);
  const contratoRota = contrato || sugestao?.contrato || null;

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icone className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Rota de atendimento</span>
          <Badge variant="outline" className="border-primary/30 bg-card text-[11px] text-primary">
            {efetiva}
          </Badge>
        </div>
        {!somenteLeitura && (
          <Select value={efetiva} onValueChange={onRotaChange}>
            <SelectTrigger className="h-8 w-full bg-card text-xs sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROTAS.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {sugestao ? `Sugerido: ${sugestao.rota} · ${sugestao.motivo}` : motivoAtual || 'Rota registrada na OS.'}
      </p>

      {contratoRota && efetiva !== 'Equipe interna' && (
        <p className="text-[11px] text-foreground/80">{resumoContrato(contratoRota)}</p>
      )}

      {alterada && !somenteLeitura && (
        <div className="space-y-1.5">
          <Label className="text-xs">Motivo da troca de rota *</Label>
          <Textarea
            rows={2}
            value={motivoTroca || ''}
            onChange={(evento) => onMotivoTrocaChange(evento.target.value)}
            placeholder="Ex.: equipamento já fora da cobertura contratual"
          />
          {erro && <p className="text-[11px] font-medium text-destructive">Informe o motivo da troca de rota.</p>}
        </div>
      )}

      {somenteLeitura && alterada && motivoTroca && (
        <p className="text-[11px] text-foreground/80">Motivo da troca: {motivoTroca}</p>
      )}

      {externa && !somenteLeitura && (
        <div className="space-y-1.5">
          <Label className="text-xs">Fornecedor responsável</Label>
          <Input
            value={fornecedor || ''}
            onChange={(evento) => onFornecedorChange(evento.target.value)}
            placeholder="Fabricante ou serviço de manutenção"
            className="h-8 bg-card text-xs"
          />
          <p className="text-[11px] text-muted-foreground">A OS fica sem técnico interno designado.</p>
        </div>
      )}

      {somenteLeitura && externa && fornecedor && (
        <p className="text-[11px] text-foreground/80">Fornecedor: {fornecedor}</p>
      )}
    </div>
  );
}