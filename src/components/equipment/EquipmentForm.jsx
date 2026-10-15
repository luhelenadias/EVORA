import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { computePriorizacao } from '@/lib/maintenance';
import { buildEquipmentCode, computeNextSequencial, sequencialDoCodigo, MAX_SEQUENCIAL } from '@/lib/equipmentCode';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Hash } from 'lucide-react';

export default function EquipmentForm({ equipment, onSubmit, onCancel, isLoading }) {
  const { config } = useConfiguracao();
  const modelo = config?.modelo_priorizacao || 'simples';
  const usaUtil = modelo === 'avancado' && config?.avancado_usa_utilizacao === true;
  const { toast } = useToast();
  const [verificando, setVerificando] = useState(false);

  const { data: setores = [] } = useQuery({
    queryKey: ['CodigoSetor'],
    queryFn: () => base44.entities.CodigoSetor.list(),
  });
  const { data: tipos = [] } = useQuery({
    queryKey: ['CodigoTipoEquipamento'],
    queryFn: () => base44.entities.CodigoTipoEquipamento.list(),
  });
  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const [form, setForm] = useState({
    name: equipment?.name || '',
    manufacturer: equipment?.manufacturer || '',
    model: equipment?.model || '',
    serial_number: equipment?.serial_number || '',
    anvisa_registry: equipment?.anvisa_registry || '',
    patrimony_number: equipment?.patrimony_number || '',
    location_unit: equipment?.location_unit || '',
    location_sector: equipment?.location_sector || '',
    acquisition_date: equipment?.acquisition_date || '',
    installation_date: equipment?.installation_date || '',
    setor_id: equipment?.setor_id || '',
    tipo_equipamento_id: equipment?.tipo_equipamento_id || '',
    acquisition_value: equipment?.acquisition_value || '',
    warranty_end: equipment?.warranty_end || '',
    criticality: equipment?.criticality || '',
    operational_status: equipment?.operational_status || 'Ativo',
    weekly_usage_hours: equipment?.weekly_usage_hours || '',
    total_operators: equipment?.total_operators || '',
    trained_operators: equipment?.trained_operators || '',
    // Priorização — modelo simples (sempre)
    funcao_f: equipment?.funcao_f ?? '',
    risco_fisico_pr: equipment?.risco_fisico_pr ?? '',
    requisitos_manutencao_mr: equipment?.requisitos_manutencao_mr ?? '',
    // Priorização — modelo avançado
    mission_critical_mc: equipment?.mission_critical_mc ?? '',
    risco_r: equipment?.risco_r || '',
    manutencao_m: equipment?.manutencao_m ?? '',
    utilizacao_u: equipment?.utilizacao_u ?? '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const numOrUndef = (v) => (v === '' || v == null ? undefined : Number(v));

  // ── Codificação técnica (padrão Calil) ──────────────────────────
  // Opções ativas + o registro atual, caso tenha sido desativado depois do cadastro.
  const setorOptions = useMemo(() => {
    const active = setores.filter((s) => s.ativo !== false);
    const current = setores.find((s) => s.id === form.setor_id);
    return current && !active.some((s) => s.id === current.id) ? [current, ...active] : active;
  }, [setores, form.setor_id]);

  const tipoOptions = useMemo(() => {
    const active = tipos.filter((t) => t.ativo !== false);
    const current = tipos.find((t) => t.id === form.tipo_equipamento_id);
    return current && !active.some((t) => t.id === current.id) ? [current, ...active] : active;
  }, [tipos, form.tipo_equipamento_id]);

  const setorSigla = setores.find((s) => s.id === form.setor_id)?.sigla;
  const tipoSigla = tipos.find((t) => t.id === form.tipo_equipamento_id)?.sigla;

  // Setor, tipo e data de aquisição iguais aos do registro → o código atual é mantido.
  const codigoInalterado = useMemo(
    () =>
      !!equipment?.codigo_equipamento &&
      equipment.setor_id === form.setor_id &&
      equipment.tipo_equipamento_id === form.tipo_equipamento_id &&
      (equipment.acquisition_date || '') === (form.acquisition_date || ''),
    [equipment, form.setor_id, form.tipo_equipamento_id, form.acquisition_date]
  );

  // Sequencial: mantém o existente se setor/tipo não mudaram; senão, a próxima posição livre.
  const sequencial = useMemo(() => {
    if (!form.setor_id || !form.tipo_equipamento_id) return null;
    const unchanged =
      equipment?.id &&
      equipment.setor_id === form.setor_id &&
      equipment.tipo_equipamento_id === form.tipo_equipamento_id &&
      equipment.sequencial_unidade != null;
    if (unchanged) return equipment.sequencial_unidade;
    return computeNextSequencial(allEquipment, form.setor_id, form.tipo_equipamento_id, equipment?.id);
  }, [allEquipment, form.setor_id, form.tipo_equipamento_id, equipment]);

  const limiteAtingido = sequencial != null && sequencial > MAX_SEQUENCIAL;

  const codigoEquipamento = useMemo(() => {
    if (codigoInalterado) return equipment.codigo_equipamento;
    return buildEquipmentCode({
      setorSigla,
      tipoSigla,
      sequencial,
      acquisitionDate: form.acquisition_date,
    });
  }, [codigoInalterado, equipment, setorSigla, tipoSigla, sequencial, form.acquisition_date]);

  /** Retorna o outro equipamento que já usa o código informado (ou null). */
  const equipamentoComCodigo = async (codigo) => {
    if (!codigo) return null;
    const encontrados = await base44.entities.Equipment.filter({ codigo_equipamento: codigo });
    return (encontrados || []).find((e) => e.id !== equipment?.id) || null;
  };

  const avisarLimite = () => {
    toast({
      title: `Limite de ${MAX_SEQUENCIAL} equipamentos atingido`,
      description: `A combinação ${setorSigla || '—'}-${tipoSigla || '—'} já usa todas as posições disponíveis. Cadastre um novo tipo de equipamento para continuar.`,
      variant: 'destructive',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verificando || isLoading) return;
    if (!form.setor_id || !form.tipo_equipamento_id) {
      toast({
        title: 'Setor e tipo obrigatórios',
        description: 'Selecione o setor e o tipo de equipamento para gerar o código técnico.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.acquisition_date) {
      toast({
        title: 'Data de aquisição obrigatória',
        description: 'A data de aquisição é usada para compor o código técnico.',
        variant: 'destructive',
      });
      return;
    }
    if (limiteAtingido) {
      avisarLimite();
      return;
    }
    const data = { ...form };
    // campos numéricos vazios não são enviados (string vazia invalida a gravação)
    data.acquisition_value = numOrUndef(form.acquisition_value);
    data.weekly_usage_hours = numOrUndef(form.weekly_usage_hours);
    data.total_operators = numOrUndef(form.total_operators);
    data.trained_operators = numOrUndef(form.trained_operators);

    // converte campos numéricos de priorização (mantém todos salvos, ambos os modelos)
    data.funcao_f = numOrUndef(form.funcao_f);
    data.risco_fisico_pr = numOrUndef(form.risco_fisico_pr);
    data.requisitos_manutencao_mr = numOrUndef(form.requisitos_manutencao_mr);
    data.mission_critical_mc = numOrUndef(form.mission_critical_mc);
    data.manutencao_m = numOrUndef(form.manutencao_m);
    data.utilizacao_u = numOrUndef(form.utilizacao_u);
    data.risco_r = form.risco_r || undefined;

    // codificação técnica (padrão Calil)
    data.setor_id = form.setor_id;
    data.tipo_equipamento_id = form.tipo_equipamento_id;

    let seqFinal = sequencial;
    let codigoFinal = codigoEquipamento;

    // Unicidade: só valida quando o código é (re)gerado.
    if (!codigoInalterado) {
      setVerificando(true);
      try {
        const conflito = await equipamentoComCodigo(codigoFinal);
        if (conflito) {
          // Posição tomada por outro cadastro no mesmo instante: parte do registro conflitante
          // e da lista atual para a próxima posição livre, tentando novamente uma única vez.
          const lista = await base44.entities.Equipment.list();
          const posicaoNaLista = computeNextSequencial(lista, form.setor_id, form.tipo_equipamento_id, equipment?.id) || 1;
          const posicaoConflitante = sequencialDoCodigo(conflito.codigo_equipamento) || Number(conflito.sequencial_unidade) || 0;
          seqFinal = Math.max(posicaoNaLista, posicaoConflitante + 1);
          if (seqFinal > MAX_SEQUENCIAL) {
            setVerificando(false);
            avisarLimite();
            return;
          }
          codigoFinal = buildEquipmentCode({
            setorSigla,
            tipoSigla,
            sequencial: seqFinal,
            acquisitionDate: form.acquisition_date,
          });
          if (await equipamentoComCodigo(codigoFinal)) {
            setVerificando(false);
            toast({
              title: 'Código já cadastrado',
              description: `O código ${codigoFinal} já pertence a outro equipamento. Nada foi salvo — revise setor, tipo e data de aquisição.`,
              variant: 'destructive',
            });
            return;
          }
        }
      } catch (err) {
        setVerificando(false);
        toast({
          title: 'Não foi possível validar o código',
          description: `A verificação de unicidade falhou, então nada foi salvo. ${err?.message || ''}`.trim(),
          variant: 'destructive',
        });
        return;
      }
      setVerificando(false);
    }

    data.sequencial_unidade = seqFinal ?? undefined;
    data.codigo_equipamento = codigoFinal || undefined;

    // cálculo automático de priorização
    const result = computePriorizacao(data, config);
    data.status_priorizacao = result.status_priorizacao;
    data.prioridade_score = result.prioridade_score;
    data.prioridade_alta = result.prioridade_alta;

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome *</Label>
          <Input value={form.name} onChange={e => update('name', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nº Série *</Label>
          <Input value={form.serial_number} onChange={e => update('serial_number', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fabricante</Label>
          <Input value={form.manufacturer} onChange={e => update('manufacturer', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Modelo</Label>
          <Input value={form.model} onChange={e => update('model', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Registro ANVISA</Label>
          <Input value={form.anvisa_registry} onChange={e => update('anvisa_registry', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nº Patrimônio</Label>
          <Input value={form.patrimony_number} onChange={e => update('patrimony_number', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unidade</Label>
          <Input value={form.location_unit} onChange={e => update('location_unit', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Setor</Label>
          <Input value={form.location_sector} onChange={e => update('location_sector', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data Aquisição *</Label>
          <Input type="date" value={form.acquisition_date} onChange={e => update('acquisition_date', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data Instalação</Label>
          <Input type="date" value={form.installation_date} onChange={e => update('installation_date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valor Aquisição (R$)</Label>
          <Input type="number" step="0.01" value={form.acquisition_value} onChange={e => update('acquisition_value', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fim da Garantia</Label>
          <Input type="date" value={form.warranty_end} onChange={e => update('warranty_end', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Criticidade *</Label>
          <Select value={form.criticality} onValueChange={v => update('criticality', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Suporte à Vida">Suporte à Vida</SelectItem>
              <SelectItem value="Terapêutico">Terapêutico</SelectItem>
              <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
              <SelectItem value="Apoio">Apoio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status Operacional</Label>
          <Select value={form.operational_status} onValueChange={v => update('operational_status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
              <SelectItem value="Parado">Parado</SelectItem>
              <SelectItem value="Inativo/Baixado">Inativo/Baixado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Horas de Uso / Semana</Label>
          <Input type="number" step="0.5" placeholder="Ex: 40" value={form.weekly_usage_hours} onChange={e => update('weekly_usage_hours', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nº de Operadores</Label>
          <Input type="number" placeholder="Ex: 10" value={form.total_operators} onChange={e => update('total_operators', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Operadores Treinados</Label>
          <Input type="number" placeholder="Ex: 8" value={form.trained_operators} onChange={e => update('trained_operators', e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* Codificação técnica — padrão Calil */}
      <div>
        <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-primary" /> Identificação Técnica (padrão Calil)
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          O código é gerado automaticamente a partir do setor, do tipo e do ano de aquisição.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Setor *</Label>
            <Select value={form.setor_id} onValueChange={v => update('setor_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {setorOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.sigla} — {s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Equipamento *</Label>
            <Select value={form.tipo_equipamento_id} onValueChange={v => update('tipo_equipamento_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tipoOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.sigla} — {t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Código do Equipamento</Label>
            <Input
              value={codigoEquipamento}
              readOnly
              placeholder="Gerado automaticamente"
              className="font-mono bg-muted cursor-default text-primary font-semibold"
            />
            {limiteAtingido ? (
              <p className="text-[11px] font-medium text-destructive flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                Limite de {MAX_SEQUENCIAL} equipamentos para {setorSigla}-{tipoSigla} atingido — cadastre um novo tipo para continuar.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Somente leitura — gerado pelo sistema.</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Priorização — modelo simples (sempre visível) */}
      <div>
        <h4 className="text-sm font-semibold mb-1">Priorização — Modelo Simples (Fennigkoh &amp; Smith)</h4>
        <p className="text-xs text-muted-foreground mb-3">EM = F + PR + MR. Campos obrigatórios em qualquer modelo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Função (F) *</Label>
            <Input type="number" min="1" max="10" step="1" value={form.funcao_f} onChange={e => update('funcao_f', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Risco Físico (PR) *</Label>
            <Input type="number" min="1" max="5" step="1" value={form.risco_fisico_pr} onChange={e => update('risco_fisico_pr', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Requisitos Manut. (MR) *</Label>
            <Input type="number" min="1" max="10" step="1" value={form.requisitos_manutencao_mr} onChange={e => update('requisitos_manutencao_mr', e.target.value)} required />
          </div>
        </div>
      </div>

      {/* Priorização — modelo avançado */}
      {modelo === 'avancado' && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Priorização — Modelo Avançado (ECRI)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              {usaUtil
                ? 'EMR = (MC + 2·M) × U + 2·R'
                : 'EMR = MC + 2·R + 2·M'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Mission Critical (MC) *</Label>
                <Input type="number" min="1" max="10" step="1" value={form.mission_critical_mc} onChange={e => update('mission_critical_mc', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Risco ECRI (R) *</Label>
                <Select value={form.risco_r} onValueChange={v => update('risco_r', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo (1)</SelectItem>
                    <SelectItem value="Médio">Médio (3)</SelectItem>
                    <SelectItem value="Alto">Alto (5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Manutenção (M) *</Label>
                <Input type="number" min="1" max="10" step="1" value={form.manutencao_m} onChange={e => update('manutencao_m', e.target.value)} required />
              </div>
            </div>
            {usaUtil && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Utilização (U) *</Label>
                  <Input type="number" min="0" max="1" step="0.1" placeholder="0.0 a 1.0" value={form.utilizacao_u} onChange={e => update('utilizacao_u', e.target.value)} required />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {equipment?.status_priorizacao === 'pendente_atualizacao' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/40 text-warning-foreground text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Este equipamento está marcado como "Pendente de atualização" para o modelo ativo. Preencha os campos obrigatórios acima para recalcular a prioridade.</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading || verificando}>
          {isLoading ? 'Salvando...' : verificando ? 'Verificando código...' : equipment ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}