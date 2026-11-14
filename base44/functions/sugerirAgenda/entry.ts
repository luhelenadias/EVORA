import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { candidatasASugestao, motivoPadrao, formatarDiaBr, sugerirData } from '../../shared/agendaRegras.ts';
import { listarTecnicos } from '../../shared/tecnicos.ts';

const LIMITE = 12;

/**
 * Gera sugestões de data para OS sem data ou atrasadas.
 * A data e o técnico saem SEMPRE das regras determinísticas (agendaRegras.ts);
 * a IA recebe apenas os fatos já calculados e escreve a frase do motivo.
 * Sugestão não gera log, alerta nem notificação.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [ordens, equipamentos, tecnicos, pendentes] = await Promise.all([
      base44.entities.ServiceOrder.list(),
      base44.entities.Equipment.list(),
      listarTecnicos(base44),
      base44.entities.SugestaoAgenda.filter({ status: 'Pendente' }),
    ]);

    // Sugestão com data já passada não vale mais: expira e é gerada de novo abaixo.
    const agoraIso = new Date().toISOString();
    const vencidas = (pendentes || []).filter(
      (s: any) => s.data_sugerida && new Date(s.data_sugerida).getTime() < Date.now()
    );
    if (vencidas.length) {
      await base44.entities.SugestaoAgenda.bulkUpdate(
        vencidas.map((s: any) => ({ id: s.id, status: 'Expirada', resolvida_em: agoraIso }))
      );
    }
    const vencidasIds = new Set(vencidas.map((s: any) => s.id));
    const vigentes = (pendentes || []).filter((s: any) => !vencidasIds.has(s.id));

    const comSugestao = new Set(vigentes.map((s: any) => s.service_order_id));
    const equipamentoPorId = new Map((equipamentos || []).map((e: any) => [e.id, e]));

    const candidatas = candidatasASugestao(ordens || [])
      .filter((ordem: any) => !comSugestao.has(ordem.id))
      .slice(0, LIMITE);

    const sugestoes = [];
    for (const ordem of candidatas) {
      const equipamento = equipamentoPorId.get(ordem.equipment_id);
      const regra: any = sugerirData({ ordem, equipamento, ordens, tecnicos });
      if (!regra) continue;
      sugestoes.push({
        service_order_id: ordem.id,
        service_order_code: ordem.code || '',
        equipment_id: ordem.equipment_id || '',
        data_sugerida: regra.data_sugerida,
        tecnico_sugerido_id: regra.tecnico_sugerido_id,
        tecnico_sugerido_nome: regra.tecnico_sugerido_nome,
        criterios: {
          ...regra.criterios,
          tipo: ordem.type || '',
          equipamento: equipamento?.name || ordem.equipment_name || '',
          prioridade_ordem: ordem.priority || null,
        },
        motivo: motivoPadrao(regra),
        status: 'Pendente',
        gerada_em: new Date().toISOString(),
      });
    }

    if (!sugestoes.length) {
      return Response.json({ geradas: 0, expiradas: vencidas.length, sugestoes: [] });
    }

    const criadas = await base44.entities.SugestaoAgenda.bulkCreate(sugestoes);

    // A IA só escreve o motivo — nunca escolhe data, técnico ou prioridade.
    try {
      const fatos = sugestoes.map((s: any, indice: number) => ({
        indice,
        os: s.service_order_code,
        tipo: s.criterios?.tipo,
        equipamento: s.criterios?.equipamento,
        dia: formatarDiaBr(s.criterios?.dia || ''),
        hora: s.criterios?.hora,
        tecnico: s.tecnico_sugerido_nome,
        tecnico_origem: s.criterios?.tecnico_origem,
        carga_no_dia: s.criterios?.carga_no_dia,
        capacidade_dia: s.criterios?.capacidade_dia,
        vencimento: s.criterios?.vencimento ? formatarDiaBr(s.criterios.vencimento) : null,
        dias_para_vencimento: s.criterios?.dias_para_vencimento,
        prioridade_equipamento: s.criterios?.prioridade_equipamento,
        prioridade_ordem: s.criterios?.prioridade_ordem,
      }));

      // Modelo fixado para que o comportamento seja reprodutível (documentado no TCC).
      const resposta = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_8_flash',
        prompt: `Você explica, em português do Brasil, por que uma data foi sugerida para uma manutenção hospitalar.
Os fatos abaixo já foram decididos por REGRAS determinísticas. Não proponha outra data, outro técnico nem outra prioridade, e não invente dados.

Para cada item escreva UM motivo, com no máximo 120 caracteres, no formato:
"sugerido para 12/11 às 09:30: Marcos está livre e a preventiva vence em 15/11"
Use apenas os fatos fornecidos (técnico livre, carga do dia, vencimento, prioridade). Sem emoji, sem ponto e vírgula, sem travessão.

Fatos:
${JSON.stringify(fatos, null, 2)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            motivos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  indice: { type: 'number' },
                  motivo: { type: 'string' },
                },
                required: ['indice', 'motivo'],
              },
            },
          },
          required: ['motivos'],
        },
      });

      const motivos: any[] = Array.isArray(resposta?.motivos) ? resposta.motivos : [];
      const atualizacoes = motivos
        .map((item) => {
          const criada = (criadas || [])[item.indice];
          if (!criada?.id || !item.motivo) return null;
          return { id: criada.id, motivo: String(item.motivo).slice(0, 200) };
        })
        .filter(Boolean);

      if (atualizacoes.length) {
        await base44.entities.SugestaoAgenda.bulkUpdate(atualizacoes);
      }
    } catch {
      // Sem IA, fica o motivo determinístico já gravado.
    }

    return Response.json({ geradas: (criadas || []).length, expiradas: vencidas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
