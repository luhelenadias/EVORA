import React from 'react';
import { Mic } from 'lucide-react';

/** Transcrição bruta do relato em áudio do técnico (o áudio não é guardado). */
export default function TranscricaoAudio({ transcricao }) {
  if (!transcricao) return null;
  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Mic className="w-3.5 h-3.5" /> Transcrição do relato em áudio
      </p>
      <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
        {transcricao}
      </p>
    </div>
  );
}