import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, Printer, Link2, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildEquipmentLabel, equipmentQrUrl } from '@/lib/equipmentQr';

/** Etiqueta QR do equipamento: prévia, cópia como imagem, download e impressão. */
export default function QrCodeDialog({ equipment, open, onOpenChange }) {
  const [label, setLabel] = useState(null);
  const [copiando, setCopiando] = useState(false);

  useEffect(() => {
    if (!open || !equipment?.id) return undefined;
    let ativo = true;
    setLabel(null);
    buildEquipmentLabel(equipment)
      .then((resultado) => { if (ativo) setLabel(resultado); })
      .catch(() => { if (ativo) toast.error('Não foi possível gerar o QR Code.'); });
    return () => { ativo = false; };
  }, [open, equipment?.id]);

  const nomeArquivo = `QR-${equipment?.codigo_equipamento || equipment?.id}.png`;

  const copiarImagem = async () => {
    if (!label) return;
    setCopiando(true);
    try {
      const blob = await new Promise((resolve) => label.canvas.toBlob(resolve, 'image/png'));
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('Imagem copiada — cole na etiqueta ou no documento.');
    } catch {
      toast.error('Este navegador não permitiu copiar a imagem. Use "Baixar PNG".');
    } finally {
      setCopiando(false);
    }
  };

  const baixar = () => {
    if (!label) return;
    const link = document.createElement('a');
    link.href = label.dataUrl;
    link.download = nomeArquivo;
    link.click();
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(equipmentQrUrl(equipment?.id));
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" /> QR Code do Equipamento
          </DialogTitle>
          <DialogDescription>
            Etiqueta com QR, código e nome. O QR abre a ficha no app publicado — só para usuários logados.
          </DialogDescription>
        </DialogHeader>

        {!label ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <img
              src={label.dataUrl}
              alt={`Etiqueta QR ${equipment?.codigo_equipamento || ''}`}
              className="w-full rounded-lg border shadow-sm"
            />
            <p className="text-[11px] text-muted-foreground break-all">{equipmentQrUrl(equipment?.id)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copiarImagem} disabled={copiando} className="gap-1.5">
                <Copy className="w-4 h-4" /> {copiando ? 'Copiando...' : 'Copiar imagem'}
              </Button>
              <Button variant="outline" onClick={baixar} className="gap-1.5">
                <Download className="w-4 h-4" /> Baixar PNG
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
              <Button variant="outline" onClick={copiarLink} className="gap-1.5">
                <Link2 className="w-4 h-4" /> Copiar link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {label &&
        createPortal(
          <div className="qr-print-area">
            <img src={label.dataUrl} alt="Etiqueta QR do equipamento" />
          </div>,
          document.body
        )}
    </Dialog>
  );
}