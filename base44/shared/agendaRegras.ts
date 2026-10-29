/**
 * Regras determinísticas de sugestão de data para o calendário.
 *
 * Nenhuma decisão de data ou de técnico sai da IA: aqui ficam as regras
 * (primeiro horário livre do técnico, férias/afastamento, carga do dia,
 * vencimento da preventiva e prioridade do equipamento). A IA só escreve a
 * explicação curta do motivo, a partir dos fatos calculados aqui.
 */

export const CAPACIDADE_DIA = 3;
export const HORARIOS_TRABALHO = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];
export const DIAS_BUSCA = 30;

const CONCLUIDO = 'Concluído';

export function ehAberta(ordem: any) {
  return !!ordem && ordem.status !== CONCLUIDO;
}

/** 'yyyy-MM-dd' de um campo de data ou data/hora. */
export function diaIso(valor: any) {
  if (!valor) return '';
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? '' : data.toISOString().slice(0, 10);
}

export function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number) {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas 'yyyy-MM-dd'. */
export function diferencaEmDias(de: string, ate: string) {
  if (!de || !ate) return null;
  const a = new Date(`${de}T12:00:00Z`).getTime();
  const b = new Date(`${ate}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatarDiaBr(dia: string) {
  if (!dia) return '';
  const [ano, mes, diaMes] = dia.split('-');
  return `${diaMes}/${mes}/${ano}`;
}

/** Ordens abertas do técnico naquele dia. */
export function ordensDoTecnicoNoDia(ordens: any[], tecnicoId: string, dia: string) {
  if (!tecnicoId || !dia) return [];
  return (ordens || []).filter(
    (ordem) =>
      ehAberta(ordem) &&
      ordem.technician_id === tecnicoId &&
      diaIso(ordem.scheduled_date) === dia
  );
}

export function cargaDoDia(ordens: any[], tecnicoId: string, dia: string) {
  return ordensDoTecnicoNoDia(ordens, tecnicoId, dia).length;
}

/** Horários já tomados pelo técnico no dia (só o que tem hora definida). */
export function horariosTomados(ordens: any[], tecnicoId: string, dia: string) {
  const tomados = new Set<string>();
  ordensDoTecnicoNoDia(ordens, tecnicoId, dia).forEach((ordem) => {
    const texto = String(ordem.scheduled_date || '');
    if (texto.includes('T')) tomados.add(texto.slice(11, 16));
  });
  return tomados;
}

/** OS sem data ou com a data já vencida — as que merecem sugestão. */
export function candidatasASugestao(ordens: any[], hoje = hojeIso()) {
  return (ordens || []).filter((ordem) => {
    if (!ehAberta(ordem)) return false;
    if (ordem.status === 'Em Andamento') return false;
    const dia = diaIso(ordem.scheduled_date);
    if (!dia) return true;
    return dia < hoje;
  });
}

function prioridadeAlta(ordem: any, equipamento: any) {
  const faixa = equipamento?.prioridade_faixa;
  return (
    ['Crítica', 'Alta'].includes(ordem?.priority) ||
    ['Crítica', 'Alta'].includes(faixa) ||
    equipamento?.prioridade_alta === true
  );
}

/** Técnicos na ordem de preferência da regra: o atribuído, o padrão do equipamento e os de menor carga. */
function ordemDePreferencia(ordem: any, equipamento: any, ativos: any[], ordens: any[], dia: string) {
  const escolhidos: any[] = [];
  const adicionar = (id: string) => {
    if (!id) return;
    const tecnico = ativos.find((t) => t.id === id);
    if (tecnico && !escolhidos.some((t) => t.id === tecnico.id)) escolhidos.push(tecnico);
  };
  adicionar(ordem?.technician_id);
  adicionar(equipamento?.tecnico_padrao_id);

  const restantes = ativos
    .filter((tecnico) => !escolhidos.some((t) => t.id === tecnico.id))
    .sort((a, b) => {
      const cargaA = cargaDoDia(ordens, a.id, dia);
      const cargaB = cargaDoDia(ordens, b.id, dia);
      if (cargaA !== cargaB) return cargaA - cargaB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });

  return [...escolhidos, ...restantes];
}

function origemDoTecnico(ordem: any, equipamento: any, tecnico: any) {
  if (tecnico?.id && tecnico.id === ordem?.technician_id) return 'já atribuído à OS';
  if (tecnico?.id && tecnico.id === equipamento?.tecnico_padrao_id) return 'técnico padrão do equipamento';
  return 'menor carga no dia';
}

/**
 * Primeira data/hora livre, respeitando férias/afastamento, carga do dia,
 * vencimento da preventiva e prioridade. Devolve null quando não há janela.
 */
export function sugerirData({ ordem, equipamento, ordens = [], tecnicos = [] }: any) {
  const ativos = (tecnicos || []).filter((t: any) => (t.status || 'Ativo') === 'Ativo');
  if (!ativos.length) return null;

  const hoje = hojeIso();
  const vencimento = diaIso(equipamento?.data_proxima_preventiva);
  const urgente = prioridadeAlta(ordem, equipamento);

  let inicio = somarDias(hoje, urgente ? 0 : 1);
  if (ordem?.type === 'Preventiva' && vencimento && vencimento > inicio) inicio = vencimento;

  for (let passo = 0; passo < DIAS_BUSCA; passo += 1) {
    const dia = somarDias(inicio, passo);
    for (const tecnico of ordemDePreferencia(ordem, equipamento, ativos, ordens, dia)) {
      const carga = cargaDoDia(ordens, tecnico.id, dia);
      if (carga >= CAPACIDADE_DIA) continue;
      const tomados = horariosTomados(ordens, tecnico.id, dia);
      const hora = HORARIOS_TRABALHO.find((h) => !tomados.has(h));
      if (!hora) continue;

      return {
        data_sugerida: `${dia}T${hora}:00.000Z`,
        tecnico_sugerido_id: tecnico.id,
        tecnico_sugerido_nome: tecnico.name || 'Técnico',
        criterios: {
          dia,
          hora,
          tecnico_status: tecnico.status || 'Ativo',
          tecnico_origem: origemDoTecnico(ordem, equipamento, tecnico),
          carga_no_dia: carga,
          capacidade_dia: CAPACIDADE_DIA,
          vencimento: vencimento || null,
          dias_para_vencimento: vencimento ? diferencaEmDias(hoje, vencimento) : null,
          prioridade_equipamento: equipamento?.prioridade_faixa || equipamento?.criticality || null,
          prioridade_ordem: ordem?.priority || null,
          urgente,
        },
      };
    }
  }
  return null;
}

/** Motivo determinístico, usado quando a IA não responde. */
export function motivoPadrao({ data_sugerida, tecnico_sugerido_nome, criterios }: any) {
  const dia = formatarDiaBr(criterios?.dia || diaIso(data_sugerida));
  const partes = [`sugerido para ${dia} às ${criterios?.hora || ''}`.trim()];
  partes.push(`${tecnico_sugerido_nome} está livre`);
  if (criterios?.dias_para_vencimento != null) {
    const venc = formatarDiaBr(criterios.vencimento);
    partes.push(
      criterios.dias_para_vencimento >= 0
        ? `a preventiva vence em ${venc}`
        : `a preventiva venceu em ${venc}`
    );
  }
  if (criterios?.carga_no_dia != null) {
    partes.push(`carga do dia ${criterios.carga_no_dia}/${criterios.capacidade_dia}`);
  }
  if (criterios?.prioridade_equipamento) {
    partes.push(`equipamento de prioridade ${criterios.prioridade_equipamento}`);
  }
  return `${partes[0]}${partes.length > 1 ? `: ${partes.slice(1).join(' · ')}` : ''}.`;
}