import { base44 } from '@/api/base44Client';

/**
 * Única porta de gravação da OS. O servidor confere quem pode alterar o quê
 * (destino, técnico e prioridade são de admin/gestor; o técnico grava só a execução).
 */
export async function salvarOS(id, patch) {
  try {
    const { data } = await base44.functions.invoke('salvarOS', { id, patch });
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (erro) {
    const mensagem = erro?.response?.data?.error || erro?.message || 'Não foi possível salvar a OS';
    throw new Error(mensagem);
  }
}