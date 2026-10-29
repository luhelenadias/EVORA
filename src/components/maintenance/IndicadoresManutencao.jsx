import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import EquipmentIndicatorsTable from '@/components/indicators/EquipmentIndicatorsTable';
import { Activity, ArrowLeft, BarChart3, Clock, ShieldCheck, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { calcularMtbf, calcularMttr, calcularTempoMedioAtendimento } from '@/lib/indicadores';
import { diaIso } from '@/lib/preventivas';

function Indicador({ icone: Icone, rotulo, valor, detalhe }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{valor}</p>
          {detalhe && <p className="mt-0.5 text-[11px] text-muted-foreground">{detalhe}</p>}
        </div>
        <Icone className="h-4 w-4 text-muted-foreground" />
      </div>
    </Card>
  );
}

const horas = (valor) => (valor == null ? '—' : `${valor} h`);

/**
 * Indicadores da manutenção no período filtrado. A visão por técnico é
 * restrita a gestor e administrador.
 */
export default function IndicadoresManutencao({ ordens = [], tecnicos = [], equipment = [], podeVerPorTecnico = false }) {
  const [selecionado, setSelecionado] = useState(null);
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const resumo = useMemo(() => {
    const concluidas = ordens.filter((o) => o.status === 'Concluído');
    const abertas = ordens.filter((o) => o.status !== 'Concluído');
    const corretivasAbertas = abertas.filter((o) => o.type === 'Corretiva');
    const preventivasAtrasadas = abertas.filter(
      (o) => o.type === 'Preventiva' && o.scheduled_date && diaIso(o.scheduled_date) < hoje
    );
    const comSla = concluidas.filter((o) => o.sla_status && o.sla_status !== 'Sem SLA Definido');
    const noPrazo = comSla.filter((o) => o.sla_status === 'Dentro do Prazo');
    return {
      total: ordens.length,
      concluidas: concluidas.length,
      abertas: abertas.length,
      corretivasAbertas: corretivasAbertas.length,
      preventivasAtrasadas: preventivasAtrasadas.length,
      mttr: calcularMttr(ordens),
      atendimento: calcularTempoMedioAtendimento(ordens),
      aderencia: comSla.length ? Math.round((noPrazo.length / comSla.length) * 100) : null,
      comSla: comSla.length,
    };
  }, [ordens, hoje]);

  const porEquipamento = useMemo(() => {
    return equipment
      .map((equipamento) => {
        const doEquipamento = ordens.filter((o) => o.equipment_id === equipamento.id);
        return {
          equipment_id: equipamento.id,
          equipment_name: equipamento.name,
          criticality: equipamento.criticality,
          operational_status: equipamento.operational_status,
          mttr_hours: calcularMttr(doEquipamento),
          mtbf_hours: calcularMtbf(doEquipamento),
          avg_response_time_hours: calcularTempoMedioAtendimento(doEquipamento),
          total: doEquipamento.length,
        };
      })
      .filter((linha) => linha.total > 0 && (linha.mttr_hours != null || linha.mtbf_hours != null || linha.avg_response_time_hours != null));
  }, [equipment, ordens]);

  const medias = useMemo(() => {
    const media = (valores) => {
      const validos = valores.filter((v) => v != null);
      return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
    };
    return {
      mttr: media(porEquipamento.map((r) => r.mttr_hours)),
      mtbf: media(porEquipamento.map((r) => r.mtbf_hours)),
    };
  }, [porEquipamento]);

  const porTecnico = useMemo(() => {
    return tecnicos
      .map((tecnico) => {
        const doTecnico = ordens.filter((o) => o.technician_id === tecnico.id);
        return {
          id: tecnico.id,
          nome: tecnico.name,
          status: tecnico.status || 'Ativo',
          total: doTecnico.length,
          concluidas: doTecnico.filter((o) => o.status === 'Concluído').length,
          abertas: doTecnico.filter((o) => o.status !== 'Concluído').length,
          atrasadas: doTecnico.filter(
            (o) => o.status !== 'Concluído' && o.scheduled_date && diaIso(o.scheduled_date) < hoje
          ).length,
          mttr: calcularMttr(doTecnico),
          atendimento: calcularTempoMedioAtendimento(doTecnico),
        };
      })
      .filter((linha) => linha.total > 0)
      .sort((a, b) => b.concluidas - a.concluidas);
  }, [tecnicos, ordens, hoje]);

  const ordensDoSelecionado = useMemo(() => {
    if (!selecionado) return [];
    return ordens
      .filter((o) => o.equipment_id === selecionado.id)
      .sort((a, b) => String(b.open_date || '').localeCompare(String(a.open_date || '')));
  }, [ordens, selecionado]);

  if (!ordens.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem manutenções no período"
        description="Ajuste o período ou os filtros para ver os indicadores."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador icone={Activity} rotulo="OS no período" valor={resumo.total} detalhe={`${resumo.abertas} em aberto`} />
        <Indicador icone={BarChart3} rotulo="Concluídas" valor={resumo.concluidas} detalhe="no período filtrado" />
        <Indicador icone={Clock} rotulo="MTTR médio" valor={horas(resumo.mttr)} detalhe={`atendimento ${horas(resumo.atendimento)}`} />
        <Indicador
          icone={ShieldCheck}
          rotulo="Aderência ao SLA"
          valor={resumo.aderencia == null ? '—' : `${resumo.aderencia}%`}
          detalhe={resumo.comSla ? `${resumo.comSla} OS com SLA` : 'sem SLA avaliado'}
        />
        <Indicador
          icone={Wrench}
          rotulo="Atrasadas agora"
          valor={`${resumo.preventivasAtrasadas}/${resumo.corretivasAbertas}`}
          detalhe="preventivas / corretivas abertas"
        />
      </div>

      {selecionado && (
        <Card className="border-primary/30">
          <div className="flex items-center gap-3 border-b p-3">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelecionado(null)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div>
              <h3 className="text-sm font-semibold">Chamados — {selecionado.name}</h3>
              <p className="text-xs text-muted-foreground">{ordensDoSelecionado.length} OS no período filtrado</p>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Técnico</TableHead>
                  <TableHead className="text-xs font-semibold">Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensDoSelecionado.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-mono text-xs">{ordem.code || '—'}</TableCell>
                    <TableCell className="text-sm">{ordem.type}</TableCell>
                    <TableCell><StatusBadge value={ordem.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ordem.technician_name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ordem.open_date ? format(new Date(ordem.open_date), 'dd/MM/yy') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Indicadores por equipamento</h3>
        {porEquipamento.length ? (
          <EquipmentIndicatorsTable
            rows={porEquipamento}
            avgMttr={medias.mttr}
            avgMtbf={medias.mtbf}
            onRowClick={(id, name) => setSelecionado({ id, name })}
          />
        ) : (
          <EmptyState
            icon={Wrench}
            title="Sem indicadores por equipamento"
            description="Os indicadores aparecem quando há corretivas concluídas no período."
          />
        )}
      </div>

      {podeVerPorTecnico && (
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Indicadores por técnico</h3>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Visão restrita a gestor e administrador.
          </p>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Técnico</TableHead>
                  <TableHead className="text-xs font-semibold text-right">OS</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Concluídas</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Em aberto</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Atrasadas</TableHead>
                  <TableHead className="text-xs font-semibold text-right">MTTR</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Atendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porTecnico.length ? (
                  porTecnico.map((linha) => (
                    <TableRow key={linha.id}>
                      <TableCell className="text-sm font-medium">
                        {linha.nome}
                        {linha.status !== 'Ativo' && (
                          <span className="ml-1 text-[10px] text-muted-foreground">({linha.status})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{linha.total}</TableCell>
                      <TableCell className="text-right text-sm">{linha.concluidas}</TableCell>
                      <TableCell className="text-right text-sm">{linha.abertas}</TableCell>
                      <TableCell className={`text-right text-sm ${linha.atrasadas > 0 ? 'font-semibold text-accent' : ''}`}>
                        {linha.atrasadas}
                      </TableCell>
                      <TableCell className="text-right text-sm">{horas(linha.mttr)}</TableCell>
                      <TableCell className="text-right text-sm">{horas(linha.atendimento)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                      Nenhuma OS atribuída no período filtrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}