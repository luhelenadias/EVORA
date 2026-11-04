import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BellRing, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { ALERTAS_ATIVOS_PADRAO, TIPOS_ALERTA } from '@/lib/alertas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import TermoTooltip from '@/components/shared/TermoTooltip';

const CAMPOS_NUMERO = [
  {
    key: 'alerta_preventiva_antecedencia_dias',
    label: 'Preventiva próxima (dias antes)',
    ajuda: 'Antecedência do aviso de preventiva agendada.',
  },
  {
    key: 'alerta_preventiva_muito_atrasada_dias',
    label: 'Preventiva muito atrasada (dias)',
    ajuda: 'Atraso a partir do qual o alerta escala para urgente e vai ao gestor.',
  },
  {
    key: 'alerta_sla_risco_pct',
    label: 'SLA em risco (% do prazo)',
    ajuda: 'Percentual do prazo consumido que dispara o aviso de risco.',
  },
  {
    key: 'alerta_chamado_parado_dias',
    label: 'Chamado parado (dias)',
    ajuda: 'Dias em Aguardando Peça/Fornecedor/Pendente antes do aviso.',
  },
  {
    key: 'alerta_triagem_dias',
    label: 'Aguardando triagem (dias)',
    ajuda: 'Dias de fila de triagem antes de avisar admin e gestão. Padrão 1 dia.',
  },
];

/** Regras dos alertas automáticos (campos alerta_*) e liga/desliga por tipo. */
export default function AlertasConfig() {
  const queryClient = useQueryClient();
  const { config, isLoading } = useConfiguracao();
  const [valores, setValores] = useState({});
  const [ativos, setAtivos] = useState([]);
  const [antecedencias, setAntecedencias] = useState('90, 60, 30');
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!config) return;
    setValores({
      alerta_preventiva_antecedencia_dias: config.alerta_preventiva_antecedencia_dias ?? 7,
      alerta_preventiva_muito_atrasada_dias: config.alerta_preventiva_muito_atrasada_dias ?? 30,
      alerta_sla_risco_pct: config.alerta_sla_risco_pct ?? 80,
      alerta_chamado_parado_dias: config.alerta_chamado_parado_dias ?? 5,
      alerta_triagem_dias: config.alerta_triagem_dias ?? 1,
    });
    setAtivos(
      Array.isArray(config.alertas_ativos) ? config.alertas_ativos : ALERTAS_ATIVOS_PADRAO
    );
    setAntecedencias((config.alerta_contrato_dias || [90, 60, 30]).join(', '));
  }, [config]);

  const listaAntecedencias = antecedencias
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const alternarTipo = (tipo) =>
    setAtivos((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]));

  const salvar = async () => {
    if (!config) return;
    if (!listaAntecedencias.length) {
      toast.error('Informe ao menos uma antecedência de contrato.');
      return;
    }
    setSalvando(true);
    try {
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        alerta_contrato_dias: listaAntecedencias.sort((a, b) => b - a),
        alerta_preventiva_antecedencia_dias: Number(valores.alerta_preventiva_antecedencia_dias),
        alerta_preventiva_muito_atrasada_dias: Number(valores.alerta_preventiva_muito_atrasada_dias),
        alerta_sla_risco_pct: Number(valores.alerta_sla_risco_pct),
        alerta_chamado_parado_dias: Number(valores.alerta_chamado_parado_dias),
        alerta_triagem_dias: Number(valores.alerta_triagem_dias ?? 1),
        alertas_ativos: ativos,
      });
      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      toast.success('Regras de alerta atualizadas');
    } catch {
      toast.error('Não foi possível salvar as regras.');
    } finally {
      setSalvando(false);
    }
  };

  const verificarAgora = async () => {
    setVerificando(true);
    try {
      const resposta = await base44.functions.invoke('verificarAlertas', {});
      const { criados = 0, resolvidos = 0 } = resposta.data || {};
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success(`Verificação concluída — ${criados} novo(s), ${resolvidos} resolvido(s)`);
    } catch {
      toast.error('Não foi possível rodar a verificação agora.');
    } finally {
      setVerificando(false);
    }
  };

  if (isLoading || !config) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <BellRing className="h-5 w-5 text-primary" /> Regras de alerta
          </CardTitle>
          <CardDescription>
            A verificação roda ao abrir o app e todos os dias às 07:00 (UTC), mesmo com o app fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Contrato vencendo — antecedências (dias)</Label>
            <Input
              value={antecedencias}
              onChange={(e) => setAntecedencias(e.target.value)}
              placeholder="90, 60, 30"
            />
            <p className="text-[11px] text-muted-foreground">
              Separe por vírgula. A maior antecedência gera aviso informativo, as intermediárias atenção e a menor,
              urgente.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAMPOS_NUMERO.map((campo) => (
              <div key={campo.key} className="space-y-1.5">
                <Label className="text-xs">{campo.label}</Label>
                <Input
                  type="number"
                  min="0"
                  value={valores[campo.key] ?? ''}
                  onChange={(e) => setValores((p) => ({ ...p, [campo.key]: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">{campo.ajuda}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-semibold">
              Tipos <TermoTooltip termo="ativos" as="span">ligados</TermoTooltip>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Garantia e calibração começam desligados até os campos correspondentes serem preenchidos.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {TIPOS_ALERTA.map((tipo) => (
                <div key={tipo} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2">
                  <span className="text-xs font-medium">{tipo}</span>
                  <Switch checked={ativos.includes(tipo)} onCheckedChange={() => alternarTipo(tipo)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-[11px] text-muted-foreground">
              Um alerta por situação e nível: só é criado outro quando a gravidade aumenta.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={verificarAgora} disabled={verificando}>
                {verificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Verificar agora
              </Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar regras
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}