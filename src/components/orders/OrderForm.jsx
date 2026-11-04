import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestPriorityDeEquipamento } from '@/lib/maintenance';
import { rotuloScore } from '@/lib/priorizacao';
import { useTecnicos } from '@/lib/tecnicos';
import { dadosDaRota, sugerirRota } from '@/lib/rota';
import RotaCard from '@/components/orders/RotaCard';
import { toast } from 'sonner';

export default function OrderForm({ order, equipamentoInicial, onSubmit, onCancel, isLoading, user }) {
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  // Só a equipe técnica ativa pode receber chamados.
  const { tecnicos: technicians } = useTecnicos({ ativos: true });

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
    priority_override_reason: order?.priority_override_reason || '',
  });

  // Sugestão aplicada no chamado novo: faixa de prioridade do equipamento.
  const [sugestao, setSugestao] = useState(null);
  const [erroMotivo, setErroMotivo] = useState(false);

  // Rota de atendimento (OS corretiva): sugestão do sistema + escolha do usuário.
  const [rotaSugestao, setRotaSugestao] = useState(null);
  const [rota, setRota] = useState(order?.rota_atendimento || '');
  const [rotaMotivoTroca, setRotaMotivoTroca] = useState(order?.rota_alterada_motivo || '');
  const [fornecedorRota, setFornecedorRota] = useState(order?.fornecedor_nome || '');
  const [erroRota, setErroRota] = useState(false);
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);

  // Código sequencial por ano (OS-AAAA-NNN), reservado no servidor.
  const codigoSequencial = async () => {
    setBuscandoCodigo(true);
    try {
      const resposta = await base44.functions.invoke('gerarCodigoOS', { quantidade: 1 });
      const codigo = resposta?.data?.codigos?.[0];
      if (!codigo) throw new Error('sem código');
      return codigo;
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEquipmentChange = (eqId) => {
    // Ao trocar de equipamento a rota é recalculada para o novo equipamento.
    setRota('');
    setRotaSugestao(null);
    setRotaMotivoTroca('');
    setFornecedorRota('');
    setErroRota(false);
    const eq = equipment.find(e => e.id === eqId);
    if (eq) {
      // Priorização: a sugestão vem da faixa de prioridade do equipamento; se ele estiver
      // pendente (sem faixa), cai no mapeamento por criticidade. Só em chamado novo.
      const suggested = !order ? suggestPriorityDeEquipamento(eq) : null;
      if (suggested) setSugestao({ priority: suggested, equipment: eq });
      setErroMotivo(false);
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

  // Equipamento já escolhido na ficha do equipamento: preenche nome, setor e sugestão de prioridade.
  useEffect(() => {
    if (order || !equipamentoInicial || form.equipment_id || !equipment.length) return;
    if (equipment.some(e => e.id === equipamentoInicial)) handleEquipmentChange(equipamentoInicial);
  }, [equipamentoInicial, equipment, form.equipment_id]);

  // Rota sugerida: recalculada quando o equipamento e os contratos estão carregados.
  useEffect(() => {
    if (!form.equipment_id || !equipment.length || !contracts) return;
    const eq = equipment.find(e => e.id === form.equipment_id);
    if (!eq) return;
    const sugerida = sugerirRota(eq, contracts);
    setRotaSugestao(sugerida);
    setRota((atual) => atual || sugerida.rota);
    setFornecedorRota((atual) => atual || sugerida.fornecedor || '');
  }, [form.equipment_id, equipment, contracts]);

  const precisaMotivo = !order && sugestao && form.priority !== sugestao.priority;

  const handleTechnicianChange = (valor) => {
    const techId = valor === 'sem' ? '' : valor;
    const tech = technicians.find(t => t.id === techId);
    setForm(prev => ({
      ...prev,
      technician_id: techId,
      technician_name: tech?.name || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (buscandoCodigo) return;
    const data = { ...form };
    // Rota de atendimento: a troca em relação à sugestão exige um motivo curto.
    if (!isClinical && form.type === 'Corretiva' && rotaSugestao) {
      const rotaFinal = rota || rotaSugestao.rota;
      if (rotaFinal !== rotaSugestao.rota && !rotaMotivoTroca.trim()) {
        setErroRota(true);
        return;
      }
      Object.assign(data, dadosDaRota(rotaFinal, rotaSugestao, fornecedorRota), {
        rota_alterada_motivo: rotaFinal !== rotaSugestao.rota ? rotaMotivoTroca.trim() : '',
      });
    }
    if (!order) {
      data.open_date = new Date().toISOString();
      data.requester_id = user?.id;
      data.requester_name = user?.full_name;
      try {
        data.code = await codigoSequencial();
      } catch {
        toast.error('Não foi possível gerar o número do chamado agora. Tente novamente.');
        return;
      }
      if (sugestao?.equipment) {
        // Copia a criticidade e o índice do equipamento e exige justificativa na troca manual.
        data.equipment_criticality = sugestao.equipment.criticality;
        data.prioridade_score_equipamento = sugestao.equipment.prioridade_score ?? null;
        if (precisaMotivo) {
          if (!form.priority_override_reason.trim()) {
            setErroMotivo(true);
            return;
          }
        } else {
          data.priority_override_reason = undefined;
        }
      }
    }
    // Campos de data e número vazios são omitidos: a API rejeita '' nesses tipos.
    if (data.scheduled_date) data.scheduled_date = new Date(data.scheduled_date).toISOString();
    else delete data.scheduled_date;
    if (data.total_cost) data.total_cost = parseFloat(data.total_cost);
    else delete data.total_cost;
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
              <Select value={form.technician_id || 'sem'} onValueChange={handleTechnicianChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem">Não atribuída</SelectItem>
                  {form.technician_id && !technicians.some(t => t.id === form.technician_id) && (
                    <SelectItem value={form.technician_id}>
                      {order?.technician_name || 'Técnico atual (fora da equipe ativa)'}
                    </SelectItem>
                  )}
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.specialty ? ` (${t.specialty})` : ''}
                    </SelectItem>
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
                    <SelectItem value="Aguardando Orçamento">Aguardando Orçamento</SelectItem>
                    <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
                    <SelectItem value="Em Transporte (ida)">Em Transporte (ida)</SelectItem>
                    <SelectItem value="Em Conserto Externo">Em Conserto Externo</SelectItem>
                    <SelectItem value="Em Transporte (volta)">Em Transporte (volta)</SelectItem>
                    <SelectItem value="Aguardando Teste de Qualidade">Aguardando Teste de Qualidade</SelectItem>
                    <SelectItem value="Aguardando Aceite">Aguardando Aceite</SelectItem>
                    <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                    <SelectItem value="Aguardando Fornecedor">Aguardando Fornecedor</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type !== 'Corretiva' && (
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
            )}

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

      {!isClinical && form.type === 'Corretiva' && form.equipment_id && (
        <RotaCard
          sugestao={rotaSugestao}
          rota={rota}
          motivoAtual={order?.rota_motivo}
          motivoTroca={rotaMotivoTroca}
          fornecedor={fornecedorRota}
          onRotaChange={(valor) => { setRota(valor); setErroRota(false); }}
          onMotivoTrocaChange={(valor) => { setRotaMotivoTroca(valor); setErroRota(false); }}
          onFornecedorChange={setFornecedorRota}
          erro={erroRota}
        />
      )}

      {precisaMotivo && (
        <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <Label className="text-xs">Justificativa da prioridade *</Label>
          <p className="text-[11px] text-muted-foreground">
            Sugestão pelo índice de priorização do equipamento
            {sugestao.equipment?.prioridade_score != null
              ? ` (${rotuloScore(sugestao.equipment.prioridade_score, sugestao.equipment.prioridade_modelo)} = ${sugestao.priority})`
              : ` (${sugestao.priority})`}
            . Explique o motivo da alteração manual.
          </p>
          <Textarea
            rows={2}
            value={form.priority_override_reason}
            onChange={(e) => { update('priority_override_reason', e.target.value); setErroMotivo(false); }}
          />
          {erroMotivo && (
            <p className="text-[11px] font-medium text-destructive">Informe o motivo da alteração de prioridade.</p>
          )}
        </div>
      )}

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
        <Button type="submit" disabled={isLoading || buscandoCodigo}>
          {isLoading ? 'Salvando...' : buscandoCodigo ? 'Gerando número...' : order ? 'Atualizar' : 'Abrir Chamado'}
        </Button>
      </div>
    </form>
  );
}