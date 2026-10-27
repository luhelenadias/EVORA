import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import ContractDocumentCard from '@/components/contracts/ContractDocumentCard';
import ContractFieldsReview from '@/components/contracts/ContractFieldsReview';
import ContractSerieMatches from '@/components/contracts/ContractSerieMatches';
import ContractVersions from '@/components/contracts/ContractVersions';
import ContractHistory from '@/components/contracts/ContractHistory';
import { enviarPdfDoContrato, extrairDoPdf } from '@/lib/contratoPdf';
import { registrarAuditoria } from '@/lib/auditoria';
import {
  dadosDoContrato,
  diasParaVencer,
  formatarData,
  garantiaFim,
  historicoDeAlteracoes,
  statusPorVigencia,
  valoresDoContrato,
} from '@/lib/contratos';

function Secao({ titulo, acao, children }) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold font-display">{titulo}</h3>
        {acao}
      </div>
      {children}
    </div>
  );
}

export default function ContractDetailDialog({ contrato, user, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const autor = user?.full_name || user?.email || 'Usuário';

  const [atual, setAtual] = useState(contrato);
  const [valores, setValores] = useState(() => valoresDoContrato(contrato));
  const [extraido, setExtraido] = useState({});
  const [fontes, setFontes] = useState(contrato.fontes_extracao || []);
  const [camposRevisar, setCamposRevisar] = useState(contrato.campos_revisar || []);
  const [qualidade, setQualidade] = useState(null);
  const [extraindo, setExtraindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const status = statusPorVigencia({ ...atual, ...valores });
  const dias = diasParaVencer(valores.end_date);
  const pendente = atual.extracao_status === 'Pendente de revisão';
  const temPropostas = Object.keys(extraido).length > 0;

  const extrair = async (fileUri) => {
    if (!fileUri) return;
    setExtraindo(true);
    try {
      const resultado = await extrairDoPdf(fileUri);
      setExtraido(resultado.valores);
      setFontes(resultado.fontes);
      setCamposRevisar(resultado.camposRevisar);
      setQualidade(resultado.qualidade);
      const registro = await base44.entities.Contract.update(atual.id, {
        fontes_extracao: resultado.fontes,
        campos_revisar: resultado.camposRevisar,
        extracao_status: 'Pendente de revisão',
        extracao_em: new Date().toISOString(),
      });
      setAtual(registro);
      onSaved?.();
      await registrarAuditoria({
        entidade_tipo: 'Contract',
        entidade_id: atual.id,
        entidade_codigo: atual.contract_number || '',
        acao: 'Extração por IA',
        campo: 'fontes_extracao',
        valor_novo: `${resultado.fontes.length} campo(s) com fonte no PDF`,
        motivo: `Qualidade da leitura: ${resultado.qualidade || '—'}`,
        origem: 'IA',
      });
      toast.success('Leitura concluída — confira os valores propostos');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível ler o PDF.');
    } finally {
      setExtraindo(false);
    }
  };

  const enviarNovaVersao = async (arquivo, tipo, nota) => {
    if (!arquivo) return;
    try {
      const fileUri = await enviarPdfDoContrato(arquivo);
      const versao = {
        url: fileUri,
        tipo,
        nota,
        vigente: true,
        enviado_em: new Date().toISOString(),
        enviado_por: autor,
      };
      const versoes = [...(atual.versoes_documento || []).map((v) => ({ ...v, vigente: false })), versao];
      const registro = await base44.entities.Contract.update(atual.id, {
        documento_atual_url: fileUri,
        versoes_documento: versoes,
      });
      setAtual(registro);
      onSaved?.();
      await registrarAuditoria({
        entidade_tipo: 'Contract',
        entidade_id: atual.id,
        entidade_codigo: atual.contract_number || '',
        acao: 'Upload de documento',
        campo: 'versoes_documento',
        valor_novo: `${tipo} — ${arquivo.name}`,
        motivo: nota ? `Nota: ${nota}` : '',
      });
      toast.success('PDF enviado como nova versão');
      await extrair(fileUri);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível enviar o PDF.');
    }
  };

  const salvar = async ({ confirmar = false } = {}) => {
    setSalvando(true);
    try {
      // As edições passam a ser registradas no log de auditoria (com quem e quando);
      // historico_alteracoes fica apenas como leitura do que já existia.
      const alteracoes = historicoDeAlteracoes(atual, valores, autor);
      const dados = {
        ...dadosDoContrato(valores),
        status: statusPorVigencia({ ...atual, ...valores }),
        ...(confirmar ? { extracao_status: 'Revisado', campos_revisar: [] } : {}),
      };
      const registro = await base44.entities.Contract.update(atual.id, dados);

      for (const alteracao of alteracoes) {
        await registrarAuditoria({
          entidade_tipo: 'Contract',
          entidade_id: atual.id,
          entidade_codigo: atual.contract_number || '',
          acao: 'Edição de campo',
          campo: alteracao.chave,
          valor_anterior: alteracao.valor_anterior,
          valor_novo: alteracao.valor_novo,
          motivo: `Campo: ${alteracao.campo}`,
        });
      }
      if (confirmar) {
        await registrarAuditoria({
          entidade_tipo: 'Contract',
          entidade_id: atual.id,
          entidade_codigo: atual.contract_number || '',
          acao: 'Edição de campo',
          campo: 'extracao_status',
          valor_anterior: atual.extracao_status || 'Pendente de revisão',
          valor_novo: 'Revisado',
          motivo: 'Revisão dos dados extraídos confirmada',
        });
      }

      setAtual(registro);
      if (confirmar) {
        setCamposRevisar([]);
        setExtraido({});
      }
      onSaved?.();
      toast.success(confirmar ? 'Dados conferidos e confirmados' : 'Alterações salvas');
    } catch {
      toast.error('Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const vincularEquipamentos = async (ids, naoEncontradas) => {
    setSalvando(true);
    try {
      const cobertos = [...new Set([...(atual.covered_equipment_ids || []), ...ids])];
      const registro = await base44.entities.Contract.update(atual.id, {
        covered_equipment_ids: cobertos,
        series_nao_encontradas: naoEncontradas,
      });
      setAtual(registro);

      const meses = Number(valores.warranty_months) || null;
      for (const id of ids) {
        const equipamento = equipamentos.find((e) => e.id === id);
        const fim = garantiaFim(equipamento, meses);
        await base44.entities.Equipment.update(id, {
          contract_id: atual.id,
          ...(fim ? { warranty_end: fim } : {}),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      onSaved?.();
      toast.success(
        ids.length
          ? `${ids.length} equipamento(s) vinculado(s)${meses ? ' e garantia aplicada quando havia data de instalação' : ''}`
          : 'Séries sem correspondência registradas no contrato'
      );
    } catch {
      toast.error('Não foi possível concluir o vínculo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{atual.supplier_name || 'Contrato'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge value={status} />
          <span className="font-mono">{atual.contract_number || 'sem nº'}</span>
          <span>·</span>
          <span>{formatarData(valores.start_date)} — {formatarData(valores.end_date)}</span>
          {dias !== null && dias < 0 && (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
              <AlertTriangle className="mr-1 w-3 h-3" /> Vencido há {Math.abs(dias)} dia(s) — renovação necessária
            </Badge>
          )}
          {dias !== null && dias >= 0 && dias <= 60 && (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
              <AlertTriangle className="mr-1 w-3 h-3" /> Renovação em {dias} dia(s)
            </Badge>
          )}
        </div>

        {pendente && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 w-4 h-4 flex-shrink-0 text-warning-foreground" />
            <div className="text-xs text-warning-foreground">
              <p className="font-medium">
                Extração aguardando conferência{camposRevisar.length ? ` — ${camposRevisar.length} campo(s) para revisar` : ''}
              </p>
              <p>Nada foi confirmado. Confira os valores, ajuste o que precisar e clique em “Confirmar revisão”.</p>
            </div>
          </div>
        )}

        <ContractDocumentCard
          contrato={atual}
          extraindo={extraindo}
          qualidade={qualidade}
          onExtrair={extrair}
          onEnviar={enviarNovaVersao}
        />

        <Secao
          titulo="Dados do contrato"
          acao={
            temPropostas && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setValores((p) => ({ ...p, ...extraido }))}
              >
                <Sparkles className="w-3.5 h-3.5" /> Usar todos os valores do PDF
              </Button>
            )
          }
        >
          <ContractFieldsReview
            valores={valores}
            fontes={fontes}
            camposRevisar={camposRevisar}
            extraido={extraido}
            onChange={(key, valor) => setValores((p) => ({ ...p, [key]: valor }))}
          />
        </Secao>

        <Secao titulo="Números de série e equipamentos cobertos">
          <ContractSerieMatches
            contrato={atual}
            series={valores.series_no_contrato}
            equipamentos={equipamentos}
            onConfirmar={vincularEquipamentos}
            salvando={salvando}
          />
        </Secao>

        <Secao titulo={`Versões do PDF${(atual.versoes_documento || []).length ? ` (${atual.versoes_documento.length})` : ''}`}>
          <ContractVersions contrato={atual} onReextrair={extrair} extraindo={extraindo} />
        </Secao>

        <Secao titulo="Alterações anteriores à auditoria">
          <ContractHistory registros={atual.historico_alteracoes || []} />
          <p className="text-[11px] text-muted-foreground">
            As edições feitas a partir de agora entram no log de Auditoria, com autor e data/hora
            do servidor. Este bloco guarda apenas o que já existia.
          </p>
        </Secao>

        <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-6 py-3 backdrop-blur">
          <p className="text-[11px] text-muted-foreground">
            Toda edição manual entra no histórico. Os campos continuam editáveis depois.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => salvar()} disabled={salvando}>
              Salvar alterações
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={() => salvar({ confirmar: true })} disabled={salvando}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Confirmar revisão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}