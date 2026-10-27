import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { registrarAuditoria } from '@/lib/auditoria';
import { Link } from 'react-router-dom';

export default function NewOrder() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    // Vindo da ficha do equipamento (inclusive pela etiqueta QR), já chega preenchido.
    equipment_id: searchParams.get('equipamento') || '',
    problem_description: '',
    sector: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const criado = await base44.entities.ServiceOrder.create(data);
      await registrarAuditoria({
        entidade_tipo: 'ServiceOrder',
        entidade_id: criado.id,
        entidade_codigo: criado.code || '',
        acao: 'Abertura',
        valor_novo: `${criado.type} · ${criado.problem_description || ''}`.trim(),
      });
      return criado;
    },
    onSuccess: () => {
      toast.success('Chamado aberto com sucesso!');
      navigate('/chamados');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const eq = equipment.find(eq => eq.id === form.equipment_id);
    createMutation.mutate({
      type: 'Corretiva',
      origin: 'Manual',
      equipment_id: form.equipment_id,
      equipment_name: eq?.name || '',
      requester_id: user?.id,
      requester_name: user?.full_name,
      status: 'Novo',
      priority: 'Média',
      problem_description: form.problem_description,
      sector: form.sector || eq?.location_sector || '',
      open_date: new Date().toISOString(),
      code: `OS-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/chamados">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display">Abrir Chamado Corretivo</h1>
          <p className="text-sm text-muted-foreground">Registre um problema com um equipamento</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Equipamento com problema *</Label>
              <Select value={form.equipment_id} onValueChange={v => setForm(p => ({...p, equipment_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {equipment.filter(e => e.operational_status !== 'Inativo/Baixado').map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} {eq.location_sector ? `(${eq.location_sector})` : ''} {eq.patrimony_number ? `- ${eq.patrimony_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Input placeholder="Ex: UTI, Centro Cirúrgico..." value={form.sector} onChange={e => setForm(p => ({...p, sector: e.target.value}))} />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição do problema *</Label>
              <Textarea
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                value={form.problem_description}
                onChange={e => setForm(p => ({...p, problem_description: e.target.value}))}
                rows={5}
                required
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending || !form.equipment_id}>
              <Send className="w-4 h-4" />
              {createMutation.isPending ? 'Enviando...' : 'Abrir Chamado'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}