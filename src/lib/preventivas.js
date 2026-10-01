import { format, parseISO } from 'date-fns';
import { dataReferencia } from '@/lib/central';

/**
 * Preventivas em aberto = ServiceOrder do tipo Preventiva ainda não concluídas.
 * Corretivas ficam de fora: são reativas, não têm data programada e não representam
 * compromisso agendado da equipe.
 */
export function preventivasAbertas(orders = []) {
  return (orders || []).filter((o) => o.type === 'Preventiva' && o.status !== 'Concluído');
}

/** Data programada da preventiva (scheduled_date; abertura como fallback). */
export function dataProgramada(order) {
  const referencia = dataReferencia(order);
  return referencia ? parseISO(referencia) : null;
}

/** A ordem tem horário definido ou apenas o dia? */
export function temHorario(order) {
  return String(dataReferencia(order) || '').includes('T');
}

export function horarioProgramado(order) {
  const data = dataProgramada(order);
  return data ? format(data, 'HH:mm') : '';
}

export function ordenarCronologico(orders = []) {
  return [...(orders || [])].sort(
    (a, b) => (dataProgramada(a)?.getTime() || 0) - (dataProgramada(b)?.getTime() || 0)
  );
}

/** Cores fixas de identificação do técnico (identidade EVORA). */
const PALETA_TECNICO = ['#0F4C4A', '#D97861', '#4E7A76', '#8A6E3F', '#3E5C76', '#6B7A4F'];

export function corDoTecnico(id) {
  if (!id) return '#9AA1A4';
  let soma = 0;
  for (const caractere of String(id)) soma = (soma * 31 + caractere.charCodeAt(0)) % 9973;
  return PALETA_TECNICO[soma % PALETA_TECNICO.length];
}

export function iniciaisDoNome(nome) {
  return (nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

/**
 * Agrupa as preventivas por técnico. Ativos aparecem sempre (mesmo sem preventivas);
 * técnicos em férias/afastados só quando têm preventivas atribuídas, para sinalizar
 * ao administrador que aquela agenda precisa ser redistribuída.
 */
export function agruparPorTecnico(preventivas = [], tecnicos = []) {
  const porTecnico = new Map();
  const naoAtribuidas = [];

  preventivas.forEach((ordem) => {
    if (!ordem.technician_id) {
      naoAtribuidas.push(ordem);
      return;
    }
    const lista = porTecnico.get(ordem.technician_id) || [];
    lista.push(ordem);
    porTecnico.set(ordem.technician_id, lista);
  });

  const grupos = tecnicos.map((tecnico) => ({
    id: tecnico.id,
    nome: tecnico.name,
    status: tecnico.status || 'Ativo',
    cor: corDoTecnico(tecnico.id),
    ordens: ordenarCronologico(porTecnico.get(tecnico.id) || []),
  }));

  // Técnico removido do cadastro, mas com preventivas ainda vinculadas.
  porTecnico.forEach((ordens, id) => {
    if (!tecnicos.some((tecnico) => tecnico.id === id)) {
      grupos.push({
        id,
        nome: ordens[0]?.technician_name || 'Técnico não cadastrado',
        status: 'Desconhecido',
        cor: corDoTecnico(id),
        ordens: ordenarCronologico(ordens),
      });
    }
  });

  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

  return {
    grupos: [
      ...grupos.filter((g) => g.status === 'Ativo').sort(porNome),
      ...grupos.filter((g) => g.status !== 'Ativo' && g.ordens.length > 0).sort(porNome),
    ],
    naoAtribuidas: ordenarCronologico(naoAtribuidas),
  };
}