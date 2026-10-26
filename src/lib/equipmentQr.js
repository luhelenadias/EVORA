import QRCode from 'qrcode';

/** App publicado — destino do QR Code das etiquetas. */
export const APP_BASE_URL = 'https://phenomenal-med-equip-flow.base44.app';

const PETROLEO = '#0F4C4A';
const GRAFITE = '#202426';
const CORAL = '#D97861';
const MUTED = '#6B7280';

export const LABEL_WIDTH = 720;
export const LABEL_HEIGHT = 1020;

/** URL que o QR carrega: app publicado + id interno do equipamento (não o código, que pode mudar). */
export function equipmentQrUrl(equipmentId) {
  return `${APP_BASE_URL}/equipamentos/${equipmentId}`;
}

/** Lê o id do equipamento de um texto vindo de qualquer QR (URL completa ou caminho). */
export function equipmentIdFromQr(text) {
  if (!text) return null;
  const partes = String(text)
    .trim()
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean);
  const i = partes.indexOf('equipamentos');
  return i >= 0 && partes[i + 1] ? partes[i + 1] : null;
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function escreverCentralizado(ctx, texto, x, y, larguraMax, alturaLinha, maxLinhas) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  palavras.forEach((palavra) => {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  });
  if (atual) linhas.push(atual);
  const visiveis = linhas.slice(0, maxLinhas);
  if (linhas.length > maxLinhas) visiveis[maxLinhas - 1] = `${visiveis[maxLinhas - 1]}…`;
  visiveis.forEach((linha, i) => ctx.fillText(linha, x, y + i * alturaLinha));
}

/**
 * Etiqueta EVORA do equipamento (QR + código em destaque + nome) desenhada em canvas,
 * pronta para copiar como imagem, baixar ou imprimir.
 */
export async function buildEquipmentLabel(equipment) {
  const qrDataUrl = await QRCode.toDataURL(equipmentQrUrl(equipment.id), {
    margin: 0,
    width: 480,
    errorCorrectionLevel: 'M',
    color: { dark: GRAFITE, light: '#FFFFFF' },
  });
  const qr = await carregarImagem(qrDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  // Cabeçalho EVORA
  ctx.fillStyle = PETROLEO;
  ctx.fillRect(0, 0, LABEL_WIDTH, 118);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '800 40px Montserrat, system-ui, sans-serif';
  ctx.fillText('EVORA', 40, 58);
  ctx.font = '600 16px Montserrat, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText('ENGENHARIA CLÍNICA', 40, 94);
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, 118, LABEL_WIDTH, 6);

  // QR Code
  const qrSize = 470;
  ctx.drawImage(qr, (LABEL_WIDTH - qrSize) / 2, 188, qrSize, qrSize);

  // Código do equipamento em destaque
  ctx.textAlign = 'center';
  ctx.fillStyle = PETROLEO;
  ctx.font = '800 58px Montserrat, system-ui, sans-serif';
  ctx.fillText(equipment.codigo_equipamento || '—', LABEL_WIDTH / 2, 742);

  ctx.strokeStyle = '#E5E1D8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 784);
  ctx.lineTo(LABEL_WIDTH - 120, 784);
  ctx.stroke();

  // Nome do equipamento
  ctx.fillStyle = GRAFITE;
  ctx.font = '600 27px Montserrat, system-ui, sans-serif';
  escreverCentralizado(ctx, equipment.name, LABEL_WIDTH / 2, 828, LABEL_WIDTH - 110, 34, 2);

  // Setor · criticidade
  ctx.fillStyle = MUTED;
  ctx.font = '500 19px Montserrat, system-ui, sans-serif';
  const linha = [equipment.location_sector, equipment.criticality].filter(Boolean).join(' · ');
  if (linha) ctx.fillText(linha, LABEL_WIDTH / 2, 912);

  // Rodapé
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px Montserrat, system-ui, sans-serif';
  ctx.fillText('Aponte a câmera do app para abrir a ficha', LABEL_WIDTH / 2, 968);

  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}