import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/roles';

/** Aviso de aba não liberada para o perfil do usuário, com atalhos para o que ele pode acessar. */
export default function SemAcesso({ abas = [], perfil, personalizado = false }) {
  return (
    <Card className="max-w-xl mx-auto mt-8">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold">Sem acesso a esta área</p>
          <p className="text-sm text-muted-foreground">
            {personalizado
              ? 'Os seus acessos foram personalizados e esta aba não está incluída. Peça ao administrador para ajustar em Usuários → Editar usuário.'
              : `O perfil ${ROLE_LABELS[perfil] || 'do usuário'} não tem esta aba liberada. Peça ao administrador para ajustar em Configurações → Acessos por Perfil.`}
          </p>
        </div>
        {abas.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {abas.slice(0, 4).map((aba) => (
              <Button key={aba.key} variant="outline" size="sm" asChild>
                <Link to={aba.path}>{aba.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}