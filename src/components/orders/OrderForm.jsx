import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestPriority } from '@/lib/maintenance';

export default function OrderForm({ order, onSubmit, onCancel, isLoading, user }) {
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['techTeam'],
    queryFn: () => base44.entities.TechTeam.filter({ status: 'Ativo' }),
  });

  const [form, setForm] = useState({
    type: order?.type || 'Corretiva',
    origin: order?.origin || 'Manual',
    equipment_id: order?.equipment_id || '',
    equipment_name: order?.equipment_name || '',
    technician_id: order?.technician_id || '',
    technician_name: order?.technician_name || '',
    status: order?.status || 'Novo',
    priority: order?.priority || 'Média',
    problem_description: order?.problem_description || '',
    technical_report: order?.technical_report || '',
    execution_by: order?.execution_by || 'Equipe Interna',
    sector: order?.sector || '',
    scheduled_date: order?.scheduled_date?.split('T')[0] || '',
    total_cost: order?.total_cost || '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEquipmentChange = (eqId) => {
    const eq = equipment.find(e => e.id === eqId);
    if (eq) {
      // Priorização inteligente: sugere prioridade com base na criticidade (apenas em novo chamado)
      const suggested = !order ? suggestPriority(eq.criticality) : undefined;
      setForm(prev => ({
        ...prev,
        equipment_id: eqId,
        equipment_name: eq.name,
        sector: eq.location_sector || prev.sector,
        ...(suggested ? { priority: suggested } : {}),
      }));
    } else {
      update('equipment_id', eqId);
    }
  };

  const handleTechnicianChange = (techId) => {
    const tech = technicians.find(t => t.id === techId);
    setForm(prev => ({
      ...prev,
      technician_id: techId,
      technician_name: tech?.name || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (!order) {
      data.open_date = new Date().toISOString();
      data.requester_id = user?.id;
      data.requester_name = user?.full_name;
      data.code = `OS-${Date.now().toString(36).toUpperCase()}`;
    }
    if (data.scheduled_date) data.scheduled_date = new Date(data.scheduled_date).toISOString();
    if (data.total_cost) data.total_cost = parseFloat(data.total_cost);
    onSubmit(data);
  };

  const isTechnician = user?.role === 'tecnico';
  const isClinical = user?.role === 'clinico';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isClinical && (
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={form.type} onValueChange={v => update('type', v)} disabled={isTechnician}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Preventiva">Preventiva</SelectItem>
                <SelectItem value="Corretiva">Corretiva</SelectItem>
                <SelectItem value="Calibração">Calibração</SelectItem>
                <SelectItem value="Instalação">Instalação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Equipamento *</Label>
          <Select value={form.equipment_id} onValueChange={handleEquipmentChange}>
            <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
            <SelectContent>
              {equipment.map(eq => (
                <SelectItem key={eq.id} value={eq.id}>{eq.name} - {eq.patrimony_number || eq.serial_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isClinical && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.priority} onValueChange={v => update('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Crítica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Técnico Responsável</Label>
              <Select value={form.technician_id} onValueChange={handleTechnicianChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.specialty})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {order && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => update('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                    <SelectItem value="Aguardando Fornecedor">Aguardando Fornecedor</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Execução por</Label>
              <Select value={form.execution_by} onValueChange={v => update('execution_by', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equipe Interna">Equipe Interna</SelectItem>
                  <SelectItem value="Fornecedor Externo">Fornecedor Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data Agendamento</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => update('scheduled_date', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Custo Total (R$)</Label>
              <Input type="number" step="0.01" value={form.total_cost} onChange={e => update('total_cost', e.target.value)} />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Setor</Label>
          <Input value={form.sector} onChange={e => update('sector', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Descrição do Problema *</Label>
        <Textarea value={form.problem_description} onChange={e => update('problem_description', e.target.value)} rows={3} required />
      </div>

      {(isTechnician || user?.role === 'admin' || user?.role === 'gestor') && order && (
        <div className="space-y-1.5">
          <Label className="text-xs">Laudo Técnico</Label>
          <Textarea value={form.technical_report} onChange={e => update('technical_report', e.target.value)} rows={3} />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : order ? 'Atualizar' : 'Abrir Chamado'}
        </Button>
      </div>
    </form>
  );
}