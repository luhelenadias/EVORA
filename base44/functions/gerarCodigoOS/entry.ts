import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Código sequencial da OS por ano: OS-AAAA-NNN.
 *
 * O número é reservado no servidor, num contador por ano (entidade SequenciaOS),
 * com troca condicional (compare-and-swap) — dois pedidos simultâneos nunca
 * recebem o mesmo número. O ponto de partida é o maior entre o contador e o
 * maior número já usado nas OS existentes, então a numeração continua a partir
 * do que já está gravado, sem renomear nada.
 */

const MAX_TENTATIVAS = 6;
const MAX_LOTE = 50;

function anoCorrente() {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date())
  );
}

function formatar(ano: number, numero: number) {
  return `OS-${ano}-${String(numero).padStart(3, '0')}`;
}

function codigosDe(ano: number, inicio: number, quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => formatar(ano, inicio + i));
}

/** Maior número já usado no ano, lendo os códigos existentes. */
async function maiorCodigoDoAno(base44: any, ano: number) {
  const codigos: string[] = [];
  try {
    const { items } = await base44.asServiceRole.entities.ServiceOrder.filter(
      { code: { $regex: `^OS-${ano}-` } },
      { limit: 1000 }
    );
    (items || []).forEach((o: any) => o?.code && codigos.push(o.code));
  } catch {
    const ordens = await base44.asServiceRole.entities.ServiceOrder.list('-created_date', 1000);
    (ordens || []).forEach((o: any) => o?.code && codigos.push(o.code));
  }

  let maior = 0;
  for (const codigo of codigos) {
    const partes = new RegExp(`^OS-${ano}-(\\d+)$`).exec(codigo);
    if (!partes) continue;
    maior = Math.max(maior, Number(partes[1]));
  }
  return maior;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const pedido = Number(body?.quantidade ?? 1);
    const quantidade = Math.min(Math.max(Number.isFinite(pedido) ? Math.trunc(pedido) : 1, 1), MAX_LOTE);

    const ano = anoCorrente();
    const maiorExistente = await maiorCodigoDoAno(base44, ano);

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa += 1) {
      const registros = (await base44.asServiceRole.entities.SequenciaOS.filter({ ano })) || [];
      // Uma linha por ano: mantém a do maior contador e remove sobras antigas.
      const ordenados = registros
        .slice()
        .sort((a: any, b: any) => (Number(b.ultimo_numero) || 0) - (Number(a.ultimo_numero) || 0));
      const sequencia = ordenados[0] || null;
      for (const extra of ordenados.slice(1)) {
        await base44.asServiceRole.entities.SequenciaOS.delete(extra.id).catch(() => {});
      }

      const base = Math.max(Number(sequencia?.ultimo_numero) || 0, maiorExistente);
      const ultimo = base + quantidade;

      if (!sequencia) {
        try {
          await base44.asServiceRole.entities.SequenciaOS.create({ ano, ultimo_numero: ultimo });
          return Response.json({ codigos: codigosDe(ano, base + 1, quantidade) });
        } catch {
          // Outro pedido criou a linha do ano primeiro: tenta de novo lendo o valor atual.
          continue;
        }
      }

      // Só grava se o contador ainda estiver no valor que lemos (troca condicional).
      const resultado = await base44.asServiceRole.entities.SequenciaOS.updateMany(
        { id: sequencia.id, ultimo_numero: base },
        { $set: { ultimo_numero: ultimo } }
      );
      if (Number(resultado?.updated) === 1) {
        return Response.json({ codigos: codigosDe(ano, base + 1, quantidade) });
      }
    }

    return Response.json(
      { error: 'Não foi possível reservar o próximo número da OS agora. Tente novamente.' },
      { status: 409 }
    );
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}