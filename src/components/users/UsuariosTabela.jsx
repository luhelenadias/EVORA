import React from 'react';
import { Pencil, Send, Trash2, UserCheck, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { ROLE_LABELS } from '@/lib/roles';
import { PERFIL_TECNICO } from '@/lib/tecnicos';

const TIPO_STYLES = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  tecnico: 'bg-warning/20 text-warning-foreground border-warning/40',
  clinico: 'bg-primary/10 text-primary border-primary/25',
  gestor: 'bg-muted text-muted-foreground border-border',
};

/** Lista única de pessoas: usuários cadastrados e convites ainda não aceitos. */
export default function UsuariosTabela({
  linhas,
  onEditar,
  onDesativar,
  onReativar,
  onReenviarConvite,
  onCancelarConvite,
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Nome</TableHead>
            <TableHead className="text-xs font-semibold">E-mail</TableHead>
            <TableHead className="text-xs font-semibold">Tipo</TableHead>
            <TableHead className="text-xs font-semibold">Situação</TableHead>
            <TableHead className="text-xs font-semibold">Formação</TableHead>
            <TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => {
            const tecnico = linha.role === PERFIL_TECNICO;
            const formacao = [linha.especialidade, linha.nivel].filter(Boolean).join(' · ');
            return (
              <TableRow key={linha.key}>
                <TableCell className="text-sm font-medium">
                  {linha.nome}
                  {linha.department && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">· {linha.department}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{linha.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[11px] border ${TIPO_STYLES[linha.role] || TIPO_STYLES.clinico}`}>
                    {ROLE_LABELS[linha.role] || linha.role}
                  </Badge>
                </TableCell>
                <TableCell><StatusBadge value={linha.situacao} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{tecnico && formacao ? formacao : '—'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {linha.convitePendente ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reenviar convite" onClick={() => onReenviarConvite(linha)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Cancelar convite" onClick={() => onCancelarConvite(linha)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => onEditar(linha)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {linha.situacao === 'Inativo' ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reativar" onClick={() => onReativar(linha)}>
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Desativar" onClick={() => onDesativar(linha)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}