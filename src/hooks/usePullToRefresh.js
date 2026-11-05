import { useEffect, useRef, useState } from 'react';

/** Quanto o dedo precisa puxar (px) para disparar a atualização. */
const LIMITE = 72;

/**
 * "Puxar para atualizar" por toque, a partir do topo da página.
 * Só reage a toque (o desktop não é afetado) e não interfere na rolagem normal.
 */
export default function usePullToRefresh(onRefresh) {
  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicioRef = useRef(null);
  const distanciaRef = useRef(0);
  const ocupadoRef = useRef(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const noTopo = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
    const aplicar = (valor) => {
      distanciaRef.current = valor;
      setDistancia(valor);
    };

    const aoIniciar = (evento) => {
      if (ocupadoRef.current || !noTopo() || evento.touches.length !== 1) {
        inicioRef.current = null;
        return;
      }
      inicioRef.current = evento.touches[0].clientY;
    };

    const aoMover = (evento) => {
      if (inicioRef.current == null) return;
      if (!noTopo()) {
        inicioRef.current = null;
        aplicar(0);
        return;
      }
      const delta = evento.touches[0].clientY - inicioRef.current;
      if (delta <= 0) {
        aplicar(0);
        return;
      }
      // Resistência: o indicador anda menos que o dedo.
      aplicar(Math.min(96, delta * 0.55));
    };

    const aoSoltar = async () => {
      if (inicioRef.current == null) return;
      inicioRef.current = null;
      if (distanciaRef.current < LIMITE) {
        aplicar(0);
        return;
      }
      ocupadoRef.current = true;
      setAtualizando(true);
      aplicar(LIMITE);
      try {
        await refreshRef.current?.();
      } finally {
        ocupadoRef.current = false;
        setAtualizando(false);
        aplicar(0);
      }
    };

    window.addEventListener('touchstart', aoIniciar, { passive: true });
    window.addEventListener('touchmove', aoMover, { passive: true });
    window.addEventListener('touchend', aoSoltar);
    window.addEventListener('touchcancel', aoSoltar);
    return () => {
      window.removeEventListener('touchstart', aoIniciar);
      window.removeEventListener('touchmove', aoMover);
      window.removeEventListener('touchend', aoSoltar);
      window.removeEventListener('touchcancel', aoSoltar);
    };
  }, []);

  return { distancia, atualizando, progresso: Math.min(1, distancia / LIMITE) };
}