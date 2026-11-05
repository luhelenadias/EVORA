import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/** Exclusão da própria conta, exigida pela política do Google Play. */
export default function ExcluirContaCard() {
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    setExcluindo(true);
    try {
      const resposta = await base44.functions.invoke('excluirConta', {});
      if (resposta?.data?.error) {
        toast.error(resposta.data.error);
        setExcluindo(false);
        return;
      }
      toast.success('Sua conta foi excluída');
      base44.auth.logout('/login');
    } catch (erro) {
      toast.error(erro?.response?.data?.error || erro?.data?.error || 'Não foi possível excluir sua conta');
      setExcluindo(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm text-destructive">Excluir conta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ao excluir, seu acesso a este aplicativo é removido e seus dados de perfil são apagados. Os registros
          operacionais das manutenções (ordens de serviço, histórico dos equipamentos) permanecem no sistema por
          exigência de rastreabilidade, sem vínculo com a sua conta.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={excluindo}>
              <Trash2 className="h-4 w-4" /> {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Você perderá o acesso imediatamente e será redirecionado para a
                tela de entrada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(evento) => { evento.preventDefault(); excluir(); }}
                disabled={excluindo}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {excluindo ? 'Excluindo...' : 'Sim, excluir minha conta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}