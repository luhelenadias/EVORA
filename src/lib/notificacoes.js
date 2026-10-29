import { base44 } from '@/api/base44Client';

/**
 * Avisa o técnico quando a agenda de uma OS muda. O servidor consolida
 * mudanças em sequência (espera alguns minutos) e envia um único e-mail com a
 * mudança final. Não bloqueia a ação do usuário.
 */
export async function notificarMudancaDeAgenda({ order, antes, depois, evento }) {
  if (!order?.id) return null;
  try {
    const resposta = await base44.functions.invoke('notificarAgendamento', {
      service_order_id: order.id,
      evento,
      antes: {
        scheduled_date: antes?.scheduled_date || '',
        technician_id: antes?.technician_id || '',
        technician_name: antes?.technician_name || '',
      },
      depois: {
        scheduled_date: depois?.scheduled_date || '',
        technician_id: depois?.technician_id || '',
        technician_name: depois?.technician_name || '',
      },
    });
    return resposta?.data || null;
  } catch {
    return null;
  }
}

/** Descobre o tipo de aviso a partir do que mudou na agenda. */
export function eventoDaMudanca(antes = {}, depois = {}) {
  const mudouData = (antes.scheduled_date || '') !== (depois.scheduled_date || '');
  const mudouTecnico = (antes.technician_id || '') !== (depois.technician_id || '');

  if (mudouData && !depois.scheduled_date) return 'Cancelamento';
  if (mudouData && mudouTecnico) return 'Agendamento e troca de técnico';
  if (mudouTecnico) return 'Troca de técnico';
  if (mudouData && !antes.scheduled_date) return 'Agendamento';
  if (mudouData) return 'Reagendamento';
  return null;
}