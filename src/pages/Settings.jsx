import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { computePriorizacao } from '@/lib/maintenance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CodigoManager from '@/components/settings/CodigoManager';
import { ShieldCheck, AlertTriangle, Building2, Stethoscope } from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const { config, isLoading } = useConfiguracao();
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const [modelo, setModelo] = useState('simples');
  const [usaUtilizacao, setUsaUtilizacao] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingModelo, setPendingModelo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setModelo(config.modelo_priorizacao || 'simples');
      setUsaUtilizacao(!!config.avancado_usa_utilizacao);
    }
  }, [config]);

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
      const newConfig = {
        ...config,
        modelo_priorizacao: modelo,
        avancado_usa_utilizacao: modelo === 'avancado' ? usaUtilizacao : false,
      };
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        modelo_priorizacao: modelo,
        avancado_usa_utilizacao: modelo === 'avancado' ? usaUtilizacao : false,
      });

      // Recomputa priorização de todos os equipamentos existentes com o novo modelo
      if (equipment.length > 0) {
        const updates = equipment.map((eq) => {
          const result = computePriorizacao(eq, newConfig);
          return {
            id: eq.id,
            status_priorizacao: result.status_priorizacao,
            prioridade_score: result.prioridade_score,
            prioridade_alta: result.prioridade_alta,
          };
        });
        await base44.entities.Equipment.bulkUpdate(updates);
      }

      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    config &&
    (config.modelo_priorizacao !== modelo ||
    (!!config.avancado_usa_utilizacao !== (modelo === 'avancado' ? usaUtilizacao : false)));

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
              {modelo === 'simples'
                ? 'EM = Função (F) + Risco Físico (PR) + Requisitos de Manutenção (MR). Alta prioridade quando EM ≥ 12.'
                : 'EMR = Mission Critical (MC) + 2·Risco (R) + 2·Manutenção (M). Inclui classificação de risco ECRI.'}
            </p>
          </div>

          {modelo === 'avancado' && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm">Usar taxa de utilização (U)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se ativo, EMR = (MC + 2·M) × U + 2·R e o campo utilização_u torna-se obrigatório.
                </p>
              </div>
              <Switch checked={usaUtilizacao} onCheckedChange={setUsaUtilizacao} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || saving}>
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </Button>
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
      </Tabs>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirmar mudança de modelo
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