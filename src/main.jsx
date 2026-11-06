import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Depois de uma nova versão, uma tela aberta com a versão antiga pode pedir um arquivo que não
// existe mais (as páginas carregam sob demanda). Recarrega uma vez para pegar a versão nova.
window.addEventListener('vite:preloadError', (evento) => {
  try {
    if (sessionStorage.getItem('evora:recarregou-chunk')) return;
    sessionStorage.setItem('evora:recarregou-chunk', '1');
  } catch {
    // sem sessionStorage: recarrega mesmo assim, uma vez por abertura
  }
  evento.preventDefault();
  window.location.reload();
});

// App em tela cheia (WebView/PWA) que não informa a área segura do topo: reserva espaço para a
// barra de status, senão o cabeçalho fica por baixo do relógio e da bateria.
try {
  const modoApp = ['standalone', 'fullscreen', 'minimal-ui'].some(
    (modo) => window.matchMedia(`(display-mode: ${modo})`).matches,
  );
  const webview = /; wv\)|\bwv\b/.test(navigator.userAgent);
  if ((modoApp || webview) && window.innerWidth < 1024) {
    const sonda = document.createElement('div');
    sonda.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
    document.body.appendChild(sonda);
    const inset = parseFloat(getComputedStyle(sonda).paddingTop) || 0;
    sonda.remove();
    if (inset < 1) document.documentElement.setAttribute('data-app-embutido', '');
  }
} catch {
  // sem detecção: mantém o layout padrão
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
