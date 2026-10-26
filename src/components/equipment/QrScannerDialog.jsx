import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, Camera, ShieldAlert } from 'lucide-react';

/** Leitor de QR Code pela câmera do dispositivo (pede permissão ao abrir). */
export default function QrScannerDialog({ open, onOpenChange, onDetect }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectRef = useRef(onDetect);
  const [erro, setErro] = useState(null);
  const [lendo, setLendo] = useState(false);

  detectRef.current = onDetect;

  useEffect(() => {
    if (!open) return undefined;
    let cancelado = false;
    setErro(null);
    setLendo(false);

    const iniciar = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não libera a câmera. Use o app publicado no celular.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        setLendo(true);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let ultimo = null;
        let ultimoEm = 0;

        const loop = () => {
          const alvo = videoRef.current;
          if (!alvo || alvo.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          const largura = alvo.videoWidth;
          const altura = alvo.videoHeight;
          if (largura && altura) {
            canvas.width = largura;
            canvas.height = altura;
            ctx.drawImage(alvo, 0, 0, largura, altura);
            const imagem = ctx.getImageData(0, 0, largura, altura);
            const achado = jsQR(imagem.data, largura, altura, { inversionAttempts: 'dontInvert' });
            if (achado?.data && (achado.data !== ultimo || Date.now() - ultimoEm > 2000)) {
              ultimo = achado.data;
              ultimoEm = Date.now();
              detectRef.current(achado.data);
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        const negado = ['NotAllowedError', 'SecurityError'].includes(e?.name);
        setErro(
          negado
            ? 'Permissão de câmera negada. Libere o acesso à câmera para este site nas configurações do navegador e tente novamente.'
            : 'Não foi possível abrir a câmera deste dispositivo.'
        );
      }
    };

    iniciar();

    return () => {
      cancelado = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setLendo(false);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> Ler QR Code
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera para a etiqueta do equipamento. A ficha abre automaticamente.
          </DialogDescription>
        </DialogHeader>

        {erro ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">{erro}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-foreground/90 aspect-square">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/70" />
            {!lendo && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-white/90 text-sm">
                <Camera className="w-4 h-4 animate-pulse" /> Abrindo a câmera...
              </div>
            )}
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}