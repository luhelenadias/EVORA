import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/** Nome curto do arquivo a partir do caminho salvo no anexo. */
function nomeDoArquivo(uri) {
  const partes = String(uri || '').split('/');
  return decodeURIComponent(partes[partes.length - 1] || 'arquivo');
}

/**
 * Fotos e anexos da OS (armazenados de forma privada). Usado na abertura e na
 * edição do chamado; em `somenteLeitura` apenas lista e abre os arquivos.
 */
export default function AnexosField({ valores = [], onChange, somenteLeitura = false }) {
  const [enviando, setEnviando] = useState(false);
  const [abrindo, setAbrindo] = useState(null);
  const lista = Array.isArray(valores) ? valores : [];

  const enviar = async (evento) => {
    const arquivos = Array.from(evento.target.files || []);
    evento.target.value = '';
    if (!arquivos.length) return;
    setEnviando(true);
    try {
      const enviados = [];
      for (const arquivo of arquivos) {
        const resposta = await base44.integrations.Core.UploadPrivateFile({ file: arquivo });
        if (resposta?.file_uri) enviados.push(resposta.file_uri);
      }
      if (enviados.length) onChange([...lista, ...enviados]);
    } catch {
      toast.error('Não foi possível anexar o arquivo agora.');
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (uri) => {
    setAbrindo(uri);
    try {
      const resposta = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 });
      const url = resposta?.signed_url;
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Não foi possível abrir o anexo.');
    } finally {
      setAbrindo(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Fotos e anexos</Label>
      {lista.length > 0 && (
        <ul className="space-y-1">
          {lista.map((uri) => (
            <li key={uri} className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[11px]">{nomeDoArquivo(uri)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => abrir(uri)}
                disabled={abrindo === uri}
              >
                {abrindo === uri ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Abrir
              </Button>
              {!somenteLeitura && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => onChange(lista.filter((item) => item !== uri))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!somenteLeitura && (
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted">
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {enviando ? 'Enviando...' : 'Anexar foto ou arquivo'}
          <input type="file" className="hidden" multiple onChange={enviar} disabled={enviando} />
        </label>
      )}
      {somenteLeitura && !lista.length && (
        <p className="text-[11px] text-muted-foreground">Sem anexos.</p>
      )}
    </div>
  );
}