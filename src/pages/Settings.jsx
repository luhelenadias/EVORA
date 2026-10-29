import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import {
  CORTES_PADRAO, cortesDe, cortesValidos, contarFaixas, equipamentosDoRanking, recalcularPrioridades,
} from '@/lib/priorizacao';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CodigoManager from '@/components/settings/CodigoManager';
import AcessosPerfil from '@/components/settings/AcessosPerfil';
import AlertasConfig from '@/components/settings/AlertasConfig';
import EmailConfig from '@/components/settings/EmailConfig';
import TermoTooltip from '@/components/shared/TermoTooltip';
import { toast } from 'sonner';
import { ShieldCheck, AlertTriangle, Building2, Stethoscope, RefreshCw, Users, Mail } from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const { config, isLoading } = useConfiguracao();
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const [modelo, setModelo] = useState('simples');
  const [usaUtilizacao, setUsaUtilizacao] = useState(false);
  const [cortes, setCortes] = useState({ ...CORTES_PADRAO });
  const [resultadoRecalculo, setResultadoRecalculo] = useState(null);
  const [recalculando, setRecalculando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingModelo, setPendingModelo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setModelo(config.modelo_priorizacao || 'simples');
      setUsaUtilizacao(!!config.avancado_usa_utilizacao);
      setCortes(cortesDe(config));
    }
  }, [config]);

  const setCut = (campo, valor) => setCortes((prev) => ({ ...prev, [campo]: valor }));

  const cortesOk = cortesValidos(cortes);

  // Prévia: quantos equipamentos ficariam em cada faixa com os cortes atuais.
  const previa = useMemo(() => {
    const total = equipamentosDoRanking(equipment, config).length;
    const pendentes = equipment.filter((e) => e.status_priorizacao === 'pendente_atualizacao').length;
    if (!cortesValidos(cortes)) return { total, pendentes, invalido: true };
    return { ...contarFaixas(total, cortes), pendentes, invalido: false };
  }, [equipment, config, cortes]);

  const handleModeloChange = (value) => {
    if (value === 'avancado' && modelo === 'simples') {
      setPendingModelo('avancado');
      setShowConfirm(true);
    } else {
      setModelo(value);
      if (value === 'simples') setUsaUtilizacao(false);
    }
  };

  const confirmSwitch = () => {
    setModelo('avancado');
    setShowConfirm(false);
    setPendingModelo(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const novaConfig = {
        ...config,
        modelo_priorizacao: modelo,
        avancado_usa_utilizacao: modelo === 'avancado' ? usaUtilizacao : false,
        faixa_critica_ate_pct: Number(cortes.critica),
        faixa_alta_ate_pct: Number(cortes.alta),
        faixa_media_ate_pct: Number(cortes.media),
      };
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        modelo_priorizacao: novaConfig.modelo_priorizacao,
        avancado_usa_utilizacao: novaConfig.avancado_usa_utilizacao,
        faixa_critica_ate_pct: novaConfig.faixa_critica_ate_pct,
        faixa_alta_ate_pct: novaConfig.faixa_alta_ate_pct,
        faixa_media_ate_pct: novaConfig.faixa_media_ate_pct,
      });

      // Modelo, utilização e cortes mudam o ranking inteiro: recalcula todos os equipamentos.
      const resultado = equipment.length ? await recalcularPrioridades(novaConfig) : null;
      setResultadoRecalculo(resultado);

      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });

      if (resultado) {
        toast.success(
          `Prioridades recalculadas — ${resultado.calculados} calculados · ${resultado.pendentes} pendentes`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      const resultado = await recalcularPrioridades(config);
      setResultadoRecalculo(resultado);
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success(
        `Prioridades recalculadas — ${resultado.calculados} calculados · ${resultado.pendentes} pendentes`
      );
    } finally {
      setRecalculando(false);
    }
  };

  const cortesSalvos = cortesDe(config);
  const dirty =
    config &&
    (config.modelo_priorizacao !== modelo ||
      !!config.avancado_usa_utilizacao !== (modelo === 'avancado' ? usaUtilizacao : false) ||
      Number(cortes.critica) !== cortesSalvos.critica ||
      Number(cortes.alta) !== cortesSalvos.alta ||
      Number(cortes.media) !== cortesSalvos.media);

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Configurações da Instituição" subtitle="Modelo de priorização e codificação de equipamentos" />

      <Tabs defaultValue="priorizacao" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="priorizacao" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Modelo de Priorização
          </TabsTrigger>
          <TabsTrigger value="setores" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Setores
          </TabsTrigger>
          <TabsTrigger value="tipos" className="gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" /> Tipos de Equipamento
          </TabsTrigger>
          <TabsTrigger value="acessos" className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> Acessos por Perfil
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="priorizacao">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Modelo de Priorização
          </CardTitle>
          <CardDescription>
            Define quais campos de priorização são exigidos no cadastro de equipamentos e a fórmula de cálculo do score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm">Modelo ativo</Label>
            <Select value={modelo} onValueChange={handleModeloChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simples">Simples (Fennigkoh &amp; Smith)</SelectItem>
                <SelectItem value="avancado">Avançado (ECRI)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {modelo === 'simples' ? (
                <>
                  <TermoTooltip termo="EM" as="span" className="font-semibold text-foreground">EM</TermoTooltip> ={' '}
                  <TermoTooltip termo="F" as="span">F</TermoTooltip> +{' '}
                  <TermoTooltip termo="PR" as="span">PR</TermoTooltip> +{' '}
                  <TermoTooltip termo="MR" as="span">MR</TermoTooltip>. Alta prioridade quando EM ≥ 12.
                </>
              ) : usaUtilizacao ? (
                <>
                  <TermoTooltip termo="AEMR" as="span" className="font-semibold text-foreground">AEMR</TermoTooltip> = (
                  <TermoTooltip termo="MC" as="span">MC</TermoTooltip> + 2·<TermoTooltip termo="M" as="span">M</TermoTooltip>) ×{' '}
                  <TermoTooltip termo="U" as="span">U</TermoTooltip> + 2·<TermoTooltip termo="R" as="span">R</TermoTooltip>.
                </>
              ) : (
                <>
                  <TermoTooltip termo="EMR" as="span" className="font-semibold text-foreground">EMR</TermoTooltip> ={' '}
                  <TermoTooltip termo="MC" as="span">MC</TermoTooltip> + 2·<TermoTooltip termo="R" as="span">R</TermoTooltip> + 2·
                  <TermoTooltip termo="M" as="span">M</TermoTooltip>. Inclui classificação de risco ECRI.
                </>
              )}
            </p>
          </div>

          {modelo === 'avancado' && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm">Usar taxa de utilização (U)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se ativo, o índice passa a ser AEMR = (MC + 2·M) × U + 2·R e o campo utilização torna-se obrigatório.
                </p>
              </div>
              <Switch checked={usaUtilizacao} onCheckedChange={setUsaUtilizacao} />
            </div>
          )}

          {/* Cortes das faixas de prioridade */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="text-sm font-semibold">
                <TermoTooltip termo="faixa" as="span" className="text-sm font-semibold">
                  Faixas de prioridade
                </TermoTooltip>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O ranking vai do mais prioritário ao menos prioritário; os percentuais indicam onde cada faixa termina.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Crítica: primeiros {cortes.critica || 0}% do ranking</Label>
                <Input type="number" min="1" max="97" value={cortes.critica}
                  onChange={(e) => setCut('critica', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alta: primeiros {cortes.alta || 0}% do ranking</Label>
                <Input type="number" min="2" max="98" value={cortes.alta}
                  onChange={(e) => setCut('alta', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Média: primeiros {cortes.media || 0}% do ranking</Label>
                <Input type="number" min="3" max="99" value={cortes.media}
                  onChange={(e) => setCut('media', e.target.value)} />
              </div>
            </div>

            {!cortesOk && (
              <p className="text-xs font-medium text-destructive">
                A Crítica deve ser menor que a Alta, a Alta menor que a Média e a Média menor que 100%.
              </p>
            )}

            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              {previa.invalido ? (
                <p className="text-muted-foreground">Ajuste os cortes para ver a prévia das faixas.</p>
              ) : (
                <>
                  <p className="mb-1.5 font-medium text-foreground">
                    Prévia com os cortes atuais — {previa.total} equipamento{previa.total !== 1 ? 's' : ''} no ranking
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>Crítica: <strong>{previa.critica}</strong></span>
                    <span>Alta: <strong>{previa.alta}</strong></span>
                    <span>Média: <strong>{previa.media}</strong></span>
                    <span>Baixa: <strong>{previa.baixa}</strong></span>
                  </div>
                </>
              )}
              {previa.pendentes > 0 && (
                <p className="mt-1.5 text-muted-foreground">
                  {previa.pendentes} equipamento{previa.pendentes !== 1 ? 's' : ''}{' '}
                  <TermoTooltip termo="pendente" as="span">
                    pendente{previa.pendentes !== 1 ? 's' : ''} de atualização
                  </TermoTooltip>{' '}
                  — fora do ranking.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {resultadoRecalculo
                ? `Último recálculo: ${resultadoRecalculo.calculados} calculados · ${resultadoRecalculo.pendentes} pendentes`
                : 'O recálculo atualiza posição e faixa de todos os equipamentos.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRecalcular} disabled={recalculando || !cortesOk} className="gap-1.5">
                <RefreshCw className={recalculando ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                {recalculando ? 'Recalculando...' : 'Recalcular prioridades'}
              </Button>
              <Button onClick={handleSave} disabled={!dirty || saving || !cortesOk}>
                {saving ? 'Salvando...' : 'Salvar configuração'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="setores">
          <CodigoManager kind="CodigoSetor" />
        </TabsContent>

        <TabsContent value="tipos">
          <CodigoManager kind="CodigoTipoEquipamento" />
        </TabsContent>

        <TabsContent value="acessos">
          <AcessosPerfil config={config} />
        </TabsContent>

        <TabsContent value="alertas">
          <AlertasConfig />
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Confirmar mudança de modelo
            </DialogTitle>
            <DialogDescription className="text-sm text-left pt-2 leading-relaxed">
              ⚠️ Atenção: o modelo avançado exige informações adicionais em cada equipamento (criticidade institucional, classificação de risco ECRI, e opcionalmente taxa de utilização). Equipamentos já cadastrados ficarão marcados como "Pendente de atualização" até que esses dados sejam preenchidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowConfirm(false); setPendingModelo(null); }}>
              Cancelar
            </Button>
            <Button onClick={confirmSwitch}>Confirmar mudança</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}