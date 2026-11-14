import { base44 } from '@/api/base44Client';

/** Extensão aceita pelo transcritor, a partir do tipo gravado pelo navegador. */
function extensao(tipo = '') {
  if (tipo.includes('mp4') || tipo.includes('m4a')) return 'm4a';
  if (tipo.includes('ogg')) return 'ogg';
  if (tipo.includes('wav')) return 'wav';
  return 'webm';
}

/**
 * Envia cada trecho para armazenamento privado, gera uma URL assinada de curta duração
 * e transcreve (Whisper da plataforma, sem chave externa). Devolve a transcrição completa.
 */
export async function transcreverTrechos(trechos = [], aoProgredir) {
  const partes = [];
  for (let i = 0; i < trechos.length; i += 1) {
    aoProgredir?.(i + 1, trechos.length);
    const blob = trechos[i].blob;
    const arquivo = new File([blob], `trecho-${i + 1}.${extensao(blob.type)}`, {
      type: blob.type || 'audio/webm',
    });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: arquivo });
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 600,
    });
    const texto = await base44.integrations.Core.TranscribeAudio({ audio_url: signed_url });
    if (typeof texto === 'string' && texto.trim()) partes.push(texto.trim());
  }
  return partes.join('\n\n');
}

const ESQUEMA = {
  type: 'object',
  properties: {
    causa_falha: { type: 'string' },
    acao_realizada: { type: 'string' },
    testes_finais: { type: 'string' },
    pendencias: { type: 'string' },
    pecas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          spare_part_id: { type: 'string' },
          quantidade: { type: 'number' },
        },
        required: ['spare_part_id', 'quantidade'],
      },
    },
    campos_revisar: { type: 'array', items: { type: 'string' } },
  },
  required: ['causa_falha', 'acao_realizada', 'testes_finais', 'pendencias', 'pecas', 'campos_revisar'],
};

/**
 * Transforma a transcrição em rascunho estruturado do relatório da OS.
 * A IA é instruída a não inventar: campo sem informação volta vazio e marcado em campos_revisar.
 */
export async function gerarRascunho({ transcricao, order, equipment, spareParts = [] }) {
  const catalogo = spareParts
    .map((p) => `${p.id} | ${p.name} | código ${p.code || '—'} | estoque ${p.current_stock ?? 0}`)
    .join('\n');

  const prompt = `Você é engenheiro clínico sênior e vai transformar o relato falado de um técnico de manutenção em um rascunho de relatório de ordem de serviço hospitalar.

DADOS DA ORDEM
- Equipamento: ${order?.equipment_name || equipment?.name || '—'}
- Código do equipamento: ${equipment?.codigo_equipamento || '—'}
- Criticidade: ${equipment?.criticality || '—'}
- Tipo de serviço: ${order?.type || '—'}
- Problema relatado na abertura: ${order?.problem_description || '—'}

RELATO DO TÉCNICO (transcrição do áudio, pode ter repetições e erros de fala)
"""
${transcricao}
"""

CATÁLOGO DE PEÇAS (id | nome | código | estoque atual)
${catalogo || '(catálogo vazio)'}

REGRAS OBRIGATÓRIAS
1. Use SOMENTE o que o técnico disse. Nunca invente causa, peça, teste, medição ou pendência.
2. Campo sem informação no relato: devolva string vazia "" e inclua a chave do campo em campos_revisar.
3. Em caso de dúvida (termo ambíguo, peça mal identificada, quantidade incerta), prefira deixar vazio ou registrar apenas o que foi dito, e inclua a chave em campos_revisar. Nunca complete com suposição.
4. Peças: sugira somente itens que existam no catálogo acima, usando exatamente o id informado. Se o técnico citou uma peça fora do catálogo, não crie item novo: mencione a citação em acao_realizada e inclua "pecas" em campos_revisar. Quantidade só quando dita; se não foi dita, use 1 e inclua "pecas" em campos_revisar.
5. causa_falha: diagnóstico e causa provável da falha. acao_realizada: o que foi executado, em texto corrido, pronto para o laudo. testes_finais: testes/medições feitos após o serviço. pendencias: o que ficou pendente.
6. Não invente números de medição: use apenas os ditados pelo técnico.
7. campos_revisar aceita somente as chaves: "causa_falha", "acao_realizada", "testes_finais", "pendencias", "pecas".`;

  // Modelo fixado para que o comportamento seja reprodutível (documentado no TCC).
  return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: ESQUEMA, model: 'gemini_3_8_flash' });
}