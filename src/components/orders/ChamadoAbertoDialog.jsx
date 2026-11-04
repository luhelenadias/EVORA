import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail, MailX } from 'lucide-react';

/** Confirmação da abertura do chamado: número gerado e aviso de e-mail ao solicitante. */
export default function ChamadoAbertoDialog({ chamado, email, onClose }) {
  if (!chamado) return null;

  const numero = chamado.code || (chamado.id ? `OS-${chamado.id.substring(0, 6)}` : '—');
  const enviado = email?.enviado;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <DialogTitle className="font-display">Chamado aberto com sucesso</DialogTitle>
          <DialogDescription>
            Sua solicitação já está disponível para a engenharia clínica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Número do chamado</p>
            <p className="font-mono text-lg font-bold text-primary">{numero}</p>
          </div>

          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              Equipamento: <span className="text-foreground font-medium">{chamado.equipment_name || '—'}</span>
            </p>
            <p className="text-muted-foreground">
              Prioridade: <span className="text-foreground font-medium">{chamado.priority || '—'}</span>
            </p>
          </div>

          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${enviado ? 'bg-muted/40 text-muted-foreground' : 'border-accent/40 bg-accent/5 text-accent'}`}>
            {enviado ? <Mail className="w-4 h-4 shrink-0 mt-0.5" /> : <MailX className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>
              {enviado
                ? `Enviamos o e-mail de confirmação para ${email.destinatario}.`
                : `O chamado foi registrado, mas o e-mail de confirmação não pôde ser enviado${email?.motivo ? `: ${email.motivo}` : '.'}`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}