import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { computePriorizacao } from '@/lib/maintenance';
import { AlertTriangle } from 'lucide-react';

export default function EquipmentForm({ equipment, onSubmit, onCancel, isLoading }) {
  const { config } = useConfiguracao();
  const modelo = config?.modelo_priorizacao || 'simples';
  const usaUtil = modelo === 'avancado' && config?.avancado_usa_utilizacao === true;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.acquisition_value) data.acquisition_value = parseFloat(data.acquisition_value);
    if (data.weekly_usage_hours) data.weekly_usage_hours = parseFloat(data.weekly_usage_hours);
    if (data.total_operators) data.total_operators = parseInt(data.total_operators);
    if (data.trained_operators) data.trained_operators = parseInt(data.trained_operators);

    // converte campos numéricos de priorização (mantém todos salvos, ambos os modelos)
    data.funcao_f = numOrUndef(form.funcao_f);
    data.risco_fisico_pr = numOrUndef(form.risco_fisico_pr);
    data.requisitos_manutencao_mr = numOrUndef(form.requisitos_manutencao_mr);
    data.mission_critical_mc = numOrUndef(form.mission_critical_mc);
    data.manutencao_m = numOrUndef(form.manutencao_m);
    data.utilizacao_u = numOrUndef(form.utilizacao_u);
    data.risco_r = form.risco_r || undefined;

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
          <Label className="text-xs">Data Aquisição</Label>
          <Input type="date" value={form.acquisition_date} onChange={e => update('acquisition_date', e.target.value)} />
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
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Este equipamento está marcado como "Pendente de atualização" para o modelo ativo. Preencha os campos obrigatórios acima para recalcular a prioridade.</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : equipment ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}