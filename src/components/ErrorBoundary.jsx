import React from 'react';

/**
 * Evita a "tela branca": se algo quebrar ao desenhar o app, mostra a mensagem do erro
 * e um botão para recarregar (útil para enviar o texto do erro a quem dá suporte).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro de tela:', erro, info?.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const texto = `${erro?.name || 'Erro'}: ${erro?.message || String(erro)}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="font-display text-lg font-semibold">Não foi possível abrir esta tela</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente recarregar. Se o problema continuar, envie o texto abaixo a quem faz o suporte.
          </p>
          <pre className="mt-4 max-h-40 select-text overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-left text-xs">
            {texto}
          </pre>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="h-11 rounded-md border border-input px-4 text-sm font-medium"
            >
              Ir para o início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
