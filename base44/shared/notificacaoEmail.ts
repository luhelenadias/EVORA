/**
 * Composição dos e-mails de agenda para o técnico responsável e do convite
 * de calendário (.ics). Usado por notificarAgendamento e enviarNotificacoesAgenda.
 *
 * Regra da instituição: com ConfiguracaoInstituicao.email_modo_teste ligado,
 * TODO e-mail vai para email_teste_destino, com o destinatário real indicado
 * no assunto e no corpo.
 */

export const APP_URL = 'https://phenomenal-med-equip-flow.base44.app';

export const EVENTOS = [
  'Agendamento',
  'Reagendamento',
  'Troca de técnico',
  'Agendamento e troca de técnico',
  'Cancelamento',
];

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function duasCasas(valor: number) {
  return String(valor).padStart(2, '0');
}

/** '12/11/2026 às 09:30' (texto vazio = sem data). */
export function formatarQuando(valor: any) {
  if (!valor) return 'sem data definida';
  const texto = String(valor);
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto;
  const dia = `${duasCasas(data.getUTCDate())}/${duasCasas(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
  return texto.includes('T') ? `${dia} às ${duasCasas(data.getUTCHours())}:${duasCasas(data.getUTCMinutes())}` : dia;
}

export function tituloDoEvento(evento: string) {
  switch (evento) {
    case 'Agendamento':
      return 'Nova manutenção agendada para você';
    case 'Reagendamento':
      return 'Sua manutenção mudou de data';
    case 'Troca de técnico':
      return 'Você passou a responder por esta manutenção';
    case 'Agendamento e troca de técnico':
      return 'Manutenção agendada e atribuída a você';
    case 'Cancelamento':
      return 'A manutenção saiu da sua agenda';
    default:
      return 'Atualização na sua agenda de manutenções';
  }
}

/** Junta dois tipos de mudança em um único rótulo (o e-mail sai com a mudança final). */
export function juntarEvento(atual: string, novo: string) {
  if (!atual || atual === novo) return novo || atual || 'Reagendamento';
  const envolveTecnico = (e: string) => e === 'Troca de técnico' || e === 'Agendamento e troca de técnico';
  if ((atual === 'Agendamento' || atual === 'Reagendamento') && envolveTecnico(novo)) {
    return 'Agendamento e troca de técnico';
  }
  if (envolveTecnico(atual) && (novo === 'Agendamento' || novo === 'Reagendamento')) {
    return 'Agendamento e troca de técnico';
  }
  if (novo === 'Cancelamento' || atual === 'Cancelamento') return 'Cancelamento';
  return novo;
}

function escaparHtml(texto: any) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function linha(rotulo: string, valor: string) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font:600 12px 'Montserrat',Arial,sans-serif;color:#636e74;text-transform:uppercase;letter-spacing:.04em;vertical-align:top;">${rotulo}</td>
    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font:400 14px 'Montserrat',Arial,sans-serif;color:#202527;text-align:right;">${valor}</td>
  </tr>`;
}

export function linkDaOrdem(serviceOrderId: string) {
  return `${APP_URL}/manutencoes?os=${serviceOrderId}`;
}

/**
 * Monta assunto, HTML e texto do e-mail. `modoTeste` + `destinatarioReal`
 * entram no assunto e no corpo para ninguém confundir quem receberia.
 */
export function montarEmail(
  notificacao: any,
  opcoes: { modoTeste: boolean; destinatarioReal: string; ordem?: any }
) {
  const quandoNova = formatarQuando(notificacao.data_nova);
  const quandoAnterior = formatarQuando(notificacao.data_anterior);
  // Primeira designação (sem técnico anterior): o aviso diz que há um chamado novo para a pessoa.
  const primeiraDesignacao =
    notificacao.papel !== 'Anterior responsável' &&
    !notificacao.tecnico_anterior_nome &&
    ['Troca de técnico', 'Agendamento e troca de técnico'].includes(notificacao.evento);
  const titulo = primeiraDesignacao ? 'Novo chamado designado a você' : tituloDoEvento(notificacao.evento);
  const link = linkDaOrdem(notificacao.service_order_id);

  const assuntoBase = `[${notificacao.service_order_code || 'OS'}] ${titulo}${
    primeiraDesignacao && !notificacao.data_nova ? '' : ` · ${quandoNova}`
  }`;
  const assunto = opcoes.modoTeste
    ? `[MODO TESTE · destinatário real: ${opcoes.destinatarioReal}] ${assuntoBase}`
    : assuntoBase;

  const trocaTecnico = notificacao.tecnico_anterior_nome
    ? linha('Antes com', notificacao.tecnico_anterior_nome)
    : '';

  const html = `<div style="background:#f6f4ef;padding:24px 12px;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#0f4d4b;padding:20px 28px;font:700 16px 'Montserrat',Arial,sans-serif;color:#f7f6f2;">EVORA · Engenharia Clínica</td></tr>
    <tr><td style="padding:28px;">
      <p style="margin:0 0 6px;font:700 20px 'Montserrat',Arial,sans-serif;color:#0f4d4b;">${titulo}</p>
      <p style="margin:0 0 18px;font:400 14px 'Montserrat',Arial,sans-serif;color:#636e74;">Olá, ${notificacao.tecnico_nome || 'técnico'}. ${
        primeiraDesignacao ? 'A gestão designou este chamado a você.' : 'Esta é a situação atual desta ordem de serviço.'
      }</p>
      ${
        opcoes.modoTeste
          ? `<p style="margin:0 0 18px;padding:10px 12px;background:#fff5e6;border:1px solid #f0d9b5;border-radius:8px;font:400 12px 'Montserrat',Arial,sans-serif;color:#7a5a1f;">MODO TESTE ativo: este e-mail seria enviado para <strong>${opcoes.destinatarioReal}</strong>.</p>`
          : ''
      }
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${linha('Ordem de serviço', `${notificacao.service_order_code || '—'} · ${notificacao.tipo_ordem || '—'}`)}
        ${linha('Equipamento', notificacao.equipment_name || '—')}
        ${linha('Setor', notificacao.sector || '—')}
        ${opcoes.ordem?.priority ? linha('Prioridade', escaparHtml(opcoes.ordem.priority)) : ''}
        ${
          opcoes.ordem?.problem_description
            ? linha('Problema relatado', escaparHtml(String(opcoes.ordem.problem_description).slice(0, 300)))
            : ''
        }
        ${primeiraDesignacao ? '' : linha('Data anterior', quandoAnterior)}
        ${linha(primeiraDesignacao ? 'Data agendada' : 'Nova data', quandoNova)}
        ${notificacao.tecnico_nome ? linha('Técnico responsável', notificacao.tecnico_nome) : ''}
        ${trocaTecnico}
        ${linha('Alterado por', notificacao.alterado_por || '—')}
      </table>
      <p style="margin:22px 0 0;">
        <a href="${link}" style="display:inline-block;background:#0f4d4b;color:#f7f6f2;text-decoration:none;padding:12px 22px;border-radius:8px;font:700 14px 'Montserrat',Arial,sans-serif;">Abrir a ordem de serviço</a>
      </p>
      <p style="margin:18px 0 0;font:400 11px 'Montserrat',Arial,sans-serif;color:#636e74;">O convite de calendário (.ics) vai anexo a este e-mail.</p>
    </td></tr>
  </table>
</div>`;

  const texto = [
    titulo,
    '',
    opcoes.modoTeste ? `MODO TESTE: destinatário real seria ${opcoes.destinatarioReal}.` : '',
    `Ordem de serviço: ${notificacao.service_order_code || '—'} (${notificacao.tipo_ordem || '—'})`,
    `Equipamento: ${notificacao.equipment_name || '—'}`,
    `Setor: ${notificacao.sector || '—'}`,
    opcoes.ordem?.priority ? `Prioridade: ${opcoes.ordem.priority}` : '',
    opcoes.ordem?.problem_description
      ? `Problema relatado: ${String(opcoes.ordem.problem_description).slice(0, 300)}`
      : '',
    primeiraDesignacao ? '' : `Data anterior: ${quandoAnterior}`,
    `${primeiraDesignacao ? 'Data agendada' : 'Nova data'}: ${quandoNova}`,
    notificacao.tecnico_anterior_nome ? `Antes com: ${notificacao.tecnico_anterior_nome}` : '',
    `Alterado por: ${notificacao.alterado_por || '—'}`,
    '',
    `Abrir a ordem de serviço: ${link}`,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { assunto, html, texto, link };
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function paraBase64(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    saida += ALFABETO[b0 >> 2];
    saida += ALFABETO[((b0 & 3) << 4) | ((b1 || 0) >> 4)];
    saida += b1 === undefined ? '=' : ALFABETO[((b1 & 15) << 2) | ((b2 || 0) >> 6)];
    saida += b2 === undefined ? '=' : ALFABETO[b2 & 63];
  }
  return saida;
}

function carimboUtc(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return `${data.getUTCFullYear()}${duasCasas(data.getUTCMonth() + 1)}${duasCasas(data.getUTCDate())}T${duasCasas(
    data.getUTCHours()
  )}${duasCasas(data.getUTCMinutes())}00Z`;
}

function escaparIcs(texto: string) {
  return String(texto || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

/** Convite de calendário anexado ao e-mail (base64, como o SendEmail espera). */
export function conviteCalendario(notificacao: any) {
  const inicio = carimboUtc(notificacao.data_nova);
  if (!inicio) return null;
  const data = new Date(notificacao.data_nova);
  const fim = carimboUtc(new Date(data.getTime() + 2 * 60 * 60 * 1000).toISOString());
  const resumo = `OS ${notificacao.service_order_code || ''} · ${notificacao.equipment_name || 'Manutenção'}`.trim();

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EVORA//Engenharia Clinica//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${notificacao.service_order_id}@evora`,
    `DTSTAMP:${carimboUtc(new Date().toISOString())}`,
    `DTSTART:${inicio}`,
    `DTEND:${fim}`,
    `SUMMARY:${escaparIcs(resumo)}`,
    `LOCATION:${escaparIcs(notificacao.sector || '')}`,
    `DESCRIPTION:${escaparIcs(
      `${notificacao.evento} · ${notificacao.tipo_ordem || 'Manutenção'} · ${linkDaOrdem(notificacao.service_order_id)}`
    )}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    filename: `OS-${(notificacao.service_order_code || notificacao.service_order_id).replace(/[^A-Za-z0-9-]/g, '')}.ics`,
    content: paraBase64(ics),
  };
}

/** Dia da semana por extenso, para o texto do motivo da sugestão. */
export function diaDaSemana(valor: any) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return DIAS[data.getUTCDay()];
}