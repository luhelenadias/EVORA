import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/** Parâmetros que alimentam os indicadores de confiabilidade e de equipe. */
export default function IndicadoresConfig({ config }) {
  const queryClient = useQueryClient();
  const [rechamada, setRechamada] = useState('30');
  const [custoHora, setCustoHora] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!config) return;
    setRechamada(String(config.rechamada_dias ?? 30));
    setCustoHora(config.custo_hora_tecnica != null ? String(config.custo_hora_tecnica) : '');
  }, [config]);

  const salvar = async () => {
    if (!config) return;
    setSalvando(true);
    try {
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        rechamada_dias: Number(rechamada) || 30,
        custo_hora_tecnica: custoHora === '' ? null : Number(custoHora),
      });
      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      toast.success('Parâmetros dos indicadores salvos');
    } catch (erro) {
      toast.error(erro?.message || 'Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <BarChart2 className="h-5 w-5 text-primary" /> Parâmetros dos indicadores
        </CardTitle>
        <CardDescription>
          Janela de rechamada e custo da hora técnica. A carga horária de cada técnico é preenchida em Usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Rechamada (dias)</Label>
            <Input type="number" min="1" value={rechamada} onChange={(e) => setRechamada(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              Nova corretiva no mesmo equipamento até X dias após uma OS concluída conta como rechamada. Padrão 30.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custo da hora técnica (R$)</Label>
            <Input type="number" min="0" step="0.01" value={custoHora} onChange={(e) => setCustoHora(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              Usado para estimar a mão de obra interna: horas registradas em OS × custo da hora. Sem valor, o indicador
              mostra aviso em vez de estimar.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar parâmetros'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}