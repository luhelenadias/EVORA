// ── Codificação de equipamento — padrão Calil ─────────────────────
// Formato: {sigla_setor}-{sigla_tipo}{sequencial 2 dígitos}{ano aquisição 2 dígitos}
// Exemplo: CC-VT0394  (Centro Cirúrgico, Ventilador para Terapia, 3º, 1994)

/** Normaliza a sigla: maiúscula, apenas A-Z/0-9, no máximo 2 caracteres. */
export function normalizeSigla(value) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
}

/** Extrai os dois últimos dígitos do ano de aquisição. */
export function yearTwoDigits(acquisitionDate) {
  if (!acquisitionDate) return '';
  const year = String(acquisitionDate).slice(0, 4);
  return year.length === 4 ? year.slice(2) : '';
}

/**
 * Próxima posição sequencial para o par setor + tipo.
 * Conta os equipamentos já existentes nesse par (excluindo o próprio registro em edição).
 */
export function computeNextSequencial(equipmentList, setorId, tipoId, excludeId) {
  if (!setorId || !tipoId) return null;
  const count = (equipmentList || []).filter(
    (e) => e.setor_id === setorId && e.tipo_equipamento_id === tipoId && e.id !== excludeId
  ).length;
  return count + 1;
}

/** Monta o código técnico completo (ex: CC-VT0394). Retorna '' se faltar algum bloco. */
export function buildEquipmentCode({ setorSigla, tipoSigla, sequencial, acquisitionDate }) {
  if (!setorSigla || !tipoSigla || sequencial == null || !acquisitionDate) return '';
  const seq = String(sequencial).padStart(2, '0');
  const year = yearTwoDigits(acquisitionDate);
  if (!year) return '';
  return `${setorSigla}-${tipoSigla}${seq}${year}`;
}