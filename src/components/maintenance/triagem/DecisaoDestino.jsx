import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ESPECIALIDADES, NIVEIS_TECNICOS } from '@/lib/tecnicos';
import { cargaDoTecnico } from '@/lib/triagem';
import { ROTAS, ROTAS_EXTERNAS } from '@/lib/rota';

const DESCRICOES = {
  'Equipe interna': 'Escolher o técnico da casa que vai executar.',
  Garantia: 'Acionar o fabricante pela garantia do equipamento.',
  Contrato: 'Acionar o fornecedor do contrato que cobre o equipamento.',
  'Fornecedor sem contrato': 'Encaminhar para um fornecedor externo fora de contrato.',
};

/**
 * Decisão de destino da triagem: equipe interna (com escolha do técnico),
 * garantia, contrato ou fornecedor sem contrato.
 */
export default function DecisaoDestino({
  rota,
  onRotaChange,
  tecnicos = [],
  orders = [],
  tecnicoId,
  onTecnicoChange,
  contratos = [],
  contratoId,
  onContratoChange,
  fornecedor,
  onFornecedorChange,
  dataAgendada,
  onDataChange,
  erro,
  somenteRota = false,
}) {
  const [especialidade, setEspecialidade] = useState('');
  const visiveis = tecnicos.filter((tecnico) => !especialidade || tecnico.specialty === especialidade);
  const externa = ROTAS_EXTERNAS.includes(rota);

  const opcoes = somenteRota ? ROTAS.filter((opcao) => opcao !== 'Equipe interna') : ROTAS;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Destino do chamado *</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {opcoes.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => onRotaChange(opcao)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors',
                rota === opcao
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <p className="text-xs font-semibold text-foreground">{opcao}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{DESCRICOES[opcao]}</p>
            </button>
          ))}
        </div>
        {erro && <p className="text-[11px] font-medium text-destructive">{erro}</p>}
      </div>

      {rota === 'Equipe interna' && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs">Técnico responsável *</Label>
            <Select value={especialidade || 'todas'} onValueChange={(v) => setEspecialidade(v === 'todas' ? '' : v)}>
              <SelectTrigger className="h-8 w-40 bg-card text-xs">
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as especialidades</SelectItem>
                {ESPECIALIDADES.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visiveis.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum técnico ativo com essa especialidade.</p>
          ) : (
            <div className="space-y-1">
              {visiveis.map((tecnico) => {
                const carga = cargaDoTecnico(orders, tecnico.id);
                const marcado = tecnicoId === tecnico.id;
                return (
                  <button
                    key={tecnico.id}
                    type="button"
                    onClick={() => onTecnicoChange(tecnico.id)}
                    className={cn(
                      'flex w-full flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                      marcado ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{tecnico.name}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {[tecnico.specialty, tecnico.level].filter(Boolean).join(' · ') || 'sem especialidade'}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {carga.abertas} OS aberta{carga.abertas === 1 ? '' : 's'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5',
                          carga.agendaNoDia
                            ? 'border border-warning/40 bg-warning/10 text-warning-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {carga.agendaNoDia ? 'com agenda hoje' : 'sem agenda hoje'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Data agendada (opcional)</Label>
            <Input
              type="date"
              value={dataAgendada || ''}
              onChange={(evento) => onDataChange(evento.target.value)}
              className="h-8 w-44 bg-card text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Sem data, a OS aparece em “Sem data” no calendário do técnico.
            </p>
          </div>
        </div>
      )}

      {rota === 'Contrato' && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <Label className="text-xs">Contrato *</Label>
          {contratos.length === 0 ? (
            <p className="text-[11px] font-medium text-destructive">
              Nenhum contrato vigente cobre este equipamento. Use “Fornecedor sem contrato”.
            </p>
          ) : (
            <Select value={contratoId || ''} onValueChange={onContratoChange}>
              <SelectTrigger className="h-8 bg-card text-xs">
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((contrato) => (
                  <SelectItem key={contrato.id} value={contrato.id}>
                    {[contrato.contract_number, contrato.supplier_name].filter(Boolean).join(' · ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {externa && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <Label className="text-xs">Fornecedor responsável *</Label>
          <Input
            value={fornecedor || ''}
            onChange={(evento) => onFornecedorChange(evento.target.value)}
            placeholder="Fabricante ou serviço de manutenção"
            className="h-8 bg-card text-xs"
          />
          <p className="text-[11px] text-muted-foreground">A OS fica sem técnico interno designado.</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Níveis disponíveis: {NIVEIS_TECNICOS.join(' · ')}.
      </p>
    </div>
  );
}