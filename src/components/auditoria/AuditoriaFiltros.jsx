import React from 'react';
import { Download, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACOES, ENTIDADES } from '@/lib/auditoria';

/** Filtros da página de Auditoria: usuário, período, ação, tipo de registro e código. */
export default function AuditoriaFiltros({ filtros, onChange, onExportar, podeExportar }) {
  const alterar = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Usuário</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtros.usuario}
                onChange={(e) => alterar('usuario', e.target.value)}
                placeholder="Nome ou e-mail"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filtros.de} onChange={(e) => alterar('de', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filtros.ate} onChange={(e) => alterar('ate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Ação</Label>
            <Select value={filtros.acao} onValueChange={(v) => alterar('acao', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                {ACOES.map((acao) => <SelectItem key={acao} value={acao}>{acao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tipo de registro</Label>
            <Select value={filtros.tipo} onValueChange={(v) => alterar('tipo', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {ENTIDADES.map((entidade) => (
                  <SelectItem key={entidade.valor} value={entidade.valor}>{entidade.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Código (OS ou nº do contrato)</Label>
            <Input
              value={filtros.codigo}
              onChange={(e) => alterar('codigo', e.target.value)}
              placeholder="Ex: OS-2026-018"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Registros sem visualizações: o log guarda apenas ações que alteram dados.
          </p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onExportar} disabled={!podeExportar}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}