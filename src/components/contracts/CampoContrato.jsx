import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { rotuloValor } from '@/lib/contratos';

const estiloCerteza = {
  Alta: 'border-primary/25 bg-primary/10 text-primary',
  'Média': 'border-warning/40 bg-warning/20 text-warning-foreground',
  Baixa: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const SEM_VALOR = '__sem_valor';

const temConteudo = (valor) => valor !== undefined && valor !== null && valor !== '' && !(Array.isArray(valor) && valor.length === 0);

/** Um campo do contrato: valor editável, fonte no PDF e comparação com o valor extraído. */
export default function CampoContrato({ campo, valor, extraido, fonte, revisar, onChange }) {
  const diverge = temConteudo(extraido) && JSON.stringify(extraido) !== JSON.stringify(valor ?? '');

  const entrada = () => {
    if (campo.tipo === 'multiopcao') {
      const atuais = Array.isArray(valor) ? valor : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {campo.opcoes.map((opcao) => {
            const ativo = atuais.includes(opcao);
            return (
              <button
                key={opcao}
                type="button"
                onClick={() => onChange(ativo ? atuais.filter((v) => v !== opcao) : [...atuais, opcao])}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  ativo ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {opcao}
              </button>
            );
          })}
        </div>
      );
    }

    if (campo.tipo === 'opcao') {
      return (
        <Select value={valor || SEM_VALOR} onValueChange={(v) => onChange(v === SEM_VALOR ? '' : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Não informado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_VALOR}>Não informado</SelectItem>
            {campo.opcoes.map((opcao) => (
              <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (campo.tipo === 'texto_longo') {
      return <Textarea rows={2} value={valor || ''} onChange={(e) => onChange(e.target.value)} />;
    }

    if (campo.tipo === 'data') {
      return <Input type="date" value={valor || ''} onChange={(e) => onChange(e.target.value)} />;
    }

    if (campo.tipo === 'numero') {
      return (
        <Input
          type="number"
          step="any"
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    }

    return <Input value={valor || ''} onChange={(e) => onChange(e.target.value)} />;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{campo.label}</Label>
        {revisar && (
          <Badge variant="outline" className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground">
            revisar
          </Badge>
        )}
      </div>

      {entrada()}

      {fonte ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          p. {fonte.pagina || '—'} · “{fonte.trecho}”
          <span className={cn('ml-1 rounded border px-1 py-px text-[10px] font-medium', estiloCerteza[fonte.certeza])}>
            {fonte.certeza}
          </span>
        </p>
      ) : (
        revisar && <p className="text-[11px] text-muted-foreground">Não localizado no PDF — confira ou preencha.</p>
      )}

      {diverge && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5">
          <span className="text-[11px] text-warning-foreground">
            No PDF: <strong>{rotuloValor(campo.key, extraido)}</strong>
          </span>
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => onChange(extraido)}>
            Usar o do PDF
          </Button>
        </div>
      )}
    </div>
  );
}