import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ContractFieldsReview from '@/components/contracts/ContractFieldsReview';
import { dadosDoContrato, statusPorVigencia, valoresDoContrato } from '@/lib/contratos';

/** Cadastro manual de um contrato novo (sem PDF). */
export default function ContractFormDialog({ open, onOpenChange, onCriado }) {
  const [valores, setValores] = useState(() => valoresDoContrato(null));
  const [salvando, setSalvando] = useState(false);

  const completo = valores.supplier_name && valores.contract_number && valores.start_date && valores.end_date;

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await base44.entities.Contract.create({
        ...dadosDoContrato(valores),
        status: statusPorVigencia({ end_date: valores.end_date }),
        extracao_status: 'Sem documento',
      });
      toast.success('Contrato cadastrado');
      setValores(valoresDoContrato(null));
      onCriado();
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível cadastrar o contrato.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Novo Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <ContractFieldsReview
            valores={valores}
            onChange={(key, valor) => setValores((p) => ({ ...p, [key]: valor }))}
          />
          <p className="text-[11px] text-muted-foreground">
            Você pode enviar o PDF depois: abra o contrato e use “Enviar e extrair” para a IA ler os dados.
          </p>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !completo}>
              {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}