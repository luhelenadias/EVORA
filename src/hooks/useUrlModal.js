import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Guarda o diálogo aberto na URL (ex.: ?os=<id>).
 * Assim o gesto "voltar" do Android/iOS fecha o diálogo em vez de sair do aplicativo:
 * abrir empilha uma entrada no histórico e fechar a substitui.
 */
export default function useUrlModal(chave) {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(chave) || null;

  const abrir = useCallback((valor) => {
    if (!valor) return;
    setSearchParams((atual) => {
      const proximo = new URLSearchParams(atual);
      proximo.set(chave, valor);
      return proximo;
    });
  }, [chave, setSearchParams]);

  const fechar = useCallback(() => {
    setSearchParams((atual) => {
      if (!atual.has(chave)) return atual;
      const proximo = new URLSearchParams(atual);
      proximo.delete(chave);
      return proximo;
    }, { replace: true });
  }, [chave, setSearchParams]);

  return [id, abrir, fechar];
}