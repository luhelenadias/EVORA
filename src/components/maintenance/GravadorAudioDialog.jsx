import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from 'lucide-react';
import { gerarRascunho, transcreverTrechos } from '@/lib/relatorioAudio';

const formatarSegundos = (total) => {
  const s = Math.max(Math.floor(total), 0);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const escolherFormato = () => {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  const formatos = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg'];
  return formatos.find((f) => { try { return MediaRecorder.isTypeSupported(f); } catch { return false; } }) || '';
};

/**
 * Gravação do relato em áudio da manutenção. O áudio fica no aparelho até a transcrição
 * e é descartado depois dela; só o texto é guardado na ordem de serviço.
 */
export default function GravadorAudioDialog({ open, order, equipment, trechos = [], onTrechosChange, onRascunho, onClose }) {
  const { data: spareParts = [] } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => base44.entities.SparePart.list(),
  });

  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState(null);
  const [etapa, setEtapa] = useState(null);
  const [progresso, setProgresso] = useState('');

  const gravadorRef = useRef(null);
  const fluxoRef = useRef(null);
  const pedacosRef = useRef([]);
  const timerRef = useRef(null);
  const segundosRef = useRef(0);

  const limparTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const encerrarFluxo = () => {
    limparTimer();
    try { gravadorRef.current?.state !== 'inactive' && gravadorRef.current?.stop(); } catch { /* já parado */ }
    gravadorRef.current = null;
    fluxoRef.current?.getTracks().forEach((t) => t.stop());
    fluxoRef.current = null;
    pedacosRef.current = [];
    setGravando(false);
    setPausado(false);
  };

  useEffect(() => {
    if (!open) encerrarFluxo();
    return () => { if (!open) encerrarFluxo(); };
  }, [open]);

  const iniciarGravacao = async () => {
    setErro(null);
    if (!escolherFormato() && escolherFormato() !== '') {
      setErro('Este navegador não grava áudio. Use o app publicado no celular (Chrome ou Safari).');
      return;
    }
    try {
      if (!fluxoRef.current) {
        fluxoRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const tipo = escolherFormato();
      const gravador = new MediaRecorder(fluxoRef.current, tipo ? { mimeType: tipo } : undefined);
      pedacosRef.current = [];
      gravador.ondataavailable = (e) => { if (e.data?.size) pedacosRef.current.push(e.data); };
      gravador.onstop = () => {
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || tipo || 'audio/webm' });
        pedacosRef.current = [];
        if (blob.size > 0) {
          onTrechosChange([...trechos, { blob, segundos: segundosRef.current }]);
        }
        segundosRef.current = 0;
        setSegundos(0);
      };
      gravador.start();
      gravadorRef.current = gravador;
      segundosRef.current = 0;
      setSegundos(0);
      setGravando(true);
      setPausado(false);
      limparTimer();
      timerRef.current = setInterval(() => {
        segundosRef.current += 1;
        setSegundos(segundosRef.current);
      }, 1000);
    } catch (e) {
      const negado = ['NotAllowedError', 'SecurityError'].includes(e?.name);
      setErro(
        negado
          ? 'Permissão de microfone negada. Libere o microfone para o site nas configurações do navegador e tente novamente.'
          : 'Não foi possível acessar o microfone deste dispositivo.'
      );
    }
  };

  const alternarPausa = () => {
    const gravador = gravadorRef.current;
    if (!gravador) return;
    if (gravador.state === 'recording') {
      gravador.pause();
      limparTimer();
      setPausado(true);
    } else if (gravador.state === 'paused') {
      gravador.resume();
      timerRef.current = setInterval(() => {
        segundosRef.current += 1;
        setSegundos(segundosRef.current);
      }, 1000);
      setPausado(false);
    }
  };

  const encerrarTrecho = () => {
    limparTimer();
    try { gravadorRef.current?.stop(); } catch { /* já parado */ }
    gravadorRef.current = null;
    setGravando(false);
    setPausado(false);
  };

  const processar = async () => {
    setErro(null);
    try {
      setEtapa('transcrevendo');
      const transcricao = await transcreverTrechos(trechos, (atual, total) =>
        setProgresso(`Transcrevendo trecho ${atual} de ${total}...`)
      );
      if (!transcricao.trim()) throw new Error('Não foi possível entender o áudio. Tente gravar novamente.');
      setEtapa('gerando');
      setProgresso('Gerando o rascunho do relatório...');
      const rascunho = await gerarRascunho({ transcricao, order, equipment, spareParts });
      await onRascunho({ rascunho, transcricao });
    } catch (e) {
      setErro(`Não foi possível gerar o rascunho: ${e?.message || e}. Os trechos gravados continuam aqui para tentar de novo.`);
    } finally {
      setEtapa(null);
      setProgresso('');
    }
  };

  const processando = !!etapa;
  const temTrechos = trechos.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !processando) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Relato por áudio
          </DialogTitle>
          <DialogDescription>
            {order?.equipment_name || 'Equipamento'} — fale o que está fazendo ou já fez. Pode gravar vários trechos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {gravando ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 ${pausado ? '' : 'animate-ping'}`} />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  </span>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                )}
                <p className="text-sm font-medium">
                  {gravando ? (pausado ? 'Gravação pausada' : 'Gravando...') : temTrechos ? 'Trechos prontos' : 'Nenhuma gravação'}
                </p>
              </div>
              <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatarSegundos(segundos)}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {!gravando ? (
                <Button onClick={iniciarGravacao} disabled={processando} className="gap-1.5">
                  <Mic className="w-4 h-4" /> {temTrechos ? 'Gravar outro trecho' : 'Gravar'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={alternarPausa} className="gap-1.5">
                    {pausado ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {pausado ? 'Retomar' : 'Pausar'}
                  </Button>
                  <Button variant="outline" onClick={encerrarTrecho} className="gap-1.5">
                    <Square className="w-4 h-4" /> Encerrar trecho
                  </Button>
                </>
              )}
            </div>
          </div>

          {temTrechos && (
            <div className="space-y-1.5">
              {trechos.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-sm">
                  <span>Trecho {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatarSegundos(t.segundos)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={processando}
                      onClick={() => onTrechosChange(trechos.filter((_, idx) => idx !== i))}
                      aria-label={`Remover trecho ${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            O áudio fica só neste aparelho até você gerar o relatório e é apagado depois da transcrição — na OS fica
            apenas o texto. Nada é concluído sem você revisar.
          </p>

          {erro && (
            <p className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-foreground">
              <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-destructive" />
              {erro}
            </p>
          )}

          {processando && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progresso}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={processando || gravando}>
              Fechar
            </Button>
            <Button onClick={processar} disabled={!temTrechos || processando || gravando} className="gap-1.5">
              <Sparkles className="w-4 h-4" /> Transcrever e gerar relatório
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}