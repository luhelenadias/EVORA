import { base44 } from '@/api/base44Client';
import { normalizarExtracao } from '@/lib/contratos';

/**
 * Esquema pedido à integração de leitura de arquivos da plataforma
 * (ExtractDataFromUploadedFile). Lê PDF com texto e PDF escaneado (OCR),
 * e devolve, para cada campo, a página e o trecho literal de onde saiu.
 */
const ESQUEMA = {
  type: 'object',
  properties: {
    fornecedor: { type: 'string', description: 'Razão social da contratada, como escrita no PDF. Vazio se não constar.' },
    cnpj: { type: 'string', description: 'CNPJ da contratada. Vazio se não constar.' },
    numero_contrato: { type: 'string', description: 'Número/identificação do contrato. Vazio se não constar.' },
    vigencia_inicio: { type: 'string', description: 'Início da vigência no formato dd/mm/aaaa. Vazio se não constar.' },
    vigencia_fim: { type: 'string', description: 'Fim da vigência no formato dd/mm/aaaa. Vazio se não constar.' },
    valor_mensal: { type: 'number', description: 'Valor mensal em reais, somente número (18500.00). 0 se não constar.' },
    valor_total: { type: 'number', description: 'Valor total do contrato em reais, somente número. 0 se não constar.' },
    periodicidade_preventiva: { type: 'string', description: 'Periodicidade da manutenção preventiva inclusa: Mensal, Trimestral, Semestral ou Anual. Vazio se não constar.' },
    servicos_inclusos: {
      type: 'array',
      description: 'Serviços expressamente inclusos no contrato.',
      items: { type: 'string', enum: ['Manutenção Preventiva', 'Manutenção Corretiva', 'Peças', 'Calibração'] },
    },
    sla_resposta_horas: { type: 'number', description: 'Prazo de primeiro atendimento/resposta em horas. 0 se não constar.' },
    sla_resolucao_horas: { type: 'number', description: 'Prazo de resolução/conclusão em horas. 0 se não constar.' },
    termos_garantia: { type: 'string', description: 'Texto dos termos de garantia, copiado do PDF. Vazio se não constar.' },
    garantia_meses: { type: 'number', description: 'Prazo de garantia em meses, apenas se o PDF informar em meses. 0 se não constar ou se a unidade não estiver clara.' },
    numeros_serie: {
      type: 'array',
      description: 'Todos os números de série citados no contrato ou nos anexos, exatamente como escritos.',
      items: { type: 'string' },
    },
    qualidade_leitura: { type: 'string', enum: ['Boa', 'Ruim'] },
    fontes: {
      type: 'array',
      description: 'Para cada campo extraído, a página e o trecho literal do PDF de onde o valor foi lido.',
      items: {
        type: 'object',
        properties: {
          campo: { type: 'string' },
          pagina: { type: 'number' },
          trecho: { type: 'string' },
          certeza: { type: 'string', enum: ['Alta', 'Média', 'Baixa'] },
        },
        required: ['campo', 'pagina', 'trecho', 'certeza'],
      },
    },
    campos_revisar: {
      type: 'array',
      description: 'Chaves dos campos ausentes, ilegíveis ou de baixa certeza. Nunca preencha um campo por dedução: deixe vazio e liste aqui.',
      items: { type: 'string' },
    },
  },
  required: ['fontes', 'campos_revisar', 'qualidade_leitura'],
};

/** Sobe o PDF no armazenamento privado do app e devolve o file_uri. */
export async function enviarPdfDoContrato(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

/** URL assinada e temporária para abrir um arquivo privado. */
export async function urlDoArquivo(fileUri, expiresIn = 300) {
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
  return signed_url;
}

export async function abrirDocumento(fileUri) {
  const url = await urlDoArquivo(fileUri);
  window.open(url, '_blank', 'noopener');
}

/**
 * Lê o PDF (texto ou digitalizado) e devolve os valores propostos, com fontes
 * e a lista de campos a revisar. Não grava nada no contrato.
 */
export async function extrairDoPdf(fileUri) {
  const url = await urlDoArquivo(fileUri, 900);
  const resposta = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: ESQUEMA });
  if (resposta?.status !== 'success' || !resposta?.output) {
    throw new Error(resposta?.details || 'Não foi possível ler este PDF. Se for um documento digitalizado, verifique a qualidade da digitalização.');
  }
  return normalizarExtracao(resposta.output);
}