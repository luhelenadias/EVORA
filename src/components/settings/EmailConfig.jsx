import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modo teste de e-mail das notificações de agenda.
 * Ligado (padrão), todo e-mail vai para o endereço de teste, com o destinatário
 * real indicado no assunto e no corpo.
 */
export default function EmailConfig({ config }) {
  const queryClient = useQueryClient();
  const [modoTeste, setModoTeste] = useState(config?.email_modo_teste !== false);
  const [destino, setDestino] = useState(config?.email_teste_destino || '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setModoTeste(config?.email_modo_teste !== false);
    setDestino(config?.email_teste_destino || '');
  }, [config?.id, config?.email_modo_teste, config?.email_teste_destino]);

  const alterou =
    modoTeste !== (config?.email_modo_teste !== false) ||
    destino !== (config?.email_teste_destino || '');

  const salvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.ConfiguracaoInstituicao.update(config.id, {
        email_modo_teste: modoTeste,
        email_teste_destino: destino.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['configuracaoInstituicao'] });
      toast.success('Configuração de e-mail salva');
    } catch (erro) {
      toast.error(`Não foi possível salvar: ${erro?.message || erro}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Mail className="h-5 w-5 text-primary" /> Notificações por e-mail
        </CardTitle>
        <CardDescription>
          Avisos de agendamento, mudança de data, troca de técnico e cancelamento vão para o técnico
          responsável, com convite de calendário (.ics) anexo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
            modoTeste ? 'border-warning/50 bg-warning/10' : 'border-border bg-muted/40'
          }`}
        >
          <Switch id="modo-teste-email" checked={modoTeste} onCheckedChange={setModoTeste} />
          <div className="flex-1">
            <Label htmlFor="modo-teste-email" className="text-sm font-semibold">
              Modo teste {modoTeste ? 'ligado' : 'desligado'}
            </Label>
            <p className="text-xs leading-snug text-muted-foreground">
              {modoTeste
                ? 'Nenhum técnico recebe e-mail agora: tudo é enviado ao endereço de teste, com o destinatário real no assunto e no corpo.'
                : 'Os e-mails vão para o endereço cadastrado de cada técnico. Ligue o modo teste enquanto esses endereços não forem reais e verificados.'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destino-teste" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Endereço de teste
          </Label>
          <Input
            id="destino-teste"
            type="email"
            placeholder="lhdias@unifesp.br"
            value={destino}
            onChange={(evento) => setDestino(evento.target.value)}
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-xs leading-snug text-muted-foreground">
            Os e-mails dos técnicos cadastrados hoje são fictícios (@demo.evora) ou de domínio genérico.
            Enquanto isso não for corrigido, mantenha o modo teste ligado. A entrega para endereços que não
            são usuários do sistema depende de domínio de e-mail próprio conectado ao app e de plano pago;
            quando a plataforma recusa a entrega, a fila registra o erro em Notificações de agenda.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={!alterou || salvando || (modoTeste && !destino.trim())}>
            {salvando ? 'Salvando...' : 'Salvar notificações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}