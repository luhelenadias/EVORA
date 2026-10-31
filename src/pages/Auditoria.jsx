import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import AuditoriaConteudo from '@/components/auditoria/AuditoriaConteudo';

/** Página global de auditoria — acesso exclusivo do perfil administrador. */
export default function Auditoria() {
  const { user } = useOutletContext() || {};

  if (user?.role !== 'admin') {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        description="O log de auditoria é visível apenas para administradores."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Quem abriu, atendeu, alterou e fechou cada registro — com data e hora do servidor."
      />
      <AuditoriaConteudo />
    </div>
  );
}