import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ABAS, ABA_TRAVADA, ACESSOS_PADRAO, PERFIS, ROLE_LABELS, chavesDoPerfil } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, RotateCcw, Users } from 'lucide-react';
import { toast } from 'sonner';

const padrao = () =>
  PERFIS.reduce((acc, perfil) => ({ ...acc, [perfil]: [...(ACESSOS_PADRAO[perfil] || [])] }), {});

/** Matriz de acesso: linhas = abas do sistema, colunas = perfis. */
export default function AcessosPerfil({ config }) {
  const queryClient = useQueryClient();
  const [acessos, setAcessos] = useState(padrao);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcessos(PERFIS.reduce((acc, perfil) => ({ ...acc, [perfil]: chavesDoPerfil(config, perfil) }), {}));
  }, [config]);

  const travada = (perfil, chave) => perfil === 'admin' && chave === ABA_TRAVADA;

  const alternar = (perfil, chave) => {
    if (travada(perfil, chave)) return;
    setAcessos((prev) => {
      const atuais = prev[perfil] || [];
      return {
        ...prev,
        [perfil]: atuais.includes(chave) ? atuais.filter((k) => k !== chave) : [...atuais, chave],
      };
    });
  };

  const listaParaSalvar = (perfil) =>
    ABAS.filter((aba) => (acessos[perfil] || []).includes(aba.key)).map((aba) => aba.key);

  const alterado = !!config && PERFIS.some((perfil) => {
    const salvo = [...chavesDoPerfil(config, perfil)].sort().join('|');
    const atual = [...listaParaSalvar(perfil)].sort().join('|');
    return salvo !== atual;
  });

  const restaurar = () => {
    setAcessos(padrao());
    toast.info('Pré-definições restauradas. Salve para aplicar.');
  };

  const salvar = async () => {
    setSaving(true);
    try {
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        acessos_perfil: PERFIS.map((perfil) => ({ perfil, abas: listaParaSalvar(perfil) })),
      });
      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      toast.success('Acessos por perfil atualizados!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Acessos por Perfil
        </CardTitle>
        <CardDescription>
          Escolha quais abas cada perfil enxerga. O que não estiver marcado sai do menu e fica bloqueado para o
          perfil, mesmo por link direto. Quem tem acessos personalizados em Usuários não é afetado por esta matriz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Aba</TableHead>
                {PERFIS.map((perfil) => (
                  <TableHead key={perfil} className="text-xs font-semibold text-center">
                    {ROLE_LABELS[perfil]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ABAS.map((aba) => (
                <TableRow key={aba.key}>
                  <TableCell className="text-sm font-medium">{aba.label}</TableCell>
                  {PERFIS.map((perfil) => (
                    <TableCell key={perfil} className="text-center">
                      <Checkbox
                        checked={(acessos[perfil] || []).includes(aba.key)}
                        onCheckedChange={() => alternar(perfil, aba.key)}
                        disabled={travada(perfil, aba.key)}
                        aria-label={`${aba.label} — ${ROLE_LABELS[perfil]}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          Configurações fica sempre liberada para o Administrador — é por ela que os próprios acessos são ajustados.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {alterado ? 'Há alterações não salvas.' : 'Acessos salvos.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={restaurar} className="gap-1.5">
              <RotateCcw className="w-4 h-4" /> Restaurar pré-definições
            </Button>
            <Button onClick={salvar} disabled={!alterado || saving}>
              {saving ? 'Salvando...' : 'Salvar acessos'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}