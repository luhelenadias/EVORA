import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ABAS, ABA_TRAVADA, ROLE_LABELS, chavesDoPerfil } from '@/lib/roles';
import { Lock } from 'lucide-react';

/**
 * Acessos deste usuário: por padrão segue o perfil; personalizado, passa a ter
 * uma lista própria de abas, independente do perfil.
 */
export default function AcessosUsuario({ role, config, valor, onChange }) {
  const { personalizado, chaves } = valor || { personalizado: false, chaves: [] };
  const travada = (chave) => role === 'admin' && chave === ABA_TRAVADA;

  const alternarPersonalizado = () => {
    onChange(
      personalizado
        ? { personalizado: false, chaves: [] }
        : { personalizado: true, chaves: chavesDoPerfil(config, role) }
    );
  };

  const alternarAba = (chave) => {
    if (travada(chave)) return;
    const atuais = chaves.includes(chave) ? chaves.filter((item) => item !== chave) : [...chaves, chave];
    onChange({ personalizado: true, chaves: atuais });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={personalizado}
          onCheckedChange={alternarPersonalizado}
          aria-label="Personalizar os acessos deste usuário"
          className="mt-0.5"
        />
        <div className="text-xs leading-relaxed">
          <button type="button" onClick={alternarPersonalizado} className="block text-left font-medium">
            Personalizar os acessos deste usuário
          </button>
          <span className="block text-muted-foreground">
            {personalizado
              ? 'Vale esta lista, independente do perfil.'
              : `Sem personalização, vale o perfil ${ROLE_LABELS[role] || role}.`}
          </span>
        </div>
      </div>

      {personalizado && (
        <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-3">
          {ABAS.map((aba) => (
            <div key={aba.key} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={chaves.includes(aba.key)}
                disabled={travada(aba.key)}
                onCheckedChange={() => alternarAba(aba.key)}
                aria-label={aba.label}
              />
              <button type="button" onClick={() => alternarAba(aba.key)} className="truncate text-left">
                {aba.label}
              </button>
            </div>
          ))}
          {role === 'admin' && (
            <p className="col-span-full flex items-start gap-1 text-[11px] text-muted-foreground">
              <Lock className="mt-px h-3 w-3 flex-shrink-0" />
              Configurações fica sempre liberada para o Administrador.
            </p>
          )}
        </div>
      )}
    </div>
  );
}