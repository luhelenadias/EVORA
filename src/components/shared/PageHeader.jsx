import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

/**
 * Cabeçalho de página.
 * Botão de voltar opcional: aparece quando `showBackButton` é verdadeiro ou quando `onBack` é informado.
 * Sem `onBack`, volta uma página no histórico (ou vai ao início se a página foi aberta direto).
 */
export default function PageHeader({ title, subtitle, onAdd, addLabel, onBack, showBackButton = false, children }) {
  const navigate = useNavigate();
  const mostrarVoltar = showBackButton || typeof onBack === 'function';

  const voltar = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    // idx 0 = primeira entrada do histórico desta sessão: não há para onde voltar.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {mostrarVoltar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={voltar}
            aria-label="Voltar"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onAdd && (
          <Button onClick={onAdd} className="h-11 gap-2 sm:h-9">
            <Plus className="w-4 h-4" />
            {addLabel || 'Novo'}
          </Button>
        )}
      </div>
    </div>
  );
}
