// Pilha de navegação por aba da barra inferior (mobile).
// Cada aba guarda os locais visitados dentro dela; ao voltar para a aba, reabre o último.
// Fica em memória e em sessionStorage (sobrevive a recarga da WebView, não a fechar o app).

const CHAVE = 'evora:pilhas-abas';
const LIMITE = 30;

/** Raízes das abas da barra inferior. A ordem não importa: '/' só casa exatamente. */
export const RAIZES_ABAS = ['/', '/chamados', '/equipamentos', '/meu-perfil'];

function carregar() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE));
    return salvo && typeof salvo === 'object' ? salvo : {};
  } catch {
    return {};
  }
}

function salvar() {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(pilhas));
  } catch {
    // sem armazenamento: a pilha fica só em memória
  }
}

let pilhas = carregar();

/** Raiz da aba a que a rota pertence; null quando a rota não é de nenhuma aba. */
export function raizDaAba(pathname) {
  if (pathname === '/') return '/';
  return (
    RAIZES_ABAS.filter((raiz) => raiz !== '/').find(
      (raiz) => pathname === raiz || pathname.startsWith(`${raiz}/`)
    ) || null
  );
}

/** Registra um local visitado na pilha da aba. `tipo` é o NavigationType do react-router. */
export function registrarLocal(pathname, search, tipo) {
  const raiz = raizDaAba(pathname);
  if (!raiz) return;
  const local = `${pathname}${search || ''}`;
  const pilha = pilhas[raiz] || (pilhas[raiz] = []);

  if (tipo === 'POP') {
    // Voltou (ou avançou) no histórico: corta a pilha até este local; se não conhece, empilha.
    const i = pilha.lastIndexOf(local);
    if (i >= 0) pilha.length = i + 1;
    else pilha.push(local);
  } else if (tipo === 'REPLACE') {
    if (pilha.length) pilha[pilha.length - 1] = local;
    else pilha.push(local);
  } else if (pilha[pilha.length - 1] !== local) {
    pilha.push(local);
  }

  if (pilha.length > LIMITE) pilha.splice(0, pilha.length - LIMITE);
  salvar();
}

/** Último local aberto na aba (ou a própria raiz, se ainda não houve navegação nela). */
export function destinoDaAba(raiz) {
  const pilha = pilhas[raiz];
  return pilha?.length ? pilha[pilha.length - 1] : raiz;
}

/** Zera a pilha da aba, deixando só a raiz (toque na aba que já está ativa). */
export function reiniciarAba(raiz) {
  pilhas[raiz] = [raiz];
  salvar();
}
