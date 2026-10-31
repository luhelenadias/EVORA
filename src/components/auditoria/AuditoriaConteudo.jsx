import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import AuditoriaFiltros from '@/components/auditoria/AuditoriaFiltros';
import AuditoriaTabela from '@/components/auditoria/AuditoriaTabela';
import AvisoLoginIndividual from '@/components/auditoria/AvisoLoginIndividual';

const COLUNAS_CSV = [
  ['data_hora', 'Data/hora'],
  ['entidade_tipo', 'Registro'],
  ['entidade_codigo', 'Código'],
  ['acao', 'Ação'],
  ['campo', 'Campo'],
  ['valor_anterior', 'Valor anterior'],
  ['valor_novo', 'Valor novo'],
  ['motivo', 'Motivo'],
  ['origem', 'Origem'],
  ['usuario_nome', 'Usuário'],
  ['usuario_email', 'E-mail'],
  ['usuario_perfil', 'Perfil'],
  ['tecnico_atribuido_id', 'Técnico atribuído (ID)'],
];

function montarQuery(filtros) {
  const query = {};
  if (filtros.acao !== 'todas') query.acao = filtros.acao;
  if (filtros.tipo !== 'todos') query.entidade_tipo = filtros.tipo;

  const periodo = {};
  if (filtros.de) periodo.$gte = `${filtros.de}T00:00:00.000Z`;
  if (filtros.ate) periodo.$lte = `${filtros.ate}T23:59:59.999Z`;
  if (Object.keys(periodo).length) query.data_hora = periodo;

  const codigo = filtros.codigo.trim();
  if (codigo) query.entidade_codigo = { $regex: codigo.toUpperCase() };

  const usuario = filtros.usuario.trim();
  if (usuario) {
    query.$or = [
      { usuario_nome: { $regex: usuario } },
      { usuario_email: { $regex: usuario.toLowerCase() } },
    ];
  }

  return query;
}

/** Filtros em texto legível, gravados no log junto com a exportação. */
function descreverFiltros(filtros, total) {
  const partes = [];
  if (filtros.de || filtros.ate) partes.push(`período ${filtros.de || 'início'} a ${filtros.ate || 'hoje'}`);
  if (filtros.acao !== 'todas') partes.push(`ação: ${filtros.acao}`);
  if (filtros.tipo !== 'todos') partes.push(`tipo: ${filtros.tipo}`);
  if (filtros.codigo.trim()) partes.push(`código: ${filtros.codigo.trim()}`);
  if (filtros.usuario.trim()) partes.push(`usuário: ${filtros.usuario.trim()}`);
  partes.push(`${total} registro(s)`);
  return partes.join(' · ');
}

function baixarCsv(registros) {
  const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const linhas = [COLUNAS_CSV.map(([, titulo]) => escapar(titulo)).join(';')];
  registros.forEach((registro) => {
    linhas.push(COLUNAS_CSV.map(([campo]) => escapar(registro[campo])).join(';'));
  });
  const blob = new Blob([`\ufeff${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Conteúdo do log: filtros, tabela e exportação. Usado na página e em Configurações. */
export default function AuditoriaConteudo() {
  const [filtros, setFiltros] = useState({
    usuario: '',
    de: subDays(new Date(), 30).toISOString().slice(0, 10),
    ate: '',
    acao: 'todas',
    tipo: 'todos',
    codigo: '',
  });

  const query = useMemo(() => montarQuery(filtros), [filtros]);

  const { data: registros = [], isLoading, refetch } = useQuery({
    queryKey: ['auditoria', query],
    queryFn: async () => {
      const { items } = await base44.entities.LogAuditoria.filter(query, { sort: '-data_hora', limit: 300 });
      return items;
    },
  });

  // A exportação em CSV também entra no log: quem exportou, quando e com quais filtros.
  const registrarExportacao = async () => {
    try {
      await base44.functions.invoke('registrarAuditoria', {
        entidade_tipo: 'LogAuditoria',
        entidade_id: 'exportacao',
        entidade_codigo: 'CSV',
        acao: 'Ajuste administrativo',
        campo: 'exportacao_csv',
        valor_novo: descreverFiltros(filtros, registros.length),
        origem: 'Usuário',
      });
      refetch();
    } catch {
      // A exportação já foi entregue; o registro é complementar.
    }
  };

  const exportar = () => {
    baixarCsv(registros);
    registrarExportacao();
  };

  return (
    <div className="space-y-4">
      <AvisoLoginIndividual registros={registros} />

      <AuditoriaFiltros
        filtros={filtros}
        onChange={setFiltros}
        onExportar={exportar}
        podeExportar={registros.length > 0}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : registros.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Nenhum registro no período"
          description="Ajuste os filtros ou amplie o período consultado."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <AuditoriaTabela registros={registros} />
          </CardContent>
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            {registros.length} registro(s) — os mais recentes primeiro (limite de 300 por consulta).
          </p>
        </Card>
      )}
    </div>
  );
}