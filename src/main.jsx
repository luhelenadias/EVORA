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

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
