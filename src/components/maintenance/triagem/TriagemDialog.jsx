import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import RotaCard from '@/components/orders/RotaCard';
import ContextoEquipamento from '@/components/maintenance/triagem/ContextoEquipamento';
import DecisaoDestino from '@/components/maintenance/triagem/DecisaoDestino';
import PrioridadeTriagem from '@/components/maintenance/triagem/PrioridadeTriagem';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { sugerirRota } from '@/lib/rota';
import { contratosDoEquipamento, esperaTexto, rotuloStatusOS } from '@/lib/triagem';
import { eventoDaMudanca, notificarMudancaDeAgenda } from '@/lib/notificacoes';
import { toast } from 'sonner';

/**
 * Painel de triagem: contexto do equipamento, rota sugerida, decisão de destino,
 * prioridade confirmada e devolução ao solicitante. Só admin e gestão chegam aqui
 * (a regra também é validada no servidor, em triarOS).
 */
export default function TriagemDialog({ order, equipment, contracts = [], orders = [], tecnicos = [], onClose, onConcluida }) {
  const queryClient = useQueryClient();
  const { config } = useConfiguracao();
  const sugestao = useMemo(() => sugerirRota(equipment, contracts), [equipment, contracts]);
  const contratosVigentes = useMemo(() => contratosDoEquipamento(contracts, equipment), [contracts, equipment]);

  const retriagem = Boolean(order?.triagem_em);
  const prioridadeSugerida = order?.priority || 'Média';

  const [rota, setRota] = useState(order?.rota_atendimento || sugestao?.rota || 'Equipe interna');
  const [tecnicoId, setTecnicoId] = useState(order?.technician_id || '');
  const [contratoId, setContratoId] = useState(
    order?.contrato_id || sugestao?.contrato?.id || contratosVigentes[0]?.id || ''
  );
  const [fornecedor, setFornecedor] = useState(order?.fornecedor_nome || sugestao?.fornecedor || '');
  const [dataAgendada, setDataAgendada] = useState(order?.scheduled_date?.split('T')[0] || '');
  const [prioridade, setPrioridade] = useState(prioridadeSugerida);
  const [motivoPrioridade, setMotivoPrioridade] = useState(order?.priority_override_reason || '');
  const [motivoTroca, setMotivoTroca] = useState(order?.rota_alterada_motivo || '');
  const [motivoReabertura, setMotivoReabertura] = useState('');
  const [devolver, setDevolver] = useState(false);
  const [devolucaoMotivo, setDevolucaoMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const trocouRota = Boolean(sugestao && rota && rota !== sugestao.rota);
  const precisaMotivoPrioridade = prioridade !== prioridadeSugerida;

  const confirmar = async () => {
    setErro('');
    if (retriagem && !motivoReabertura.trim()) {
      setErro('Informe o motivo da reabertura da triagem.');
      return;
    }
    if (devolver && !devolucaoMotivo.trim()) {
      setErro('Descreva o que falta para o chamado seguir.');
      return;
    }
    if (!devolver) {
      if (trocouRota && !motivoTroca.trim()) {
        setErro('A rota escolhida difere da sugerida: informe o motivo.');
        return;
      }
      if (precisaMotivoPrioridade && !motivoPrioridade.trim()) {
        setErro('A prioridade difere da sugerida: informe o motivo.');
        return;
      }
    }

    setSalvando(true);
    try {
      const resposta = await base44.functions.invoke('triarOS', {
        service_order_id: order.id,
        rota: devolver ? undefined : rota,
        rota_sugerida: sugestao?.rota || order.rota_sugerida || '',
        rota_alterada_motivo: motivoTroca.trim(),
        rota_motivo: sugestao?.motivo || order.rota_motivo || '',
        motivo: motivoReabertura.trim(),
        contrato_id: rota === 'Contrato' ? contratoId : sugestao?.contrato?.id || '',
        fornecedor_nome: fornecedor,
        technician_id: tecnicoId,
        scheduled_date: dataAgendada ? new Date(`${dataAgendada}T09:00:00`).toISOString() : '',
        priority: prioridade,
        priority_sugerida: prioridadeSugerida,
        priority_override_reason: motivoPrioridade.trim(),
        devolver,
        devolucao_motivo: devolucaoMotivo.trim(),
      });

      const dados = resposta?.data || {};
      if (dados.error) throw new Error(dados.error);

      // Aviso ao técnico: mesma fila de notificações da agenda (com modo teste).
      const anterior = dados.anterior || order;
      const atual = dados.order || {};
      const mudouTecnico = (anterior.technician_id || '') !== (atual.technician_id || '');
      const mudouData = (anterior.scheduled_date || '') !== (atual.scheduled_date || '');
      if (atual.technician_id && (mudouTecnico || mudouData)) {
        await notificarMudancaDeAgenda({
          order: atual,
          antes: anterior,
          depois: atual,
          evento: eventoDaMudanca(anterior, atual) || 'Troca de técnico',
        });
      }

      // Alertas: fila de triagem e devoluções são recalculadas na hora.
      await base44.functions.invoke('verificarAlertas', {}).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoesAgenda'] });

      toast.success(
        dados.devolvida
          ? 'Chamado devolvido ao solicitante para complemento.'
          : `Triagem concluída: ${atual.rota_atendimento || rota}.`
      );
      onConcluida?.();
      onClose?.();
    } catch (falha) {
      const detalhe = falha?.response?.data?.error || falha?.message;
      setErro(detalhe || 'Não foi possível concluir a triagem.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {equipment?.name || order?.equipment_name || 'Equipamento'}
            {equipment?.codigo_equipamento && (
              <Badge variant="outline" className="font-mono text-xs font-bold tracking-wide border-primary/30 text-primary bg-primary/5">
                {equipment.codigo_equipamento}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {order?.code && <span className="font-mono">{order.code}</span>}
            <StatusBadge value={order?.status} rotulo={rotuloStatusOS(order)} />
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
              <AlertTriangle className="h-2.5 w-2.5" /> aguardando há {esperaTexto(order)}
            </span>
            {retriagem && <span className="text-[11px] text-muted-foreground">reabertura de triagem</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ContextoEquipamento
            order={order}
            equipment={equipment}
            contracts={contracts}
            orders={orders}
            rechamadaDias={config?.rechamada_dias ?? 30}
          />

          <div className="space-y-2">
            <RotaCard
              sugestao={sugestao}
              rota={sugestao?.rota}
              contrato={sugestao?.contrato}
              fornecedor={sugestao?.fornecedor}
              somenteLeitura
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  if (!sugestao) return;
                  setRota(sugestao.rota);
                  setFornecedor(sugestao.fornecedor || '');
                  if (sugestao.contrato?.id) setContratoId(sugestao.contrato.id);
                  setMotivoTroca('');
                }}
              >
                Aceitar sugestão
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Aplica o destino sugerido em um clique.
              </span>
            </div>
          </div>

          <DecisaoDestino
            rota={rota}
            onRotaChange={setRota}
            tecnicos={tecnicos}
            orders={orders}
            tecnicoId={tecnicoId}
            onTecnicoChange={setTecnicoId}
            contratos={contratosVigentes}
            contratoId={contratoId}
            onContratoChange={setContratoId}
            fornecedor={fornecedor}
            onFornecedorChange={setFornecedor}
            dataAgendada={dataAgendada}
            onDataChange={setDataAgendada}
            erro={erro && !devolver ? erro : ''}
          />

          {trocouRota && (
            <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <Label className="text-xs">Motivo da troca de rota *</Label>
              <Textarea
                rows={2}
                value={motivoTroca}
                onChange={(evento) => setMotivoTroca(evento.target.value)}
                placeholder="Ex.: equipamento já fora da cobertura contratual"
              />
            </div>
          )}

          <PrioridadeTriagem
            urgencia={order?.urgencia_percebida}
            sugestao={prioridadeSugerida}
            prioridade={prioridade}
            onPrioridadeChange={setPrioridade}
            motivo={motivoPrioridade}
            onMotivoChange={setMotivoPrioridade}
            erro={erro && !devolver ? erro : ''}
          />

          {retriagem && (
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <Label className="text-xs">Motivo da reabertura da triagem *</Label>
              <Textarea
                rows={2}
                value={motivoReabertura}
                onChange={(evento) => setMotivoReabertura(evento.target.value)}
                placeholder="Ex.: técnico designado está de férias"
              />
            </div>
          )}

          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={devolver} onChange={(evento) => setDevolver(evento.target.checked)} />
              Devolver ao solicitante (falta informação para triar)
            </label>
            {devolver && (
              <>
                <Textarea
                  rows={2}
                  value={devolucaoMotivo}
                  onChange={(evento) => setDevolucaoMotivo(evento.target.value)}
                  placeholder="O que falta: ex. número de série, descrição do defeito, foto da etiqueta"
                />
                <p className="text-[11px] text-muted-foreground">
                  A OS continua “Novo” com a marcação “Devolvida para complemento” e quem abriu recebe um aviso.
                </p>
              </>
            )}
          </div>

          {erro && <p className="text-[11px] font-medium text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button type="button" onClick={confirmar} disabled={salvando} className="gap-1.5">
              {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {devolver ? 'Devolver ao solicitante' : 'Confirmar destino'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}