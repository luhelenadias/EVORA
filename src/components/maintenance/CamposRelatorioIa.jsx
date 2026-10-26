import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const CAMPOS = [
  {
    key: 'causa_falha',
    label: 'Causa provável da falha',
    placeholder: 'Diagnóstico e causa provável, se identificada...',
  },
  {
    key: 'testes_finais',
    label: 'Testes finais realizados',
    placeholder: 'Testes e medições feitos após o serviço...',
  },
  { key: 'pendencias', label: 'Pendências', placeholder: 'Peça em falta, retorno programado...' },
];

/** Campos do relatório preenchidos pelo rascunho de IA, com marcação de "revisar". */
export default function CamposRelatorioIa({ valores = {}, onChange, revisar = [] }) {
  return (
    <div className="space-y-3">
      {CAMPOS.map((campo) => (
        <div key={campo.key} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs">{campo.label}</Label>
            {revisar.includes(campo.key) && (
              <Badge
                variant="outline"
                className="border-warning/40 bg-warning/20 text-[10px] text-warning-foreground"
              >
                revisar
              </Badge>
            )}
          </div>
          <Textarea
            rows={2}
            value={valores[campo.key] || ''}
            placeholder={campo.placeholder}
            onChange={(e) => onChange(campo.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}