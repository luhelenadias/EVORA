import { format, isValid, parseISO } from 'date-fns';
import { statusPorVigencia } from '@/lib/contratos';

/** Rotas de atendimento possíveis na abertura de uma OS corretiva. */
export const ROTAS = ['Garantia', 'Contrato', 'Equipe interna', 'Fornecedor sem contrato'];

/** Rotas executadas por fornecedor externo (sem técnico interno designado). */
export const ROTAS_EXTERNAS = ['Garantia', 'Contrato', 'Fornecedor sem contrato'];

export function dataLegivel(valor) {
  if (!valor) return '';
  const data = parseISO(String(valor).slice(0, 10));
  return isValid(data) ? format(data, 'dd/MM/yyyy') : '';
}

/** Contrato vinculado ao equipamento (vínculo direto ou cobertura por lista de equipamentos). */
export function contratoDoEquipamento(contracts = [], equipment) {
  if (!equipment) return null;
  const lista = contracts || [];
  return (
    lista.find((c) => c.id === equipment.contract_id) ||
    lista.find((c) => (c.covered_equipment_ids || []).includes(equipment.id)) ||
    null
  );
}

/** Garantia vale quando o fim é hoje ou uma data futura. */
export function garantiaVigente(equipment) {
  const fim = String(equipment?.warranty_end || '').slice(0, 10);
  if (!fim) return false;
  return fim >= format(new Date(), 'yyyy-MM-dd');
}

export function resumoContrato(contrato) {
  if (!contrato) return '';
  const identificacao = [contrato.contract_number, contrato.supplier_name].filter(Boolean).join(' · ');
  const slas = [];
  if (contrato.sla_response_hours) slas.push(`resposta ${contrato.sla_response_hours}h`);
  if (contrato.sla_resolution_hours) slas.push(`resolução ${contrato.sla_resolution_hours}h`);
  return [identificacao, slas.join(' · ')].filter(Boolean).join(' — ');
}

/**
 * Rota sugerida na abertura da OS corretiva: garantia vigente, senão contrato
 * ativo que cobre o equipamento, senão equipe interna.
 */
export function sugerirRota(equipment, contracts = []) {
  if (!equipment) return null;
  const contrato = contratoDoEquipamento(contracts, equipment);
  const contratoVigente = contrato && statusPorVigencia(contrato) === 'Ativo' ? contrato : null;

  if (garantiaVigente(equipment)) {
    return {
      rota: 'Garantia',
      motivo: `Garantia vigente até ${dataLegivel(equipment.warranty_end)}`,
      contrato: contratoVigente,
      fornecedor: contrato?.supplier_name || equipment.manufacturer || '',
    };
  }

  if (contratoVigente) {
    return {
      rota: 'Contrato',
      motivo: `Coberto pelo contrato ${contratoVigente.contract_number || ''}`.trim(),
      contrato: contratoVigente,
      fornecedor: contratoVigente.supplier_name || '',
    };
  }

  return {
    rota: 'Equipe interna',
    motivo: 'Sem garantia ou contrato encontrado',
    contrato: null,
    fornecedor: equipment.manufacturer || '',
  };
}

/** Campos gravados na OS a partir da rota escolhida. */
export function dadosDaRota(rota, sugestao, fornecedor) {
  const externa = ROTAS_EXTERNAS.includes(rota);
  return {
    rota_sugerida: sugestao?.rota || '',
    rota_atendimento: rota,
    rota_motivo: sugestao?.motivo || '',
    contrato_id: sugestao?.contrato?.id || '',
    execution_by: externa ? 'Fornecedor Externo' : 'Equipe Interna',
    fornecedor_nome: externa ? String(fornecedor || sugestao?.fornecedor || '').trim() : '',
  };
}