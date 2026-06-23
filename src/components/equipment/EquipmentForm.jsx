import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function EquipmentForm({ equipment, onSubmit, onCancel, isLoading }) {
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
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.acquisition_value) data.acquisition_value = parseFloat(data.acquisition_value);
    if (data.weekly_usage_hours) data.weekly_usage_hours = parseFloat(data.weekly_usage_hours);
    if (data.total_operators) data.total_operators = parseInt(data.total_operators);
    if (data.trained_operators) data.trained_operators = parseInt(data.trained_operators);
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : equipment ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}