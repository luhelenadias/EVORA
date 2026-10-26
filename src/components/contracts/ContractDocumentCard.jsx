import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { abrirDocumento } from '@/lib/contratoPdf';
import { formatarData } from '@/lib/contratos';

const TIPOS = ['Original', 'Aditivo', 'Renovação', 'Correção'];

const estiloStatus = {
  'Sem documento': 'border-border bg-muted text-muted-foreground',
  'Pendente de revisão': 'border-warning/40 bg-warning/20 text-warning-foreground',
  Revisado: 'border-primary/25 bg-primary/10 text-primary',
};

/** PDF vigente, envio de nova versão e disparo da leitura por IA. */
export default function ContractDocumentCard({ contrato, extraindo, qualidade, onExtrair, onEnviar }) {
  const versoes = contrato.versoes_documento || [];
  const [arquivo, setArquivo] = useState(null);
  const [tipo, setTipo] = useState(versoes.length ? 'Aditivo' : 'Original');
  const [nota, setNota] = useState('');
  const [campoArquivo, setCampoArquivo] = useState(0);
  const [abrindo, setAbrindo] = useState(false);

  const abrir = async () => {
    setAbrindo(true);
    try {
      await abrirDocumento(contrato.documento_atual_url);
    } catch {
      toast.error('Não foi possível abrir o PDF.');
    } finally {
      setAbrindo(false);
    }
  };

  const enviar = async () => {
    await onEnviar(arquivo, tipo, nota);
    setArquivo(null);
    setNota('');
    setCampoArquivo((n) => n + 1);
  };

  const status = contrato.extracao_status || 'Sem documento';

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold font-display">Documento do contrato</p>
          <Badge variant="outline" className={`text-[10px] ${estiloStatus[status] || estiloStatus['Sem documento']}`}>
            {status}
          </Badge>
          {contrato.extracao_em && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" /> leitura de {formatarData(contrato.extracao_em)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {contrato.documento_atual_url && (
            <Button type="button" variant="outline" size="sm" onClick={abrir} disabled={abrindo}>
              {abrindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Abrir PDF
            </Button>
          )}
          {contrato.documento_atual_url && (
            <Button type="button" size="sm" className="gap-1.5" onClick={() => onExtrair(contrato.documento_atual_url)} disabled={extraindo}>
              {extraindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {extraindo ? 'Lendo o PDF...' : 'Extrair dados do PDF'}
            </Button>
          )}
        </div>
      </div>

      {!contrato.documento_atual_url && (
        <p className="text-xs text-muted-foreground">
          Nenhum PDF anexado ainda. Envie o contrato assinado para a IA ler os dados principais.
        </p>
      )}

      {qualidade === 'Ruim' && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertTriangle className="mt-0.5 w-4 h-4 flex-shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            A leitura deste PDF ficou ruim (documento digitalizado com baixa qualidade ou página ilegível).
            Nada foi aplicado: confira os valores manualmente ou envie um PDF com melhor resolução.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Nova versão do PDF</Label>
          <Input
            key={campoArquivo}
            type="file"
            accept="application/pdf"
            className="h-9 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nota (opcional)</Label>
          <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex: reajuste anual" className="h-9" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          A versão enviada passa a ser a vigente; as anteriores são preservadas. Correções, aditivos e
          renovações entram sempre como nova versão.
        </p>
        <Button type="button" size="sm" onClick={enviar} disabled={!arquivo || extraindo}>
          {extraindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Enviar e extrair
        </Button>
      </div>
    </div>
  );
}