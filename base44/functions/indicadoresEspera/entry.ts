import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Status em que a OS está parada esperando algo (peça, fornecedor, decisão).
const EM_ESPERA = ['Aguardando Peça', 'Aguardando Fornecedor', 'Pendente'];
const ABERTAS = [
  'Novo',
  'Em Andamento',
  'Aguardando Orçamento',
  'Aguardando Aprovação',
  'Em Transporte (ida)',
  'Em Conserto Externo',
  'Em Transporte (volta)',
  'Aguardando Teste de Qualidade',
  'Aguardando Aceite',
  'Aguardando Peça',
  'Aguardando Fornecedor',
  'Pendente',
];
const MINUTOS_DIA = 24 * 60;

/**
 * Tempo em espera por OS, calculado a partir das mudanças de status registradas
 * no LogAuditoria (o log só é legível por administradores, por isso o cálculo
 * roda no servidor para admin e gestor). Cada intervalo começa na entrada em um
 * status de espera e termina na mudança seguinte — ou agora, se a OS segue aberta.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'gestor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { items: registros } = await base44.asServiceRole.entities.LogAuditoria.filter(
      { entidade_tipo: 'ServiceOrder', campo: 'status' },
      { sort: 'data_hora', limit: 3000 }
    );

    const { items: abertas } = await base44.asServiceRole.entities.ServiceOrder.filter(
      { status: { $in: ABERTAS } },
      { limit: 500 }
    );
    const idsAbertas = new Set((abertas || []).map((o) => o.id));

    const porOrdem = new Map();
    (registros || []).forEach((registro) => {
      if (!registro?.entidade_id || !registro?.data_hora) return;
      const lista = porOrdem.get(registro.entidade_id) || [];
      lista.push(registro);
      porOrdem.set(registro.entidade_id, lista);
    });

    const agora = Date.now();
    const porOs: Record<string, number> = {};
    let totalMinutos = 0;

    porOrdem.forEach((lista, ordemId) => {
      const ordenada = [...lista].sort(
        (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      );
      let minutos = 0;
      ordenada.forEach((registro, indice) => {
        const status = String(registro.valor_novo || '');
        if (!EM_ESPERA.includes(status)) return;
        const inicio = new Date(registro.data_hora).getTime();
        const proximo = ordenada[indice + 1];
        const fim = proximo ? new Date(proximo.data_hora).getTime() : idsAbertas.has(ordemId) ? agora : null;
        if (fim == null || fim < inicio) return;
        minutos += (fim - inicio) / 60000;
      });
      const arredondado = Math.round(minutos);
      if (arredondado > 0) {
        porOs[ordemId] = arredondado;
        totalMinutos += arredondado;
      }
    });

    return Response.json({
      por_os: porOs,
      total_minutos: totalMinutos,
      os_com_espera: Object.keys(porOs).length,
      dias_medios: Object.keys(porOs).length
        ? Number((totalMinutos / Object.keys(porOs).length / MINUTOS_DIA).toFixed(1))
        : null,
      registros_lidos: (registros || []).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}