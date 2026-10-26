import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { abrirDocumento } from '@/lib/contratoPdf';
import { formatarData } from '@/lib/contratos';
import { toast } from 'sonner';

/** Versões do PDF: a assinada nunca é alterada, cada mudança entra como nova versão. */
export default function ContractVersions({ contrato, onReextrair, extraindo }) {
  const versoes = [...(contrato.versoes_documento || [])].reverse();

  if (!versoes.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma versão enviada ainda.</p>;
  }

  const abrir = async (url) => {
    try {
      await abrirDocumento(url);
    } catch {
      toast.error('Não foi possível abrir esta versão.');
    }
  };

  return (
    <div className="space-y-2">
      {versoes.map((versao, indice) => (
        <div
          key={`${versao.url}-${indice}`}
          className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{versao.tipo || 'Original'}</Badge>
              {versao.vigente && (
                <Badge variant="outline" className="border-primary/25 bg-primary/10 text-[10px] text-primary">vigente</Badge>
              )}
              <span className="text-[11px] text-muted-foreground">{formatarData(versao.enviado_em)}</span>
              {versao.enviado_por && <span className="text-[11px] text-muted-foreground">· {versao.enviado_por}</span>}
            </div>
            {versao.nota && <p className="mt-1 text-xs">{versao.nota}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => abrir(versao.url)}>Abrir</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={extraindo}
              onClick={() => onReextrair(versao.url)}
            >
              Reextrair
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}