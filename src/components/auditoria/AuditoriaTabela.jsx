import React from 'react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ENTIDADES, fraseDaEntrada, quemFez } from '@/lib/auditoria';

const ROTULO_ENTIDADE = ENTIDADES.reduce((mapa, item) => ({ ...mapa, [item.valor]: item.label }), {});

const CORES_ORIGEM = {
  'Usuário': 'border-border bg-muted text-muted-foreground',
  IA: 'border-primary/30 bg-primary/10 text-primary',
  Sistema: 'border-border bg-card text-muted-foreground',
  'Ajuste administrativo': 'border-destructive/30 bg-destructive/10 text-destructive',
};

/** Tabela do log: o que aconteceu, em qual registro, quem fez e por qual origem. */
export default function AuditoriaTabela({ registros = [] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-36 text-xs font-semibold">Data/hora</TableHead>
            <TableHead className="text-xs font-semibold">Registro</TableHead>
            <TableHead className="text-xs font-semibold">Ação</TableHead>
            <TableHead className="text-xs font-semibold">Quem</TableHead>
            <TableHead className="w-32 text-xs font-semibold">Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((registro) => (
            <TableRow key={registro.id} className="align-top">
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {registro.data_hora ? format(parseISO(registro.data_hora), 'dd/MM/yy HH:mm') : '—'}
              </TableCell>
              <TableCell>
                <p className="text-xs font-medium">{ROTULO_ENTIDADE[registro.entidade_tipo] || registro.entidade_tipo}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{registro.entidade_codigo || '—'}</p>
              </TableCell>
              <TableCell>
                <p className="text-xs">{fraseDaEntrada(registro)}</p>
                {registro.motivo && (
                  <p className="mt-0.5 text-[11px] italic text-muted-foreground">{registro.motivo}</p>
                )}
              </TableCell>
              <TableCell className="text-xs">
                <p>{quemFez(registro)}</p>
                {registro.usuario_email && registro.usuario_email !== quemFez(registro) && (
                  <p className="text-[11px] text-muted-foreground">{registro.usuario_email}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${CORES_ORIGEM[registro.origem] || CORES_ORIGEM['Usuário']}`}>
                  {registro.origem}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}